import type { SignalingSocket } from '../signaling/client';
import type { SignalPayload } from '../signaling/types';
import { getDisplayStream, stopStream } from './media';

export type WebRTCConnectionState =
  | 'new'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'disconnected'
  | 'failed'
  | 'closed';

export interface WebRTCManagerEvents {
  onRemoteStream?: (stream: MediaStream) => void;
  onConnectionStateChange?: (state: WebRTCConnectionState) => void;
  onRemoteScreenShare?: (sharing: boolean) => void;
  onError?: (message: string) => void;
}

const DEFAULT_STUN = [
  'stun:stun.l.google.com:19302',
  'stun:stun1.l.google.com:19302',
];

/**
 * Parse ICE server configuration from environment variables.
 * NEXT_PUBLIC_STUN_URLS: comma-separated stun: URLs.
 * NEXT_PUBLIC_TURN_URL / _USERNAME / _CREDENTIAL: optional single TURN entry.
 */
function buildIceServers(): RTCIceServer[] {
  const servers: RTCIceServer[] = [];

  const stunEnv = process.env.NEXT_PUBLIC_STUN_URLS?.trim();
  const stunUrls = stunEnv ? stunEnv.split(',').map((s) => s.trim()) : DEFAULT_STUN;
  servers.push({ urls: stunUrls });

  const turnUrl = process.env.NEXT_PUBLIC_TURN_URL?.trim();
  if (turnUrl) {
    servers.push({
      urls: turnUrl,
      username: process.env.NEXT_PUBLIC_TURN_USERNAME,
      credential: process.env.NEXT_PUBLIC_TURN_CREDENTIAL,
    });
  }

  return servers;
}

/**
 * Encapsulates a single RTCPeerConnection for a 1-to-1 call. Handles the full
 * perfect-negotiation flow, ICE exchange, track replacement for camera/device
 * switching and screen sharing, connection monitoring and cleanup.
 *
 * All signaling I/O goes through the injected socket so the transport can be
 * swapped without touching WebRTC logic.
 */
export class WebRTCManager {
  private pc: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private screenStream: MediaStream | null = null;

  private videoSender: RTCRtpSender | null = null;
  private audioSender: RTCRtpSender | null = null;

  // Perfect-negotiation state.
  private polite = false;
  private makingOffer = false;
  private ignoreOffer = false;

  // Only the initiator creates offers, and only once a peer is in the room.
  private isInitiator = false;
  private peerPresent = false;

  private isScreenSharing = false;
  private closed = false;

  // Camera track stashed while screen sharing so we can restore it.
  private cameraTrack: MediaStreamTrack | null = null;

  constructor(
    private readonly socket: SignalingSocket,
    private readonly roomId: string,
    private readonly events: WebRTCManagerEvents,
  ) {}

  /** Local stream must be set before starting negotiation. */
  setLocalStream(stream: MediaStream): void {
    this.localStream = stream;
  }

  getRemoteStream(): MediaStream | null {
    return this.remoteStream;
  }

  /**
   * Initialize the peer connection. `initiator` decides politeness: the
   * non-initiator is "polite" and yields on offer collisions.
   */
  start(initiator: boolean): void {
    this.isInitiator = initiator;
    this.polite = !initiator;
    // Suppress the automatic initial offer until a peer is confirmed present.
    // The initiator opens negotiation via notifyPeerJoined(); the guest waits
    // for that offer and marks the peer present when it arrives.
    this.peerPresent = false;
    this.createPeerConnection();
    this.attachSignalingHandlers();
    this.addLocalTracks();
  }

  /**
   * Called when the second participant has joined. Only the initiator drives
   * the initial offer, and only once the peer is present — otherwise an offer
   * created while alone leaves signaling in a non-stable state and blocks the
   * peer's later offer.
   */
  notifyPeerJoined(): void {
    this.peerPresent = true;
    if (this.isInitiator) {
      void this.createAndSendOffer();
    }
  }

  private async createAndSendOffer(): Promise<void> {
    const pc = this.pc;
    if (!pc || this.closed) return;
    try {
      this.makingOffer = true;
      await pc.setLocalDescription();
      this.socket.emit('offer', {
        roomId: this.roomId,
        data: pc.localDescription,
      });
    } catch {
      this.events.onError?.('Failed to create offer.');
    } finally {
      this.makingOffer = false;
    }
  }

  private createPeerConnection(): void {
    const pc = new RTCPeerConnection({ iceServers: buildIceServers() });
    this.pc = pc;

    this.remoteStream = new MediaStream();
    this.events.onRemoteStream?.(this.remoteStream);

    pc.onicecandidate = ({ candidate }) => {
      if (candidate) {
        this.socket.emit('ice-candidate', {
          roomId: this.roomId,
          data: candidate.toJSON(),
        });
      }
    };

    pc.ontrack = ({ track, streams }) => {
      // Prefer the stream the sender grouped tracks into; fall back to our own.
      const incoming = streams[0];
      if (incoming) {
        this.remoteStream = incoming;
      } else if (this.remoteStream) {
        this.remoteStream.addTrack(track);
      }
      this.events.onRemoteStream?.(this.remoteStream!);
    };

    pc.onnegotiationneeded = async () => {
      // Suppress offers while we're alone in the room. If the initiator emits
      // an offer before the peer arrives, it never reaches anyone yet leaves
      // signalingState in "have-local-offer", which then causes it to ignore
      // the peer's later offer — deadlocking on "Connecting…".
      if (!this.peerPresent) return;
      try {
        this.makingOffer = true;
        await pc.setLocalDescription();
        this.socket.emit('offer', {
          roomId: this.roomId,
          data: pc.localDescription,
        });
      } catch (err) {
        this.events.onError?.('Failed to create offer.');
        void err;
      } finally {
        this.makingOffer = false;
      }
    };

    pc.oniceconnectionstatechange = () => {
      const s = pc.iceConnectionState;
      if (s === 'failed') {
        // Trigger an ICE restart from either side; the offerer will renegotiate.
        this.tryIceRestart();
      }
    };

    pc.onconnectionstatechange = () => {
      this.emitConnectionState();
    };
  }

  private emitConnectionState(): void {
    if (!this.pc) return;
    const map: Record<RTCPeerConnectionState, WebRTCConnectionState> = {
      new: 'new',
      connecting: 'connecting',
      connected: 'connected',
      disconnected: 'reconnecting',
      failed: 'failed',
      closed: 'closed',
    };
    this.events.onConnectionStateChange?.(map[this.pc.connectionState]);
  }

  private async tryIceRestart(): Promise<void> {
    if (!this.pc || this.closed || this.polite) return;
    try {
      const offer = await this.pc.createOffer({ iceRestart: true });
      await this.pc.setLocalDescription(offer);
      this.socket.emit('offer', {
        roomId: this.roomId,
        data: this.pc.localDescription,
      });
    } catch {
      // Monitoring hooks will surface a failed state to the UI.
    }
  }

  private addLocalTracks(): void {
    if (!this.pc || !this.localStream) return;
    for (const track of this.localStream.getTracks()) {
      const sender = this.pc.addTrack(track, this.localStream);
      if (track.kind === 'video') {
        this.videoSender = sender;
        this.cameraTrack = track;
      } else if (track.kind === 'audio') {
        this.audioSender = sender;
      }
    }
  }

  private attachSignalingHandlers(): void {
    this.socket.on('offer', this.handleOffer);
    this.socket.on('answer', this.handleAnswer);
    this.socket.on('ice-candidate', this.handleRemoteCandidate);
    this.socket.on('connection-status', this.handleRemoteStatus);
  }

  private detachSignalingHandlers(): void {
    this.socket.off('offer', this.handleOffer);
    this.socket.off('answer', this.handleAnswer);
    this.socket.off('ice-candidate', this.handleRemoteCandidate);
    this.socket.off('connection-status', this.handleRemoteStatus);
  }

  private handleOffer = async ({ data }: SignalPayload) => {
    const pc = this.pc;
    if (!pc || !data) return;
    const description = data as RTCSessionDescriptionInit;

    // Receiving an offer means the peer is present; allow future renegotiation.
    this.peerPresent = true;

    const offerCollision =
      description.type === 'offer' &&
      (this.makingOffer || pc.signalingState !== 'stable');

    this.ignoreOffer = !this.polite && offerCollision;
    if (this.ignoreOffer) return;

    try {
      await pc.setRemoteDescription(description);
      await pc.setLocalDescription();
      this.socket.emit('answer', {
        roomId: this.roomId,
        data: pc.localDescription,
      });
    } catch (err) {
      this.events.onError?.('Failed to handle incoming offer.');
      void err;
    }
  };

  private handleAnswer = async ({ data }: SignalPayload) => {
    const pc = this.pc;
    if (!pc || !data) return;
    try {
      await pc.setRemoteDescription(data as RTCSessionDescriptionInit);
    } catch (err) {
      void err;
    }
  };

  private handleRemoteCandidate = async ({ data }: SignalPayload) => {
    const pc = this.pc;
    if (!pc || !data) return;
    try {
      await pc.addIceCandidate(data as RTCIceCandidateInit);
    } catch (err) {
      // Safe to ignore if we deliberately ignored the corresponding offer.
      if (!this.ignoreOffer) {
        void err;
      }
    }
  };

  private handleRemoteStatus = ({ status }: { socketId: string; status: string }) => {
    if (status === 'screen-share-on') this.events.onRemoteScreenShare?.(true);
    else if (status === 'screen-share-off') this.events.onRemoteScreenShare?.(false);
  };

  // ---- Media controls -----------------------------------------------------

  toggleAudio(enabled: boolean): void {
    this.localStream?.getAudioTracks().forEach((t) => {
      t.enabled = enabled;
    });
  }

  toggleVideo(enabled: boolean): void {
    this.localStream?.getVideoTracks().forEach((t) => {
      t.enabled = enabled;
    });
  }

  /**
   * Replace the outgoing audio or video track with one from a new device,
   * without renegotiating or dropping the call.
   */
  async replaceTrack(newTrack: MediaStreamTrack): Promise<void> {
    if (!this.localStream) return;
    const sender = newTrack.kind === 'video' ? this.videoSender : this.audioSender;
    if (!sender) return;

    const oldTracks =
      newTrack.kind === 'video'
        ? this.localStream.getVideoTracks()
        : this.localStream.getAudioTracks();

    await sender.replaceTrack(newTrack);

    oldTracks.forEach((t) => {
      this.localStream!.removeTrack(t);
      t.stop();
    });
    this.localStream.addTrack(newTrack);

    if (newTrack.kind === 'video' && !this.isScreenSharing) {
      this.cameraTrack = newTrack;
    }
  }

  isSharingScreen(): boolean {
    return this.isScreenSharing;
  }

  /**
   * Start screen sharing by replacing the outgoing video track. Detects when
   * the user ends the share via the browser's native UI and restores camera.
   */
  async startScreenShare(): Promise<void> {
    if (!this.videoSender) {
      this.events.onError?.('No video track to replace for screen sharing.');
      return;
    }
    const { stream } = await getDisplayStream();
    this.screenStream = stream;
    const screenTrack = stream.getVideoTracks()[0];
    if (!screenTrack) return;

    await this.videoSender.replaceTrack(screenTrack);
    this.isScreenSharing = true;

    // Restore camera automatically when the user stops via browser UI.
    screenTrack.onended = () => {
      void this.stopScreenShare();
    };

    this.socket.emit('connection-status', {
      roomId: this.roomId,
      status: 'screen-share-on',
    });
  }

  /** Stop screen sharing and restore the camera track. */
  async stopScreenShare(): Promise<void> {
    if (!this.isScreenSharing) return;
    this.isScreenSharing = false;

    stopStream(this.screenStream);
    this.screenStream = null;

    if (this.videoSender && this.cameraTrack) {
      // If the stashed camera track was stopped, callers should re-acquire; we
      // still attempt to restore whatever camera track we have.
      await this.videoSender.replaceTrack(this.cameraTrack);
    }

    this.socket.emit('connection-status', {
      roomId: this.roomId,
      status: 'screen-share-off',
    });
  }

  /** Provide a fresh camera track (used when the stashed one was stopped). */
  setCameraTrack(track: MediaStreamTrack): void {
    this.cameraTrack = track;
  }

  // ---- Teardown -----------------------------------------------------------

  close(): void {
    if (this.closed) return;
    this.closed = true;

    this.detachSignalingHandlers();
    stopStream(this.screenStream);

    if (this.pc) {
      this.pc.onicecandidate = null;
      this.pc.ontrack = null;
      this.pc.onnegotiationneeded = null;
      this.pc.oniceconnectionstatechange = null;
      this.pc.onconnectionstatechange = null;
      this.pc.getSenders().forEach((s) => {
        try {
          s.track?.stop();
        } catch {
          /* noop */
        }
      });
      this.pc.close();
      this.pc = null;
    }

    this.remoteStream = null;
    this.screenStream = null;
    this.videoSender = null;
    this.audioSender = null;
    this.cameraTrack = null;
  }
}

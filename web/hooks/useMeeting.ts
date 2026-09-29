'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createSignalingSocket, type SignalingSocket } from '@/lib/signaling/client';
import type {
  ChatMessageBroadcast,
  JoinErrorPayload,
  JoinedPayload,
  ParticipantInfo,
} from '@/lib/signaling/types';
import {
  WebRTCManager,
  type WebRTCConnectionState,
} from '@/lib/webrtc/WebRTCManager';
import { getLocalStream, MediaError } from '@/lib/webrtc/media';
import { createSpeakingDetector } from '@/lib/webrtc/speaking';

export type MeetingPhase =
  | 'idle'
  | 'connecting'
  | 'waiting' // in room, waiting for peer
  | 'connected'
  | 'reconnecting'
  | 'ended'
  | 'error';

export interface ChatMessage {
  id: string;
  socketId: string;
  displayName: string;
  text: string;
  timestamp: number;
  self: boolean;
}

export interface MeetingErrorState {
  title: string;
  message: string;
  code?: string;
}

export interface UseMeetingOptions {
  roomId: string;
  displayName: string;
  initialStream: MediaStream | null;
  audioDeviceId?: string;
  videoDeviceId?: string;
  startWithAudio: boolean;
  startWithVideo: boolean;
}

export interface UseMeetingResult {
  phase: MeetingPhase;
  connectionState: WebRTCConnectionState;
  error: MeetingErrorState | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  peer: ParticipantInfo | null;
  audioEnabled: boolean;
  videoEnabled: boolean;
  isScreenSharing: boolean;
  remoteScreenSharing: boolean;
  localSpeaking: boolean;
  remoteSpeaking: boolean;
  facingMode: 'user' | 'environment';
  messages: ChatMessage[];
  unreadCount: number;
  sendMessage: (text: string) => void;
  markChatRead: (open: boolean) => void;
  toggleAudio: () => void;
  toggleVideo: () => void;
  toggleScreenShare: () => Promise<void>;
  switchAudioDevice: (deviceId: string) => Promise<void>;
  switchVideoDevice: (deviceId: string) => Promise<void>;
  flipCamera: () => Promise<void>;
  leave: () => void;
}

/**
 * Orchestrates the full meeting lifecycle: connects the signaling socket,
 * joins the room, wires up the WebRTCManager, and exposes media controls to
 * the UI. All heavy WebRTC logic lives in WebRTCManager; this hook is glue.
 */
export function useMeeting(opts: UseMeetingOptions): UseMeetingResult {
  const {
    roomId,
    displayName,
    initialStream,
    startWithAudio,
    startWithVideo,
  } = opts;

  const [phase, setPhase] = useState<MeetingPhase>('idle');
  const [connectionState, setConnectionState] =
    useState<WebRTCConnectionState>('new');
  const [error, setError] = useState<MeetingErrorState | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(
    initialStream,
  );
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [peer, setPeer] = useState<ParticipantInfo | null>(null);
  const [audioEnabled, setAudioEnabled] = useState(startWithAudio);
  const [videoEnabled, setVideoEnabled] = useState(startWithVideo);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [remoteScreenSharing, setRemoteScreenSharing] = useState(false);
  const [localSpeaking, setLocalSpeaking] = useState(false);
  const [remoteSpeaking, setRemoteSpeaking] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const socketRef = useRef<SignalingSocket | null>(null);
  const managerRef = useRef<WebRTCManager | null>(null);
  const leftRef = useRef(false);
  const localSpeakingCleanupRef = useRef<(() => void) | null>(null);
  const remoteSpeakingCleanupRef = useRef<(() => void) | null>(null);
  const chatOpenRef = useRef(false);
  const devicesRef = useRef({
    audioDeviceId: opts.audioDeviceId,
    videoDeviceId: opts.videoDeviceId,
  });
  const facingModeRef = useRef<'user' | 'environment'>('user');

  const leave = useCallback(() => {
    if (leftRef.current) return;
    leftRef.current = true;

    localSpeakingCleanupRef.current?.();
    remoteSpeakingCleanupRef.current?.();

    const socket = socketRef.current;
    if (socket) {
      socket.emit('leave-room', { roomId });
      socket.disconnect();
    }
    managerRef.current?.close();
    managerRef.current = null;

    // Stop the local stream last so preview elements clear cleanly.
    localStream?.getTracks().forEach((t) => t.stop());

    setPhase('ended');
  }, [roomId, localStream]);

  useEffect(() => {
    if (!initialStream) {
      setError({
        title: 'No media available',
        message: 'Could not access your camera or microphone.',
      });
      setPhase('error');
      return;
    }

    // Apply the initial enabled state from the pre-join screen.
    initialStream.getAudioTracks().forEach((t) => (t.enabled = startWithAudio));
    initialStream.getVideoTracks().forEach((t) => (t.enabled = startWithVideo));

    const socket = createSignalingSocket();
    socketRef.current = socket;
    setPhase('connecting');

    const manager = new WebRTCManager(socket, roomId, {
      onRemoteStream: (stream) => {
        setRemoteStream(stream);
        // Attach a speaking detector to the remote stream.
        remoteSpeakingCleanupRef.current?.();
        remoteSpeakingCleanupRef.current = createSpeakingDetector(
          stream,
          (speaking) => setRemoteSpeaking(speaking),
        );
      },
      onConnectionStateChange: (state) => {
        setConnectionState(state);
        if (state === 'connected') setPhase('connected');
        else if (state === 'reconnecting') setPhase('reconnecting');
        else if (state === 'failed') {
          setError({
            title: 'Connection lost',
            message:
              'Connection lost. This network may be blocking peer-to-peer connectivity. Please refresh or rejoin.',
          });
          setPhase('error');
        }
      },
      onRemoteScreenShare: (sharing) => setRemoteScreenSharing(sharing),
      onError: (message) =>
        setError({ title: 'Connection error', message }),
    });
    manager.setLocalStream(initialStream);
    managerRef.current = manager;

    // Detect when the local user is speaking (for the "you" indicator).
    localSpeakingCleanupRef.current = createSpeakingDetector(
      initialStream,
      (speaking) => setLocalSpeaking(speaking),
    );

    const onConnect = () => {
      socket.emit('join-room', { roomId, displayName });
    };

    const onJoined = (payload: JoinedPayload) => {
      setPeer(payload.peer);
      manager.start(payload.isInitiator);
      // If a peer is already present the connection will negotiate; otherwise
      // wait for participant-joined.
      setPhase(payload.peer ? 'connecting' : 'waiting');
    };

    const onJoinError = (payload: JoinErrorPayload) => {
      const titleMap: Record<string, string> = {
        'room-full': 'Meeting is full',
        'invalid-room': 'Invalid meeting link',
        'not-found': 'Meeting not found',
      };
      setError({
        title: titleMap[payload.code] ?? 'Unable to join',
        message: payload.message,
        code: payload.code,
      });
      setPhase('error');
    };

    const onParticipantJoined = (p: ParticipantInfo) => {
      setPeer(p);
      setPhase('connecting');
      // We are the initiator (already in the room). Kick off negotiation now
      // that a peer is present. Offers are suppressed while alone, so this is
      // what actually starts the WebRTC handshake.
      manager.notifyPeerJoined();
    };

    const onParticipantLeft = () => {
      setPeer(null);
      setRemoteStream(null);
      setRemoteScreenSharing(false);
      setRemoteSpeaking(false);
      remoteSpeakingCleanupRef.current?.();
      remoteSpeakingCleanupRef.current = null;
      setPhase('waiting');
    };

    const onChatMessage = (payload: ChatMessageBroadcast) => {
      const self = payload.socketId === socket.id;
      setMessages((prev) => [
        ...prev,
        {
          id: `${payload.socketId}-${payload.timestamp}-${prev.length}`,
          socketId: payload.socketId,
          displayName: payload.displayName,
          text: payload.text,
          timestamp: payload.timestamp,
          self,
        },
      ]);
      // Count unread only for incoming messages while the panel is closed.
      if (!self && !chatOpenRef.current) {
        setUnreadCount((n) => n + 1);
      }
    };

    socket.on('connect', onConnect);
    socket.on('joined', onJoined);
    socket.on('join-error', onJoinError);
    socket.on('participant-joined', onParticipantJoined);
    socket.on('participant-left', onParticipantLeft);
    socket.on('chat-message', onChatMessage);
    socket.on('connect_error', () => {
      setError({
        title: 'Server unavailable',
        message:
          'Could not reach the signaling server. Please check your connection and try again.',
      });
      setPhase('error');
    });

    socket.connect();

    return () => {
      socket.off('connect', onConnect);
      socket.off('joined', onJoined);
      socket.off('join-error', onJoinError);
      socket.off('participant-joined', onParticipantJoined);
      socket.off('participant-left', onParticipantLeft);
      socket.off('chat-message', onChatMessage);
      localSpeakingCleanupRef.current?.();
      remoteSpeakingCleanupRef.current?.();
      if (!leftRef.current) {
        manager.close();
        socket.disconnect();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleAudio = useCallback(() => {
    setAudioEnabled((prev) => {
      const next = !prev;
      managerRef.current?.toggleAudio(next);
      return next;
    });
  }, []);

  const toggleVideo = useCallback(() => {
    setVideoEnabled((prev) => {
      const next = !prev;
      managerRef.current?.toggleVideo(next);
      return next;
    });
  }, []);

  const sendMessage = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      socketRef.current?.emit('chat-message', { roomId, text: trimmed });
    },
    [roomId],
  );

  const markChatRead = useCallback((open: boolean) => {
    chatOpenRef.current = open;
    if (open) setUnreadCount(0);
  }, []);

  const toggleScreenShare = useCallback(async () => {
    const manager = managerRef.current;
    if (!manager) return;
    try {
      if (manager.isSharingScreen()) {
        await manager.stopScreenShare();
        setIsScreenSharing(false);
      } else {
        await manager.startScreenShare();
        setIsScreenSharing(true);
        // Reflect the automatic stop (browser "Stop sharing" bar) in UI.
        const poll = setInterval(() => {
          if (!manager.isSharingScreen()) {
            setIsScreenSharing(false);
            clearInterval(poll);
          }
        }, 500);
      }
    } catch (err) {
      if (err instanceof MediaError && err.kind === 'permission-dismissed') {
        // User cancelled the picker — not an error.
        return;
      }
      const message =
        err instanceof MediaError
          ? err.message
          : "Screen sharing isn't supported on this device or browser.";
      setError({ title: 'Screen sharing', message });
    }
  }, []);

  const switchAudioDevice = useCallback(async (deviceId: string) => {
    const manager = managerRef.current;
    if (!manager) return;
    devicesRef.current.audioDeviceId = deviceId;
    const { stream } = await getLocalStream({
      audio: true,
      video: false,
      audioDeviceId: deviceId,
    });
    const track = stream.getAudioTracks()[0];
    if (track) {
      track.enabled = audioEnabled;
      await manager.replaceTrack(track);
    }
  }, [audioEnabled]);

  const switchVideoDevice = useCallback(async (deviceId: string) => {
    const manager = managerRef.current;
    if (!manager) return;
    devicesRef.current.videoDeviceId = deviceId;
    const { stream } = await getLocalStream({
      audio: false,
      video: true,
      videoDeviceId: deviceId,
    });
    const track = stream.getVideoTracks()[0];
    if (track) {
      track.enabled = videoEnabled;
      // If currently screen sharing, stash for restore; else replace live.
      if (managerRef.current?.isSharingScreen()) {
        managerRef.current.setCameraTrack(track);
      } else {
        await manager.replaceTrack(track);
      }
      setLocalStream((prev) => prev);
    }
  }, [videoEnabled]);

  // Flip between front/back camera on mobile without needing a device list
  // (labels are often blank on mobile, making the dropdown unusable).
  const flipCamera = useCallback(async () => {
    const manager = managerRef.current;
    if (!manager) return;
    const next = facingModeRef.current === 'user' ? 'environment' : 'user';
    let acquired: MediaStream | null = null;
    try {
      const { stream } = await getLocalStream({
        audio: false,
        video: true,
        videoFacingMode: next,
      });
      acquired = stream;
    } catch {
      setError({
        title: 'Camera',
        message: 'Could not switch camera. Your device may have only one.',
      });
      return;
    }
    const track = acquired.getVideoTracks()[0];
    if (!track) return;
    facingModeRef.current = next;
    setFacingMode(next);
    devicesRef.current.videoDeviceId = track.getSettings().deviceId;
    track.enabled = videoEnabled;
    if (manager.isSharingScreen()) {
      manager.setCameraTrack(track);
    } else {
      await manager.replaceTrack(track);
    }
    // Re-attach local speaking detector? Audio unchanged, so skip. Refresh
    // the preview by nudging state.
    setLocalStream((prev) => prev);
  }, [videoEnabled]);

  // Handle page/tab visibility: pause outbound video when hidden on mobile is
  // left to the browser; we simply keep tracks intact per spec.

  useEffect(() => {
    const handleUnload = () => leave();
    window.addEventListener('pagehide', handleUnload);
    return () => window.removeEventListener('pagehide', handleUnload);
  }, [leave]);

  return {
    phase,
    connectionState,
    error,
    localStream,
    remoteStream,
    peer,
    audioEnabled,
    videoEnabled,
    isScreenSharing,
    remoteScreenSharing,
    localSpeaking,
    remoteSpeaking,
    facingMode,
    messages,
    unreadCount,
    sendMessage,
    markChatRead,
    toggleAudio,
    toggleVideo,
    toggleScreenShare,
    switchAudioDevice,
    switchVideoDevice,
    flipCamera,
    leave,
  };
}

'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MonitorUp } from 'lucide-react';
import { ParticipantVideo } from '@/components/ParticipantVideo';
import { MeetingControls } from '@/components/MeetingControls';
import { ConnectionStatus } from '@/components/ConnectionStatus';
import { DeviceSelector } from '@/components/DeviceSelector';
import { PermissionError } from '@/components/PermissionError';
import { ChatPanel } from '@/components/ChatPanel';
import { Button } from '@/components/ui/Button';
import { ToastContainer, useToasts } from '@/components/Toast';
import { useMeeting } from '@/hooks/useMeeting';
import { listDevices, type DeviceList } from '@/lib/webrtc/devices';
import { getCapabilities, isMobile } from '@/lib/capabilities';
import type { PreJoinResult } from '@/components/PreJoinScreen';

interface MeetingRoomProps {
  roomId: string;
  prejoin: PreJoinResult;
  onEnded: () => void;
}

/**
 * The live meeting view. Owns the useMeeting hook, renders remote video full
 * bleed with a floating local preview, the control bar, connection status and
 * a settings drawer for switching devices mid-call.
 */
export function MeetingRoom({ roomId, prejoin, onEnded }: MeetingRoomProps) {
  const router = useRouter();
  const { toasts, push } = useToasts();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [devices, setDevices] = useState<DeviceList>({
    audioInputs: [],
    videoInputs: [],
  });
  const [audioDeviceId, setAudioDeviceId] = useState(prejoin.audioDeviceId);
  const [videoDeviceId, setVideoDeviceId] = useState(prejoin.videoDeviceId);

  const caps = useMemo(
    () => (typeof window !== 'undefined' ? getCapabilities() : null),
    [],
  );
  const mobile = useMemo(
    () => (typeof window !== 'undefined' ? isMobile() : false),
    [],
  );

  const {
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
  } = useMeeting({
    roomId,
    displayName: prejoin.displayName,
    initialStream: prejoin.stream,
    audioDeviceId: prejoin.audioDeviceId,
    videoDeviceId: prejoin.videoDeviceId,
    startWithAudio: prejoin.audioEnabled,
    startWithVideo: prejoin.videoEnabled,
  });

  const prevPeer = useRef<string | null>(null);
  const prevRemoteShare = useRef(false);

  // Toast on peer join/leave.
  useEffect(() => {
    if (peer && prevPeer.current !== peer.socketId) {
      push(`${peer.displayName} joined`);
      prevPeer.current = peer.socketId;
    } else if (!peer && prevPeer.current) {
      push('Participant left');
      prevPeer.current = null;
    }
  }, [peer, push]);

  // Toast on remote screen share.
  useEffect(() => {
    if (remoteScreenSharing && !prevRemoteShare.current) {
      push(`${peer?.displayName ?? 'The other participant'} is sharing their screen`);
    }
    prevRemoteShare.current = remoteScreenSharing;
  }, [remoteScreenSharing, peer, push]);

  useEffect(() => {
    if (isScreenSharing) push('Your screen is being shared');
  }, [isScreenSharing, push]);

  useEffect(() => {
    if (phase === 'ended') onEnded();
  }, [phase, onEnded]);

  useEffect(() => {
    markChatRead(chatOpen);
  }, [chatOpen, markChatRead]);

  useEffect(() => {
    void listDevices().then(setDevices);
  }, [settingsOpen]);

  if (phase === 'error' && error) {
    return (
      <main className="min-h-screen grid place-items-center px-6">
        <div className="space-y-4 text-center">
          <PermissionError title={error.title} message={error.message} />
          <div className="flex gap-3 justify-center">
            <Button variant="secondary" onClick={() => router.push('/')}>
              Go home
            </Button>
            <Button onClick={() => window.location.reload()}>Rejoin</Button>
          </div>
        </div>
      </main>
    );
  }

  const waiting = phase === 'waiting' || (phase === 'connecting' && !peer);

  return (
    <main className="relative h-[100dvh] w-full overflow-hidden bg-surface">
      <ToastContainer toasts={toasts} />

      {/* Header */}
      <div className="absolute top-0 inset-x-0 z-20 p-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm font-medium text-slate-300 font-mono glass rounded-lg px-2 py-1 shrink-0">
            {roomId}
          </span>
          {peer && (
            <span className="text-sm text-slate-200 glass rounded-full px-3 py-1 truncate max-w-[9rem] sm:max-w-none">
              {peer.displayName}
            </span>
          )}
          {isScreenSharing && (
            <span className="hidden sm:inline-flex items-center gap-1.5 text-xs text-emerald-400 glass rounded-full px-3 py-1 shrink-0">
              <MonitorUp className="w-3.5 h-3.5" aria-hidden="true" /> Sharing your
              screen
            </span>
          )}
        </div>
        <ConnectionStatus state={connectionState} waiting={waiting} />
      </div>

      {/* Remote video (full bleed) */}
      <div className="absolute inset-0">
        {remoteStream && peer ? (
          <ParticipantVideo
            stream={remoteStream}
            name={peer.displayName}
            className="w-full h-full"
            videoEnabled
            audioEnabled
            speaking={remoteSpeaking}
          />
        ) : (
          <div className="w-full h-full grid place-items-center text-center px-6">
            <div className="max-w-sm">
              <div className="w-16 h-16 rounded-full glass grid place-items-center mx-auto mb-4">
                <span className="text-2xl">👋</span>
              </div>
              <h2 className="text-lg font-medium">
                {peer
                  ? `Connecting to ${peer.displayName}…`
                  : waiting
                    ? 'Waiting for the other participant'
                    : 'Connecting…'}
              </h2>
              <p className="text-sm text-slate-400 mt-1">
                Share the meeting link so someone can join.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Local floating preview */}
      <div className="absolute z-20 bottom-24 right-4 sm:bottom-28 sm:right-6 w-28 sm:w-44 aspect-[3/4] sm:aspect-video rounded-2xl overflow-hidden shadow-glass border border-white/10">
        <ParticipantVideo
          stream={localStream}
          name={`${prejoin.displayName} (you)`}
          muted
          mirror={!isScreenSharing && facingMode === 'user'}
          isLocal
          videoEnabled={videoEnabled || isScreenSharing}
          audioEnabled={audioEnabled}
          speaking={localSpeaking}
          className="w-full h-full"
        />
      </div>

      {/* Controls */}
      <div className="absolute bottom-0 inset-x-0 z-20 p-4 pb-6 safe-bottom">
        <MeetingControls
          audioEnabled={audioEnabled}
          videoEnabled={videoEnabled}
          isScreenSharing={isScreenSharing}
          screenShareSupported={!!caps?.screenShare}
          showFlipCamera={mobile}
          unreadCount={unreadCount}
          onToggleAudio={toggleAudio}
          onToggleVideo={toggleVideo}
          onToggleScreenShare={() => void toggleScreenShare()}
          onFlipCamera={() => void flipCamera()}
          onOpenSettings={() => setSettingsOpen(true)}
          onToggleChat={() => setChatOpen((v) => !v)}
          onLeave={leave}
        />
      </div>

      {/* Chat panel */}
      <ChatPanel
        open={chatOpen}
        messages={messages}
        peerName={peer?.displayName}
        onClose={() => setChatOpen(false)}
        onSend={sendMessage}
      />

      {/* Settings drawer */}
      {settingsOpen && (
        <div
          className="absolute inset-0 z-30 bg-black/50 flex items-end sm:items-center sm:justify-center"
          onClick={() => setSettingsOpen(false)}
        >
          <div
            className="glass w-full sm:max-w-sm sm:rounded-3xl rounded-t-3xl p-6 animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-semibold mb-4">Device settings</h2>
            <DeviceSelector
              audioInputs={devices.audioInputs}
              videoInputs={devices.videoInputs}
              selectedAudioId={audioDeviceId}
              selectedVideoId={videoDeviceId}
              onAudioChange={(id) => {
                setAudioDeviceId(id);
                void switchAudioDevice(id);
              }}
              onVideoChange={(id) => {
                setVideoDeviceId(id);
                void switchVideoDevice(id);
              }}
            />
            <Button
              variant="secondary"
              className="w-full mt-5"
              onClick={() => setSettingsOpen(false)}
            >
              Done
            </Button>
          </div>
        </div>
      )}
    </main>
  );
}

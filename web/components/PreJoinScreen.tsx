'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Mic, MicOff, Video, VideoOff } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { DeviceSelector } from '@/components/DeviceSelector';
import { PermissionError } from '@/components/PermissionError';
import { getLocalStream, MediaError, stopStream } from '@/lib/webrtc/media';
import { listDevices, onDeviceChange, type DeviceList } from '@/lib/webrtc/devices';
import { getCapabilities } from '@/lib/capabilities';

export interface PreJoinResult {
  stream: MediaStream;
  displayName: string;
  audioEnabled: boolean;
  videoEnabled: boolean;
  audioDeviceId?: string;
  videoDeviceId?: string;
}

interface PreJoinScreenProps {
  roomId: string;
  onJoin: (result: PreJoinResult) => void;
}

/**
 * Device-check screen: shows a local camera preview, lets the user toggle
 * mic/camera, pick devices and set a display name before entering the room.
 */
export function PreJoinScreen({ roomId, onJoin }: PreJoinScreenProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  // Set when the stream is handed off to the meeting so unmount cleanup does
  // not stop the tracks that are now in use by the live call.
  const handedOffRef = useRef(false);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [devices, setDevices] = useState<DeviceList>({
    audioInputs: [],
    videoInputs: [],
  });
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioDeviceId, setAudioDeviceId] = useState<string | undefined>();
  const [videoDeviceId, setVideoDeviceId] = useState<string | undefined>();
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<{ title: string; message: string } | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [audioOnly, setAudioOnly] = useState(false);

  const caps = typeof window !== 'undefined' ? getCapabilities() : null;

  const acquire = useCallback(
    async (audioId?: string, videoId?: string) => {
      setLoading(true);
      setError(null);
      try {
        const { stream: s, hasVideo } = await getLocalStream({
          audio: true,
          video: true,
          audioDeviceId: audioId,
          videoDeviceId: videoId,
        });
        // Stop the previous stream before swapping.
        stopStream(streamRef.current);
        streamRef.current = s;
        setStream(s);
        setAudioOnly(!hasVideo);
        setVideoEnabled(hasVideo);

        const list = await listDevices();
        setDevices(list);
        const a = s.getAudioTracks()[0]?.getSettings().deviceId;
        const v = s.getVideoTracks()[0]?.getSettings().deviceId;
        if (a) setAudioDeviceId(a);
        if (v) setVideoDeviceId(v);
      } catch (err) {
        const me = err as MediaError;
        setError({
          title:
            me.kind === 'permission-denied'
              ? 'Access blocked'
              : me.kind === 'not-found'
                ? 'No devices found'
                : 'Cannot access media',
          message: me.message,
        });
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (!caps?.webrtc) {
      setError({
        title: 'Browser not supported',
        message:
          'This browser does not support WebRTC. Please use a recent version of Chrome, Edge, Firefox or Safari.',
      });
      setLoading(false);
      return;
    }
    void acquire();
    const cleanup = onDeviceChange(() => {
      void listDevices().then(setDevices);
    });
    return () => {
      cleanup();
      // Do not stop tracks that were handed off to the live meeting.
      if (!handedOffRef.current) {
        stopStream(streamRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const el = videoRef.current;
    if (el && el.srcObject !== stream) {
      el.srcObject = stream;
    }
  }, [stream]);

  useEffect(() => {
    stream?.getAudioTracks().forEach((t) => (t.enabled = audioEnabled));
  }, [audioEnabled, stream]);

  useEffect(() => {
    stream?.getVideoTracks().forEach((t) => (t.enabled = videoEnabled));
  }, [videoEnabled, stream]);

  const handleJoin = () => {
    if (!streamRef.current) return;
    // Mark the stream as owned by the meeting so cleanup does not kill it.
    handedOffRef.current = true;
    onJoin({
      stream: streamRef.current,
      displayName: displayName.trim() || 'Guest',
      audioEnabled,
      videoEnabled,
      audioDeviceId,
      videoDeviceId,
    });
  };

  if (error && !stream) {
    return (
      <main className="min-h-screen grid place-items-center px-6">
        <div className="space-y-4">
          <PermissionError
            title={error.title}
            message={error.message}
            onRetry={() => acquire(audioDeviceId, videoDeviceId)}
          />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-10">
      <div className="w-full max-w-4xl grid lg:grid-cols-[1.4fr_1fr] gap-6 items-stretch">
        <div className="relative rounded-3xl overflow-hidden bg-surface-raised aspect-video">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover scale-x-[-1] ${
              videoEnabled && !audioOnly ? '' : 'invisible'
            }`}
          />
          {(!videoEnabled || audioOnly) && (
            <div className="absolute inset-0 grid place-items-center text-slate-400">
              <div className="text-center">
                <VideoOff className="w-10 h-10 mx-auto mb-2" aria-hidden="true" />
                <p className="text-sm">
                  {audioOnly ? 'Audio-only — no camera detected' : 'Camera is off'}
                </p>
              </div>
            </div>
          )}
          {loading && (
            <div className="absolute inset-0 grid place-items-center bg-surface/60 text-sm text-slate-300">
              Loading camera…
            </div>
          )}

          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-3">
            <button
              onClick={() => setAudioEnabled((v) => !v)}
              aria-label={audioEnabled ? 'Mute microphone' : 'Unmute microphone'}
              aria-pressed={!audioEnabled}
              className={`w-11 h-11 rounded-full grid place-items-center transition-colors ${
                audioEnabled ? 'glass hover:bg-white/10' : 'bg-red-500 hover:bg-red-600'
              }`}
            >
              {audioEnabled ? (
                <Mic className="w-5 h-5" aria-hidden="true" />
              ) : (
                <MicOff className="w-5 h-5 text-white" aria-hidden="true" />
              )}
            </button>
            <button
              onClick={() => setVideoEnabled((v) => !v)}
              disabled={audioOnly}
              aria-label={videoEnabled ? 'Turn off camera' : 'Turn on camera'}
              aria-pressed={!videoEnabled}
              className={`w-11 h-11 rounded-full grid place-items-center transition-colors disabled:opacity-40 ${
                videoEnabled ? 'glass hover:bg-white/10' : 'bg-red-500 hover:bg-red-600'
              }`}
            >
              {videoEnabled ? (
                <Video className="w-5 h-5" aria-hidden="true" />
              ) : (
                <VideoOff className="w-5 h-5 text-white" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>

        <div className="glass rounded-3xl p-6 flex flex-col">
          <h1 className="text-xl font-semibold tracking-tight">Ready to join?</h1>
          <p className="text-sm text-slate-400 mt-1">
            Meeting <span className="font-mono">{roomId}</span>
          </p>

          <div className="mt-5 space-y-4 flex-1">
            <div>
              <label htmlFor="name" className="block text-xs text-slate-400 mb-1">
                What should we call you?
              </label>
              <input
                id="name"
                type="text"
                value={displayName}
                maxLength={40}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Guest"
                className="w-full glass rounded-lg px-3 py-2 text-sm outline-none focus:border-accent placeholder:text-slate-500"
              />
            </div>

            <DeviceSelector
              audioInputs={devices.audioInputs}
              videoInputs={devices.videoInputs}
              selectedAudioId={audioDeviceId}
              selectedVideoId={videoDeviceId}
              disableVideo={audioOnly}
              onAudioChange={(id) => {
                setAudioDeviceId(id);
                void acquire(id, videoDeviceId);
              }}
              onVideoChange={(id) => {
                setVideoDeviceId(id);
                void acquire(audioDeviceId, id);
              }}
            />

            {error && (
              <p className="text-xs text-amber-400" role="alert">
                {error.message}
              </p>
            )}
          </div>

          <Button
            className="w-full mt-5"
            size="lg"
            disabled={!stream || loading}
            onClick={handleJoin}
          >
            Join Meeting
          </Button>
        </div>
      </div>
    </main>
  );
}

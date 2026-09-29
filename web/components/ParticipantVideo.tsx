'use client';

import { useEffect, useRef } from 'react';
import { MicOff, VideoOff, User } from 'lucide-react';

interface ParticipantVideoProps {
  stream: MediaStream | null;
  name: string;
  muted?: boolean;
  mirror?: boolean;
  isLocal?: boolean;
  videoEnabled?: boolean;
  audioEnabled?: boolean;
  speaking?: boolean;
  className?: string;
}

/**
 * Renders a MediaStream into a video element. Used for both the remote
 * participant (full screen) and the local floating preview.
 */
export function ParticipantVideo({
  stream,
  name,
  muted = false,
  mirror = false,
  videoEnabled = true,
  audioEnabled = true,
  speaking = false,
  className = '',
}: ParticipantVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = videoRef.current;
    if (el && el.srcObject !== stream) {
      el.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className={`relative overflow-hidden bg-surface-raised ${className}`}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={muted}
        className={`w-full h-full object-cover ${mirror ? 'scale-x-[-1]' : ''} ${
          videoEnabled ? '' : 'invisible'
        }`}
      />

      {/* Speaking highlight ring. */}
      {speaking && audioEnabled && (
        <div
          className="absolute inset-0 rounded-[inherit] ring-2 ring-emerald-400 ring-inset pointer-events-none animate-pulse"
          aria-hidden="true"
        />
      )}

      {!videoEnabled && (
        <div className="absolute inset-0 grid place-items-center">
          <div className="flex flex-col items-center gap-2 text-slate-400">
            <div
              className={`w-16 h-16 rounded-full grid place-items-center transition-shadow ${
                speaking && audioEnabled
                  ? 'bg-emerald-500/20 shadow-[0_0_0_3px_rgba(52,211,153,0.6)]'
                  : 'bg-white/10'
              }`}
            >
              <User className="w-8 h-8" aria-hidden="true" />
            </div>
            <span className="text-sm">{name}</span>
          </div>
        </div>
      )}

      <div className="absolute bottom-2 left-2 flex items-center gap-1.5 glass rounded-lg px-2 py-1">
        {!audioEnabled && (
          <MicOff className="w-3.5 h-3.5 text-red-400" aria-label="Microphone off" />
        )}
        {!videoEnabled && (
          <VideoOff className="w-3.5 h-3.5 text-red-400" aria-label="Camera off" />
        )}
        {speaking && audioEnabled && (
          <span className="flex items-end gap-[2px] h-3" aria-label="Speaking">
            <span className="w-[3px] bg-emerald-400 rounded-full animate-[pulse_0.8s_ease-in-out_infinite] h-1.5" />
            <span className="w-[3px] bg-emerald-400 rounded-full animate-[pulse_0.8s_ease-in-out_infinite_0.2s] h-3" />
            <span className="w-[3px] bg-emerald-400 rounded-full animate-[pulse_0.8s_ease-in-out_infinite_0.4s] h-2" />
          </span>
        )}
        <span className="text-xs text-slate-200 truncate max-w-[8rem]">{name}</span>
      </div>
    </div>
  );
}

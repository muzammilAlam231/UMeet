'use client';

import type { WebRTCConnectionState } from '@/lib/webrtc/WebRTCManager';
import { Loader2, Wifi, WifiOff } from 'lucide-react';

interface ConnectionStatusProps {
  state: WebRTCConnectionState;
  waiting: boolean;
}

/** Small status pill shown in the meeting header. */
export function ConnectionStatus({ state, waiting }: ConnectionStatusProps) {
  let label = 'Connecting…';
  let icon = <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />;
  let tone = 'text-slate-300';

  if (waiting) {
    label = 'Waiting for the other participant…';
    icon = <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />;
  } else if (state === 'connected') {
    label = 'Connected';
    icon = <Wifi className="w-3.5 h-3.5" aria-hidden="true" />;
    tone = 'text-emerald-400';
  } else if (state === 'reconnecting') {
    label = 'Reconnecting…';
    icon = <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />;
    tone = 'text-amber-400';
  } else if (state === 'failed' || state === 'closed') {
    label = 'Connection lost';
    icon = <WifiOff className="w-3.5 h-3.5" aria-hidden="true" />;
    tone = 'text-red-400';
  }

  return (
    <div
      className={`inline-flex items-center gap-2 glass rounded-full px-3 py-1 text-xs ${tone}`}
      role="status"
      aria-live="polite"
    >
      {icon}
      {label}
    </div>
  );
}

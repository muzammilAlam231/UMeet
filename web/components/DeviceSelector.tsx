'use client';

import { Mic, Video } from 'lucide-react';
import type { MediaDeviceOption } from '@/lib/webrtc/devices';

interface DeviceSelectorProps {
  audioInputs: MediaDeviceOption[];
  videoInputs: MediaDeviceOption[];
  selectedAudioId?: string;
  selectedVideoId?: string;
  onAudioChange: (deviceId: string) => void;
  onVideoChange: (deviceId: string) => void;
  disableVideo?: boolean;
}

/** Dropdowns for selecting microphone and camera input devices. */
export function DeviceSelector({
  audioInputs,
  videoInputs,
  selectedAudioId,
  selectedVideoId,
  onAudioChange,
  onVideoChange,
  disableVideo = false,
}: DeviceSelectorProps) {
  return (
    <div className="space-y-3">
      <div>
        <label
          htmlFor="mic-select"
          className="flex items-center gap-2 text-xs text-slate-400 mb-1"
        >
          <Mic className="w-3.5 h-3.5" aria-hidden="true" /> Microphone
        </label>
        <select
          id="mic-select"
          value={selectedAudioId}
          onChange={(e) => onAudioChange(e.target.value)}
          className="w-full glass rounded-lg px-3 py-2 text-sm outline-none focus:border-accent"
          disabled={audioInputs.length === 0}
        >
          {audioInputs.length === 0 && <option>No microphone found</option>}
          {audioInputs.map((d) => (
            <option key={d.deviceId} value={d.deviceId}>
              {d.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label
          htmlFor="cam-select"
          className="flex items-center gap-2 text-xs text-slate-400 mb-1"
        >
          <Video className="w-3.5 h-3.5" aria-hidden="true" /> Camera
        </label>
        <select
          id="cam-select"
          value={selectedVideoId}
          onChange={(e) => onVideoChange(e.target.value)}
          className="w-full glass rounded-lg px-3 py-2 text-sm outline-none focus:border-accent disabled:opacity-50"
          disabled={disableVideo || videoInputs.length === 0}
        >
          {videoInputs.length === 0 && <option>No camera found</option>}
          {videoInputs.map((d) => (
            <option key={d.deviceId} value={d.deviceId}>
              {d.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

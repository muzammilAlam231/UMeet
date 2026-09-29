'use client';

import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  MonitorUp,
  MonitorX,
  PhoneOff,
  Settings,
  MessageSquare,
  SwitchCamera,
} from 'lucide-react';

interface MeetingControlsProps {
  audioEnabled: boolean;
  videoEnabled: boolean;
  isScreenSharing: boolean;
  screenShareSupported: boolean;
  showFlipCamera?: boolean;
  unreadCount?: number;
  onToggleAudio: () => void;
  onToggleVideo: () => void;
  onToggleScreenShare: () => void;
  onFlipCamera?: () => void;
  onOpenSettings: () => void;
  onToggleChat: () => void;
  onLeave: () => void;
}

interface ControlButtonProps {
  label: string;
  active?: boolean;
  danger?: boolean;
  disabled?: boolean;
  badge?: number;
  onClick: () => void;
  children: React.ReactNode;
}

function ControlButton({
  label,
  active = false,
  danger = false,
  disabled = false,
  badge = 0,
  onClick,
  children,
}: ControlButtonProps) {
  const base =
    'relative group w-12 h-12 sm:w-14 sm:h-14 rounded-full grid place-items-center transition-colors focus-visible:outline-none disabled:opacity-40 disabled:cursor-not-allowed';
  const style = danger
    ? 'bg-red-500 hover:bg-red-600 text-white'
    : active
      ? 'bg-white/10 hover:bg-white/15 text-white'
      : 'bg-red-500 hover:bg-red-600 text-white';
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`${base} ${style}`}
    >
      {children}
      {badge > 0 && (
        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-accent text-white text-[10px] font-semibold grid place-items-center">
          {badge > 9 ? '9+' : badge}
        </span>
      )}
      <span className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-black/80 px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100">
        {label}
      </span>
    </button>
  );
}

/** Bottom control bar for the meeting room. */
export function MeetingControls({
  audioEnabled,
  videoEnabled,
  isScreenSharing,
  screenShareSupported,
  showFlipCamera = false,
  unreadCount = 0,
  onToggleAudio,
  onToggleVideo,
  onToggleScreenShare,
  onFlipCamera,
  onOpenSettings,
  onToggleChat,
  onLeave,
}: MeetingControlsProps) {
  return (
    <div className="flex items-center justify-center gap-2 sm:gap-3">
      <ControlButton
        label={audioEnabled ? 'Mute microphone' : 'Unmute microphone'}
        active={audioEnabled}
        onClick={onToggleAudio}
      >
        {audioEnabled ? (
          <Mic className="w-5 h-5" aria-hidden="true" />
        ) : (
          <MicOff className="w-5 h-5" aria-hidden="true" />
        )}
      </ControlButton>

      <ControlButton
        label={videoEnabled ? 'Turn off camera' : 'Turn on camera'}
        active={videoEnabled}
        onClick={onToggleVideo}
      >
        {videoEnabled ? (
          <Video className="w-5 h-5" aria-hidden="true" />
        ) : (
          <VideoOff className="w-5 h-5" aria-hidden="true" />
        )}
      </ControlButton>

      <ControlButton
        label={
          !screenShareSupported
            ? "Screen sharing isn't supported on this device or browser"
            : isScreenSharing
              ? 'Stop sharing'
              : 'Share screen'
        }
        active={!isScreenSharing}
        disabled={!screenShareSupported}
        onClick={onToggleScreenShare}
      >
        {isScreenSharing ? (
          <MonitorX className="w-5 h-5" aria-hidden="true" />
        ) : (
          <MonitorUp className="w-5 h-5" aria-hidden="true" />
        )}
      </ControlButton>

      {showFlipCamera && onFlipCamera && (
        <ControlButton
          label="Flip camera"
          active
          disabled={!videoEnabled}
          onClick={onFlipCamera}
        >
          <SwitchCamera className="w-5 h-5" aria-hidden="true" />
        </ControlButton>
      )}

      <ControlButton
        label="Chat"
        active
        badge={unreadCount}
        onClick={onToggleChat}
      >
        <MessageSquare className="w-5 h-5" aria-hidden="true" />
      </ControlButton>

      <ControlButton label="Settings" active onClick={onOpenSettings}>
        <Settings className="w-5 h-5" aria-hidden="true" />
      </ControlButton>

      <ControlButton label="Leave meeting" danger onClick={onLeave}>
        <PhoneOff className="w-5 h-5" aria-hidden="true" />
      </ControlButton>
    </div>
  );
}

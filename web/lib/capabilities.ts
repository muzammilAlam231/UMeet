/**
 * Browser capability detection. All checks are defensive so the app never
 * throws when an API is missing on a given platform (notably iOS Safari).
 */

export function supportsWebRTC(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.RTCPeerConnection !== 'undefined'
  );
}

export function supportsMediaDevices(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    !!navigator.mediaDevices &&
    typeof navigator.mediaDevices.getUserMedia === 'function'
  );
}

export function supportsCamera(): boolean {
  return supportsMediaDevices();
}

export function supportsMicrophone(): boolean {
  return supportsMediaDevices();
}

export function supportsScreenShare(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    !!navigator.mediaDevices &&
    typeof navigator.mediaDevices.getDisplayMedia === 'function'
  );
}

/**
 * Whether getDisplayMedia is likely to provide audio. iOS Safari does not
 * support screen share at all; most desktop browsers support tab/system audio.
 */
export function supportsDisplayAudio(): boolean {
  if (!supportsScreenShare()) return false;
  // Conservatively true on desktop-class browsers; the actual call still
  // guards against a missing audio track.
  return !isIOS();
}

export function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  const iOSDevice = /iPad|iPhone|iPod/.test(ua);
  // iPadOS 13+ reports as Mac; detect touch to disambiguate.
  const iPadOS =
    navigator.platform === 'MacIntel' &&
    typeof navigator.maxTouchPoints === 'number' &&
    navigator.maxTouchPoints > 1;
  return iOSDevice || iPadOS;
}

export function isMobile(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
}

export interface CapabilityReport {
  webrtc: boolean;
  camera: boolean;
  microphone: boolean;
  screenShare: boolean;
  displayAudio: boolean;
}

export function getCapabilities(): CapabilityReport {
  return {
    webrtc: supportsWebRTC(),
    camera: supportsCamera(),
    microphone: supportsMicrophone(),
    screenShare: supportsScreenShare(),
    displayAudio: supportsDisplayAudio(),
  };
}

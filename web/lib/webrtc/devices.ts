/** Device enumeration helpers. */

export interface MediaDeviceOption {
  deviceId: string;
  label: string;
}

export interface DeviceList {
  audioInputs: MediaDeviceOption[];
  videoInputs: MediaDeviceOption[];
}

/**
 * List available input devices. Labels are only populated after the user has
 * granted permission at least once, so callers should re-enumerate post-grant.
 */
export async function listDevices(): Promise<DeviceList> {
  if (
    typeof navigator === 'undefined' ||
    !navigator.mediaDevices ||
    typeof navigator.mediaDevices.enumerateDevices !== 'function'
  ) {
    return { audioInputs: [], videoInputs: [] };
  }

  const devices = await navigator.mediaDevices.enumerateDevices();
  const audioInputs: MediaDeviceOption[] = [];
  const videoInputs: MediaDeviceOption[] = [];

  devices.forEach((d, i) => {
    if (d.kind === 'audioinput') {
      audioInputs.push({
        deviceId: d.deviceId,
        label: d.label || `Microphone ${audioInputs.length + 1}`,
      });
    } else if (d.kind === 'videoinput') {
      videoInputs.push({
        deviceId: d.deviceId,
        label: d.label || `Camera ${videoInputs.length + 1}`,
      });
    }
    void i;
  });

  return { audioInputs, videoInputs };
}

/** Subscribe to device changes (e.g. plugging in a headset). Returns cleanup. */
export function onDeviceChange(handler: () => void): () => void {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices) {
    return () => undefined;
  }
  navigator.mediaDevices.addEventListener('devicechange', handler);
  return () => navigator.mediaDevices.removeEventListener('devicechange', handler);
}

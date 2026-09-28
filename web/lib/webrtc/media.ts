/** Media acquisition helpers with graceful fallbacks. */

export interface MediaConstraintsOptions {
  audio?: boolean | MediaTrackConstraints;
  video?: boolean | MediaTrackConstraints;
  audioDeviceId?: string;
  videoDeviceId?: string;
}

export interface AcquiredMedia {
  stream: MediaStream;
  hasVideo: boolean;
  hasAudio: boolean;
}

export class MediaError extends Error {
  constructor(
    message: string,
    readonly kind:
      | 'permission-denied'
      | 'permission-dismissed'
      | 'not-found'
      | 'in-use'
      | 'unknown',
  ) {
    super(message);
    this.name = 'MediaError';
  }
}

function mapDomError(err: unknown): MediaError {
  const name = (err as DOMException)?.name ?? '';
  switch (name) {
    case 'NotAllowedError':
    case 'SecurityError':
      return new MediaError(
        'Camera/microphone access was blocked. Please allow access in your browser settings.',
        'permission-denied',
      );
    case 'NotFoundError':
    case 'OverconstrainedError':
      return new MediaError('No matching camera or microphone was found.', 'not-found');
    case 'NotReadableError':
    case 'AbortError':
      return new MediaError(
        'Your camera or microphone is already in use by another application.',
        'in-use',
      );
    default:
      return new MediaError('Could not access media devices.', 'unknown');
  }
}

function buildConstraints(opts: MediaConstraintsOptions): MediaStreamConstraints {
  const audio =
    opts.audio === false
      ? false
      : {
          ...(typeof opts.audio === 'object' ? opts.audio : {}),
          ...(opts.audioDeviceId ? { deviceId: { exact: opts.audioDeviceId } } : {}),
          echoCancellation: true,
          noiseSuppression: true,
        };

  const video =
    opts.video === false
      ? false
      : {
          ...(typeof opts.video === 'object' ? opts.video : {}),
          ...(opts.videoDeviceId ? { deviceId: { exact: opts.videoDeviceId } } : {}),
          width: { ideal: 1280 },
          height: { ideal: 720 },
        };

  return { audio, video };
}

/**
 * Acquire a local media stream. Falls back to audio-only if video fails, and
 * throws a typed MediaError only when nothing can be obtained.
 */
export async function getLocalStream(
  opts: MediaConstraintsOptions = { audio: true, video: true },
): Promise<AcquiredMedia> {
  const wantVideo = opts.video !== false;
  const wantAudio = opts.audio !== false;

  try {
    const stream = await navigator.mediaDevices.getUserMedia(buildConstraints(opts));
    return {
      stream,
      hasVideo: stream.getVideoTracks().length > 0,
      hasAudio: stream.getAudioTracks().length > 0,
    };
  } catch (err) {
    const mapped = mapDomError(err);
    // If video was the problem, retry audio-only so the user can still join.
    if (wantVideo && wantAudio && mapped.kind === 'not-found') {
      try {
        const audioOnly = await navigator.mediaDevices.getUserMedia(
          buildConstraints({ ...opts, video: false }),
        );
        return {
          stream: audioOnly,
          hasVideo: false,
          hasAudio: audioOnly.getAudioTracks().length > 0,
        };
      } catch {
        throw mapped;
      }
    }
    throw mapped;
  }
}

export interface DisplayMediaResult {
  stream: MediaStream;
  hasAudio: boolean;
}

/** Acquire a screen-share stream, requesting audio where supported. */
export async function getDisplayStream(): Promise<DisplayMediaResult> {
  if (
    !navigator.mediaDevices ||
    typeof navigator.mediaDevices.getDisplayMedia !== 'function'
  ) {
    throw new MediaError(
      "Screen sharing isn't supported on this device or browser.",
      'unknown',
    );
  }
  try {
    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: true,
      audio: true,
    });
    return { stream, hasAudio: stream.getAudioTracks().length > 0 };
  } catch (err) {
    const name = (err as DOMException)?.name ?? '';
    if (name === 'NotAllowedError' || name === 'AbortError') {
      // User cancelled the picker — treat as a soft cancel, not a fatal error.
      throw new MediaError('Screen sharing was cancelled.', 'permission-dismissed');
    }
    throw mapDomError(err);
  }
}

export function stopStream(stream: MediaStream | null | undefined): void {
  stream?.getTracks().forEach((t) => t.stop());
}

/** Active-speaker detection via the Web Audio API. */

export interface SpeakingDetectorOptions {
  /** RMS threshold (0..1) above which the stream is considered "speaking". */
  threshold?: number;
  /** Poll interval in ms. */
  intervalMs?: number;
  /** How long audio must stay below threshold before "stopped speaking". */
  silenceMs?: number;
}

/**
 * Monitors a MediaStream's audio and invokes `onChange(true|false)` as the
 * speaking state flips. Returns a cleanup function. Safe to call with a stream
 * that has no audio track (it simply never fires).
 */
export function createSpeakingDetector(
  stream: MediaStream,
  onChange: (speaking: boolean) => void,
  opts: SpeakingDetectorOptions = {},
): () => void {
  const threshold = opts.threshold ?? 0.045;
  const intervalMs = opts.intervalMs ?? 150;
  const silenceMs = opts.silenceMs ?? 600;

  if (stream.getAudioTracks().length === 0) {
    return () => undefined;
  }

  const AudioCtx =
    typeof window !== 'undefined'
      ? window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext
      : undefined;
  if (!AudioCtx) return () => undefined;

  let ctx: AudioContext;
  try {
    ctx = new AudioCtx();
  } catch {
    return () => undefined;
  }

  const source = ctx.createMediaStreamSource(stream);
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 512;
  analyser.smoothingTimeConstant = 0.3;
  source.connect(analyser);

  const buffer = new Uint8Array(analyser.fftSize);
  let speaking = false;
  let lastLoud = 0;

  const timer = setInterval(() => {
    analyser.getByteTimeDomainData(buffer);
    let sumSquares = 0;
    for (let i = 0; i < buffer.length; i++) {
      const v = (buffer[i] - 128) / 128;
      sumSquares += v * v;
    }
    const rms = Math.sqrt(sumSquares / buffer.length);
    const now = Date.now();

    if (rms >= threshold) {
      lastLoud = now;
      if (!speaking) {
        speaking = true;
        onChange(true);
      }
    } else if (speaking && now - lastLoud > silenceMs) {
      speaking = false;
      onChange(false);
    }
  }, intervalMs);

  return () => {
    clearInterval(timer);
    try {
      source.disconnect();
      analyser.disconnect();
      void ctx.close();
    } catch {
      /* noop */
    }
  };
}

'use client';

import { useEffect, useState } from 'react';

export interface ToastMessage {
  id: number;
  text: string;
}

let counter = 0;

/** Simple ephemeral toast queue for meeting events (joined/left/sharing). */
export function useToasts() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const push = (text: string) => {
    const id = ++counter;
    setToasts((prev) => [...prev, { id, text }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  };

  return { toasts, push };
}

export function ToastContainer({ toasts }: { toasts: ToastMessage[] }) {
  return (
    <div
      className="pointer-events-none fixed top-4 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2"
      aria-live="polite"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className="glass rounded-full px-4 py-2 text-sm text-slate-100 animate-fade-in shadow-glass"
        >
          {t.text}
        </div>
      ))}
    </div>
  );
}

/** Fades a value in and clears it — used to trigger toasts on state changes. */
export function useChangeToast(
  value: string | null,
  push: (text: string) => void,
) {
  useEffect(() => {
    if (value) push(value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
}

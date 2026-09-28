'use client';

import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface PermissionErrorProps {
  title: string;
  message: string;
  onRetry?: () => void;
}

/** Friendly, non-crashing error surface for media permission problems. */
export function PermissionError({ title, message, onRetry }: PermissionErrorProps) {
  return (
    <div className="glass rounded-2xl p-6 text-center max-w-sm mx-auto" role="alert">
      <div className="w-12 h-12 rounded-full bg-amber-500/15 grid place-items-center mx-auto mb-4">
        <AlertTriangle className="w-6 h-6 text-amber-400" aria-hidden="true" />
      </div>
      <h2 className="font-semibold">{title}</h2>
      <p className="text-sm text-slate-400 mt-2">{message}</p>
      {onRetry && (
        <Button variant="secondary" className="mt-4" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

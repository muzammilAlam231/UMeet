'use client';

import { useCallback, useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface CopyMeetingLinkProps {
  url: string;
}

/** Copy-to-clipboard control with a graceful fallback for older browsers. */
export function CopyMeetingLink({ url }: CopyMeetingLinkProps) {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        const el = document.createElement('textarea');
        el.value = url;
        el.style.position = 'fixed';
        el.style.opacity = '0';
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Silently ignore; the URL is still visible for manual copy.
    }
  }, [url]);

  return (
    <div className="flex items-center gap-2 w-full">
      <div className="flex-1 truncate glass rounded-xl px-3 py-2 text-sm text-slate-300 font-mono">
        {url}
      </div>
      <Button
        variant="secondary"
        onClick={copy}
        aria-label={copied ? 'Meeting link copied' : 'Copy meeting link'}
      >
        {copied ? (
          <>
            <Check className="w-4 h-4" aria-hidden="true" /> Copied
          </>
        ) : (
          <>
            <Copy className="w-4 h-4" aria-hidden="true" /> Copy
          </>
        )}
      </Button>
    </div>
  );
}

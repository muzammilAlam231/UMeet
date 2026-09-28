'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Video } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { CopyMeetingLink } from '@/components/CopyMeetingLink';
import { generateRoomId } from '@/lib/room';

export default function CreateMeetingPage() {
  const router = useRouter();
  const [roomId, setRoomId] = useState<string | null>(null);

  // Generate the room ID once on the client (needs Web Crypto).
  useEffect(() => {
    setRoomId(generateRoomId());
  }, []);

  const appUrl = useMemo(() => {
    if (typeof window !== 'undefined') return window.location.origin;
    return process.env.NEXT_PUBLIC_APP_URL || '';
  }, []);

  const meetingUrl = roomId ? `${appUrl}/meeting/${roomId}` : '';

  return (
    <main className="min-h-screen flex flex-col">
      <header className="px-6 py-5 max-w-3xl mx-auto w-full">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" /> Back
        </Link>
      </header>

      <section className="flex-1 flex flex-col items-center justify-center px-6 pb-16 w-full">
        <div className="w-full max-w-md glass rounded-3xl p-8 animate-fade-in">
          <div className="w-12 h-12 rounded-2xl bg-accent grid place-items-center mb-5">
            <Video className="w-6 h-6 text-white" aria-hidden="true" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Your meeting is ready.
          </h1>
          <p className="text-slate-400 mt-2 text-sm">
            Share this link with one other person. The room stays active only
            while participants are connected.
          </p>

          <div className="mt-6 space-y-3">
            {roomId ? (
              <CopyMeetingLink url={meetingUrl} />
            ) : (
              <div className="h-10 rounded-xl bg-white/5 animate-pulse" />
            )}

            <Button
              className="w-full"
              size="lg"
              disabled={!roomId}
              onClick={() => roomId && router.push(`/meeting/${roomId}`)}
            >
              Enter meeting
            </Button>
          </div>

          {roomId && (
            <p className="text-xs text-slate-500 mt-4 text-center">
              Meeting ID: <span className="font-mono text-slate-400">{roomId}</span>
            </p>
          )}
        </div>
      </section>
    </main>
  );
}

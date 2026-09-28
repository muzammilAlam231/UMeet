'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { PhoneOff, RotateCcw, Home } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function MeetingEndedPage() {
  const params = useParams();
  const router = useRouter();
  const rawId = Array.isArray(params.roomId) ? params.roomId[0] : params.roomId;
  const roomId = (rawId ?? '').toUpperCase();

  return (
    <main className="min-h-screen grid place-items-center px-6">
      <div className="w-full max-w-md glass rounded-3xl p-8 text-center animate-fade-in">
        <div className="w-14 h-14 rounded-full bg-white/10 grid place-items-center mx-auto mb-5">
          <PhoneOff className="w-6 h-6 text-slate-300" aria-hidden="true" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">You left the meeting</h1>
        <p className="text-slate-400 mt-2 text-sm">
          Your camera and microphone have been turned off.
        </p>

        <div className="mt-6 flex flex-col gap-3">
          <Button
            size="lg"
            onClick={() => router.push(`/meeting/${roomId}`)}
          >
            <RotateCcw className="w-4 h-4" aria-hidden="true" /> Rejoin meeting
          </Button>
          <Link href="/">
            <Button variant="secondary" size="lg" className="w-full">
              <Home className="w-4 h-4" aria-hidden="true" /> Back home
            </Button>
          </Link>
        </div>
      </div>
    </main>
  );
}

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Video } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { parseRoomInput } from '@/lib/room';

export default function JoinMeetingPage() {
  const router = useRouter();
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    const roomId = parseRoomInput(value);
    if (!roomId) {
      setError('Invalid meeting link.');
      return;
    }
    setError(null);
    router.push(`/meeting/${roomId}`);
  };

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
        <form
          onSubmit={handleJoin}
          className="w-full max-w-md glass rounded-3xl p-8 animate-fade-in"
        >
          <div className="w-12 h-12 rounded-2xl bg-accent grid place-items-center mb-5">
            <Video className="w-6 h-6 text-white" aria-hidden="true" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Join a meeting</h1>
          <p className="text-slate-400 mt-2 text-sm">
            Paste the meeting link or enter the meeting ID.
          </p>

          <div className="mt-6 space-y-3">
            <label htmlFor="room" className="sr-only">
              Meeting link or ID
            </label>
            <input
              id="room"
              type="text"
              autoComplete="off"
              autoCapitalize="characters"
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                if (error) setError(null);
              }}
              placeholder="AB7K-XP29 or full link"
              className="w-full glass rounded-xl px-4 py-3 text-sm outline-none focus:border-accent placeholder:text-slate-500"
              aria-invalid={!!error}
              aria-describedby={error ? 'room-error' : undefined}
            />
            {error && (
              <p id="room-error" className="text-sm text-red-400" role="alert">
                {error}
              </p>
            )}
            <Button type="submit" className="w-full" size="lg">
              Continue
            </Button>
          </div>
        </form>
      </section>
    </main>
  );
}

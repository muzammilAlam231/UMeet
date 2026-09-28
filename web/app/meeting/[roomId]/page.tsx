'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PreJoinScreen, type PreJoinResult } from '@/components/PreJoinScreen';
import { MeetingRoom } from '@/components/MeetingRoom';
import { PermissionError } from '@/components/PermissionError';
import { Button } from '@/components/ui/Button';
import { isValidRoomId } from '@/lib/room';

type Stage = 'prejoin' | 'in-call';

export default function MeetingPage() {
  const params = useParams();
  const router = useRouter();
  const rawId = Array.isArray(params.roomId) ? params.roomId[0] : params.roomId;
  const roomId = (rawId ?? '').toUpperCase();

  const [stage, setStage] = useState<Stage>('prejoin');
  const [prejoin, setPrejoin] = useState<PreJoinResult | null>(null);
  const [valid, setValid] = useState<boolean | null>(null);

  useEffect(() => {
    setValid(isValidRoomId(roomId));
  }, [roomId]);

  const handleJoin = useCallback((result: PreJoinResult) => {
    setPrejoin(result);
    setStage('in-call');
  }, []);

  const handleEnded = useCallback(() => {
    router.replace(`/meeting/${roomId}/ended`);
  }, [router, roomId]);

  if (valid === false) {
    return (
      <main className="min-h-screen grid place-items-center px-6">
        <div className="space-y-4 text-center">
          <PermissionError
            title="Invalid meeting link"
            message="This meeting link is not valid. Please check the link and try again."
          />
          <Button onClick={() => router.push('/join')}>Try another link</Button>
        </div>
      </main>
    );
  }

  if (valid === null) {
    return <main className="min-h-screen grid place-items-center">Loading…</main>;
  }

  if (stage === 'prejoin' || !prejoin) {
    return <PreJoinScreen roomId={roomId} onJoin={handleJoin} />;
  }

  return <MeetingRoom roomId={roomId} prejoin={prejoin} onEnded={handleEnded} />;
}

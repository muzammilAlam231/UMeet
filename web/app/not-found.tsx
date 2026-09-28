import Link from 'next/link';
import { Button } from '@/components/ui/Button';

export default function NotFound() {
  return (
    <main className="min-h-screen grid place-items-center px-6">
      <div className="text-center max-w-sm">
        <p className="text-5xl font-semibold tracking-tight">404</p>
        <h1 className="text-lg font-medium mt-3">Page not found</h1>
        <p className="text-sm text-slate-400 mt-1">
          The page you&apos;re looking for doesn&apos;t exist or the meeting has
          ended.
        </p>
        <Link href="/" className="inline-block mt-6">
          <Button>Back home</Button>
        </Link>
      </div>
    </main>
  );
}

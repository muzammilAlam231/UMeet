import Link from 'next/link';
import {
  ShieldCheck,
  Users,
  Video,
  MonitorUp,
  Share2,
  EyeOff,
  Ban,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';

const features = [
  { icon: Users, title: 'No account required', desc: 'Just create a link and share it.' },
  { icon: Users, title: '1-to-1 only', desc: 'Rooms are limited to exactly two people.' },
  { icon: Video, title: 'Camera & microphone', desc: 'Real audio and video, right in your browser.' },
  { icon: MonitorUp, title: 'Screen sharing', desc: 'Share a tab, window, or your whole screen.' },
  { icon: Share2, title: 'Peer-to-peer WebRTC', desc: 'Media flows directly between the two browsers.' },
  { icon: EyeOff, title: 'No recordings', desc: 'Nothing is recorded or stored on a server.' },
  { icon: Ban, title: 'No ads', desc: 'A clean, distraction-free experience.' },
];

export default function LandingPage() {
  return (
    <main className="min-h-screen flex flex-col">
      <header className="px-6 py-5 flex items-center justify-between max-w-6xl mx-auto w-full">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-accent grid place-items-center">
            <Video className="w-5 h-5 text-white" aria-hidden="true" />
          </div>
          <span className="font-semibold text-lg tracking-tight">UMeet</span>
        </div>
      </header>

      <section className="flex-1 flex flex-col items-center justify-center text-center px-6 py-16 max-w-3xl mx-auto w-full">
        <div className="inline-flex items-center gap-2 text-xs text-slate-400 glass px-3 py-1 rounded-full mb-6">
          <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
          Peer-to-peer · free · no sign-up
        </div>
        <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight text-balance">
          Private 1-to-1 meetings.
        </h1>
        <p className="mt-4 text-lg text-slate-400 max-w-xl text-balance">
          Simple video calls, voice calls and screen sharing — directly between
          two people.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <Link href="/create" className="w-full sm:w-auto">
            <Button size="lg" className="w-full sm:w-auto">
              Create Meeting
            </Button>
          </Link>
          <Link href="/join" className="w-full sm:w-auto">
            <Button size="lg" variant="secondary" className="w-full sm:w-auto">
              Join Meeting
            </Button>
          </Link>
        </div>
      </section>

      <section className="px-6 pb-20 max-w-4xl mx-auto w-full">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {features.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="glass rounded-2xl p-4 animate-fade-in">
              <Icon className="w-5 h-5 text-accent mb-2" aria-hidden="true" />
              <h3 className="font-medium text-sm">{title}</h3>
              <p className="text-sm text-slate-400 mt-1">{desc}</p>
            </div>
          ))}
        </div>

        <p className="text-xs text-slate-500 mt-8 text-center max-w-2xl mx-auto">
          Media is sent directly between the two browsers using WebRTC. Some
          restrictive networks may block direct peer-to-peer connections; this
          free deployment does not include a TURN relay, so connectivity cannot
          be guaranteed on every network.
        </p>
      </section>
    </main>
  );
}

# UMeet — Private 1-to-1 Meetings

A free, production-quality, peer-to-peer video meeting app for **exactly two
participants**. Real WebRTC audio/video/screen-share flows directly between the
two browsers; a tiny signaling server only exchanges connection metadata. No
accounts, no database, no paid services.

> Direct peer-to-peer WebRTC is used. Some restrictive networks may require a
> TURN relay. This free deployment does not include a paid TURN relay, so
> connectivity cannot be guaranteed on every network. See
> [WebRTC troubleshooting](#webrtc-troubleshooting-guide).

---

## Table of contents

1. [What was built](#what-was-built)
2. [Architecture](#architecture)
3. [File structure](#file-structure)
4. [Running locally](#running-locally)
5. [Testing with two devices](#testing-with-two-devices)
6. [Free deployment](#free-deployment)
7. [Environment variables](#environment-variables)
8. [Browser compatibility](#browser-compatibility)
9. [WebRTC troubleshooting guide](#webrtc-troubleshooting-guide)
10. [Known limitations](#known-limitations)
11. [Future improvements](#future-improvements)

---

## What was built

- **Real 1-to-1 WebRTC calls** — camera, microphone and screen sharing sent
  peer-to-peer via `RTCPeerConnection`. Media never touches the server.
- **Signaling server** — Node.js + TypeScript + Socket.IO. In-memory rooms,
  max two participants, automatic room cleanup, membership validation.
- **Next.js frontend** — App Router, TypeScript, Tailwind CSS, `lucide-react`
  icons. Dark, minimal, responsive, accessible.
- **Full feature set** — mute/unmute, camera on/off, device switching mid-call,
  screen sharing via `getDisplayMedia` with `replaceTrack` (no second peer
  connection), automatic camera restore, perfect-negotiation to avoid offer
  collisions, ICE-restart reconnection, capability detection, PWA install.

### Pages

| Route | Purpose |
| --- | --- |
| `/` | Landing page |
| `/create` | Create a meeting, copy link |
| `/join` | Join by ID or URL |
| `/meeting/[roomId]` | Pre-join device check → live meeting |
| `/meeting/[roomId]/ended` | Meeting-ended screen |
| `not-found` | 404 / room-not-found |

---

## Architecture

```
 Browser A                         Browser B
 ┌──────────┐   WebRTC (media)    ┌──────────┐
 │ RTCPeer  │◄───────────────────►│ RTCPeer  │
 │Connection│  audio/video/screen │Connection│
 └────┬─────┘                     └─────┬────┘
      │                                 │
      │  Socket.IO (signaling only)     │
      │  offer / answer / ICE           │
      └──────────────┬──────────────────┘
                     ▼
            ┌───────────────────┐
            │  Signaling server │  in-memory rooms, no media,
            │  (Node + Socket.IO)│  max 2 participants
            └───────────────────┘
```

- The server relays only SDP offers/answers and ICE candidates between the two
  verified members of a room. It never sees audio or video.
- The **first** socket to join a room is the *initiator* (creates the offer).
  The second is *polite* and yields on collisions (perfect negotiation).
- Rooms live only in memory and are deleted when the last participant leaves.

The signaling layer is isolated behind `lib/signaling/`, so it can be replaced
with another free/self-hosted transport without touching the WebRTC code in
`lib/webrtc/`.

---

## File structure

```
UMeet/
├── web/                        # Next.js frontend
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── globals.css
│   │   ├── page.tsx            # Landing
│   │   ├── create/page.tsx
│   │   ├── join/page.tsx
│   │   ├── not-found.tsx
│   │   └── meeting/[roomId]/
│   │       ├── page.tsx        # Pre-join + live meeting
│   │       └── ended/page.tsx
│   ├── components/             # UI components
│   ├── hooks/useMeeting.ts     # Meeting lifecycle orchestration
│   ├── lib/
│   │   ├── capabilities.ts     # Browser capability detection
│   │   ├── room.ts             # Secure room ID generation/validation
│   │   ├── signaling/          # Socket.IO client + types (swappable)
│   │   └── webrtc/             # WebRTCManager, media, devices
│   ├── public/                 # manifest.json, sw.js, icons
│   └── package.json
│
├── signaling/                  # Signaling server
│   ├── src/
│   │   ├── server.ts           # HTTP + Socket.IO bootstrap
│   │   ├── rooms.ts            # In-memory RoomManager
│   │   ├── signaling.ts        # Per-socket signaling handlers
│   │   └── types.ts            # Shared message contracts
│   └── package.json
│
├── .env.example
└── README.md
```

---

## Running locally

You need **Node.js 18+**. Open two terminals.

### 1. Signaling server

```bash
cd signaling
npm install
npm run dev          # starts on http://localhost:4000
```

### 2. Frontend

```bash
cd web
npm install
cp .env.local.example .env.local   # or copy the values from ../.env.example
npm run dev          # starts on http://localhost:3000
```

Then open <http://localhost:3000>.

### Running both together

From two terminals as above, or use a process runner of your choice. A minimal
one-liner (macOS/Linux) using background jobs:

```bash
(cd signaling && npm run dev) & (cd web && npm run dev)
```

On Windows PowerShell, run each in its own terminal tab.

### Production build

```bash
# Signaling
cd signaling && npm install && npm run build && npm start

# Frontend
cd web && npm install && npm run build && npm start
```

---

## Testing with two devices

WebRTC in two tabs on one machine does **not** prove real connectivity, because
ICE candidates resolve to localhost. Test across networks:

1. Deploy or run the frontend + signaling server so both are reachable from the
   internet (or run the frontend on your LAN IP with `HTTPS`, required for
   camera access on non-localhost origins).
2. **Device A**: your PC on Wi-Fi.
3. **Device B**: a phone on **cellular data** (not the same Wi-Fi).
4. Create a meeting on A, copy the link, open it on B.
5. Verify each item:
   - camera, microphone
   - mute / unmute (audio track stays live; `track.enabled = false`)
   - camera on / off
   - screen sharing (start, stop via button, stop via browser bar → camera
     restores automatically)
   - device switching from the settings drawer
   - one participant leaves → the other sees "Participant left"
   - refresh → rejoin
   - a third device opening the link → "Meeting is full."
   - deny permissions → clear message, no crash
   - toggle airplane mode briefly → "Reconnecting…" then recovery or a clear
     failure message

Because this deployment ships **no TURN server**, a symmetric-NAT ↔ symmetric-NAT
pair (some cellular carriers) may fail to connect. That is expected and is
surfaced to the user rather than hidden.

---

## Free deployment

> Free tiers change frequently. Verify current limits before relying on them,
> and never enter a credit card if the task requires staying free.

### Frontend (Next.js)

- **Vercel** — the natural home for Next.js. Free "Hobby" tier, no card
  required for personal projects. Import the repo, set the **root directory** to
  `web`, add the environment variables below.
- **Cloudflare Pages** or **Netlify** — alternatives if Vercel's terms change.

### Signaling server (long-lived WebSocket)

Serverless platforms are a poor fit for persistent Socket.IO connections. Use a
host that keeps a process running:

- **Render** — free web service tier (spins down when idle; first request wakes
  it). Set root directory `signaling`, build `npm install && npm run build`,
  start `npm start`.
- **Railway** / **Fly.io** — free allowances (verify current limits; some now
  require a card). Fly.io keeps WebSockets alive well.
- **Glitch** — quick and free for small projects.

After deploying the signaling server, set `NEXT_PUBLIC_SIGNALING_URL` on the
frontend to its public URL, and set `CORS_ORIGIN` on the signaling server to
the frontend's URL.

If a provider changes its free tier, move the corresponding service to one of
the listed alternatives — nothing in the code is provider-specific.

---

## Environment variables

See [`.env.example`](.env.example). Only non-secret, public configuration is
exposed via `NEXT_PUBLIC_*`.

| Variable | Where | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SIGNALING_URL` | web | URL of the signaling server |
| `NEXT_PUBLIC_APP_URL` | web | Public URL for share links / metadata |
| `NEXT_PUBLIC_STUN_URLS` | web | Optional comma-separated STUN URLs |
| `NEXT_PUBLIC_TURN_URL` / `_USERNAME` / `_CREDENTIAL` | web | Optional TURN relay |
| `PORT` | signaling | Listen port (default 4000) |
| `CORS_ORIGIN` | signaling | Allowed frontend origin(s) |

TURN credentials in `NEXT_PUBLIC_*` are inherently visible to clients — only use
short-lived or self-hosted credentials you are comfortable exposing.

---

## Browser compatibility

| Feature | Chrome | Edge | Firefox | Safari (desktop) | iOS Safari | Android Chrome |
| --- | --- | --- | --- | --- | --- | --- |
| WebRTC audio/video | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Screen sharing (`getDisplayMedia`) | ✅ | ✅ | ✅ | ✅ | ❌ (unsupported) | ⚠️ limited |
| Screen-share **audio** | ✅ (tab/system) | ✅ | ⚠️ partial | ⚠️ limited | ❌ | ❌ |
| Device switching | ✅ | ✅ | ✅ | ✅ | ⚠️ | ✅ |
| PWA install | ✅ | ✅ | ⚠️ | ⚠️ | ✅ (Add to Home) | ✅ |

The app detects capabilities at runtime (`lib/capabilities.ts`). Unsupported
features are disabled with an explanation rather than crashing. On iOS Safari
the screen-share button is disabled with a clear message.

**Camera/microphone require a secure context**: `https://` or `localhost`. When
testing on a LAN IP, serve over HTTPS or the browser will block media access.

---

## WebRTC troubleshooting guide

**"Reconnecting…" then "Connection lost."**
The peer connection failed and an ICE restart did not recover. Common causes:

- Both peers behind restrictive/symmetric NAT with no TURN relay. STUN alone
  cannot traverse this. A TURN server is required — add one via
  `NEXT_PUBLIC_TURN_URL` (a free/self-hosted [coturn](https://github.com/coturn/coturn)
  works).
- A firewall blocking UDP. Corporate/guest networks often do this.

**Camera/mic permission blocked.**
Allow access in the browser's site settings and reload. The app shows a "Try
again" action rather than crashing.

**Screen share button disabled.**
The browser/device doesn't support `getDisplayMedia` (notably iOS Safari).

**No video, audio only.**
No camera was detected; the app falls back to audio-only automatically.

**Can't connect to the server ("Server unavailable").**
Check `NEXT_PUBLIC_SIGNALING_URL` and that the signaling server is running and
its `CORS_ORIGIN` allows the frontend origin. On free hosts that sleep, the
first connection may take a few seconds to wake the service.

**Verify ICE with real networks.** Two tabs on one machine always "work"; test
PC-Wi-Fi ↔ phone-cellular to exercise real ICE.

---

## Known limitations

- **No TURN relay** in the free deployment → some NAT/firewall combinations
  cannot establish a direct P2P connection. This is surfaced honestly to users.
- **1-to-1 only** by design. A third join is rejected with "Meeting is full."
- **In-memory rooms** — restarting the signaling server drops active rooms.
- **iOS Safari** cannot share its screen (platform limitation).
- **No persistence** — no chat history, no recordings, nothing stored.
- Screen-share **system audio** availability varies by browser/OS.

## Future improvements

- Optional self-hosted TURN (coturn) with short-lived credentials.
- In-call text chat over a `RTCDataChannel`.
- Redis-backed room state for multi-instance signaling.
- Bandwidth/quality adaptation controls.
- Push-to-talk and background blur (client-side, still free).

---

## Privacy

No audio, video, or screen content is ever sent to or stored on the server.
Media is strictly peer-to-peer. The signaling server only relays connection
metadata (SDP/ICE) and holds room membership in memory while a call is active.

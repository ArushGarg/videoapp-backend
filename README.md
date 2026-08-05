# Connectly — Backend

The server for **Connectly**, a full-stack real-time video/audio calling and chat application. Built with Node.js, Express, and MongoDB, with Socket.io powering live call signaling and message delivery, and Agora RTC handling the actual voice/video streams.

**Frontend repo:** [videoapp-frontend](https://github.com/ArushGarg/videoapp-frontend)

---

## Features

- **Authentication** — JWT-based auth with bcrypt password hashing. Register, login, and a protected "get current user" endpoint.
- **Friends system** — send/accept/reject/cancel friend requests, backed by a MongoDB partial unique index that prevents duplicate pending requests while still allowing a fresh request after a rejection. Auto-resolves the case where two users send each other a request at the same time.
- **Real-time call signaling** — Socket.io handles invite → accept/reject → cancel/end for both audio and video calls. Calls always ring (no instant "offline" wall) — if the other person isn't connected, the invite is a harmless no-op and the caller's own client-side timeout handles "No answer," the same way calling a switched-off phone would.
- **Agora RTC token generation** — short-lived, per-channel signed tokens generated server-side, so the client never holds a static Agora credential.
- **Chat** — 1:1 text messaging, persisted in MongoDB regardless of whether the recipient is online, and pushed live over Socket.io if they are.
- **Presence** — tracks online/offline status per user, correctly handling multiple simultaneous device connections for the same account.
- **Friendship-gated access** — both calling and messaging are restricted to accepted friends, enforced server-side (not just hidden in the UI).

## Tech stack

| Layer | Technology |
|---|---|
| Runtime | Node.js / Express |
| Database | MongoDB (Mongoose) |
| Real-time | Socket.io |
| Auth | JWT (jsonwebtoken) + bcryptjs |
| Video/Audio | Agora RTC (agora-token for server-side token generation) |

## Project structure

```
backend/
├── config/
│   └── database.js          # MongoDB connection
├── middleware/
│   └── auth.js               # JWT verification middleware (protect)
├── models/
│   ├── User.js                # username, email, password hash, friends[], isOnline, lastSeen
│   ├── FriendRequest.js       # from/to/status, partial unique index on pending requests
│   └── Message.js             # from/to/content, indexed for fast conversation lookups
├── routes/
│   ├── auth.js                 # POST /register, POST /login, GET /me
│   ├── agora.js                # POST /token — signed RTC token generation
│   ├── users.js                # GET / — other users, annotated with friendship status
│   ├── friends.js              # send/accept/reject/cancel requests, list friends
│   └── messages.js             # conversations list, conversation history, send message
├── sockets/
│   └── callSignaling.js        # Socket.io auth + call invite/accept/reject/cancel/end handlers
├── utils/
│   └── agoraToken.js           # RTC token generation helper, channel name validation
├── uploads/                    # reserved for future avatar/file uploads
├── server.js                   # app entry point — Express + HTTP server + Socket.io
├── package.json
└── .env                        # not committed — see Environment variables below
```

## Getting started

### Prerequisites
- Node.js (v18+ recommended)
- A running MongoDB instance (local or Atlas)
- An [Agora](https://console.agora.io) project with an App ID and App Certificate (Secured mode)

### Installation

```bash
git clone https://github.com/ArushGarg/videoapp-backend.git
cd videoapp-backend
npm install
```

### Environment variables

Create a `.env` file in the project root:

```env
PORT=3000
MONGO_URI=mongodb://localhost:27017/videoapp
JWT_SECRET=<a long, random, cryptographically secure string>
AGORA_APP_ID=<your Agora App ID>
AGORA_APP_CERTIFICATE=<your Agora App Certificate>
```

> **Generating a strong `JWT_SECRET`:**
> ```bash
> node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
> ```

### Running the server

```bash
node server.js
```

You should see:
```
🚀 Server running on http://localhost:3000
```

The server exposes a health check at `GET /`.

## API overview

All protected routes require an `Authorization: Bearer <token>` header.

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| POST | `/api/auth/register` | Create an account | — |
| POST | `/api/auth/login` | Log in, returns JWT | — |
| GET | `/api/auth/me` | Current user | ✅ |
| GET | `/api/users` | All other users, annotated with friend status | ✅ |
| GET | `/api/friends` | Your accepted friends | ✅ |
| GET | `/api/friends/requests` | Pending incoming/outgoing requests | ✅ |
| POST | `/api/friends/request` | Send a friend request | ✅ |
| POST | `/api/friends/accept` | Accept a request | ✅ |
| POST | `/api/friends/reject` | Reject a request | ✅ |
| DELETE | `/api/friends/request/:id` | Cancel a sent request | ✅ |
| DELETE | `/api/friends/:friendId` | Remove a friend | ✅ |
| GET | `/api/messages/conversations` | Chat list (friends + last message) | ✅ |
| GET | `/api/messages/:friendId` | Full conversation history | ✅ |
| POST | `/api/messages` | Send a message | ✅ |
| POST | `/api/agora/token` | Generate a signed RTC token | ✅ |

### Socket.io events

Connect with `io(URL, { auth: { token: '<jwt>' } })`.

| Event | Direction | Payload |
|---|---|---|
| `call:invite` | client → server | `{ toUserId, channelName, callType }` |
| `call:incoming` | server → client | `{ fromUserId, fromUsername, channelName, callType }` |
| `call:accept` / `call:reject` / `call:cancel` / `call:end` | client → server | `{ toUserId, channelName, reason? }` |
| `call:accepted` / `call:rejected` / `call:cancelled` / `call:ended` | server → client | mirrors the above |
| `call:not_friends` | server → client | emitted if a call is attempted between non-friends |
| `message:new` | server → client | pushed live when a friend sends you a message while connected |

## Known limitations

- No push notification integration — a genuinely offline user (app fully closed) can't be woken up by an incoming call or message the way a phone's OS-level push system would; they'll see it next time they open the app.
- No missed-call log — a call that rings out unanswered isn't currently recorded anywhere for the recipient to see later.
- No file/media upload support yet (the `uploads/` folder and `multer` dependency are reserved for this).

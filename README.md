# Swachh Sathi

A volunteer management platform for community cleaning events.

## Features

- Event creation and management
- Volunteer registration and tracking
- Real-time chat
- Leaderboard and rewards
- **QR Code Attendance System**

## QR Attendance System

See [docs/qr-attendance.md](docs/qr-attendance.md) for detailed documentation.

### Quick Guide

**For Organizers:**
1. Create event → QR auto-generated
2. Click "Show QR" at event

**For Volunteers:**
1. Join event
2. Click "Check In" → Scan QR code
3. Earn credits

---

## Tech Stack

### Server
- Node.js + Express
- MongoDB + Mongoose
- Socket.io
- Redis (caching)

### Client
- React + Vite
- TailwindCSS
- Socket.io Client

---

## Getting Started

### Server
```bash
cd server
npm install
npm run dev
```

### Client
```bash
cd client
npm install
npm run dev
```

---

## Environment Variables

### Server (.env)
```
PORT=3000
MONGODB_URI=...
REDIS_URL=...
JWT_SECRET=...
CLIENT_URL=http://localhost:5173
```

### Client (.env)
```
VITE_BACKEND_URL=http://localhost:3000
```

---

## API Endpoints

### Events
- `POST /api/events/create` - Create event
- `GET /api/events/all` - List events
- `GET /api/events/:eventId` - Event details
- `GET /api/events/:eventId/qrcode/image` - Get QR code

### Volunteers
- `POST /api/volunteers/:eventId/join` - Join event
- `POST /api/volunteers/check-in` - Check in with QR

---

## License

ISC# MandalKhata

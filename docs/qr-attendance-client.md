# Swachh Sathi - QR Attendance System Documentation

## Quick Start

### Event Organizer
1. Login and go to "Create Event"
2. Fill in event details and publish
3. When event is LIVE, click "Show QR" button
4. Display QR code to volunteers

### Volunteer
1. Login and browse events
2. Click on event and "Join Event"
3. At the event location, click "Check In"
4. Scan organizer's QR code with camera
5. Get credited automatically

---

## Key Features

### 1. QR Code Generation
- Auto-generated on event creation
- Contains unique code + event ID
- Supports both image and manual string

### 2. Two-Way Check-In
- **Camera Scan**: Use device camera to scan QR
- **Manual Entry**: Type QR code manually

### 3. URL-Based Check-In
- QR codes contain URLs: `/event/:id/checkin?code=XXX`
- Can be opened from any QR scanner app
- Auto-checks in logged-in user

### 4. Credit System
- Only PRESENT volunteers get credits
- Credits set per event (default: 10)
- Displayed before check-in

---

## API Reference

### Server Endpoints

```bash
# Get QR code image (organizer only)
GET /api/events/:eventId/qrcode/image

# Get QR code string (organizer only)
GET /api/events/:eventId/qrcode

# Regenerate QR code
POST /api/events/:eventId/qrcode/regenerate

# Volunteer check-in
POST /api/volunteers/check-in
Body: { "eventId": "...", "qrCode": "..." }
```

---

## Important Points

### Permissions
- Only event organizer can view QR code
- Only joined volunteers can check in
- Check-in only during UPCOMING or ONGOING status

### Validation Rules
1. QR code must match event's QR code
2. Volunteer must have joined event first
3. Cannot check in twice (one-time only)
4. Event must be active (not COMPLETED/CANCELLED)

### Status Flow
```
JOINED → PRESENT → credits awarded (on event complete)
```

### Error Messages
- "Invalid QR code" - Wrong code entered
- "Event not found" - Event doesn't exist
- "Cannot join this event" - Registration closed
- "You have not joined this event" - Join first
- "You have already checked in" - Already PRESENT
- "Event is not available for check-in" - Wrong status

---

## Component Files

### Client
- `src/components/swachh/QRScanner.jsx` - Camera scanner
- `src/components/swachh/EventQRDisplay.jsx` - QR display
- `src/pages/swachh/EventCheckIn.jsx` - Check-in page

### Server
- `src/controllers/event.controller.js` - QR endpoints
- `src/controllers/volunteer.controller.js` - Check-in logic
- `src/models/event.model.js` - QR code field
- `src/models/eventVolunteer.model.js` - Status tracking

---

## Troubleshooting

| Issue | Solution |
|------|----------|
| White screen on scan | Check route exists |
| 404 error | Restart server |
| Camera not working | Allow permissions |
| Invalid code | Verify with organizer |
| Already checked in | Cannot check in again |
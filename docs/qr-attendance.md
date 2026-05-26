# QR Code Attendance System

## Overview

This document describes the QR code-based attendance system for verifying volunteer presence at events. Only volunteers who physically scan the event QR code can get credited.

## How It Works

### 1. Event Creation
When an organizer creates an event, a unique QR code is automatically generated.

- QR code format: `<random string> + <timestamp>`
- Stored in the event model (`qrCode` field)
- Each event has its own unique QR code

### 2. QR Code Display (For Organizers)
Organizers can display the event QR code by:
1. Going to the event they created
2. Clicking "Show QR" button

Features:
- QR code displayed as a scannable image
- Option to copy QR code string manually
- Option to download QR code image
- Option to regenerate QR code (invalidates old one)

### 3. Volunteer Check-In
Volunteers can check in by:
1. Joining the event first
2. Clicking "Check In" button
3. Scanning the QR code displayed by organizer (using camera)
4. Or entering the QR code manually

### 4. Automatic Check-In Page
When a QR code is scanned from outside the app:
- URL format: `/event/:eventId/checkin?code=XXX`
- Page automatically attempts check-in using the code
- Shows success/failure message

## API Endpoints

### Get QR Code Image
```
GET /api/events/:eventId/qrcode/image
```
Returns QR code as a data URL image.

**Response:**
```json
{
  "qrCodeImage": "data:image/png;base64,...",
  "qrCode": "ABC123XYZ"
}
```

### Get QR Code String
```
GET /api/events/:eventId/qrcode
```
Returns just the QR code string (for manual entry).

### Regenerate QR Code
```
POST /api/events/:eventId/qrcode/regenerate
```
Generates a new QR code for the event (invalidates old one).

### Check In with QR Code
```
POST /api/volunteers/check-in
Body: { "eventId": "...", "qrCode": "..." }
```

## Database Models

### Event Model
```javascript
{
  qrCode: String,        // Unique QR code string
  creditsReward: Number,  // Credits awarded on check-in
  status: String         // UPCOMING, ONGOING, COMPLETED, CANCELLED
}
```

### EventVolunteer Model
```javascript
{
  eventId: ObjectId,
  userId: ObjectId,
  status: String,        // JOINED, PRESENT, ABSENT
  attendanceMarkedAt: Date
}
```

## Security Features

1. **QR Code Validation**: Each QR code is unique and tied to specific event
2. **Only Joined Volunteers Can Check In**: Must join event first before checking in
3. **One-Time Check In**: Cannot check in twice to same event
4. **Timing Restrictions**: Can only check in during UPCOMING or ONGOING status
5. **Regeneration**: Organizer can invalidate old QR codes by regenerating

## User Flow

```
Organizer Flow:
1. Create Event → QR code auto-generated
2. Event starts → Status changes to ONGOING
3. Show QR to volunteers → They scan to check in

Volunteer Flow:
1. Browse events → Find event
2. Join Event → Added to volunteers list
3. At event → Click Check In
4. Scan QR code → Marked as PRESENT
5. Event ends → Credits awarded
```

## Component Structure

### Client Components

1. **QRScanner** (`components/swachh/QRScanner.jsx`)
   - Uses device camera to scan QR codes
   - Supports both camera and manual entry
   - Handles QR code parsing

2. **EventQRDisplay** (`components/swachh/EventQRDisplay.jsx`)
   - Shows QR code to organizer
   - Download/copy functionality
   - Regenerate option

3. **EventCheckIn** (`pages/swachh/EventCheckIn.jsx`)
   - Auto check-in page from QR URL
   - Success/failure display

4. **EventDetails** - Updated with:
   - Check In button for volunteers
   - Show QR button for organizers

## Dependencies

### Server
- `qrcode` - QR code image generation

### Client
- `html5-qrcode` - Camera QR code scanning

## Error Handling

| Error | Cause | Solution |
|-------|-------|----------|
| Invalid QR code | Wrong code entered | Enter correct QR code |
| Event not found | Invalid event ID | Check event exists |
| Cannot check in | Event not UPCOMING/ONGOING | Wait for event to start |
| Already checked in | Already marked PRESENT | Cannot check in twice |
| Not joined | Volunteer hasn't joined | Join event first |

## Best Practices

1. **For Organizers**:
   - Display QR code on a screen or print it
   - Ensure good lighting for scanning
   - Download QR code as backup

2. **For Volunteers**:
   - Join event before arriving
   - Have camera permissions enabled
   - Use manual entry if camera fails

## Future Enhancements

- Multiple QR codes per event (different times)
- Location-based check-in (geofencing)
- Time-limited QR codes
- Bulk check-in for groups
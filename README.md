# Tap-to-Log Location (with Entrance) Web App

A simple React + TypeScript + Vite web app that allows team members to quickly log their entrance to buildings at a specific entrance point. Team access is protected by a password, and all location data is stored in Google Sheets.

## Features

- **Team Password Protection**: Secure access with environment-variable stored password
- **Quick Building & Entrance Logging**: Select building and entrance, then tap to log with precise location data
- **Google Sheets Backend**: All data stored in a shared Google Sheet for easy access
- **High-Accuracy Location**: Uses device GPS for precise location tracking
- **Admin Tools**: Delete all logs for a building or entrance, plus undo last log functionality
- **Responsive Design**: Works on mobile and desktop devices
- **TypeScript**: Full type safety throughout the application

## Core Workflow

1. **Team Authentication**: Enter team password to access the app
2. **Select Building**: Choose from the building list (Library, Student Center, Admissions)
3. **Select Entrance**: Pick the specific entrance (Front, Back, Side, Parking, etc.)
4. **Tap to Log**: One-tap logging captures location and logs to Google Sheets
5. **Admin Tools**: Delete logs or undo the most recent entry if needed

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite + TailwindCSS
- **Backend**: Google Apps Script + Google Sheets
- **Authentication**: Environment variable password protection
- **API**: RESTful endpoints with API key authentication
- **Deployment**: Static hosting (Netlify, Vercel, etc.)

## Quick Start

### Prerequisites

- Node.js 18+ and npm/yarn
- Google account for Apps Script and Sheets

### 1. Clone and Install

```bash
git clone <your-repo>
cd LocationLogger
npm install
```

### 2. Environment Setup

Create `.env` file:

```env
VITE_TEAM_PASSWORD=your-secure-password
# Note: API credentials are stored in source and only exposed after password entry
```

### 3. Google Sheets Setup

1. Create a new Google Sheet
2. Name the first sheet "LocationLogs"
3. Add headers in row 1: `Timestamp | User ID | Building ID | Building Name | Entrance | Latitude | Longitude | Accuracy`

### 4. Google Apps Script Setup

1. Go to [script.google.com](https://script.google.com)
2. Create new project, paste contents of `apps-script.js`
3. Change `SHEET_ID` to your Google Sheet ID
4. Set `VALID_API_KEY` to a secure random string
5. Deploy as web app (execute as: me, access: anyone)

### 5. Update API Configuration

In `src/api.ts`, update:

```typescript
const API_ENDPOINT = 'your-apps-script-url';
const API_KEY = 'your-api-key';
```

### 6. Run Development

```bash
npm run dev
```

### 7. Build for Production

```bash
npm run build
npm run preview  # test production build
```

## Team Password Security

- Password is stored in environment variables and never committed to source
- API credentials are only accessible after successful password authentication
- Session-based authentication maintains login state until browser refresh

## Admin Features

### Delete Building Logs
- **All Logs**: Remove all entries for a specific building
- **Latest Log**: Remove only the most recent entry for a building/entrance

### Undo Last Log
- **Global Undo**: Remove the most recently logged entry across all buildings
- **Quick Recovery**: Perfect for accidental logs or testing

## Google Sheets Data Format

| Column | Description | Example |
|--------|-------------|---------|
| Timestamp | ISO 8601 datetime | 2024-01-15T10:30:45.123Z |
| User ID | Anonymous identifier | anon |
| Building ID | Building identifier | library |
| Building Name | Display name | Library |
| Entrance | Entrance number | 1, 2, 3 |
| Latitude | GPS latitude | 40.123456 |
| Longitude | GPS longitude | -74.654321 |
| Accuracy | GPS accuracy (meters) | 5.2 |

## API Endpoints

### POST (Create Log)
```json
{
  "buildingId": "library",
  "buildingName": "Library", 
  "entrance": 1,
  "lat": 40.123456,
  "lng": -74.654321,
  "accuracy": 5.2,
  "userId": "anon"
}
```

### POST with DELETE method (Admin Actions)
```json
// Delete all logs for building
{
  "_method": "DELETE",
  "buildingId": "library"
}

// Delete latest log for building/entrance
{
  "_method": "DELETE", 
  "buildingId": "library",
  "entrance": 1,
  "latest": true
}

// Undo last log (any building)
{
  "_method": "DELETE",
  "undoLast": true
}
```

## Building Configuration

Edit the `buildings` array in `src/App.tsx`:

```typescript
const buildings = [
  { id: 'library', name: 'Library', entrances: 4 },
  { id: 'student-center', name: 'Student Center', entrances: 3 },
  { id: 'admissions', name: 'Admissions', entrances: 2 },
];
```

## Security Notes

- Team password protects app access but API credentials are in source code
- Use HTTPS in production for secure data transmission
- Consider additional security measures for sensitive environments
- API key authentication provides server-side request validation

## Deployment

1. Build: `npm run build`
2. Deploy `dist/` folder to static hosting
3. Set environment variables on hosting platform
4. Configure custom domain if needed

## License

MIT

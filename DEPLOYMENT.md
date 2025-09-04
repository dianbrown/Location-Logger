# Deployment Guide

## Quick Start Checklist

### ✅ Google Sheets & Apps Script Setup

1. **Create Google Spreadsheet**
   - Create new spreadsheet
   - Add tab named `buildings` with headers: `id | name | entrancesMax`
   - Add tab named `logs` with headers: `timestamp | userId | buildingId | buildingName | entrance | lat | lng | accuracy`

2. **Apps Script Setup**
   - Go to Extensions > Apps Script
   - Paste code from `apps-script.js`
   - Run `setupSheets()` function once
   - Run `importBuildings()` function once
   - Set Script Properties:
     - `API_KEY` = `your-secret-key` (make up a random string)
   - Deploy as Web App:
     - Execute as: Me
     - Access: Anyone with the link
   - Copy the web app URL

### ✅ Environment Variables

Update `.env` with your actual values:
```env
VITE_SHEETS_ENDPOINT=https://script.google.com/macros/s/YOUR_ACTUAL_SCRIPT_ID/exec
VITE_SHEETS_API_KEY=your-secret-key-here
```

### ✅ Test Locally

```bash
npm run dev
```

Visit http://localhost:3000 and:
- Grant location permission
- Select a building and entrance number
- Try logging location
- Check that the building shows "Done ✅" after logging
- Test admin tools to delete logs
- Verify status changes back to "Pending" after deletion + refresh

### ✅ Deploy to Production

**Option A: Netlify**
1. Push code to GitHub
2. Connect repo to Netlify
3. Build settings:
   - Build command: `npm run build`
   - Publish directory: `dist`
4. Add environment variables in Site Settings > Environment Variables

**Option B: Vercel**
1. Push code to GitHub
2. Connect repo to Vercel
3. Add environment variables in Project Settings

## Key Features to Test

### Entrance Logging
- Select different entrance numbers (1-5 by default)
- Buildings with `entrancesMax` should limit dropdown options
- Multiple logs per building with different entrances should work

### Status Logic
- Building shows "Pending" when no logs exist
- Building shows "Done ✅" when any entrance has been logged
- Status updates immediately after logging
- Status resets to "Pending" after all logs deleted + refresh

### Admin Tools
- "Delete ALL logs" removes all entries for a building
- "Delete by entrance" removes only logs for specific entrance
- Both require refresh to update status indicators

## Troubleshooting

### Location Not Working
- Check browser permissions (click lock icon in address bar)
- Test on HTTPS (required for geolocation on most browsers)

### API Errors
- Verify Apps Script web app URL (should end with `/exec`)
- Check API keys match between `.env` and Apps Script properties
- Test Apps Script directly: `YOUR_SCRIPT_URL?mode=data`

### Data Not Loading
- Check Google Sheets has the correct tab names and headers
- Run the setup functions in Apps Script
- Verify spreadsheet permissions

### Entrance Dropdown Issues
- Check `entrancesMax` column in buildings sheet
- Ensure numeric values only (or blank for default 5)
- Verify buildings.json has correct structure for local fallback

## Production Environment Variables

When deploying, set these environment variables in your hosting platform:

```
VITE_SHEETS_ENDPOINT=https://script.google.com/macros/s/AKfycby.../exec
VITE_SHEETS_API_KEY=your-production-secret-key
```

⚠️ **Important**: Use different API keys for development and production!

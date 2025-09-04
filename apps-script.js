/**
 * Campus Entrance Logger Google Apps Script
 * 
 * Setup Instructions:
 * 1. Create a new Google Spreadsheet
 * 2. Create two tabs: "buildings" and "logs"
 * 3. Add headers to buildings tab: id | name | entrancesMax
 * 4. Add headers to logs tab: timestamp | userId | buildingId | buildingName | entrance | lat | lng | accuracy
 * 5. Go to Apps Script (Extensions > Apps Script)
 * 6. Paste this code and save
 * 7. Set Script Properties:
 *    - API_KEY: your shared secret
 * 8. Deploy as web app:
 *    - Execute as: Me
 *    - Who has access: Anyone with the link
 * 9. Copy the web app URL to your .env file
 */

// === CONFIG ===
const SHEET_BUILDINGS = "buildings";
const SHEET_LOGS = "logs";

// === UTIL ===
function _ss() {
  const id = PropertiesService.getScriptProperties().getProperty("SPREADSHEET_ID");
  return id ? SpreadsheetApp.openById(id) : SpreadsheetApp.getActive();
}

function _ok(data) { 
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON); 
}

function _cors(output) {
  // Google Apps Script automatically handles CORS for web apps
  // We don't need manual header setting - just return the output
  return output || ContentService.createTextOutput("");
}

function _requireAuth(e) {
  const apiKey = PropertiesService.getScriptProperties().getProperty("API_KEY");
  if (!apiKey) return true; // if not set, skip (dev only)
  
  const headers = e?.headers || {};
  const provided = headers["X-API-KEY"] || headers["x-api-key"];
  if (provided === apiKey) return true;
  
  // If body carries it (method override)
  try {
    const body = e?.postData?.contents ? JSON.parse(e.postData.contents) : {};
    if (body && body._xApiKey === apiKey) return true;
  } catch (_) {}
  
  return false;
}

function _readSheet(name) {
  const sh = _ss().getSheetByName(name);
  if (!sh) return [];
  
  const range = sh.getDataRange();
  if (range.getNumRows() === 0) return [];
  
  const [header, ...rows] = range.getValues();
  return rows.filter(r => r.some(cell => cell !== "")).map(r => {
    const obj = {};
    header.forEach((h,i) => obj[h] = r[i]);
    return obj;
  });
}

function _appendRow(name, values) {
  const sh = _ss().getSheetByName(name);
  sh.appendRow(values);
}

function _deleteLogs(filterFn) {
  const sh = _ss().getSheetByName(SHEET_LOGS);
  const range = sh.getDataRange();
  if (range.getNumRows() === 0) return 0;
  
  const values = range.getValues(); // includes header
  const header = values[0];
  let deleted = 0;
  
  // Collect rows to keep (including header)
  const keep = [header];
  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    const obj = {};
    header.forEach((h, idx) => obj[h] = row[idx]);
    if (filterFn(obj)) {
      deleted++;
      continue;
    }
    keep.push(row);
  }
  
  // Rewrite whole sheet (simplest)
  sh.clearContents();
  if (keep.length > 0) {
    sh.getRange(1,1,keep.length, keep[0].length).setValues(keep);
  }
  return deleted;
}

// === HTTP HANDLERS ===
function doOptions(e) {
  return _cors(ContentService.createTextOutput(""));
}

function doGet(e) {
  try {
    const mode = e?.parameter?.mode;
    
    if (mode === "data") {
      const buildings = _readSheet(SHEET_BUILDINGS).map(b => ({
        id: String(b.id || ""),
        name: String(b.name || ""),
        entrancesMax: b.entrancesMax ? Number(b.entrancesMax) : undefined
      }));
      
      const logs = _readSheet(SHEET_LOGS).map(l => ({
        timestamp: String(l.timestamp || ""),
        userId: String(l.userId || "anon"),
        buildingId: String(l.buildingId || ""),
        buildingName: String(l.buildingName || ""),
        entrance: Number(l.entrance || 1),
        lat: Number(l.lat || 0),
        lng: Number(l.lng || 0),
        accuracy: Number(l.accuracy || 0),
        underConstruction: !!l.underConstruction
      }));
      
      return _cors(_ok({ buildings, logs }));
    }
    
    if (mode === "log") {
      // Handle logging via GET parameters to avoid CORS
      const buildingId = String(e?.parameter?.buildingId || "");
      const buildingName = String(e?.parameter?.buildingName || "");
      const entrance = Number(e?.parameter?.entrance || 1);
      const lat = Number(e?.parameter?.lat || 0);
      const lng = Number(e?.parameter?.lng || 0);
      const accuracy = Number(e?.parameter?.accuracy || 0);
      const userId = String(e?.parameter?.userId || "anon");
      const underConstruction = e?.parameter?.underConstruction === 'true';

      if (!buildingId || !buildingName || !entrance || isNaN(lat) || isNaN(lng)) {
        return _cors(_ok({ ok: false, error: "Missing or invalid fields" }));
      }
      
      // Validate ranges
      if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        return _cors(_ok({ ok: false, error: "Lat/Lng out of range" }));
      }
      
      const timestamp = new Date().toISOString();
      _appendRow(SHEET_LOGS, [timestamp, userId, buildingId, buildingName, entrance, lat, lng, accuracy, underConstruction]);
      return _cors(_ok({ ok: true }));
    }
    
    if (mode === "delete") {
      // Handle delete operations via GET parameters
      const buildingId = String(e?.parameter?.buildingId || "");
      const entrance = e?.parameter?.entrance ? Number(e?.parameter?.entrance) : null;
      const latest = e?.parameter?.latest === 'true';
      const undoLast = e?.parameter?.undoLast === 'true';
      
      let deletedCount = 0;

      if (undoLast) {
        // Delete the most recent log entry (regardless of building)
        const all = _readSheet(SHEET_LOGS);
        if (all.length > 0) {
          const sorted = all.sort((a,b) => String(b.timestamp).localeCompare(String(a.timestamp)));
          const mostRecent = sorted[0];
          deletedCount = _deleteLogs(r => 
            String(r.timestamp) === String(mostRecent.timestamp) &&
            String(r.buildingId) === String(mostRecent.buildingId) &&
            Number(r.entrance) === Number(mostRecent.entrance)
          );
        }
      } else if (!buildingId) {
        return _cors(_ok({ ok: false, error: "buildingId required (unless undoLast=true)" }));
      } else if (latest) {
        // delete the most recent row for that building (and entrance if given)
        const all = _readSheet(SHEET_LOGS);
        const filtered = all
          .filter(r => String(r.buildingId) === buildingId && (entrance == null || Number(r.entrance) === entrance))
          .sort((a,b) => String(b.timestamp).localeCompare(String(a.timestamp)));
        if (filtered[0]) {
          const target = filtered[0];
          deletedCount = _deleteLogs(r => 
            String(r.timestamp) === String(target.timestamp) && 
            String(r.buildingId) === buildingId && 
            (entrance == null || Number(r.entrance) === entrance)
          );
        }
      } else {
        // delete all matching rows
        deletedCount = _deleteLogs(r => 
          String(r.buildingId) === buildingId && 
          (entrance == null || Number(r.entrance) === entrance)
        );
      }

      return _cors(_ok({ ok: true, deletedCount }));
    }
    
    return _cors(_ok({ ok: true }));
  } catch (error) {
    console.error('doGet error:', error);
    return _cors(ContentService.createTextOutput(JSON.stringify({ 
      error: error.toString(),
      stack: error.stack 
    })).setMimeType(ContentService.MimeType.JSON));
  }
}

function doPost(e) {
  try {
    // method override for DELETE
    const methodOverride = e?.parameter?._method || "";
    if (methodOverride.toUpperCase() === "DELETE") {
      // Temporarily disable auth for testing - remove in production
      // if (!_requireAuth(e)) {
      //   return _cors(ContentService.createTextOutput(JSON.stringify({ error: "Unauthorized" })).setMimeType(ContentService.MimeType.JSON));
      // }
      
      const body = JSON.parse(e.postData.contents || "{}");
      const buildingId = String(body.buildingId || "");
      const entrance = body.entrance != null ? Number(body.entrance) : null;
      const latest = !!body.latest;
      const undoLast = !!body.undoLast;
    
    let deletedCount = 0;

    if (undoLast) {
      // Delete the most recent log entry (regardless of building)
      const all = _readSheet(SHEET_LOGS);
      if (all.length > 0) {
        const sorted = all.sort((a,b) => String(b.timestamp).localeCompare(String(a.timestamp)));
        const mostRecent = sorted[0];
        deletedCount = _deleteLogs(r => 
          String(r.timestamp) === String(mostRecent.timestamp) &&
          String(r.buildingId) === String(mostRecent.buildingId) &&
          Number(r.entrance) === Number(mostRecent.entrance)
        );
      }
    } else if (!buildingId) {
      return _cors(_ok({ ok:false, error:"buildingId required (unless undoLast=true)" }));
    } else if (latest) {
      // delete the most recent row for that building (and entrance if given)
      const all = _readSheet(SHEET_LOGS);
      const filtered = all
        .filter(r => String(r.buildingId) === buildingId && (entrance == null || Number(r.entrance) === entrance))
        .sort((a,b) => String(b.timestamp).localeCompare(String(a.timestamp)));
      if (filtered[0]) {
        const target = filtered[0];
        deletedCount = _deleteLogs(r => 
          String(r.timestamp) === String(target.timestamp) && 
          String(r.buildingId) === buildingId && 
          (entrance == null || Number(r.entrance) === entrance)
        );
      }
    } else {
      // delete all matching rows
      deletedCount = _deleteLogs(r => 
        String(r.buildingId) === buildingId && 
        (entrance == null || Number(r.entrance) === entrance)
      );
    }

    return _cors(_ok({ ok: true, deletedCount }));
  }

  // normal create
  // Temporarily disable auth for testing - remove in production
  // if (!_requireAuth(e)) {
  //   return _cors(ContentService.createTextOutput(JSON.stringify({ error: "Unauthorized" })).setMimeType(ContentService.MimeType.JSON));
  // }
  
  const body = JSON.parse(e.postData.contents || "{}");
  const buildingId = String(body.buildingId || "");
  const buildingName = String(body.buildingName || "");
  const entrance = Number(body.entrance || 1);
  const lat = Number(body.lat || 0);
  const lng = Number(body.lng || 0);
  const accuracy = Number(body.accuracy || 0);
  const userId = String(body.userId || "anon");
  const underConstruction = !!body.underConstruction;

  if (!buildingId || !buildingName || !entrance || isNaN(lat) || isNaN(lng)) {
    return _cors(_ok({ ok:false, error:"Missing or invalid fields" }));
  }
  
  // Validate ranges
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return _cors(_ok({ ok:false, error:"Lat/Lng out of range" }));
  }
  
  const timestamp = new Date().toISOString();
  _appendRow(SHEET_LOGS, [timestamp, userId, buildingId, buildingName, entrance, lat, lng, accuracy, underConstruction]);
  return _cors(_ok({ ok: true }));
  } catch (error) {
    console.error('doPost error:', error);
    return _cors(ContentService.createTextOutput(JSON.stringify({ 
      error: error.toString(),
      stack: error.stack 
    })).setMimeType(ContentService.MimeType.JSON));
  }
}

/**
 * One-time setup function to create sheets with headers
 * Run this manually after creating the script
 */
function setupSheets() {
  const ss = _ss();
  
  // Create or setup buildings sheet
  let buildingsSheet = ss.getSheetByName(SHEET_BUILDINGS);
  if (!buildingsSheet) {
    buildingsSheet = ss.insertSheet(SHEET_BUILDINGS);
  }
  
  // Add headers if sheet is empty
  if (buildingsSheet.getLastRow() === 0) {
    buildingsSheet.appendRow(['id', 'name', 'entrancesMax']);
  }

  // Create or setup logs sheet
  let logsSheet = ss.getSheetByName(SHEET_LOGS);
  if (!logsSheet) {
    logsSheet = ss.insertSheet(SHEET_LOGS);
  }
  
  // Add headers if sheet is empty
  if (logsSheet.getLastRow() === 0) {
    logsSheet.appendRow(['timestamp', 'userId', 'buildingId', 'buildingName', 'entrance', 'lat', 'lng', 'accuracy', 'underConstruction']);
  }

  console.log('Sheets setup complete!');
}

/**
 * One-time function to import buildings from the frontend buildings.json
 * WARNING: This will REPLACE all existing building data!
 * Only run this on a fresh/empty buildings sheet.
 */
function importBuildings() {
  const buildings = [
    { id: "ENG-01", name: "Engineering Building A", entrancesMax: 3 },
    { id: "ENG-02", name: "Engineering Building B", entrancesMax: 4 },
    { id: "LIB-01", name: "Main Library", entrancesMax: 2 },
    { id: "STU-01", name: "Student Center", entrancesMax: 5 },
    { id: "SCI-01", name: "Science Building", entrancesMax: 5 },
    { id: "ADM-01", name: "Administration Building", entrancesMax: 2 },
    { id: "GYM-01", name: "Recreation Center", entrancesMax: 3 },
    { id: "ART-01", name: "Arts & Humanities Hall", entrancesMax: 5 }
  ];

  const ss = _ss();
  const buildingsSheet = ss.getSheetByName(SHEET_BUILDINGS);
  
  if (!buildingsSheet) {
    throw new Error('Buildings sheet not found. Run setupSheets() first.');
  }

  // Check if there's existing data
  if (buildingsSheet.getLastRow() > 1) {
    const ui = SpreadsheetApp.getUi();
    const response = ui.alert(
      'Warning: Data will be overwritten',
      'This will DELETE all existing building data and replace it with dummy data. Continue?',
      ui.ButtonSet.YES_NO
    );
    
    if (response !== ui.Button.YES) {
      console.log('Import cancelled by user');
      return;
    }
  }

  // Clear existing data (except headers)
  if (buildingsSheet.getLastRow() > 1) {
    buildingsSheet.deleteRows(2, buildingsSheet.getLastRow() - 1);
  }

  // Add buildings
  buildings.forEach(building => {
    buildingsSheet.appendRow([
      building.id, 
      building.name, 
      building.entrancesMax || ""
    ]);
  });

  console.log(`Imported ${buildings.length} buildings!`);
}

/**
 * Safe function to add sample buildings WITHOUT deleting existing data
 * Use this if you want to add dummy buildings alongside your real ones
 */
function addSampleBuildings() {
  const buildings = [
    { id: "SAMPLE-01", name: "Sample Building A", entrancesMax: 3 },
    { id: "SAMPLE-02", name: "Sample Building B", entrancesMax: 5 }
  ];

  const ss = _ss();
  const buildingsSheet = ss.getSheetByName(SHEET_BUILDINGS);
  
  if (!buildingsSheet) {
    throw new Error('Buildings sheet not found. Run setupSheets() first.');
  }

  // Add buildings without clearing existing data
  buildings.forEach(building => {
    buildingsSheet.appendRow([
      building.id, 
      building.name, 
      building.entrancesMax || ""
    ]);
  });

  console.log(`Added ${buildings.length} sample buildings to existing data!`);
}

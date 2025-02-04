// server.js
const express = require('express');
const multer = require('multer');
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
// const { exec } = require('child_process'); // Uncomment if using FFmpeg for conversion

// 0) Load environment variables from .env (for local development only)
require('dotenv').config();

// 1) Express initialization
const app = express();

// Serve static files from 'public' directory
app.use(express.static(path.join(__dirname, 'public')));
app.use('/audio', express.static(path.join(__dirname, 'audio')));

// 2) Multer config: store file temporarily in 'uploads/' folder
const upload = multer({ 
  dest: 'uploads/',
  limits: { fileSize: 100 * 1024 * 1024 }, // 100 MB limit (adjust as needed)
});

// 3) Google Drive Auth - service account
const SCOPES = ['https://www.googleapis.com/auth/drive.file'];

// Decode and parse the service account JSON from the environment variable
const decodedCredentials = Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT_JSON, 'base64').toString('utf-8');
const credentials = JSON.parse(decodedCredentials);

// Create an auth object from the service account
const auth = new google.auth.GoogleAuth({
  credentials: credentials,
  scopes: SCOPES,
});

// Load existing subfolder map (if exists), or initialize a new one
const SUBFOLDER_MAP_PATH = path.join(__dirname, 'subfolder_map.json');
let SUBFOLDER_MAP = {};

if (fs.existsSync(SUBFOLDER_MAP_PATH)) {
  SUBFOLDER_MAP = JSON.parse(fs.readFileSync(SUBFOLDER_MAP_PATH, 'utf-8'));
} else {
  SUBFOLDER_MAP = {}; // Initialize empty mapping
}

// Function to create a new folder in Google Drive
async function createDriveFolder(folderName) {
  const driveService = google.drive({ version: 'v3', auth: await auth.getClient() });

  const fileMetadata = {
    name: folderName,
    mimeType: 'application/vnd.google-apps.folder',
    parents: ['1kaua6xYUe-Rl7Z0uFBhcsG_GpKb18Db-'] // Root parent folder ID (update this!)
  };

  const folder = await driveService.files.create({
    requestBody: fileMetadata,
    fields: 'id'
  });

  return folder.data.id; // Return newly created folder ID
}

// Function to sanitize filenames by removing or replacing invalid characters
function sanitizeFilename(filename) {
  return filename.replace(/[^a-z0-9_\-\.]/gi, '_');
}

// Function to generate a timestamped filename with username
// function generateFilenameWithUsername(username, extension = 'webm') {
//   const now = new Date();
//   const year = now.getFullYear();
//   const month = String(now.getMonth() + 1).padStart(2, '0'); // Months are zero-based
//   const day = String(now.getDate()).padStart(2, '0');
//   const hours = String(now.getHours()).padStart(2, '0');
//   const minutes = String(now.getMinutes()).padStart(2, '0');
//   const seconds = String(now.getSeconds()).padStart(2, '0');
//   const milliseconds = String(now.getMilliseconds()).padStart(3, '0');
  
//   // Sanitize username to ensure it's safe for filenames
//   const safeUsername = sanitizeFilename(username);
  
//   return `${safeUsername}_${year}-${month}-${day}_${hours}-${minutes}-${seconds}-${milliseconds}.${extension}`;
// }

// 4) Upload route
app.post('/api/upload', upload.single('videoFile'), async (req, res) => {
  if (!req.file) {
    console.error('Upload Error: No file uploaded.');
    return res.status(400).json({ success: false, error: 'No file uploaded.' });
  }

  // Validate user consent
  const consentGiven = req.body.consentGiven;
  if (consentGiven !== 'true') {
    // Delete the uploaded file as consent was not given
    fs.unlink(req.file.path, (err) => {
      if (err) {
        console.error('Error deleting file without consent:', err);
      } else {
        console.log('File deleted due to lack of consent:', req.file.path);
      }
    });
    console.warn('Upload Error: Consent not given for media release.');
    return res.status(400).json({ success: false, error: 'Consent not given for media release.' });
  }

  try {
    const driveService = google.drive({ version: 'v3', auth: await auth.getClient() });

    const trackName = req.body.trackName;

    let folderId;
    if (SUBFOLDER_MAP[trackName]) {
      folderId = SUBFOLDER_MAP[trackName]; // Use existing folder
    } else {
      console.log(`Creating new folder for ${trackName}...`);
      folderId = await createDriveFolder(trackName);
      SUBFOLDER_MAP[trackName] = folderId; // Update mapping

      // Persist updated mapping to file
      fs.writeFileSync(SUBFOLDER_MAP_PATH, JSON.stringify(SUBFOLDER_MAP, null, 4), 'utf-8');
    }

    // Retrieve the username from the form data
    const username = req.body.username || 'UnknownUser';

    // Generate filename with username and timestamp
    const filename = `${username}_${Date.now()}.webm`;

    console.log(`Uploading file: ${filename} to folder ID: ${folderId}`);

    const fileMetadata = {
      name: filename,
      parents: [folderId],
    };
    const media = {
      mimeType: 'video/webm',
      body: fs.createReadStream(req.file.path),
    };

    const driveResponse = await driveService.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id, name, parents',
    });

    console.log('Uploaded file Id:', driveResponse.data.id);

    fs.unlink(req.file.path, (err) => {
      if (err) console.error('Error deleting temp file:', err);
    });

    return res.json({
      success: true,
      driveFileId: driveResponse.data.id,
      driveFileName: driveResponse.data.name,
      folderIdUsed: folderId
    });

  } catch (err) {
    console.error('Drive upload error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
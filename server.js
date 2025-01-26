// server.js
const express = require('express');
const multer = require('multer');
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

// 0) Load environment variables from .env (for local development)
require('dotenv').config();

// 1) Express initialization
const app = express();

app.use(express.static(path.join(__dirname, 'public')));
app.use('/audio', express.static(path.join(__dirname, 'audio')));

const PORT = process.env.PORT || 3000;

// 2) Multer config: store file temporarily in 'uploads/' folder
const upload = multer({ dest: 'uploads/' });

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

const SUBFOLDER_MAP = {
  '1.mp3': '1jORtSeAsseT0V3xYR9dihoZKtiERRJK',
  '2.mp3': '1dYjq1N9dxa7QKbQDdVp59uWGIQdHSE60',
  '3.mp3': '1AQ5_72gaTg_rji9g7IC7G_D0xR7XjyUq'
  // Add more mappings as needed
};

// 4) Upload route
app.post('/api/upload', upload.single('videoFile'), async (req, res) => {
  if (!req.file) {
    return res.status(400).send('No file uploaded.');
  }

  try {
    // Create a Drive client
    const driveService = google.drive({ version: 'v3', auth: await auth.getClient() });

    // Determine target file name and path
    const originalName = req.file.originalname || 'untitled.webm';
    const localFilePath = req.file.path; // e.g. 'uploads/abc123'

    const trackName = req.body.trackName;
    const folderId = SUBFOLDER_MAP[trackName] || '1kaua6xYUe-Rl7Z0uFBhcsG_GpKb18Db-';  // Default folder ID

    // 5) Upload to Google Drive
    const fileMetadata = {
      name: originalName,
      parents: [folderId], // Optional: specify a folder ID in Google Drive
    };
    const media = {
      mimeType: req.file.mimetype,
      body: fs.createReadStream(localFilePath),
    };

    const driveResponse = await driveService.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id, name, parents',
    });

    console.log('Uploaded file Id:', driveResponse.data.id);

    // 6) [Optional] Delete the local file to save space
    fs.unlink(localFilePath, (err) => {
      if (err) console.error('Error deleting temp file:', err);
    });

    // 7) Respond to client
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
app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});

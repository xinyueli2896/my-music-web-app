const express = require('express');
const multer = require('multer');
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

// Initialize Express
const app = express();

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/audio', express.static(path.join(__dirname, 'audio')));

// Multer configuration: store files temporarily in 'uploads/' folder
const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 100 * 1024 * 1024 }, // 100 MB limit
});

// Google Drive Authentication
const SCOPES = ['https://www.googleapis.com/auth/drive.file'];

// Decode service account credentials
const decodedCredentials = Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT_JSON, 'base64').toString('utf-8');
const credentials = JSON.parse(decodedCredentials);

// Create an auth object
const auth = new google.auth.GoogleAuth({
  credentials: credentials,
  scopes: SCOPES,
});

// Google Drive folder where all files will be stored
const MAIN_FOLDER_ID = '1kaua6xYUe-Rl7Z0uFBhcsG_GpKb18Db-'; // Update this with your Drive folder ID

// Function to sanitize filenames
function sanitizeFilename(filename) {
  return filename.replace(/[^a-z0-9_\-\.]/gi, '_');
}

// Function to generate a formatted filename
function generateFilename(trackIndex, username) {
  const now = new Date();
  const formattedDate = now.toISOString().replace(/:/g, '-').split('.')[0]; // Format YYYY-MM-DDTHH-MM-SS
  const safeUsername = sanitizeFilename(username);

  return `${trackIndex}_${safeUsername}_${formattedDate}.mp3`;
}

// Upload route
app.post('/api/upload', upload.single('videoFile'), async (req, res) => {
  if (!req.file) {
    console.error('Upload Error: No file uploaded.');
    return res.status(400).json({ success: false, error: 'No file uploaded.' });
  }

  // Validate user consent
  const consentGiven = req.body.consentGiven;
  if (consentGiven !== 'true') {
    fs.unlink(req.file.path, (err) => {
      if (err) console.error('Error deleting file without consent:', err);
    });
    return res.status(400).json({ success: false, error: 'Consent not given for media release.' });
  }

  try {
    const driveService = google.drive({ version: 'v3', auth: await auth.getClient() });

    // Get track index and username from request body
    const trackIndex = req.body.trackName || 'UnknownTrack';
    const username = req.body.username || 'UnknownUser';

    // Generate filename
    const filename = generateFilename(trackIndex, username);

    console.log(`Uploading file: ${filename} to Google Drive folder ID: ${MAIN_FOLDER_ID}`);

    const fileMetadata = {
      name: filename,
      parents: [MAIN_FOLDER_ID], // Upload all files to a single folder
    };
    const media = {
      mimeType: 'audio/mp3',
      body: fs.createReadStream(req.file.path),
    };

    // Upload file to Google Drive
    const driveResponse = await driveService.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id, name, parents',
    });

    console.log('Uploaded file ID:', driveResponse.data.id);

    // Delete temporary file after upload
    fs.unlink(req.file.path, (err) => {
      if (err) console.error('Error deleting temp file:', err);
    });

    return res.json({
      success: true,
      driveFileId: driveResponse.data.id,
      driveFileName: driveResponse.data.name,
      folderIdUsed: MAIN_FOLDER_ID
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

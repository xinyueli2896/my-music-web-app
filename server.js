const express = require('express');
const multer = require('multer');
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

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
const decodedCredentials = Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT_JSON, 'base64').toString('utf-8');
const credentials = JSON.parse(decodedCredentials);

const auth = new google.auth.GoogleAuth({
  credentials: credentials,
  scopes: SCOPES,
});

// Google Drive folder ID (update with your Drive folder ID)
const MAIN_FOLDER_ID = '1nUlBJi8dfh7FkCoqHz97VhIJbt5A5F4z';

function sanitizeFilename(filename) {
  return filename.replace(/[^a-z0-9_\-\.]/gi, '_');
}

function generateFilename(trackIndex, username) {
  const now = new Date();
  const formattedDate = now.toISOString().replace(/:/g, '-').split('.')[0];
  const safeUsername = sanitizeFilename(username);
  return `${trackIndex}_${safeUsername}_${formattedDate}.mp4`;
}

app.post('/api/upload', upload.single('videoFile'), async (req, res) => {
  if (!req.file) {
    console.error('Upload Error: No file uploaded.');
    return res.status(400).json({ success: false, error: 'No file uploaded.' });
  }

  const consentGiven = req.body.consentGiven;
  if (consentGiven !== 'true') {
    fs.unlink(req.file.path, (err) => {
      if (err) console.error('Error deleting file without consent:', err);
    });
    return res.status(400).json({ success: false, error: 'Consent not given for media release.' });
  }

  try {
    const driveService = google.drive({ version: 'v3', auth: await auth.getClient() });
    const trackIndex = req.body.trackName || 'UnknownTrack';
    const username = req.body.username || 'UnknownUser';
    const filename = generateFilename(trackIndex, username);

    console.log(`Uploading file: ${filename} to Google Drive folder ID: ${MAIN_FOLDER_ID}`);

    const fileMetadata = {
      name: filename,
      parents: [MAIN_FOLDER_ID],
    };
    const media = {
      mimeType: 'video/mp4',
      body: fs.createReadStream(req.file.path),
    };

    const driveResponse = await driveService.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id, name, parents',
    });

    console.log('Uploaded file ID:', driveResponse.data.id);

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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});

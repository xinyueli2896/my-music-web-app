const express = require('express');
const multer = require('multer');
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

// Load environment variables (for local development)
require('dotenv').config();

// Initialize Express app
const app = express();

// Serve static files from 'public' directory
app.use(express.static(path.join(__dirname, 'public')));
app.use('/audio', express.static(path.join(__dirname, 'audio')));

// Configure Multer (store files temporarily)
const upload = multer({ 
  dest: 'uploads/',
  limits: { fileSize: 100 * 1024 * 1024 }, // 100 MB limit
});

// Google Drive API authentication
const SCOPES = ['https://www.googleapis.com/auth/drive.file'];
const decodedCredentials = Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT_JSON, 'base64').toString('utf-8');
const credentials = JSON.parse(decodedCredentials);

const auth = new google.auth.GoogleAuth({
  credentials: credentials,
  scopes: SCOPES,
});

// ** Google Drive Parent Folder (Where all videos will be stored) **
const PARENT_FOLDER_ID = "1kaua6xYUe-Rl7Z0uFBhcsG_GpKb18Db-"; // <-- Change this to your Google Drive folder ID

// Function to sanitize filenames (remove invalid characters)
function sanitizeFilename(filename) {
  return filename.replace(/[^a-zA-Z0-9_\-\.]/g, '_');
}

// Function to generate a formatted filename
function generateFilename(musicIndex, username) {
  const now = new Date();
  const timestamp = now.toISOString().replace(/[-:T.]/g, '').slice(0, 14); // YYYYMMDDHHMMSS format
  const safeUsername = sanitizeFilename(username);
  return `${musicIndex}_${safeUsername}_${timestamp}.mp3`;
}

// ** Upload Route **
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

    // Get user details from form data
    const musicIndex = req.body.cardNumber || "unknown";
    const username = req.body.username || "Anonymous";

    // Generate formatted filename
    const filename = generateFilename(musicIndex, username);
    console.log(`Uploading file as: ${filename}`);

    // Upload to Google Drive
    const fileMetadata = {
      name: filename,
      parents: [PARENT_FOLDER_ID], // Upload to a single folder
    };
    const media = {
      mimeType: 'audio/mp3', // Assuming files are MP3
      body: fs.createReadStream(req.file.path),
    };

    const driveResponse = await driveService.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id, name, parents',
    });

    console.log('Uploaded file Id:', driveResponse.data.id);

    // Delete local temporary file
    fs.unlink(req.file.path, (err) => {
      if (err) console.error('Error deleting temp file:', err);
    });

    // Respond to client
    return res.json({
      success: true,
      driveFileId: driveResponse.data.id,
      driveFileName: driveResponse.data.name,
      folderIdUsed: PARENT_FOLDER_ID
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

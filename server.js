// server.js
const express = require('express');
const multer = require('multer');
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

// 1) Express initialization
const app = express();

app.use(express.static(path.join(__dirname, 'public')));
app.use('/audio', express.static(path.join(__dirname, 'audio')));

const PORT = process.env.PORT || 3000;

// 2) Multer config: store file temporarily in 'uploads/' folder
const upload = multer({ dest: 'uploads/' });

// 3) Google Drive Auth - service account
//    Replace with the path to your JSON key file or load from environment
const KEYFILEPATH = path.join(__dirname, 'my-video-web-449011-cc4dd6f5fdce.json'); 
const SCOPES = ['https://www.googleapis.com/auth/drive.file'];

// Create an auth object from the service account
const auth = new google.auth.GoogleAuth({
  keyFile: KEYFILEPATH,
  scopes: SCOPES,
});

const SUBFOLDER_MAP = {
    '1.mp3': '1jORtSeAsseT0V3xYR9dihoZKtiERRJK',
    '2.mp3': '1dYjq1N9dxa7QKbQDdVp59uWGIQdHSE60',
    '3.mp3': '1AQ5_72gaTg_rji9g7IC7G_D0xR7XjyUq'
    // etc.
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
    // const mimeType = req.file.mimetype;

    const trackName = req.body.trackName;
    // Optional: If you want to store files in a specific folder on Drive,
    // replace `folderIdHere` with a real folder ID
    const folderId = SUBFOLDER_MAP[trackName] || '1kaua6xYUe-Rl7Z0uFBhcsG_GpKb18Db-';  // e.g. '1A2B3CsomeUniqueId'
    
    // 5) Upload to Google Drive
    const fileMetadata = {
      name: originalName,
      parents: [folderId], // optional, remove if you want to store in root
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

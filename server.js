// server.js
const express = require('express');
const multer = require('multer');
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process'); // To execute FFmpeg commands

// 0) Load environment variables from .env (for local development only)
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

  const originalName = req.file.originalname || 'untitled.webm';
  const localFilePath = req.file.path; // e.g. 'uploads/abc123'
  const trackName = req.body.trackName;
  const folderId = SUBFOLDER_MAP[trackName] || '1kaua6xYUe-Rl7Z0uFBhcsG_GpKb18Db-';  // Default folder ID

  // Define paths for the converted MP4 file
  const convertedFileName = path.parse(originalName).name + '.mp4';
  const convertedFilePath = path.join(path.dirname(localFilePath), convertedFileName);

  // 5) Convert WebM to MP4 using FFmpeg
  exec(`ffmpeg -i ${localFilePath} -c:v libx264 -c:a aac ${convertedFilePath}`, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error converting file: ${error.message}`);
      return res.status(500).json({ success: false, error: 'Error converting video to MP4.' });
    }

    console.log(`Conversion stdout: ${stdout}`);
    console.error(`Conversion stderr: ${stderr}`);

    // 6) Upload the converted MP4 file to Google Drive
    (async () => {
      try {
        const driveService = google.drive({ version: 'v3', auth: await auth.getClient() });

        const fileMetadata = {
          name: convertedFileName,
          parents: [folderId], // Optional: specify a folder ID in Google Drive
        };
        const media = {
          mimeType: 'video/mp4',
          body: fs.createReadStream(convertedFilePath),
        };

        const driveResponse = await driveService.files.create({
          requestBody: fileMetadata,
          media: media,
          fields: 'id, name, parents',
        });

        console.log('Uploaded file Id:', driveResponse.data.id);

        // 7) Delete the local WebM and MP4 files to save space
        fs.unlink(localFilePath, (err) => {
          if (err) console.error('Error deleting temp WebM file:', err);
        });

        fs.unlink(convertedFilePath, (err) => {
          if (err) console.error('Error deleting temp MP4 file:', err);
        });

        // 8) Respond to client
        return res.json({
          success: true,
          driveFileId: driveResponse.data.id,
          driveFileName: driveResponse.data.name,
          folderIdUsed: folderId
        });

      } catch (err) {
        console.error('Drive upload error:', err);
        return res.status(500).json({ success: false, error: 'Error uploading MP4 to Google Drive.' });
      }
    })();
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});

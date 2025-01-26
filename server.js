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

// Map track names to Google Drive folder IDs
const SUBFOLDER_MAP = {
  '1.mp3': '1jORtSeAsseT0V3xYR9dihoZKtiERRJK',
  '2.mp3': '1dYjq1N9dxa7QKbQDdVp59uWGIQdHSE60',
  '3.mp3': '1AQ5_72gaTg_rji9g7IC7G_D0xR7XjyUq'
  // Add more mappings as needed
};

// Function to sanitize filenames by removing or replacing invalid characters
function sanitizeFilename(filename) {
  return filename.replace(/[^a-z0-9_\-\.]/gi, '_');
}

// Function to generate a timestamped filename with username
function generateFilenameWithUsername(username, extension = 'webm') {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0'); // Months are zero-based
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  const milliseconds = String(now.getMilliseconds()).padStart(3, '0');
  
  // Sanitize username to ensure it's safe for filenames
  const safeUsername = sanitizeFilename(username);
  
  return `${safeUsername}_${year}-${month}-${day}_${hours}-${minutes}-${seconds}-${milliseconds}.${extension}`;
}

// 4) Upload route
app.post('/api/upload', upload.single('videoFile'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, error: 'No file uploaded.' });
  }

  // Validate user consent
  const consentGiven = req.body.consentGiven;
  if (consentGiven !== 'true') {
    // Delete the uploaded file as consent was not given
    fs.unlink(req.file.path, (err) => {
      if (err) console.error('Error deleting file without consent:', err);
      else console.log('File deleted due to lack of consent:', req.file.path);
    });
    return res.status(400).json({ success: false, error: 'Consent not given for media release.' });
  }

  try {
    // Create a Drive client
    const driveService = google.drive({ version: 'v3', auth: await auth.getClient() });

    // Determine target file name and path
    const originalName = req.file.originalname || 'untitled.webm';
    const localFilePath = req.file.path; // e.g., 'uploads/abc123'

    const trackName = req.body.trackName;
    const folderId = SUBFOLDER_MAP[trackName] || '1kaua6xYUe-Rl7Z0uFBhcsG_GpKb18Db-';  // Default folder ID

    // Retrieve the username from the form data
    const username = req.body.username || 'UnknownUser';

    // Generate filename with username and timestamp
    const filename = generateFilenameWithUsername(username, 'webm'); // Change 'webm' to 'mp4' if converting

    // 5) [Optional] Convert WebM to MP4 using FFmpeg
    // If you want to convert the video to MP4, uncomment the following block and ensure FFmpeg is installed on the server.

    /*
    const convertedFilePath = path.join('uploads', `${filename}.mp4`);
    await new Promise((resolve, reject) => {
      exec(`ffmpeg -i ${localFilePath} ${convertedFilePath}`, (error, stdout, stderr) => {
        if (error) {
          console.error('FFmpeg conversion error:', error);
          reject(error);
        } else {
          resolve();
        }
      });
    });

    // Update variables for the converted file
    const finalFilePath = convertedFilePath;
    const finalMimeType = 'video/mp4';
    */

    // 5) Upload to Google Drive (WebM format)
    const fileMetadata = {
      name: filename, // Use the generated filename with username
      parents: [folderId], // Specify the target Google Drive folder ID
    };
    const media = {
      mimeType: 'video/webm', // Change to 'video/mp4' if converting
      body: fs.createReadStream(localFilePath), // Use 'convertedFilePath' if converting
    };

    const driveResponse = await driveService.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id, name, parents',
    });

    console.log('Uploaded file Id:', driveResponse.data.id);
    console.log('Uploaded file Name:', driveResponse.data.name);

    // 6) [Optional] Delete the local file to save space
    fs.unlink(localFilePath, (err) => {
      if (err) console.error('Error deleting temp file:', err);
      else console.log('Temporary file deleted:', localFilePath);
    });

    // If you converted the file, delete the original WebM file as well
    /*
    fs.unlink(localFilePath, (err) => {
      if (err) console.error('Error deleting original WebM file:', err);
      else console.log('Original WebM file deleted:', localFilePath);
    });
    */

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
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});

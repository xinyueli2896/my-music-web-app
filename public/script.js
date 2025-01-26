// script.js

// Global variables
let mediaRecorder;
let chunks = [];
let cardNumber = null;

// Get references to HTML elements
const drawButton = document.getElementById('draw-button');
const cardDisplay = document.getElementById('card-display');
const recordButton = document.getElementById('record-button');
const stopButton = document.getElementById('stop-button');
const audioPlayer = document.getElementById('audio-player');
const localVideo = document.getElementById('local-video'); // Reference to the <video> element

// 1. DRAW A CARD (randomly pick a number)
drawButton.addEventListener('click', async () => {
  // Suppose you have 3 tracks: track1.mp3, track2.mp3, track3.mp3
  const totalCards = 3; 
  cardNumber = Math.floor(Math.random() * totalCards) + 1;

  cardDisplay.textContent = "You drew card #" + cardNumber;

  // 2. PLAY MUSIC CORRESPONDING TO THAT NUMBER
  audioPlayer.src = `/audio/${cardNumber}.mp3`;
  audioPlayer.style.display = 'block'; // Show audio controls (optional)
  audioPlayer.play();

  // 3. REQUEST CAMERA PERMISSION & SET UP RECORDING
  try {
    // Request access to camera and microphone
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    
    // Show the local camera feed in the <video> element
    localVideo.style.display = 'block';  // Make sure it's visible
    localVideo.srcObject = stream;       // Attach the stream to the video element
    localVideo.play();                   // Start playing the feed in the video

    // Validate MIME type support
    let options = { mimeType: 'video/webm; codecs=vp8' };
    if (!MediaRecorder.isTypeSupported(options.mimeType)) {
      console.warn(`${options.mimeType} is not supported, using default codec.`);
      options = { mimeType: 'video/webm' }; // Let the browser choose the best available codec
    }

    // Initialize MediaRecorder with validated options
    mediaRecorder = new MediaRecorder(stream, options);

    chunks = [];
    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunks.push(event.data);
      }
    };
    mediaRecorder.onstop = handleRecordingStop;

    // Enable the record button and disable the stop button
    recordButton.disabled = false;
    stopButton.disabled = true;

  } catch (err) {
    console.error("Error accessing camera/mic:", err);
    if (err.name === 'NotAllowedError') {
      alert("Permission denied. Please allow access to camera and microphone.");
    } else if (err.name === 'NotFoundError') {
      alert("No camera or microphone found. Please connect a device.");
    } else {
      alert("Could not access camera or microphone. Error: " + err.message);
    }
  }
});

// 4. START RECORDING
recordButton.addEventListener('click', () => {
  if (!mediaRecorder) {
    alert("Media Recorder not initialized.");
    return;
  }

  // Reset chunks
  chunks = [];

  // Restart music from the beginning (optional)
  audioPlayer.currentTime = 0;
  audioPlayer.play();

  // Start recording
  try {
    mediaRecorder.start();
    console.log("Recording started...");
    
    // Disable the record button and enable the stop button
    recordButton.disabled = true;
    stopButton.disabled = false;
  } catch (error) {
    console.error("Error starting recording:", error);
    alert("Could not start recording. Please try again.");
  }
});

// 5. STOP RECORDING
stopButton.addEventListener('click', () => {
  if (!mediaRecorder) {
    alert("Media Recorder not initialized.");
    return;
  }

  // Stop recording
  mediaRecorder.stop();
  console.log("Recording stopped.");
  
  // Disable the stop button
  stopButton.disabled = true;
});

// Called when recording stops; we have the final Blob
function handleRecordingStop() {
  const recordedBlob = new Blob(chunks, { type: 'video/webm' });
  console.log("Recorded Blob:", recordedBlob);

  // 6. UPLOAD THE VIDEO FILE
  uploadVideo(recordedBlob, cardNumber);
}

// 6. UPLOAD THE VIDEO
function uploadVideo(videoBlob, cardNum) {
  const formData = new FormData();
  formData.append('videoFile', videoBlob, `card${cardNum}.webm`);
  formData.append('cardNumber', cardNum);
  formData.append('trackName', `${cardNum}.mp3`);

  fetch('/api/upload', {
    method: 'POST',
    body: formData
  })
    .then(response => {
      if (!response.ok) {
        throw new Error(`Server error: ${response.statusText}`);
      }
      return response.json();
    })
    .then(data => {
      console.log("Upload success:", data);
      alert("Video uploaded successfully to Google Drive!");
      // Optionally, reset the UI or perform additional actions
    })
    .catch(err => {
      console.error("Upload error:", err);
      alert("Error uploading video. Please try again.");
    });
}

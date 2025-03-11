// Arrays of adjectives and animals
const adjectives = [
  "Brave", "Calm", "Delightful", "Eager", "Faithful", "Gentle",
  "Happy", "Jolly", "Kind", "Lively", "Nice", "Proud", "Silly",
  "Thankful", "Witty", "Zealous", "Clever", "Daring", "Energetic",
  "Fancy", "Graceful", "Humble", "Inventive", "Joyful", "Lucky"
];

const animals = [
  "Lion", "Tiger", "Bear", "Eagle", "Shark", "Panda",
  "Dolphin", "Wolf", "Fox", "Leopard", "Giraffe", "Kangaroo",
  "Zebra", "Elephant", "Cheetah", "Falcon", "Otter", "Squirrel",
  "Monkey", "Rabbit", "Hawk", "Goose", "Owl", "Peacock"
];

// Function to generate a random username
function generateRandomUsername() {
  const randomAdj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const randomAnimal = animals[Math.floor(Math.random() * animals.length)];
  return `${randomAdj}${randomAnimal}`;
}

// Function to set and display the username
function setUsername() {
  let username = localStorage.getItem('username');
  if (!username) {
    username = generateRandomUsername();
    localStorage.setItem('username', username);
  }
  document.getElementById('username').textContent = username;
  document.getElementById('username-display').classList.add('show');
}

window.addEventListener('DOMContentLoaded', setUsername);

// Global variables
let mediaRecorder;
let chunks = [];
let cardNumber = null;
let isRecording = false;
let recordedBlob = null;
let uploadTimeout = null;
let audioEndedListener = null;

// Get references to HTML elements
const drawButton = document.getElementById('draw-button');
const cardDisplay = document.getElementById('card-display');
const recordButton = document.getElementById('record-button');
const stopButton = document.getElementById('stop-button');
const audioPlayer = document.getElementById('audio-player');
const localVideo = document.getElementById('local-video');
const uploadButton = document.getElementById('upload-button');
const statusMessage = document.getElementById('status-message');
const statusText = document.getElementById('status-text');
const spinner = document.getElementById('spinner');

// Modal Elements
const mediaReleaseModal = document.getElementById('media-release-modal');
const closeModalButton = document.getElementById('close-modal');
const agreeButton = document.getElementById('agree-button');
const declineButton = document.getElementById('decline-button');

function openMediaReleaseModal() {
  mediaReleaseModal.style.display = 'block';
}

function closeMediaReleaseModal() {
  mediaReleaseModal.style.display = 'none';
}

function handleAgree() {
  closeMediaReleaseModal();
  startRecordingProcess();
}

function handleDecline() {
  closeMediaReleaseModal();
  alert("You have declined the media release. Recording will not proceed.");
  recordButton.disabled = true;
}

closeModalButton.addEventListener('click', closeMediaReleaseModal);
agreeButton.addEventListener('click', handleAgree);
declineButton.addEventListener('click', handleDecline);

window.addEventListener('click', (event) => {
  if (event.target == mediaReleaseModal) {
    closeMediaReleaseModal();
  }
});

// Initialize MediaRecorder and attach stream to local video
async function initializeMediaRecorder() {
  try {
    // Set constraints with ideal resolution 640x480
    const constraints = {
      video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" },
      audio: true
    };
    const stream = await navigator.mediaDevices.getUserMedia(constraints);

    // Detect mobile devices
    const isMobile = /Mobi|Android/i.test(navigator.userAgent);

    // Set up local video preview
    localVideo.srcObject = stream;
    localVideo.playsInline = true;

    // Mirror preview on mobile using CSS
    if (isMobile) {
      localVideo.style.transform = 'scaleX(-1)';
    }

    let options = { mimeType: 'video/mp4' };
    if (!MediaRecorder.isTypeSupported(options.mimeType)) {
      console.warn(`${options.mimeType} is not supported, falling back to video/webm; codecs=vp8.`);
      options = { mimeType: 'video/webm; codecs=vp8' };
    }

    // For mobile, record a mirrored stream using an offscreen canvas set to 640x480
    if (isMobile) {
      const width = 640;
      const height = 480;
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      // Draw mirrored frames on the canvas
      function drawFrame() {
        ctx.save();
        ctx.scale(-1, 1);
        ctx.drawImage(localVideo, -width, 0, width, height);
        ctx.restore();
        requestAnimationFrame(drawFrame);
      }
      drawFrame();

      // Capture the canvas stream at 30 fps and add audio tracks
      const mirroredStream = canvas.captureStream(30);
      stream.getAudioTracks().forEach(track => mirroredStream.addTrack(track));
      mediaRecorder = new MediaRecorder(mirroredStream, options);
    } else {
      // For desktop, use the original stream which already has 640x480 constraints
      mediaRecorder = new MediaRecorder(stream, options);
    }
    chunks = [];

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunks.push(event.data);
      }
    };
    mediaRecorder.onstop = handleRecordingStop;
  } catch (err) {
    console.error("Error initializing media recorder:", err);
    alert("Could not access camera/microphone. Error: " + err.message);
  }
}

function startRecordingProcess() {
  recordButton.disabled = false;
  localStorage.setItem('consentGiven', 'true');
  cardDisplay.classList.add('show');
}

function resetRecordingState() {
  mediaRecorder = null;
  chunks = [];
  isRecording = false;
  recordedBlob = null;
  uploadTimeout = null;

  if (audioEndedListener && audioPlayer) {
    audioPlayer.removeEventListener('ended', audioEndedListener);
    audioEndedListener = null;
  }

  recordButton.disabled = false;
  stopButton.disabled = true;
  statusMessage.style.display = 'none';
  statusMessage.classList.remove('show');

  localVideo.style.display = 'block';
  if (localVideo.srcObject) {
    localVideo.srcObject.getTracks().forEach(track => track.stop());
    localVideo.srcObject = null;
  }
}

// Draw a card to select a song
drawButton.addEventListener('click', async () => {
  const totalCards = 577; 
  cardNumber = Math.floor(Math.random() * totalCards) + 1;

  cardDisplay.textContent = "You get song #" + cardNumber;
  cardDisplay.classList.add('show');

  audioPlayer.src = `/audio/${cardNumber}.mp3`;
  audioPlayer.style.display = 'block';

  recordButton.disabled = true;
  stopButton.disabled = true;
  uploadButton.disabled = true;

  statusMessage.style.display = 'flex';
  statusMessage.classList.add('show');
  statusText.textContent = 'Listen to the song before starting recording...';
  spinner.style.display = 'none';

  audioPlayer.play();

  await initializeMediaRecorder();

  const onSongEnd = () => {
    recordButton.disabled = false;
    statusMessage.classList.remove('show');
    statusMessage.style.display = 'none';
    audioPlayer.removeEventListener('ended', onSongEnd);
  };

  audioPlayer.addEventListener('ended', onSongEnd);
});

// Start Recording
recordButton.addEventListener('click', () => {
  if (!mediaRecorder) {
    alert("Media Recorder not initialized.");
    return;
  }
  chunks = [];
  audioPlayer.currentTime = 0;
  audioPlayer.play();
  audioPlayer.style.pointerEvents = 'none';

  try {
    mediaRecorder.start();
    isRecording = true;
    console.log("Recording started...");

    recordButton.disabled = true;
    stopButton.disabled = false;
    uploadButton.disabled = true;

    localVideo.style.display = 'block';
    statusMessage.style.display = 'none';
    statusMessage.classList.remove('show');

    audioEndedListener = () => {
      console.log("Audio ended. Automatically stopping the recording.");
      if (mediaRecorder && isRecording) {
        mediaRecorder.stop();
      }
    };
    audioPlayer.addEventListener('ended', audioEndedListener);
  } catch (error) {
    console.error("Error starting recording:", error);
    alert("Could not start recording. Please try again.");
  }
});

// Stop Recording
stopButton.addEventListener('click', () => {
  if (!mediaRecorder || !isRecording) {
    alert("Media Recorder not initialized or not recording.");
    return;
  }
  mediaRecorder.stop();
  isRecording = false;
  console.log("Recording stopped.");

  stopButton.disabled = true;
  recordButton.disabled = false;
  uploadButton.disabled = false;

  audioPlayer.pause();
  audioPlayer.currentTime = 0;
  audioPlayer.style.pointerEvents = 'auto';

  if (audioEndedListener && audioPlayer) {
    audioPlayer.removeEventListener('ended', audioEndedListener);
    audioEndedListener = null;
  }

  localVideo.style.display = 'block';
  if (localVideo.srcObject) {
    localVideo.srcObject.getTracks().forEach(track => track.stop());
    localVideo.srcObject = null;
  }
  initializeMediaRecorder();
});

// Handle Recording Stop
function handleRecordingStop() {
  recordedBlob = new Blob(chunks, { type: mediaRecorder.mimeType });
  console.log("Recorded Blob:", recordedBlob);

  statusMessage.style.display = 'flex';
  statusMessage.classList.add('show');
  statusText.textContent = 'Would you like to upload your video?';
  spinner.style.display = 'none';

  uploadTimeout = setTimeout(() => {
    if (recordedBlob) {
      console.log("Auto-upload triggered after timeout.");
      uploadButton.click();
    }
  }, 30000);
}

// Upload Functionality
uploadButton.addEventListener('click', () => {
  if (uploadTimeout) {
    clearTimeout(uploadTimeout);
    uploadTimeout = null;
  }

  console.log("Upload Button Clicked. Blob:", recordedBlob);
  if (!recordedBlob) {
    alert("No recording available to upload.");
    console.warn("No recording available. recordedBlob is null.");
    return;
  }

  const username = localStorage.getItem('username') || 'UnknownUser';

  statusMessage.style.display = 'flex';
  statusMessage.classList.add('show');
  statusText.textContent = 'Uploading your video to Google Drive...';
  spinner.style.display = 'block';

  uploadButton.disabled = true;

  uploadVideo(recordedBlob, cardNumber, username)
    .then(() => {
      spinner.style.display = 'none';
      statusText.textContent = 'Video uploaded successfully to Google Drive!';
    })
    .catch((err) => {
      spinner.style.display = 'none';
      statusText.textContent = 'Error uploading video. Please try again.';
      console.error("Upload error:", err);
      uploadButton.disabled = false;
    });
});

// Upload the Video
async function uploadVideo(videoBlob, cardNum, username) {
  const formData = new FormData();
  formData.append('videoFile', videoBlob, `recording.mp4`);
  formData.append('trackName', `${cardNum}.mp4`);
  formData.append('username', username);
  formData.append('consentGiven', 'true');

  const response = await fetch('/api/upload', {
    method: 'POST',
    body: formData
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || `Server error: ${response.statusText}`);
  }

  const data = await response.json();
  if (!data.success) {
    throw new Error(data.error || 'Unknown error during upload.');
  }
  return data;
}

// Clean up on unload
window.addEventListener('beforeunload', () => {
  if (localVideo.srcObject) {
    localVideo.srcObject.getTracks().forEach(track => track.stop());
  }
});

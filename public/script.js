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

// Function to generate a random username by combining an adjective and an animal
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
  // Add 'show' class for transition
  document.getElementById('username-display').classList.add('show');
}

// Call setUsername when the page loads
window.addEventListener('DOMContentLoaded', setUsername);

// Global variables
let mediaRecorder;
let chunks = [];
let cardNumber = null;
let isRecording = false;
let recordedBlob = null;
let uploadTimeout = null;
let audioEndedListener = null; // Reference to the audio 'ended' event listener

// Get references to HTML elements
const drawButton = document.getElementById('draw-button');
const cardDisplay = document.getElementById('card-display');
const recordButton = document.getElementById('record-button');
const stopButton = document.getElementById('stop-button');
const audioPlayer = document.getElementById('audio-player');
const localVideo = document.getElementById('local-video'); // Reference to the <video> element
const uploadButton = document.getElementById('upload-button');
const statusMessage = document.getElementById('status-message');
const statusText = document.getElementById('status-text');
const spinner = document.getElementById('spinner');

// Media Release Modal Elements
const mediaReleaseModal = document.getElementById('media-release-modal');
const closeModalButton = document.getElementById('close-modal');
const agreeButton = document.getElementById('agree-button');
const declineButton = document.getElementById('decline-button');

// Function to open the Media Release Modal
function openMediaReleaseModal() {
  mediaReleaseModal.style.display = 'block';
}

// Function to close the Media Release Modal
function closeMediaReleaseModal() {
  mediaReleaseModal.style.display = 'none';
}


// Function to handle user agreeing to the media release
function handleAgree() {
  closeMediaReleaseModal();
  startRecordingProcess();
}

// Function to handle user declining the media release
function handleDecline() {
  closeMediaReleaseModal();
  alert("You have declined the media release. Recording will not proceed.");
  // Optionally, disable the record button
  recordButton.disabled = true;
}

// Event listeners for modal buttons
closeModalButton.addEventListener('click', closeMediaReleaseModal);
agreeButton.addEventListener('click', handleAgree);
declineButton.addEventListener('click', handleDecline);

// Close the modal if the user clicks outside the modal content
window.addEventListener('click', (event) => {
  if (event.target == mediaReleaseModal) {
    closeMediaReleaseModal();
  }
});

// Function to initialize MediaRecorder and attach stream to local video preview
async function initializeMediaRecorder() {
  try {
    // Request access to camera and microphone
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    
    // Attach the stream to the local video element
    localVideo.srcObject = stream;

    // Validate MIME type support: Try MP4 first; if not, fallback to WebM
    let options = { mimeType: 'video/mp4' };
    if (!MediaRecorder.isTypeSupported(options.mimeType)) {
      console.warn(`${options.mimeType} is not supported, falling back to video/webm; codecs=vp8.`);
      options = { mimeType: 'video/webm; codecs=vp8' };
    }

    // Initialize MediaRecorder with the chosen options
    mediaRecorder = new MediaRecorder(stream, options);
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

// Function to start the recording process after consent
function startRecordingProcess() {
  // Enable the record button
  recordButton.disabled = false;
  // Persist consent
  localStorage.setItem('consentGiven', 'true');
  cardDisplay.classList.add('show');

}

// Function to reset the recording state
function resetRecordingState() {
  mediaRecorder = null;
  chunks = [];
  isRecording = false;
  recordedBlob = null;
  uploadTimeout = null;

  // Remove the audio 'ended' event listener if it exists
  if (audioEndedListener && audioPlayer) {
    audioPlayer.removeEventListener('ended', audioEndedListener);
    audioEndedListener = null;
  }

  // Reset UI elements
  recordButton.disabled = false;
  stopButton.disabled = true;
  statusMessage.style.display = 'hidden';
  statusMessage.classList.remove('show');


  // Hide the video preview and stop its stream
  localVideo.style.display = 'block';
  if (localVideo.srcObject) {
    localVideo.srcObject.getTracks().forEach(track => track.stop());
    localVideo.srcObject = null;
  }
}

// 1. DRAW A CARD (randomly pick a number)
// drawButton.addEventListener('click', async () => {
//   // Suppose you have 100 cards
//   const totalCards = 100; 
//   cardNumber = Math.floor(Math.random() * totalCards) + 1;

//   cardDisplay.textContent = "You get song #" + cardNumber;
//   cardDisplay.classList.add('show');

//   // 2. PLAY MUSIC CORRESPONDING TO THAT NUMBER
//   audioPlayer.src = `/audio/${cardNumber}.mp3`;
//   audioPlayer.style.display = 'block'; // Show audio controls

//   // 3. Initialize MediaRecorder and request camera/microphone access
//   await initializeMediaRecorder();

//   // Check if consent is already given
//   const consentGiven = localStorage.getItem('consentGiven');
//   if (consentGiven === 'true') {
//     startRecordingProcess();
//   } else {
//     // Show the Media Release Modal to seek user consent
//     openMediaReleaseModal();
//   }

//   // Hide post-record controls and status message from previous recordings
//   statusMessage.style.display = 'hidden';
//   statusMessage.classList.remove('show');
// });

drawButton.addEventListener('click', async () => {
  // Suppose you have 100 cards
  const totalCards = 100; 
  cardNumber = Math.floor(Math.random() * totalCards) + 1;

  cardDisplay.textContent = "You get song #" + cardNumber;
  cardDisplay.classList.add('show');

  // Set the audio source and show audio controls
  audioPlayer.src = `/audio/${cardNumber}.mp3`;
  audioPlayer.style.display = 'block';

  // Disable recording buttons until the song finishes
  recordButton.disabled = true;
  stopButton.disabled = true;
  uploadButton.disabled = true;

  // Show an informational status message
  statusMessage.style.display = 'flex';
  statusMessage.classList.add('show');
  statusText.textContent = 'Listen to the song before start recording...';
  spinner.style.display = 'none';

  // Play the song
  audioPlayer.play();

  // Initialize MediaRecorder and request camera/microphone access
  await initializeMediaRecorder();

  // Add an event listener for when the song ends
  const onSongEnd = () => {
    // Enable the record button after the song has finished
    recordButton.disabled = false;
    // Optionally, clear the info message:
    statusMessage.classList.remove('show');
    statusMessage.style.display = 'none';

    // Remove this event listener so it doesn't fire for subsequent plays
    audioPlayer.removeEventListener('ended', onSongEnd);
  };

  audioPlayer.addEventListener('ended', onSongEnd);

  // Hide any previous status messages (if necessary)
  // (Or leave them until the song finishes, as above)
});


// 4. START RECORDING
recordButton.addEventListener('click', () => {
  if (!mediaRecorder) {
    alert("Media Recorder not initialized.");
    return;
  }

  // Reset chunks and restart the audio
  chunks = [];
  audioPlayer.currentTime = 0;
  audioPlayer.play();
  audioPlayer.style.pointerEvents = 'none'; // Disable manual seeking during recording

  try {
    mediaRecorder.start();
    isRecording = true;
    console.log("Recording started...");

    // Disable record button and enable stop button
    recordButton.disabled = true;
    stopButton.disabled = false;
    uploadButton.disabled = true;

    // Show video preview
    localVideo.style.display = 'block';

    // Hide post-record controls and status message
    statusMessage.style.display = 'hidden';
    statusMessage.classList.remove('show');

    // Define and attach the 'ended' event listener on the audio player
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

// 5. STOP RECORDING
stopButton.addEventListener('click', () => {
  if (!mediaRecorder || !isRecording) {
    alert("Media Recorder not initialized or not recording.");
    return;
  }

  mediaRecorder.stop();
  isRecording = false;
  console.log("Recording stopped.");

  // Disable stop button
  stopButton.disabled = true;
  recordButton.disabled = false;
  uploadButton.disabled = false;

  // Stop music playback and reset audio player
  audioPlayer.pause();
  audioPlayer.currentTime = 0;
  audioPlayer.style.pointerEvents = 'auto';

  // Remove the 'ended' event listener
  if (audioEndedListener && audioPlayer) {
    audioPlayer.removeEventListener('ended', audioEndedListener);
    audioEndedListener = null;
  }

  // Hide video preview and stop its stream
  localVideo.style.display = 'block';
  if (localVideo.srcObject) {
    localVideo.srcObject.getTracks().forEach(track => track.stop());
    localVideo.srcObject = null;
  }
  initializeMediaRecorder();
});

// 6. Handle Recording Stop
function handleRecordingStop() {
  // Create the recorded blob using the MIME type from mediaRecorder
  recordedBlob = new Blob(chunks, { type: mediaRecorder.mimeType });
  console.log("Recorded Blob Assigned to Global Variable:", recordedBlob);

  // Show post-recording controls and update status message
  statusMessage.style.display = 'flex';
  statusMessage.classList.add('show');
  statusText.textContent = 'Would you like to upload your video?';
  spinner.style.display = 'none';

  // Optional: auto-upload after 30 seconds
  uploadTimeout = setTimeout(() => {
    if (recordedBlob) {
      console.log("Auto-upload triggered after timeout.");
      uploadButton.click();
    }
  }, 30000);
}


// 8. UPLOAD FUNCTIONALITY
uploadButton.addEventListener('click', () => {
  if (uploadTimeout) {
    clearTimeout(uploadTimeout);
    uploadTimeout = null;
  }

  console.log("Upload Button Clicked. Current recordedBlob:", recordedBlob);
  if (!recordedBlob) {
    alert("No recording available to upload.");
    console.warn("No recording available to upload. recordedBlob is null.");
    return;
  }

  const username = localStorage.getItem('username') || 'UnknownUser';

  statusMessage.style.display = 'flex';
  statusMessage.classList.add('show');
  statusText.textContent = 'Uploading your video to Google Drive...';
  spinner.style.display = 'block';

  uploadButton.disabled = true;

  // 9. UPLOAD THE VIDEO FILE
  uploadVideo(recordedBlob, cardNumber, username)
    .then(() => {
      spinner.style.display = 'none';
      statusText.textContent = 'Video uploaded successfully to Google Drive!';
      // resetRecordingState();

    })
    .catch((err) => {
      spinner.style.display = 'none';
      statusText.textContent = 'Error uploading video. Please try again.';
      console.error("Upload error:", err);
      uploadButton.disabled = false;
      reRecordButton.disabled = false;
    });
});

// 9. UPLOAD THE VIDEO
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

// Optional: Handle window unload to clean up
window.addEventListener('beforeunload', () => {
  if (localVideo.srcObject) {
    localVideo.srcObject.getTracks().forEach(track => track.stop());
  }
});

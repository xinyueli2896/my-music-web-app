// script.js

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
const postRecordControls = document.getElementById('post-record-controls');
const reRecordButton = document.getElementById('re-record-button');
const uploadButton = document.getElementById('upload-button');
const statusMessage = document.getElementById('status-message');
const statusText = document.getElementById('status-text');
const spinner = document.getElementById('spinner');
const uploadProgressContainer = document.getElementById('upload-progress-container');
const uploadProgress = document.getElementById('upload-progress');
const errorMessage = document.getElementById('error-message');

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
  displayError("You have declined the media release. Recording will not proceed.");
  // Disable the record button to prevent unauthorized recording
  recordButton.disabled = true;
}

// Function to display error messages
function displayError(message) {
  errorMessage.textContent = message;
  errorMessage.style.display = 'block';
  // Automatically hide after 5 seconds
  setTimeout(() => {
    errorMessage.style.display = 'none';
  }, 5000);
}

// Event listeners for modal buttons
closeModalButton.addEventListener('click', closeMediaReleaseModal);
agreeButton.addEventListener('click', handleAgree);
declineButton.addEventListener('click', handleDecline);

// Close the modal if the user presses the 'Escape' key
window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && mediaReleaseModal.style.display === 'block') {
    closeMediaReleaseModal();
  }
});

// Close the modal if the user clicks outside the modal content
window.addEventListener('click', (event) => {
  if (event.target == mediaReleaseModal) {
    closeMediaReleaseModal();
  }
});

// Function to start the recording process after consent
function startRecordingProcess() {
  // Enable the record button
  recordButton.disabled = false;
  // Persist consent
  localStorage.setItem('consentGiven', 'true');
  // Optionally, inform the user that they can now start recording
  // You can use a non-intrusive method like updating the UI instead of alerts
  displayStatusMessage("You have agreed to the media release. You can now start recording.", false);
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
  postRecordControls.style.display = 'none';
  postRecordControls.classList.remove('show');
  statusMessage.style.display = 'none';
  statusMessage.classList.remove('show');

  // Hide the video preview with smooth transition
  localVideo.classList.remove('show');
  setTimeout(() => {
    localVideo.style.display = 'none';
    if (localVideo.srcObject) {
      localVideo.srcObject.getTracks().forEach(track => track.stop()); // Stop all tracks
      localVideo.srcObject = null;
    }
  }, 500); // Match the CSS transition duration
}

// Function to display status messages
function displayStatusMessage(message, isError = false) {
  statusMessage.style.display = 'flex';
  statusMessage.classList.add('show');
  statusText.textContent = message;
  if (isError) {
    statusMessage.style.color = 'red';
  } else {
    statusMessage.style.color = '#333';
  }
}

// 1. DRAW A CARD (randomly pick a number)
drawButton.addEventListener('click', async () => {
  // Clear any previous errors
  errorMessage.style.display = 'none';

  // Suppose you have 3 tracks: track1.mp3, track2.mp3, track3.mp3
  const totalCards = 3; 
  cardNumber = Math.floor(Math.random() * totalCards) + 1;

  cardDisplay.textContent = "You drew card #" + cardNumber;
  cardDisplay.classList.add('show');

  // 2. PLAY MUSIC CORRESPONDING TO THAT NUMBER
  audioPlayer.src = `/audio/${cardNumber}.mp3`;
  audioPlayer.style.display = 'block'; // Show audio controls
  audioPlayer.classList.add('show');
  audioPlayer.play();

  // 3. REQUEST CAMERA PERMISSION & SET UP RECORDING
  try {
    // Request access to camera and microphone
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    
    // Attach the stream to the video element but do not display it yet
    localVideo.srcObject = stream; // Attach the stream to the video element

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

    // Check if consent is already given
    const consentGiven = localStorage.getItem('consentGiven');
    if (consentGiven === 'true') {
      startRecordingProcess();
    } else {
      // Show the Media Release Modal to seek user consent
      openMediaReleaseModal();
    }

    // Hide post-record controls and status message in case of previous recordings
    postRecordControls.style.display = 'none';
    postRecordControls.classList.remove('show');
    statusMessage.style.display = 'none';
    statusMessage.classList.remove('show');
    uploadProgressContainer.style.display = 'none';
    uploadProgress.style.width = '0%';

  } catch (err) {
    console.error("Error accessing camera/mic:", err);
    if (err.name === 'NotAllowedError') {
      displayError("Permission denied. Please allow access to camera and microphone.");
    } else if (err.name === 'NotFoundError') {
      displayError("No camera or microphone found. Please connect a device.");
    } else {
      displayError("Could not access camera or microphone. Error: " + err.message);
    }
  }
});

// 4. START RECORDING
recordButton.addEventListener('click', () => {
  if (!mediaRecorder) {
    displayError("Media Recorder not initialized.");
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
    isRecording = true;
    console.log("Recording started...");
    
    // Disable the record button and enable the stop button
    recordButton.disabled = true;
    stopButton.disabled = false;

    // Show the video preview with smooth transition
    localVideo.style.display = 'block';
    setTimeout(() => {
      localVideo.classList.add('show');
    }, 10); // Small delay to trigger CSS transition

    // Hide post-record controls and status message in case of previous recordings
    postRecordControls.style.display = 'none';
    postRecordControls.classList.remove('show');
    statusMessage.style.display = 'none';
    statusMessage.classList.remove('show');
    uploadProgressContainer.style.display = 'none';
    uploadProgress.style.width = '0%';

    // Define the 'ended' event listener
    audioEndedListener = () => {
      console.log("Audio ended. Automatically stopping the recording.");
      if (mediaRecorder && isRecording) {
        mediaRecorder.stop();
      }
    };

    // Attach the 'ended' event listener to the audio player
    audioPlayer.addEventListener('ended', audioEndedListener);

  } catch (error) {
    console.error("Error starting recording:", error);
    displayError("Could not start recording. Please try again.");
  }
});

// 5. STOP RECORDING
stopButton.addEventListener('click', () => {
  if (!mediaRecorder || !isRecording) {
    displayError("Media Recorder not initialized or not recording.");
    return;
  }

  // Stop recording
  mediaRecorder.stop();
  isRecording = false;
  console.log("Recording stopped.");
  
  // Disable the stop button
  stopButton.disabled = true;

  // Stop the music playback
  audioPlayer.pause();
  audioPlayer.currentTime = 0; // Reset to the beginning

  // Remove the 'ended' event listener as the recording has been stopped manually
  if (audioEndedListener && audioPlayer) {
    audioPlayer.removeEventListener('ended', audioEndedListener);
    audioEndedListener = null;
  }

  // Hide the video preview with smooth transition
  localVideo.classList.remove('show');
  setTimeout(() => {
    localVideo.style.display = 'none';
    if (localVideo.srcObject) {
      localVideo.srcObject.getTracks().forEach(track => track.stop()); // Stop all tracks
      localVideo.srcObject = null;
    }
  }, 500); // Match the CSS transition duration
});

// 6. Handle Recording Stop
function handleRecordingStop() {
  // Assign the recorded blob to the global variable
  recordedBlob = new Blob(chunks, { type: 'video/webm' });
  console.log("Recorded Blob Assigned to Global Variable:", recordedBlob);

  // Show post-recording controls
  postRecordControls.style.display = 'flex';
  postRecordControls.classList.add('show');

  // Update status message
  displayStatusMessage('Would you like to re-record or upload your video?', false);

  // Hide spinner and progress bar
  spinner.style.display = 'none';
  uploadProgressContainer.style.display = 'none';
  uploadProgress.style.width = '0%';

  // Optional: Set a timeout to auto-upload after 30 seconds
  uploadTimeout = setTimeout(() => {
    if (recordedBlob) {
      console.log("Auto-upload triggered after timeout.");
      uploadButton.click(); // Automatically trigger the upload
    }
  }, 30000); // 30,000 milliseconds = 30 seconds
}

// 7. RE-RECORD FUNCTIONALITY
reRecordButton.addEventListener('click', () => {
  // Clear any existing upload timeouts
  if (uploadTimeout) {
    clearTimeout(uploadTimeout);
    uploadTimeout = null;
  }

  // Reset the recorded blob
  recordedBlob = null;

  // Hide post-recording controls and status message
  postRecordControls.style.display = 'none';
  postRecordControls.classList.remove('show');
  statusMessage.style.display = 'none';
  statusMessage.classList.remove('show');
  uploadProgressContainer.style.display = 'none';
  uploadProgress.style.width = '0%';

  // Optionally, stop any ongoing music
  audioPlayer.pause();
  audioPlayer.currentTime = 0;

  // Enable the record button and disable the stop button
  recordButton.disabled = false;
  stopButton.disabled = true;
});

// 8. UPLOAD FUNCTIONALITY
uploadButton.addEventListener('click', () => {
  // Clear any existing upload timeouts
  if (uploadTimeout) {
    clearTimeout(uploadTimeout);
    uploadTimeout = null;
  }

  console.log("Upload Button Clicked. Current recordedBlob:", recordedBlob);

  if (!recordedBlob) {
    displayError("No recording available to upload.");
    console.warn("No recording available to upload. recordedBlob is null.");
    return;
  }

  // Retrieve the username from localStorage
  const username = localStorage.getItem('username') || 'UnknownUser';

  // Show a status message indicating upload is in progress
  displayStatusMessage('Uploading your video to Google Drive...', false);
  spinner.style.display = 'block'; // Show spinner
  uploadProgressContainer.style.display = 'block'; // Show progress bar

  // Disable upload and re-record buttons to prevent multiple uploads
  uploadButton.disabled = true;
  reRecordButton.disabled = true;

  // 6. UPLOAD THE VIDEO FILE
  uploadVideo(recordedBlob, cardNumber, username)
    .then(() => {
      // Hide spinner and progress bar
      spinner.style.display = 'none';
      uploadProgressContainer.style.display = 'none';
      uploadProgress.style.width = '0%';

      // Show success message
      displayStatusMessage('Video uploaded successfully to Google Drive!', false);

      // Optionally, reset the recording state after a delay
      setTimeout(() => {
        resetRecordingState();
      }, 3000); // 3 seconds delay
    })
    .catch((err) => {
      // Hide spinner and progress bar
      spinner.style.display = 'none';
      uploadProgressContainer.style.display = 'none';
      uploadProgress.style.width = '0%';

      // Show error message
      displayStatusMessage('Error uploading video. Please try again.', true);
      console.error("Upload error:", err);
      
      // Re-enable upload and re-record buttons
      uploadButton.disabled = false;
      reRecordButton.disabled = false;
    });
});

// 9. UPLOAD THE VIDEO
function uploadVideo(videoBlob, cardNum, username) {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append('videoFile', videoBlob, `recording.webm`);
    formData.append('cardNumber', cardNum);
    formData.append('trackName', `${cardNum}.mp3`);
    formData.append('username', username);
    formData.append('consentGiven', 'true'); // Include consent status

    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/upload');

    // Update progress bar
    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) {
        const percentComplete = (event.loaded / event.total) * 100;
        uploadProgress.style.width = percentComplete + '%';
      }
    });

    xhr.onload = () => {
      if (xhr.status === 200) {
        try {
          const response = JSON.parse(xhr.responseText);
          if (response.success) {
            resolve(response);
          } else {
            reject(new Error(response.error || 'Unknown upload error.'));
          }
        } catch (e) {
          reject(new Error('Invalid server response.'));
        }
      } else {
        try {
          const response = JSON.parse(xhr.responseText);
          reject(new Error(response.error || `Server error: ${xhr.statusText}`));
        } catch (e) {
          reject(new Error(`Server error: ${xhr.statusText}`));
        }
      }
    };

    xhr.onerror = () => {
      reject(new Error('Network error during upload.'));
    };

    xhr.send(formData);
  });
}

// Optional: Handle window unload to clean up
window.addEventListener('beforeunload', () => {
  if (localVideo.srcObject) {
    localVideo.srcObject.getTracks().forEach(track => track.stop());
  }
});

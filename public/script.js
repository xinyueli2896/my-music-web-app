// script.js

// Global variables
let mediaRecorder;
let chunks = [];
let cardNumber = null;

const drawButton = document.getElementById('draw-button');
const cardDisplay = document.getElementById('card-display');
const recordButton = document.getElementById('record-button');
const stopButton = document.getElementById('stop-button');
const audioPlayer = document.getElementById('audio-player');

// 1. DRAW A CARD (randomly pick a number)
drawButton.addEventListener('click', async () => {
  // Suppose you have 3 tracks: track1.mp3, track2.mp3, track3.mp3
  const totalCards = 3; 
  cardNumber = Math.floor(Math.random() * totalCards) + 1;

  cardDisplay.textContent = "You drew card #" + cardNumber;

  // 2. PLAY MUSIC CORRESPONDING TO THAT NUMBER
  audioPlayer.src = `/audio/${cardNumber}.mp3`;
  audioPlayer.style.display = 'block'; // show audio controls (optional)
  audioPlayer.play();

  // 3. REQUEST CAMERA PERMISSION & SET UP RECORDING
  // 3. REQUEST CAMERA PERMISSION & SET UP RECORDING
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    
    // Show the local camera feed in the <video> element
    localVideo.style.display = 'block';  // make sure it's visible
    localVideo.srcObject = stream;       // attach the stream to our video element
    localVideo.play();                   // start playing the feed in the video

    mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm; codecs=vp8' });

    chunks = [];
    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunks.push(event.data);
      }
    };
    mediaRecorder.onstop = handleRecordingStop;

    // Enable record button
    recordButton.disabled = false;
    stopButton.disabled = true;

  } catch (err) {
    console.error("Error accessing camera/mic:", err);
    alert("Could not access camera or microphone. Check permissions.");
  }
});

// 4. START RECORDING
recordButton.addEventListener('click', () => {
    if (!mediaRecorder) return;
  
    // Reset chunks
    chunks = [];
  
    // Restart music from the beginning (optional)
    audioPlayer.currentTime = 0;
    audioPlayer.play();
  
    // Start recording
    mediaRecorder.start();
    console.log("Recording started...");
  
    recordButton.disabled = true;
    stopButton.disabled = false;
  });

// 5. STOP RECORDING
stopButton.addEventListener('click', () => {
  if (!mediaRecorder) return;
  mediaRecorder.stop();
  console.log("Recording stopped.");
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
    .then(response => response.json())
    .then(data => {
      console.log("Upload success:", data);
      alert("Video uploaded successfully to Google Drive!");
    })
    .catch(err => {
      console.error("Upload error:", err);
      alert("Error uploading video.");
    });
}

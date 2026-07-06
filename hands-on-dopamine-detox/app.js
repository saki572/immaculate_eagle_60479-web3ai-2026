// Dopamine Detox Garden - Application State & Logic

const EMOJI_FLOWERS = ['🌸', '🌻', '🌷', '🌹', '🌺', '🌼', '💐', '🍀', '🍁', '💮', '🌱', '🌵'];
const FLOWER_COLORS = ['#ffb7b2', '#ffdac1', '#e2f0cb', '#b5ead7', '#c7ceea', '#ffc6ff', '#ffd3b6'];

let timerInterval = null;
let totalDuration = 1500; // default 25 mins in seconds
let timeRemaining = 1500;
let isTimerRunning = false;
let currentStage = 'seed'; // seed, sprout, growing, bloomed, withered

// Audio cues (synthesized using Web Audio API)
let audioCtx = null;

function initAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

function playSound(type) {
  try {
    initAudio();
    if (!audioCtx) return;
    
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);

    if (type === 'success') {
      const now = audioCtx.currentTime;
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.setValueAtTime(659.25, now + 0.15); // E5
      osc.frequency.setValueAtTime(783.99, now + 0.3); // G5
      osc.frequency.setValueAtTime(1046.50, now + 0.45); // C6
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.8);
      osc.start(now);
      osc.stop(now + 0.8);
    } else if (type === 'fail') {
      const now = audioCtx.currentTime;
      osc.frequency.setValueAtTime(220, now); // A3
      osc.frequency.exponentialRampToValueAtTime(110, now + 0.5); // A2
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
      osc.start(now);
      osc.stop(now + 0.5);
    } else if (type === 'click') {
      const now = audioCtx.currentTime;
      osc.frequency.setValueAtTime(440, now);
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
      osc.start(now);
      osc.stop(now + 0.05);
    }
  } catch (e) {
    console.warn("Audio playback not supported or blocked by browser settings:", e);
  }
}

// DOM Elements
const plantWrapper = document.getElementById('plantWrapper');
const plantSeed = document.getElementById('plantSeed');
const plantStem = document.getElementById('plantStem');
const plantLeaves = document.getElementById('plantLeaves');
const plantFlower = document.getElementById('plantFlower');

const timerDisplay = document.getElementById('timerDisplay');
const statusMessage = document.getElementById('statusMessage');
const durationSelect = document.getElementById('durationSelect');
const timePickerContainer = document.getElementById('timePickerContainer');

const startBtn = document.getElementById('startBtn');
const cancelBtn = document.getElementById('cancelBtn');

const journalModal = document.getElementById('journalModal');
const journalForm = document.getElementById('journalForm');
const activityInput = document.getElementById('activityInput');
const reflectionInput = document.getElementById('reflectionInput');

const gardenGrid = document.getElementById('gardenGrid');
const gardenEmptyMsg = document.getElementById('gardenEmptyMsg');
const gardenStatsBadge = document.getElementById('gardenStats');
const historyList = document.getElementById('historyList');

// Initialize App
function initApp() {
  // Initialize duration from the HTML selected option
  if (durationSelect) {
    totalDuration = parseInt(durationSelect.value) || 1500;
    timeRemaining = totalDuration;
    updateTimerDisplay();
  }

  loadData();
  setupEventListeners();
  updatePlantUI('seed');
}

// Safely trigger initialization
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

// Setup Listeners
function setupEventListeners() {
  durationSelect.addEventListener('change', (e) => {
    totalDuration = parseInt(e.target.value);
    timeRemaining = totalDuration;
    updateTimerDisplay();
  });

  startBtn.addEventListener('click', () => {
    playSound('click');
    startTimer();
  });

  cancelBtn.addEventListener('click', () => {
    playSound('click');
    if (confirm('本当にあきらめますか？育てていた植物が枯れてしまいます😢')) {
      cancelTimer();
    }
  });

  journalForm.addEventListener('submit', (e) => {
    e.preventDefault();
    saveJournalEntry();
  });
}

// Timer Logic
function startTimer() {
  isTimerRunning = true;
  timePickerContainer.classList.add('hidden');
  startBtn.classList.add('hidden');
  cancelBtn.classList.remove('hidden');
  
  // Set stage back to seed
  updatePlantUI('seed');
  statusMessage.textContent = '静かにスマホを置きましょう。植物が根を伸ばし始めています。';

  timerInterval = setInterval(() => {
    timeRemaining--;
    updateTimerDisplay();
    updatePlantStageBasedOnTime();

    if (timeRemaining <= 0) {
      clearInterval(timerInterval);
      completeTimer();
    }
  }, 1000);
}

function cancelTimer() {
  clearInterval(timerInterval);
  isTimerRunning = false;
  updatePlantUI('withered');
  playSound('fail');
  statusMessage.textContent = '植物が枯れてしまいました…次は最後まで見守りましょう。';
  resetControls();
}

function completeTimer() {
  isTimerRunning = false;
  updatePlantUI('bloomed');
  playSound('success');
  statusMessage.textContent = 'おめでとうございます！美しい花が咲き誇りました！';
  
  // Open journal popup
  setTimeout(() => {
    journalModal.classList.remove('hidden');
  }, 1000);
  
  resetControls();
}

function resetControls() {
  timePickerContainer.classList.remove('hidden');
  startBtn.classList.remove('hidden');
  cancelBtn.classList.add('hidden');
  timeRemaining = totalDuration;
  updateTimerDisplay();
}

function updateTimerDisplay() {
  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;
  timerDisplay.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

// Plant Stage Control
function updatePlantStageBasedOnTime() {
  const percentElapsed = ((totalDuration - timeRemaining) / totalDuration) * 100;
  
  if (percentElapsed >= 100) {
    updatePlantUI('bloomed');
  } else if (percentElapsed >= 60) {
    updatePlantUI('growing');
    statusMessage.textContent = '葉っぱが大きく育ち、つぼみが膨らんできました！';
  } else if (percentElapsed >= 25) {
    updatePlantUI('sprout');
    statusMessage.textContent = '芽が出てきました！順調に育っています。';
  } else {
    updatePlantUI('seed');
  }
}

function updatePlantUI(stage) {
  currentStage = stage;
  
  // Remove all stage classes
  plantWrapper.className = 'plant-wrapper';
  
  // Apply current stage class
  plantWrapper.classList.add(`stage-${stage}`);

  if (stage === 'seed') {
    plantFlower.textContent = '';
  } else if (stage === 'bloomed') {
    // Select a random flower for this bloom
    if (!plantFlower.textContent) {
      plantFlower.textContent = EMOJI_FLOWERS[Math.floor(Math.random() * EMOJI_FLOWERS.length)];
    }
  }
}

// Journal & Data Management
function saveJournalEntry() {
  const ratingVal = document.querySelector('input[name="rating"]:checked').value;
  const flower = plantFlower.textContent || '🌸';
  
  const entry = {
    id: Date.now(),
    date: new Date().toLocaleDateString('ja-JP', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
    activity: activityInput.value,
    reflection: reflectionInput.value,
    rating: parseInt(ratingVal),
    flower: flower
  };

  // Save to LocalStorage
  let journals = JSON.parse(localStorage.getItem('ddg_journals') || '[]');
  journals.unshift(entry);
  localStorage.setItem('ddg_journals', JSON.stringify(journals));

  // Update Garden and Lists
  loadData();

  // Reset & Close Modal
  journalForm.reset();
  journalModal.classList.add('hidden');
  updatePlantUI('seed'); // Reset plant stem for next time
  statusMessage.textContent = '日記を飾りました。次の種をまいて育てましょう！';
}

function loadData() {
  const journals = JSON.parse(localStorage.getItem('ddg_journals') || '[]');
  
  // Update Garden Display
  gardenGrid.innerHTML = '';
  if (journals.length === 0) {
    gardenEmptyMsg.classList.remove('hidden');
    gardenStatsBadge.textContent = '咲かせた花: 0輪';
  } else {
    gardenEmptyMsg.classList.add('hidden');
    gardenStatsBadge.textContent = `咲かせた花: ${journals.length}輪`;
    
    // Add flowers to garden grid
    journals.forEach((item, index) => {
      const slot = document.createElement('div');
      slot.className = 'garden-slot';
      slot.textContent = item.flower;
      slot.title = `「${item.activity}」\n評価: ${'★'.repeat(item.rating)}`;
      
      // Random soft background tint for visual delight
      slot.style.background = FLOWER_COLORS[index % FLOWER_COLORS.length];
      
      // Show tooltip or mini-info on click
      slot.addEventListener('click', () => {
        alert(`【${item.date}】\n🌿 やったこと: ${item.activity}\n⭐ 今を大切にできた度: ${'★'.repeat(item.rating)}\n💭 振り返り:\n${item.reflection || '記述なし'}`);
      });
      gardenGrid.appendChild(slot);
    });
  }

  // Update History List
  historyList.innerHTML = '';
  journals.forEach(item => {
    const card = document.createElement('div');
    card.className = 'history-item';
    
    card.innerHTML = `
      <div class="history-item-header">
        <span>${item.date}</span>
        <span class="history-item-emoji">${item.flower}</span>
      </div>
      <div class="history-item-activity">${item.activity}</div>
      ${item.reflection ? `<div class="history-item-reflection">${item.reflection}</div>` : ''}
      <div class="history-item-stars">${'★'.repeat(item.rating)}</div>
    `;
    historyList.appendChild(card);
  });
}

/**
 * Stereo Display App
 * Main application logic with Web Audio API integration
 * 
 * Features:
 * - Real-time microphone visualization
 * - Audio file playback visualization
 * - Fallback to animated demo mode
 */

(function() {
  'use strict';

  // ================================
  // CONFIGURATION
  // ================================

  const CONFIG = {
    eqBarCount: 16,
    eqSegmentCount: 12,
    eqUpdateInterval: 80,
    fftSize: 256, // Determines frequency resolution
  };

  // ================================
  // STATE
  // ================================

  const state = {
    output: 'READY...',
    logs: ['SYSTEM INITIALIZED', 'AWAITING INPUT...'],
    eqAnimationId: null,
    lastEqUpdate: 0,
    
    // Audio state
    audioContext: null,
    analyser: null,
    frequencyData: null,
    audioSource: null,      // Current source (mic or file)
    audioElement: null,     // For file playback
    micStream: null,        // Microphone stream reference
    audioMode: 'demo',      // 'demo', 'mic', or 'file'
    isPlaying: false,
  };

  // ================================
  // DOM CACHE
  // ================================

  const elements = {
    eqBars: null,
    outputDisplay: null,
    logContent: null,
    commandInput: null,
    submitBtn: null,
    micBtn: null,
    audioFileInput: null,
    playPauseBtn: null,
  };

  // Cached segment references
  let segments = [];

  // ================================
  // INITIALIZATION
  // ================================

  function init() {
    cacheElements();
    buildEQBars();
    renderLogs();
    bindEvents();
    startEQAnimation();
  }

  function cacheElements() {
    elements.eqBars = document.getElementById('eqBars');
    elements.outputDisplay = document.getElementById('outputDisplay');
    elements.logContent = document.getElementById('logContent');
    elements.commandInput = document.getElementById('commandInput');
    elements.submitBtn = document.getElementById('submitBtn');
    elements.micBtn = document.getElementById('micBtn');
    elements.audioFileInput = document.getElementById('audioFileInput');
    elements.playPauseBtn = document.getElementById('playPauseBtn');
  }

  // ================================
  // WEB AUDIO API SETUP
  // ================================

  function initAudioContext() {
    if (state.audioContext) return;
    
    state.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    state.analyser = state.audioContext.createAnalyser();
    state.analyser.fftSize = CONFIG.fftSize;
    state.analyser.smoothingTimeConstant = 0.7;
    state.frequencyData = new Uint8Array(state.analyser.frequencyBinCount);
    
    addLog('AUDIO ENGINE INITIALIZED');
  }

  // ================================
  // MICROPHONE INPUT
  // ================================

  async function toggleMicrophone() {
    if (state.audioMode === 'mic') {
      stopMicrophone();
      return;
    }

    // Stop any existing audio source
    stopAudioSource();

    try {
      initAudioContext();
      
      // Resume context if suspended (browser autoplay policy)
      if (state.audioContext.state === 'suspended') {
        await state.audioContext.resume();
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      state.micStream = stream;
      state.audioSource = state.audioContext.createMediaStreamSource(stream);
      state.audioSource.connect(state.analyser);
      
      state.audioMode = 'mic';
      elements.micBtn.classList.add('control-btn--active');
      elements.micBtn.textContent = 'MIC ON';
      
      setOutput('MICROPHONE ACTIVE');
      addLog('MICROPHONE CONNECTED');
      
    } catch (err) {
      console.error('Microphone access error:', err);
      addLog('MIC ERROR: ' + err.message);
      setOutput('MIC ACCESS DENIED');
    }
  }

  function stopMicrophone() {
    if (state.micStream) {
      state.micStream.getTracks().forEach(track => track.stop());
      state.micStream = null;
    }
    
    if (state.audioSource) {
      state.audioSource.disconnect();
      state.audioSource = null;
    }
    
    state.audioMode = 'demo';
    elements.micBtn.classList.remove('control-btn--active');
    elements.micBtn.textContent = 'MIC';
    
    setOutput('READY...');
    addLog('MICROPHONE DISCONNECTED');
  }

  // ================================
  // AUDIO FILE PLAYBACK
  // ================================

  function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Stop any existing audio source
    stopAudioSource();

    initAudioContext();

    // Create audio element for playback
    if (state.audioElement) {
      state.audioElement.pause();
      state.audioElement.src = '';
    }
    
    state.audioElement = new Audio();
    state.audioElement.src = URL.createObjectURL(file);
    
    // Create media element source and connect to analyser
    state.audioSource = state.audioContext.createMediaElementSource(state.audioElement);
    state.audioSource.connect(state.analyser);
    state.analyser.connect(state.audioContext.destination); // So we hear it
    
    state.audioMode = 'file';
    state.isPlaying = false;
    
    elements.playPauseBtn.disabled = false;
    elements.playPauseBtn.textContent = 'PLAY';
    
    // Truncate filename for display
    const displayName = file.name.length > 20 
      ? file.name.substring(0, 17) + '...' 
      : file.name;
    
    setOutput(displayName.toUpperCase());
    addLog('LOADED: ' + file.name);

    // Handle playback end
    state.audioElement.addEventListener('ended', () => {
      state.isPlaying = false;
      elements.playPauseBtn.textContent = 'PLAY';
      addLog('PLAYBACK COMPLETE');
    });

    // Clear the input so the same file can be re-selected
    event.target.value = '';
  }

  async function togglePlayPause() {
    if (!state.audioElement) return;

    // Resume context if suspended
    if (state.audioContext && state.audioContext.state === 'suspended') {
      await state.audioContext.resume();
    }

    if (state.isPlaying) {
      state.audioElement.pause();
      state.isPlaying = false;
      elements.playPauseBtn.textContent = 'PLAY';
      addLog('PAUSED');
    } else {
      state.audioElement.play();
      state.isPlaying = true;
      elements.playPauseBtn.textContent = 'PAUSE';
      addLog('PLAYING');
    }
  }

  // ================================
  // AUDIO SOURCE MANAGEMENT
  // ================================

  function stopAudioSource() {
    // Stop microphone if active
    if (state.micStream) {
      state.micStream.getTracks().forEach(track => track.stop());
      state.micStream = null;
    }
    
    // Stop audio file if playing
    if (state.audioElement) {
      state.audioElement.pause();
      state.audioElement.src = '';
      state.audioElement = null;
    }
    
    // Disconnect source
    if (state.audioSource) {
      state.audioSource.disconnect();
      state.audioSource = null;
    }
    
    // Reset UI
    elements.micBtn.classList.remove('control-btn--active');
    elements.micBtn.textContent = 'MIC';
    elements.playPauseBtn.disabled = true;
    elements.playPauseBtn.textContent = 'PLAY';
    
    state.audioMode = 'demo';
    state.isPlaying = false;
  }

  // ================================
  // EQ VISUALIZER
  // ================================

  function buildEQBars() {
    const fragment = document.createDocumentFragment();
    segments = [];

    for (let i = 0; i < CONFIG.eqBarCount; i++) {
      const bar = document.createElement('div');
      bar.className = 'eq-bar';
      
      const barSegments = [];

      for (let j = 0; j < CONFIG.eqSegmentCount; j++) {
        const segment = document.createElement('div');
        segment.className = 'eq-segment';
        bar.appendChild(segment);
        
        barSegments.push({
          el: segment,
          lit: false,
          color: null,
          peak: false
        });
      }

      segments.push(barSegments);
      fragment.appendChild(bar);
    }

    elements.eqBars.appendChild(fragment);
  }

  function getEQLevels(timestamp) {
    const levels = new Array(CONFIG.eqBarCount);

    if (state.audioMode !== 'demo' && state.analyser && state.frequencyData) {
      // Get real frequency data
      state.analyser.getByteFrequencyData(state.frequencyData);
      
      // Map frequency bins to our 16 bars
      // frequencyBinCount is fftSize/2 = 128 bins
      // We'll group bins into 16 bars, emphasizing lower frequencies
      const binCount = state.frequencyData.length;
      
      for (let i = 0; i < CONFIG.eqBarCount; i++) {
        // Use logarithmic scaling to emphasize bass/mids
        const startBin = Math.floor(Math.pow(i / CONFIG.eqBarCount, 1.5) * binCount);
        const endBin = Math.floor(Math.pow((i + 1) / CONFIG.eqBarCount, 1.5) * binCount);
        
        let sum = 0;
        const count = Math.max(1, endBin - startBin);
        
        for (let bin = startBin; bin < endBin && bin < binCount; bin++) {
          sum += state.frequencyData[bin];
        }
        
        // Normalize to 0-1 range (frequency data is 0-255)
        levels[i] = (sum / count) / 255;
      }
    } else {
      // Demo mode - animated sine waves
      for (let i = 0; i < CONFIG.eqBarCount; i++) {
        const base = Math.sin(timestamp / 300 + i * 0.5) * 0.3 + 0.5;
        const noise = Math.random() * 0.3;
        levels[i] = Math.max(0.1, Math.min(1, base + noise));
      }
    }

    return levels;
  }

  function updateEQBars(timestamp) {
    // Throttle updates
    if (timestamp - state.lastEqUpdate < CONFIG.eqUpdateInterval) {
      state.eqAnimationId = requestAnimationFrame(updateEQBars);
      return;
    }
    state.lastEqUpdate = timestamp;

    const levels = getEQLevels(timestamp);

    for (let i = 0; i < CONFIG.eqBarCount; i++) {
      const litCount = Math.floor(levels[i] * CONFIG.eqSegmentCount);
      const barSegments = segments[i];

      for (let j = 0; j < CONFIG.eqSegmentCount; j++) {
        const seg = barSegments[j];
        const shouldBeLit = j < litCount;
        const shouldBePeak = shouldBeLit && (j === litCount - 1);
        
        let targetColor = null;
        if (shouldBeLit) {
          if (j >= 10) {
            targetColor = 'red';
          } else if (j >= 8) {
            targetColor = 'amber';
          } else {
            targetColor = 'blue';
          }
        }

        if (seg.lit !== shouldBeLit || seg.color !== targetColor || seg.peak !== shouldBePeak) {
          const cl = seg.el.classList;

          if (seg.lit !== shouldBeLit) {
            cl.toggle('eq-segment--lit', shouldBeLit);
            seg.lit = shouldBeLit;
          }

          if (seg.color !== targetColor) {
            if (seg.color) cl.remove('eq-segment--' + seg.color);
            if (targetColor) cl.add('eq-segment--' + targetColor);
            seg.color = targetColor;
          }

          if (seg.peak !== shouldBePeak) {
            cl.toggle('eq-segment--peak', shouldBePeak);
            seg.peak = shouldBePeak;
          }
        }
      }
    }

    state.eqAnimationId = requestAnimationFrame(updateEQBars);
  }

  function startEQAnimation() {
    if (!state.eqAnimationId) {
      state.eqAnimationId = requestAnimationFrame(updateEQBars);
    }
  }

  function stopEQAnimation() {
    if (state.eqAnimationId) {
      cancelAnimationFrame(state.eqAnimationId);
      state.eqAnimationId = null;
    }
  }

  // ================================
  // OUTPUT DISPLAY
  // ================================

  function setOutput(text) {
    state.output = text;
    elements.outputDisplay.textContent = text;
  }

  // ================================
  // LOGGING
  // ================================

  function addLog(message) {
    state.logs.push(message);
    
    const entry = document.createElement('div');
    entry.className = 'log-entry';
    entry.textContent = message;
    elements.logContent.appendChild(entry);
    
    updateLogOpacity();
    scrollLogsToBottom();
  }

  function updateLogOpacity() {
    const entries = elements.logContent.children;
    const total = entries.length;
    for (let i = 0; i < total; i++) {
      entries[i].style.opacity = 0.6 + (i / total) * 0.4;
    }
  }

  function renderLogs() {
    const fragment = document.createDocumentFragment();
    const totalLogs = state.logs.length;

    state.logs.forEach((log, index) => {
      const entry = document.createElement('div');
      entry.className = 'log-entry';
      entry.style.opacity = 0.6 + (index / totalLogs) * 0.4;
      entry.textContent = log;
      fragment.appendChild(entry);
    });

    elements.logContent.innerHTML = '';
    elements.logContent.appendChild(fragment);
  }

  function scrollLogsToBottom() {
    elements.logContent.scrollTop = elements.logContent.scrollHeight;
  }

  function getTimestamp() {
    return new Date().toLocaleTimeString('en-US', { hour12: false });
  }

  // ================================
  // INPUT HANDLING
  // ================================

  function handleSubmit() {
    const input = elements.commandInput.value.trim();
    if (!input) return;

    const timestamp = getTimestamp();

    addLog('[' + timestamp + '] > ' + input);
    setOutput(input.toUpperCase());
    addLog('[' + timestamp + '] OUTPUT UPDATED');

    elements.commandInput.value = '';
  }

  function handleKeyDown(event) {
    if (event.key === 'Enter') {
      handleSubmit();
    }
  }

  // ================================
  // EVENT BINDING
  // ================================

  function bindEvents() {
    elements.submitBtn.addEventListener('click', handleSubmit);
    elements.commandInput.addEventListener('keydown', handleKeyDown);
    elements.micBtn.addEventListener('click', toggleMicrophone);
    elements.audioFileInput.addEventListener('change', handleFileSelect);
    elements.playPauseBtn.addEventListener('click', togglePlayPause);
  }

  // ================================
  // PUBLIC API
  // ================================

  window.StereoApp = {
    setOutput: setOutput,
    addLog: addLog,
    getState: function() { return { ...state }; },
    stopEQ: stopEQAnimation,
    startEQ: startEQAnimation,
    toggleMic: toggleMicrophone,
    stopAudio: stopAudioSource,
  };

  // ================================
  // START
  // ================================

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();

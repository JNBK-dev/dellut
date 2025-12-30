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
    eqUpdateInterval: 50, // Slightly faster for smoother response
    fftSize: 512, // More frequency resolution
    smoothing: 0.6, // How much previous frame influences current (0-1)
    peakDecay: 0.02, // How fast peaks fall per frame
    peakHoldTime: 500, // ms to hold peak before falling
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
    audioSource: null,
    audioElement: null,
    micStream: null,
    audioMode: 'demo',
    isPlaying: false,
    
    // EQ smoothing and peaks
    smoothedLevels: null, // Smoothed frequency levels
    peakLevels: null,     // Current peak positions
    peakHoldTimes: null,  // When each peak was last set
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
    state.analyser.smoothingTimeConstant = 0.4; // Less smoothing in analyser, we do our own
    state.analyser.minDecibels = -85;
    state.analyser.maxDecibels = -10;
    state.frequencyData = new Uint8Array(state.analyser.frequencyBinCount);
    
    // Initialize smoothing arrays
    state.smoothedLevels = new Array(CONFIG.eqBarCount).fill(0);
    state.peakLevels = new Array(CONFIG.eqBarCount).fill(0);
    state.peakHoldTimes = new Array(CONFIG.eqBarCount).fill(0);
    
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
    
    // Initialize smoothing arrays
    state.smoothedLevels = new Array(CONFIG.eqBarCount).fill(0);
    state.peakLevels = new Array(CONFIG.eqBarCount).fill(0);
    state.peakHoldTimes = new Array(CONFIG.eqBarCount).fill(0);

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
          peak: false,
          isPeakHold: false
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
      state.analyser.getByteFrequencyData(state.frequencyData);
      
      const binCount = state.frequencyData.length;
      const sampleRate = state.audioContext.sampleRate;
      const nyquist = sampleRate / 2;
      
      // Define frequency bands (in Hz) - more resolution in bass/mids
      // These roughly correspond to: sub-bass, bass, low-mid, mid, upper-mid, presence, brilliance
      const frequencyBands = [
        20, 40, 60, 90, 130, 180, 250, 350,
        500, 700, 1000, 1400, 2000, 3500, 6000, 12000, 20000
      ];
      
      // Per-band gain compensation (boost highs since they're naturally quieter)
      const bandGains = [
        1.0, 1.0, 1.0, 1.1, 1.2, 1.3, 1.4, 1.5,
        1.6, 1.8, 2.0, 2.2, 2.5, 2.8, 3.2, 3.6
      ];

      for (let i = 0; i < CONFIG.eqBarCount; i++) {
        const lowFreq = frequencyBands[i];
        const highFreq = frequencyBands[i + 1];
        
        // Convert frequency to bin index
        const lowBin = Math.floor(lowFreq / nyquist * binCount);
        const highBin = Math.min(Math.ceil(highFreq / nyquist * binCount), binCount - 1);
        
        // Get average amplitude for this frequency range
        let sum = 0;
        let count = 0;
        
        for (let bin = lowBin; bin <= highBin; bin++) {
          sum += state.frequencyData[bin];
          count++;
        }
        
        // Normalize and apply gain compensation
        let level = count > 0 ? (sum / count) / 255 : 0;
        level = Math.min(1, level * bandGains[i]);
        
        // Apply smoothing (lerp between previous and current)
        const smoothed = state.smoothedLevels[i] * CONFIG.smoothing + 
                        level * (1 - CONFIG.smoothing);
        state.smoothedLevels[i] = smoothed;
        
        levels[i] = smoothed;
      }
    } else {
      // Demo mode - more interesting animated pattern
      for (let i = 0; i < CONFIG.eqBarCount; i++) {
        const wave1 = Math.sin(timestamp / 400 + i * 0.4) * 0.3;
        const wave2 = Math.sin(timestamp / 250 + i * 0.7) * 0.2;
        const wave3 = Math.sin(timestamp / 600 - i * 0.3) * 0.15;
        const noise = Math.random() * 0.15;
        const base = 0.35 + wave1 + wave2 + wave3 + noise;
        
        const smoothed = state.smoothedLevels[i] * CONFIG.smoothing + 
                        base * (1 - CONFIG.smoothing);
        state.smoothedLevels[i] = smoothed;
        
        levels[i] = Math.max(0.05, Math.min(1, smoothed));
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
      const level = levels[i];
      const litCount = Math.floor(level * CONFIG.eqSegmentCount);
      
      // Update peak tracking
      if (level >= state.peakLevels[i]) {
        state.peakLevels[i] = level;
        state.peakHoldTimes[i] = timestamp;
      } else if (timestamp - state.peakHoldTimes[i] > CONFIG.peakHoldTime) {
        // Peak hold time expired, let it fall
        state.peakLevels[i] = Math.max(level, state.peakLevels[i] - CONFIG.peakDecay);
      }
      
      const peakSegment = Math.min(
        CONFIG.eqSegmentCount - 1,
        Math.floor(state.peakLevels[i] * CONFIG.eqSegmentCount)
      );
      
      const barSegments = segments[i];

      for (let j = 0; j < CONFIG.eqSegmentCount; j++) {
        const seg = barSegments[j];
        const shouldBeLit = j < litCount;
        const shouldBePeak = !shouldBeLit && j === peakSegment && peakSegment >= litCount;
        const isTopLit = shouldBeLit && (j === litCount - 1);
        
        let targetColor = null;
        if (shouldBeLit || shouldBePeak) {
          if (j >= 10) {
            targetColor = 'red';
          } else if (j >= 8) {
            targetColor = 'amber';
          } else {
            targetColor = 'blue';
          }
        }

        const needsUpdate = seg.lit !== shouldBeLit || 
                           seg.color !== targetColor || 
                           seg.peak !== isTopLit ||
                           seg.isPeakHold !== shouldBePeak;

        if (needsUpdate) {
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

          if (seg.peak !== isTopLit) {
            cl.toggle('eq-segment--peak', isTopLit);
            seg.peak = isTopLit;
          }
          
          if (seg.isPeakHold !== shouldBePeak) {
            cl.toggle('eq-segment--peak-hold', shouldBePeak);
            seg.isPeakHold = shouldBePeak;
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

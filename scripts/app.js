/**
 * Stereo Display App
 * Main application logic for the retro stereo equalizer interface
 * 
 * Performance optimized version:
 * - Uses classList.toggle() instead of className replacement
 * - Caches DOM references for segments
 * - Uses requestAnimationFrame with throttling
 * - Minimizes style recalculations
 */

(function() {
  'use strict';

  // ================================
  // CONFIGURATION
  // ================================

  const CONFIG = {
    eqBarCount: 16,
    eqSegmentCount: 12,
    eqUpdateInterval: 80, // milliseconds
  };

  // ================================
  // STATE
  // ================================

  const state = {
    output: 'READY...',
    logs: ['SYSTEM INITIALIZED', 'AWAITING INPUT...'],
    eqAnimationId: null,
    lastEqUpdate: 0,
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
  };

  // Pre-cached segment references for fast access
  // segments[barIndex][segmentIndex] = { el, state }
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
        
        // Cache reference with current state
        barSegments.push({
          el: segment,
          lit: false,
          color: null, // 'blue', 'amber', or 'red'
          peak: false
        });
      }

      segments.push(barSegments);
      fragment.appendChild(bar);
    }

    elements.eqBars.appendChild(fragment);
  }

  function updateEQBars(timestamp) {
    // Throttle updates to configured interval
    if (timestamp - state.lastEqUpdate < CONFIG.eqUpdateInterval) {
      state.eqAnimationId = requestAnimationFrame(updateEQBars);
      return;
    }
    state.lastEqUpdate = timestamp;

    for (let i = 0; i < CONFIG.eqBarCount; i++) {
      // Calculate animated level for this bar
      const base = Math.sin(timestamp / 300 + i * 0.5) * 0.3 + 0.5;
      const noise = Math.random() * 0.3;
      const level = Math.max(0.1, Math.min(1, base + noise));
      const litCount = Math.floor(level * CONFIG.eqSegmentCount);

      const barSegments = segments[i];

      for (let j = 0; j < CONFIG.eqSegmentCount; j++) {
        const seg = barSegments[j];
        const shouldBeLit = j < litCount;
        const shouldBePeak = shouldBeLit && (j === litCount - 1);
        
        // Determine target color
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

        // Only update DOM if state changed
        if (seg.lit !== shouldBeLit || seg.color !== targetColor || seg.peak !== shouldBePeak) {
          const cl = seg.el.classList;

          // Update lit state
          if (seg.lit !== shouldBeLit) {
            cl.toggle('eq-segment--lit', shouldBeLit);
            seg.lit = shouldBeLit;
          }

          // Update color
          if (seg.color !== targetColor) {
            if (seg.color) cl.remove('eq-segment--' + seg.color);
            if (targetColor) cl.add('eq-segment--' + targetColor);
            seg.color = targetColor;
          }

          // Update peak
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
    
    // Append single entry instead of re-rendering all
    const entry = document.createElement('div');
    entry.className = 'log-entry';
    entry.textContent = message;
    elements.logContent.appendChild(entry);
    
    // Update opacity of all entries
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

    // Log the input
    addLog('[' + timestamp + '] > ' + input);

    // Update output display
    setOutput(input.toUpperCase());

    // Log the output update
    addLog('[' + timestamp + '] OUTPUT UPDATED');

    // Clear input
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

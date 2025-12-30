/**
 * Stereo Display App
 * Main application logic for the retro stereo equalizer interface
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
    eqBars: new Array(CONFIG.eqBarCount).fill(0),
    eqIntervalId: null,
  };

  // ================================
  // DOM ELEMENTS
  // ================================

  const elements = {
    eqBars: null,
    outputDisplay: null,
    logContent: null,
    commandInput: null,
    submitBtn: null,
  };

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

    for (let i = 0; i < CONFIG.eqBarCount; i++) {
      const bar = document.createElement('div');
      bar.className = 'eq-bar';
      bar.dataset.barIndex = i;

      for (let j = 0; j < CONFIG.eqSegmentCount; j++) {
        const segment = document.createElement('div');
        segment.className = 'eq-segment eq-segment--off';
        segment.dataset.segmentIndex = j;
        bar.appendChild(segment);
      }

      fragment.appendChild(bar);
    }

    elements.eqBars.appendChild(fragment);
  }

  function updateEQBars() {
    const bars = elements.eqBars.children;

    for (let i = 0; i < CONFIG.eqBarCount; i++) {
      // Calculate animated level for this bar
      const base = Math.sin(Date.now() / 300 + i * 0.5) * 0.3 + 0.5;
      const noise = Math.random() * 0.3;
      const level = Math.max(0.1, Math.min(1, base + noise));

      const litSegments = Math.floor(level * CONFIG.eqSegmentCount);
      const segments = bars[i].children;

      for (let j = 0; j < CONFIG.eqSegmentCount; j++) {
        const segment = segments[j];
        const isLit = j < litSegments;
        const isPeak = j === litSegments - 1 && isLit;

        // Determine color class based on segment position
        let colorClass = '';
        if (isLit) {
          if (j >= 10) {
            colorClass = 'eq-segment--red';
          } else if (j >= 8) {
            colorClass = 'eq-segment--amber';
          } else {
            colorClass = 'eq-segment--blue';
          }
        }

        // Build class string
        let className = 'eq-segment';
        if (isLit) {
          className += ' ' + colorClass;
          if (isPeak) {
            className += ' eq-segment--peak';
          }
        } else {
          className += ' eq-segment--off';
        }

        // Only update if changed (minor optimization)
        if (segment.className !== className) {
          segment.className = className;
        }
      }
    }
  }

  function startEQAnimation() {
    state.eqIntervalId = setInterval(updateEQBars, CONFIG.eqUpdateInterval);
  }

  function stopEQAnimation() {
    if (state.eqIntervalId) {
      clearInterval(state.eqIntervalId);
      state.eqIntervalId = null;
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
    renderLogs();
    scrollLogsToBottom();
  }

  function renderLogs() {
    const fragment = document.createDocumentFragment();
    const totalLogs = state.logs.length;

    state.logs.forEach((log, index) => {
      const entry = document.createElement('div');
      entry.className = 'log-entry';
      // Fade in newer entries (older = more transparent)
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
    addLog(`[${timestamp}] > ${input}`);

    // Update output display
    setOutput(input.toUpperCase());

    // Log the output update
    addLog(`[${timestamp}] OUTPUT UPDATED`);

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
  // PUBLIC API (optional, for Firebase integration)
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

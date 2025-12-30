/**
 * Sound Effects
 * Audio functionality for the stereo display app
 */

const Sounds = (function() {
  'use strict';

  // Sound file paths
  const SOUNDS = {
    // keypress: '/sounds/keypress.mp3',
    // submit: '/sounds/submit.mp3',
    // error: '/sounds/error.mp3',
  };

  // Audio cache
  const audioCache = {};

  /**
   * Preload a sound file
   */
  function preload(name) {
    if (SOUNDS[name] && !audioCache[name]) {
      audioCache[name] = new Audio(SOUNDS[name]);
    }
  }

  /**
   * Play a sound by name
   */
  function play(name) {
    if (!SOUNDS[name]) {
      console.warn(`[Sounds] Unknown sound: ${name}`);
      return;
    }

    if (!audioCache[name]) {
      preload(name);
    }

    const audio = audioCache[name];
    audio.currentTime = 0;
    audio.play().catch(err => {
      console.warn(`[Sounds] Could not play ${name}:`, err);
    });
  }

  /**
   * Preload all sounds
   */
  function preloadAll() {
    Object.keys(SOUNDS).forEach(preload);
  }

  // Public API
  return {
    play: play,
    preload: preload,
    preloadAll: preloadAll,
  };

})();

console.log('[Sounds] Module loaded');

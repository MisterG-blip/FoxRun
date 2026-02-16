// ============================================================================
// AUDIO SYSTEM
// Verwaltet Hintergrundmusik (pro Welt) und Sound-Effekte.
//
// MUSIK:
//   assets/music/castle.mp3  (oder .ogg als Fallback)
//   assets/music/village.mp3
//   assets/music/forest.mp3
//
// SOUNDS:
//   assets/sounds/jump.mp3
//   assets/sounds/land.mp3
//   assets/sounds/coin.mp3
//   assets/sounds/key.mp3
//   assets/sounds/door.mp3
//   assets/sounds/switch.mp3
//   assets/sounds/discover.mp3
//   assets/sounds/sniff.mp3
//
// VERWENDUNG:
//   const audio = new AudioSystem();
//   audio.playMusic('castle');
//   audio.playSound('coin');
//   audio.setMuted(true/false);
// ============================================================================

class AudioSystem {
  constructor() {
    // Mute-Status aus localStorage laden
    this.muted        = localStorage.getItem('foxrun_muted') === 'true';

    this.musicVolume  = 0.4;
    this.soundVolume  = 0.6;

    this.currentMusic = null;   // aktuell spielendes Audio-Element
    this.currentTheme = null;   // z.B. 'castle'

    // Sound-Cache — einmal geladen, dann wiederverwendet
    this.soundCache   = {};

    // Alle Sound-Namen voraufladen
    this._soundNames  = [
      'jump', 'land', 'coin', 'key',
      'door', 'switch', 'discover', 'sniff'
    ];
    this._preloadSounds();
  }

  // ==========================================================================
  // MUSIK
  // ==========================================================================

  playMusic(theme) {
    if (this.currentTheme === theme) return;  // läuft schon
    this.stopMusic();
    this.currentTheme = theme;

    const audio = new Audio();
    audio.loop   = true;
    audio.volume = this.muted ? 0 : this.musicVolume;

    // mp3 versuchen, ogg als Fallback
    this._loadAudioWithFallback(audio, `assets/music/${theme}`);

    audio.play().catch(() => {
      // Browser blockiert Autoplay → warten auf erste User-Interaktion
      const resume = () => {
        audio.play().catch(() => {});
        document.removeEventListener('click',   resume);
        document.removeEventListener('keydown', resume);
        document.removeEventListener('touchstart', resume);
      };
      document.addEventListener('click',      resume, { once: true });
      document.addEventListener('keydown',    resume, { once: true });
      document.addEventListener('touchstart', resume, { once: true });
    });

    this.currentMusic = audio;
  }

  stopMusic() {
    if (this.currentMusic) {
      this.currentMusic.pause();
      this.currentMusic.currentTime = 0;
      this.currentMusic = null;
    }
    this.currentTheme = null;
  }

  // ==========================================================================
  // SOUND EFFEKTE
  // ==========================================================================

  playSound(name) {
    if (this.muted) return;
    const src = this.soundCache[name];
    if (!src) return;

    // Neues Audio-Element pro Abspielung damit Überlappung möglich ist
    const audio = new Audio(src);
    audio.volume = this.soundVolume;
    audio.play().catch(() => {});
  }

  _preloadSounds() {
    for (const name of this._soundNames) {
      const audio = new Audio();
      // Nur src setzen um preload auszulösen, nicht abspielen
      this._resolveAudioSrc(`assets/sounds/${name}`, src => {
        if (src) this.soundCache[name] = src;
      });
    }
  }

  // ==========================================================================
  // MUTE
  // ==========================================================================

  setMuted(muted) {
    this.muted = muted;
    localStorage.setItem('foxrun_muted', muted ? 'true' : 'false');

    if (this.currentMusic) {
      this.currentMusic.volume = muted ? 0 : this.musicVolume;
    }

    // Button-Icon aktualisieren
    const btn = document.getElementById('muteBtn');
    if (btn) btn.textContent = muted ? '🔇' : '🔊';
  }

  toggleMute() {
    this.setMuted(!this.muted);
  }

  isMuted() {
    return this.muted;
  }

  // ==========================================================================
  // INTERN: Audio-Dateien laden (mp3 → ogg Fallback)
  // ==========================================================================

  _loadAudioWithFallback(audioEl, basePath) {
    this._resolveAudioSrc(basePath, src => {
      if (src) audioEl.src = src;
    });
  }

  _resolveAudioSrc(basePath, callback) {
    const formats = ['mp3', 'ogg', 'wav'];
    let tried = 0;

    const tryNext = () => {
      if (tried >= formats.length) {
        console.warn(`⚠️ Audio nicht gefunden: ${basePath}`);
        callback(null);
        return;
      }
      const src = `${basePath}.${formats[tried++]}`;
      const test = new Audio();
      test.oncanplaythrough = () => callback(src);
      test.onerror          = tryNext;
      test.src              = src;
    };

    tryNext();
  }
}

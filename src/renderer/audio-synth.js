class SoundEngine {
  constructor() {
    this.ctx = null;
    this.currentAudio = null;
  }

  getContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  stop() {
    if (this.currentAudio) {
      try {
        this.currentAudio.pause();
        this.currentAudio.currentTime = 0;
      } catch (e) {}
      this.currentAudio = null;
    }
  }

  play(soundName = 'acorda-menina', volumePercent = 90, customSoundPath = '') {
    this.stop();
    const volume = Math.max(0, Math.min(100, volumePercent)) / 100;

    if (soundName === 'acorda-menina') {
      // Toca o áudio oficial "ACORDA, MENINA!!!!!!"
      try {
        const audio = new Audio('../assets/acorda-menina.mp3');
        audio.volume = volume;
        audio.play().catch(e => {
          console.warn('Erro ao reproduzir acorda-menina.mp3 relativo, tentando caminho alternativo:', e);
          const fallback = new Audio('../../assets/acorda-menina.mp3');
          fallback.volume = volume;
          fallback.play();
        });
        this.currentAudio = audio;
        return;
      } catch (err) {
        console.error('Falha ao tocar MP3 default:', err);
      }
    }

    if (soundName === 'custom' && customSoundPath) {
      try {
        // Formato file:// para arquivos locais no Windows
        const safePath = customSoundPath.replace(/\\/g, '/');
        const fileUrl = safePath.startsWith('file://') ? safePath : `file:///${safePath}`;
        const audio = new Audio(fileUrl);
        audio.volume = volume;
        audio.play().catch(e => console.error('Erro ao tocar som customizado:', e));
        this.currentAudio = audio;
        return;
      } catch (err) {
        console.error('Falha ao tocar som custom:', err);
      }
    }

    // Sons Sintetizados via Web Audio API com controle de volume
    const ctx = this.getContext();
    const now = ctx.currentTime;

    switch (soundName) {
      case 'chime':
        this.playChime(ctx, now, volume);
        break;
      case 'zen':
        this.playZen(ctx, now, volume);
        break;
      case 'digital':
        this.playDigital(ctx, now, volume);
        break;
      case 'gentle':
        this.playGentle(ctx, now, volume);
        break;
      case 'fanfare':
        this.playFanfare(ctx, now, volume);
        break;
      default:
        this.playChime(ctx, now, volume);
    }
  }

  playChime(ctx, now, vol = 0.8) {
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.12);

      gain.gain.setValueAtTime(0, now + idx * 0.12);
      gain.gain.linearRampToValueAtTime(0.3 * vol, now + idx * 0.12 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.12 + 1.2);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + idx * 0.12);
      osc.stop(now + idx * 0.12 + 1.3);
    });
  }

  playZen(ctx, now, vol = 0.8) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(440, now);

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.5 * vol, now + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 2.5);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 2.6);
  }

  playDigital(ctx, now, vol = 0.8) {
    [0, 0.15, 0.3].forEach((offset) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(880, now + offset);

      gain.gain.setValueAtTime(0.18 * vol, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.08);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + offset);
      osc.stop(now + offset + 0.09);
    });
  }

  playGentle(ctx, now, vol = 0.8) {
    const notes = [329.63, 392.00, 493.88];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.18);

      gain.gain.setValueAtTime(0, now + idx * 0.18);
      gain.gain.linearRampToValueAtTime(0.25 * vol, now + idx * 0.18 + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.18 + 1.5);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + idx * 0.18);
      osc.stop(now + idx * 0.18 + 1.6);
    });
  }

  playFanfare(ctx, now, vol = 0.8) {
    const chord = [523.25, 659.25, 783.99];
    chord.forEach((freq) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.2 * vol, now + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.8);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 1.9);
    });
  }
}

window.soundSynth = new SoundEngine();

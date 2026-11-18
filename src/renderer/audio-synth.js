class SoundEngine {
  constructor() {
    this.ctx = null;
    this.currentAudio = null;
    this.loopTimer = null;
    this.isLooping = false;
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
    this.isLooping = false;
    if (this.loopTimer) {
      clearTimeout(this.loopTimer);
      clearInterval(this.loopTimer);
      this.loopTimer = null;
    }
    if (this.currentAudio) {
      try {
        this.currentAudio.pause();
        this.currentAudio.currentTime = 0;
      } catch (e) {}
      this.currentAudio = null;
    }
  }

  startLoop(soundName = 'acorda-menina', volumePercent = 90, customSoundPath = '', repeatMode = 'until-closed') {
    this.stop();
    this.isLooping = true;

    const playOnce = () => {
      if (!this.isLooping) return;
      this.play(soundName, volumePercent, customSoundPath, (endedDurationMs) => {
        if (!this.isLooping) return;

        if (repeatMode === 'once') {
          this.isLooping = false;
          return;
        }

        let delayMs = 1200; // Padrão: 1.2s de pausa entre as repetições no modo until-closed
        if (repeatMode === 'every-15s') {
          delayMs = Math.max(1000, 15000 - endedDurationMs);
        } else if (repeatMode === 'every-30s') {
          delayMs = Math.max(1000, 30000 - endedDurationMs);
        }

        this.loopTimer = setTimeout(() => {
          if (this.isLooping) {
            playOnce();
          }
        }, delayMs);
      });
    };

    playOnce();
  }

  play(soundName = 'acorda-menina', volumePercent = 90, customSoundPath = '', onEnded = null) {
    const volume = Math.max(0, Math.min(100, volumePercent)) / 100;
    const startTime = Date.now();

    const handleEnd = () => {
      if (onEnded) {
        const duration = Date.now() - startTime;
        onEnded(duration);
      }
    };

    if (soundName === 'acorda-menina') {
      try {
        const audio = new Audio('../assets/acorda-menina.mp3');
        audio.volume = volume;
        audio.onended = handleEnd;
        audio.play().catch(e => {
          const fallback = new Audio('../../assets/acorda-menina.mp3');
          fallback.volume = volume;
          fallback.onended = handleEnd;
          fallback.play().catch(err => handleEnd());
        });
        this.currentAudio = audio;
        return;
      } catch (err) {
        console.error('Falha ao tocar MP3 default:', err);
        handleEnd();
        return;
      }
    }

    if (soundName === 'custom' && customSoundPath) {
      try {
        const safePath = customSoundPath.replace(/\\/g, '/');
        const fileUrl = safePath.startsWith('file://') ? safePath : `file:///${safePath}`;
        const audio = new Audio(fileUrl);
        audio.volume = volume;
        audio.onended = handleEnd;
        audio.play().catch(e => {
          console.error('Erro ao tocar som customizado:', e);
          handleEnd();
        });
        this.currentAudio = audio;
        return;
      } catch (err) {
        console.error('Falha ao tocar som custom:', err);
        handleEnd();
        return;
      }
    }

    // Sons Sintetizados via Web Audio API
    const ctx = this.getContext();
    const now = ctx.currentTime;
    let synthDuration = 1.5;

    switch (soundName) {
      case 'chime':
        this.playChime(ctx, now, volume);
        synthDuration = 1.5;
        break;
      case 'zen':
        this.playZen(ctx, now, volume);
        synthDuration = 2.6;
        break;
      case 'digital':
        this.playDigital(ctx, now, volume);
        synthDuration = 0.6;
        break;
      case 'gentle':
        this.playGentle(ctx, now, volume);
        synthDuration = 1.8;
        break;
      case 'fanfare':
        this.playFanfare(ctx, now, volume);
        synthDuration = 2.0;
        break;
      default:
        this.playChime(ctx, now, volume);
        synthDuration = 1.5;
    }

    setTimeout(() => {
      handleEnd();
    }, synthDuration * 1000);
  }

  playChime(ctx, now, vol = 0.8) {
    const notes = [523.25, 659.25, 783.99, 1046.5];
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

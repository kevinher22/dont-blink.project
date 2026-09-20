import { storage } from './storage';

export type MusicMood = 'NORMAL' | 'INTENSE' | 'DANGER' | 'HORROR' | 'ENDING';

class SoundSystem {
  private ctx: AudioContext | null = null;
  private isMusicPlaying = false;
  private musicInterval: number | null = null;
  private musicStep = 0;
  private currentMood: MusicMood = 'NORMAL';

  private initCtx(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        this.ctx = new AudioContextClass();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private isSoundEnabled(): boolean {
    return storage.getData().settings.soundEnabled;
  }

  private isMusicEnabled(): boolean {
    return storage.getData().settings.musicEnabled;
  }

  private getEffectiveSfxVolume(): number {
    const settings = storage.getData().settings;
    const master = (settings.masterVolume ?? 80) / 100;
    const sfx = (settings.sfxVolume ?? 80) / 100;
    return master * sfx;
  }

  private getEffectiveMusicVolume(): number {
    const settings = storage.getData().settings;
    const master = (settings.masterVolume ?? 80) / 100;
    const music = (settings.musicVolume ?? 70) / 100;
    return master * music;
  }

  // --- Sound Effects ---

  public playJump(): void {
    if (!this.isSoundEnabled()) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const vol = 0.28 * this.getEffectiveSfxVolume();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(680, now + 0.12);

      gain.gain.setValueAtTime(vol, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.15);
    } catch {
      // AudioContext locked or failed silently
    }
  }

  public playCollectible(type: 'NORMAL' | 'RARE' | 'PERFECT' | 'MEMORY_SHARD' | 'CORRUPTED_ANOMALY'): void {
    if (!this.isSoundEnabled()) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const sfxVol = this.getEffectiveSfxVolume();

      osc.type = type === 'CORRUPTED_ANOMALY' ? 'sawtooth' : 'triangle';

      if (type === 'NORMAL') {
        osc.frequency.setValueAtTime(660, now);
        osc.frequency.setValueAtTime(990, now + 0.05);
        gain.gain.setValueAtTime(0.25 * sfxVol, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      } else if (type === 'RARE') {
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.setValueAtTime(1320, now + 0.06);
        gain.gain.setValueAtTime(0.3 * sfxVol, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
      } else if (type === 'MEMORY_SHARD') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, now); // D5
        osc.frequency.linearRampToValueAtTime(880, now + 0.08); // A5
        osc.frequency.linearRampToValueAtTime(1174.66, now + 0.16); // D6
        gain.gain.setValueAtTime(0.35 * sfxVol, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      } else if (type === 'CORRUPTED_ANOMALY') {
        osc.frequency.setValueAtTime(160, now);
        osc.frequency.exponentialRampToValueAtTime(380, now + 0.06);
        osc.frequency.exponentialRampToValueAtTime(90, now + 0.2);
        gain.gain.setValueAtTime(0.32 * sfxVol, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      } else {
        // PERFECT
        osc.frequency.setValueAtTime(1046.5, now);
        osc.frequency.setValueAtTime(1318.5, now + 0.05);
        osc.frequency.setValueAtTime(1567.98, now + 0.1);
        gain.gain.setValueAtTime(0.35 * sfxVol, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
      }

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + (type === 'MEMORY_SHARD' ? 0.38 : 0.3));
    } catch {
      // Ignore
    }
  }

  public playCombo(comboLevel: number): void {
    if (!this.isSoundEnabled()) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      const baseFreq = 300 + Math.min(comboLevel, 10) * 80;
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(baseFreq, now);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.5, now + 0.15);

      gain.gain.setValueAtTime(0.18 * this.getEffectiveSfxVolume(), now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.2);
    } catch {
      // Ignore
    }
  }

  public playNearMiss(): void {
    if (!this.isSoundEnabled()) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(500, now);
      osc.frequency.exponentialRampToValueAtTime(1200, now + 0.08);

      gain.gain.setValueAtTime(0.2 * this.getEffectiveSfxVolume(), now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.12);
    } catch {
      // Ignore
    }
  }

  public playHit(): void {
    if (!this.isSoundEnabled()) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const bufferSize = ctx.sampleRate * 0.25;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.15));
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(800, now);
      filter.frequency.exponentialRampToValueAtTime(80, now + 0.25);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.4 * this.getEffectiveSfxVolume(), now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      noise.start(now);
    } catch {
      // Ignore
    }
  }

  public playGameOver(): void {
    if (!this.isSoundEnabled()) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(260, now);
      osc.frequency.linearRampToValueAtTime(120, now + 0.35);

      gain.gain.setValueAtTime(0.3 * this.getEffectiveSfxVolume(), now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.45);
    } catch {
      // Ignore
    }
  }

  public playNewRecord(): void {
    if (!this.isSoundEnabled()) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((freq, idx) => {
        const now = ctx.currentTime + idx * 0.08;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now);

        gain.gain.setValueAtTime(0.28 * this.getEffectiveSfxVolume(), now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.28);
      });
    } catch {
      // Ignore
    }
  }

  public playAchievement(): void {
    if (!this.isSoundEnabled()) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      const notes = [440, 554.37, 659.25, 880];
      notes.forEach((freq, idx) => {
        const now = ctx.currentTime + idx * 0.07;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);

        gain.gain.setValueAtTime(0.22 * this.getEffectiveSfxVolume(), now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.22);
      });
    } catch {
      // Ignore
    }
  }

  public playClick(): void {
    if (!this.isSoundEnabled()) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(400, now + 0.04);

      gain.gain.setValueAtTime(0.12 * this.getEffectiveSfxVolume(), now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.05);
    } catch {
      // Ignore
    }
  }

  // --- MYSTERY & CINEMATIC AUDIO EFFECTS ---

  public playHeartbeat(): void {
    if (!this.isSoundEnabled()) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const vol = 0.35 * this.getEffectiveSfxVolume();

      // Lub
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(65, now);
      osc1.frequency.exponentialRampToValueAtTime(40, now + 0.12);
      gain1.gain.setValueAtTime(vol, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.15);

      // Dub
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(55, now + 0.18);
      osc2.frequency.exponentialRampToValueAtTime(35, now + 0.32);
      gain2.gain.setValueAtTime(vol * 0.8, now + 0.18);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.18);
      osc2.stop(now + 0.36);
    } catch {
      // Ignore
    }
  }

  public playBreathing(): void {
    if (!this.isSoundEnabled()) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const bufferSize = ctx.sampleRate * 0.8;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        // Soft pink noise curve
        data[i] = (Math.random() * 2 - 1) * Math.sin((Math.PI * i) / bufferSize);
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(450, now);
      filter.Q.setValueAtTime(2, now);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(0.12 * this.getEffectiveSfxVolume(), now + 0.35);
      gain.gain.linearRampToValueAtTime(0.001, now + 0.8);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      noise.start(now);
    } catch {
      // Ignore
    }
  }

  public playWhisper(): void {
    if (!this.isSoundEnabled()) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.linearRampToValueAtTime(95, now + 0.5);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(320, now);

      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(0.18 * this.getEffectiveSfxVolume(), now + 0.2);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.52);
    } catch {
      // Ignore
    }
  }

  public playGlitch(): void {
    if (!this.isSoundEnabled()) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      for (let i = 0; i < 4; i++) {
        const t = now + i * 0.04;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'square';
        osc.frequency.setValueAtTime(150 + Math.random() * 800, t);

        gain.gain.setValueAtTime(0.15 * this.getEffectiveSfxVolume(), t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.035);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(t);
        osc.stop(t + 0.04);
      }
    } catch {
      // Ignore
    }
  }

  public playLookBack(): void {
    if (!this.isSoundEnabled()) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      // Low sub bass drone + reverse sweep
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(50, now);
      osc.frequency.linearRampToValueAtTime(30, now + 0.6);

      gain.gain.setValueAtTime(0.35 * this.getEffectiveSfxVolume(), now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.75);

      // Distorted sting
      this.playGlitch();
    } catch {
      // Ignore
    }
  }

  public playFragmentDiscovered(): void {
    if (!this.isSoundEnabled()) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      const notes = [392, 523.25, 659.25, 987.77]; // G4, C5, E5, B5
      notes.forEach((freq, idx) => {
        const now = ctx.currentTime + idx * 0.09;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);

        gain.gain.setValueAtTime(0.24 * this.getEffectiveSfxVolume(), now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.32);
      });
    } catch {
      // Ignore
    }
  }

  public playFragmentFound(): void {
    this.playFragmentDiscovered();
  }

  public playChapterUnlocked(): void {
    if (!this.isSoundEnabled()) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      const notes = [261.63, 329.63, 392.0, 523.25, 659.25];
      notes.forEach((freq, idx) => {
        const now = ctx.currentTime + idx * 0.1;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now);

        gain.gain.setValueAtTime(0.25 * this.getEffectiveSfxVolume(), now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.38);
      });
    } catch {
      // Ignore
    }
  }

  public playEndingUnlocked(): void {
    if (!this.isSoundEnabled()) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      const notes = [329.63, 392.0, 493.88, 587.33, 783.99, 987.77];
      notes.forEach((freq, idx) => {
        const now = ctx.currentTime + idx * 0.12;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);

        gain.gain.setValueAtTime(0.28 * this.getEffectiveSfxVolume(), now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.5);
      });
    } catch {
      // Ignore
    }
  }

  // --- Dynamic Procedural BGM Engine ---

  public setMusicMood(mood: MusicMood): void {
    this.currentMood = mood;
  }

  public startMusic(): void {
    if (!this.isMusicEnabled() || this.isMusicPlaying) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      this.isMusicPlaying = true;

      // Normal mode scale (A minor cyber)
      const normalBass = [110, 110, 130.81, 146.83, 110, 110, 164.81, 146.83];
      const normalLead = [440, 523.25, 659.25, 587.33, 440, 659.25, 783.99, 659.25];

      // Intense mode scale
      const intenseBass = [110, 146.83, 164.81, 196.0, 146.83, 164.81, 220.0, 196.0];

      // Danger mode scale (dissonant low tritone)
      const dangerBass = [73.42, 73.42, 103.83, 73.42, 65.41, 65.41, 92.5, 65.41];

      const stepDuration = 150; // ms per 16th note

      this.musicInterval = window.setInterval(() => {
        if (!this.isMusicPlaying || !this.isMusicEnabled() || !this.ctx) return;
        const now = this.ctx.currentTime;
        const step = this.musicStep % 8;
        const musicVol = this.getEffectiveMusicVolume();

        if (this.currentMood === 'DANGER' || this.currentMood === 'HORROR') {
          // Slow pulsing dark drone
          if (step % 2 === 0) {
            const bassOsc = this.ctx.createOscillator();
            const bassGain = this.ctx.createGain();
            bassOsc.type = 'sawtooth';
            bassOsc.frequency.setValueAtTime(dangerBass[step], now);
            bassGain.gain.setValueAtTime(0.08 * musicVol, now);
            bassGain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
            bassOsc.connect(bassGain);
            bassGain.connect(this.ctx.destination);
            bassOsc.start(now);
            bassOsc.stop(now + 0.3);
          }

          // Distant whisper ping
          if (step === 3 || step === 7) {
            const pingOsc = this.ctx.createOscillator();
            const pingGain = this.ctx.createGain();
            pingOsc.type = 'sine';
            pingOsc.frequency.setValueAtTime(880, now);
            pingGain.gain.setValueAtTime(0.02 * musicVol, now);
            pingGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
            pingOsc.connect(pingGain);
            pingGain.connect(this.ctx.destination);
            pingOsc.start(now);
            pingOsc.stop(now + 0.14);
          }
        } else if (this.currentMood === 'INTENSE') {
          // Fast driving bass
          const bassOsc = this.ctx.createOscillator();
          const bassGain = this.ctx.createGain();
          bassOsc.type = 'sawtooth';
          bassOsc.frequency.setValueAtTime(intenseBass[step], now);
          bassGain.gain.setValueAtTime(0.07 * musicVol, now);
          bassGain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
          bassOsc.connect(bassGain);
          bassGain.connect(this.ctx.destination);
          bassOsc.start(now);
          bassOsc.stop(now + 0.15);

          // Fast hat
          const hatOsc = this.ctx.createOscillator();
          const hatGain = this.ctx.createGain();
          hatOsc.type = 'sine';
          hatOsc.frequency.setValueAtTime(8000, now);
          hatGain.gain.setValueAtTime(0.025 * musicVol, now);
          hatGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.03);
          hatOsc.connect(hatGain);
          hatGain.connect(this.ctx.destination);
          hatOsc.start(now);
          hatOsc.stop(now + 0.035);
        } else {
          // NORMAL mood
          const bassOsc = this.ctx.createOscillator();
          const bassGain = this.ctx.createGain();
          bassOsc.type = 'triangle';
          bassOsc.frequency.setValueAtTime(normalBass[step], now);
          bassGain.gain.setValueAtTime(0.06 * musicVol, now);
          bassGain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
          bassOsc.connect(bassGain);
          bassGain.connect(this.ctx.destination);
          bassOsc.start(now);
          bassOsc.stop(now + 0.18);

          if (step % 2 === 1) {
            const hatOsc = this.ctx.createOscillator();
            const hatGain = this.ctx.createGain();
            hatOsc.type = 'sine';
            hatOsc.frequency.setValueAtTime(7000, now);
            hatGain.gain.setValueAtTime(0.02 * musicVol, now);
            hatGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.03);
            hatOsc.connect(hatGain);
            hatGain.connect(this.ctx.destination);
            hatOsc.start(now);
            hatOsc.stop(now + 0.04);
          }

          if (step % 4 === 0) {
            const leadOsc = this.ctx.createOscillator();
            const leadGain = this.ctx.createGain();
            leadOsc.type = 'sine';
            leadOsc.frequency.setValueAtTime(normalLead[step], now);
            leadGain.gain.setValueAtTime(0.04 * musicVol, now);
            leadGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
            leadOsc.connect(leadGain);
            leadGain.connect(this.ctx.destination);
            leadOsc.start(now);
            leadOsc.stop(now + 0.32);
          }
        }

        this.musicStep++;
      }, stepDuration);
    } catch {
      // Ignore
    }
  }

  public stopMusic(): void {
    this.isMusicPlaying = false;
    if (this.musicInterval !== null) {
      clearInterval(this.musicInterval);
      this.musicInterval = null;
    }
  }

  public toggleMusic(enabled: boolean): void {
    if (enabled) {
      this.startMusic();
    } else {
      this.stopMusic();
    }
  }
}

export const sound = new SoundSystem();

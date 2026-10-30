import {
  loadAudioSettings, normalizeAudioSettings, saveAudioSettings, type AudioSettings
} from './settings';

/** Cues are emitted by the game UI; this module never changes game state. */
export type AudioCue =
  | 'select' | 'build' | 'dig' | 'move' | 'remove'
  | 'upgrade' | 'floor' | 'reward' | 'reset' | 'error';

const BEAT_SECONDS = 0.42;
const MELODY: readonly number[] = [
  220, 0, 261.63, 0, 293.66, 261.63, 0, 196,
  220, 0, 246.94, 0, 261.63, 0, 196, 0
];
const BASS: readonly number[] = [55, 65.41, 73.42, 61.74];

export class AudioManager {
  private settings: AudioSettings;
  private context: AudioContext | null = null;
  private musicBus: GainNode | null = null;
  private effectsBus: GainNode | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private beatIndex = 0;
  private nextBeatTime = 0;
  private activated = false;
  private disposed = false;

  private readonly onVisibilityChange = (): void => this.syncMusic();

  constructor(settings: AudioSettings = loadAudioSettings()) {
    this.settings = normalizeAudioSettings(settings);
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', this.onVisibilityChange);
    }
  }

  get supported(): boolean {
    return typeof window !== 'undefined' && typeof window.AudioContext === 'function';
  }

  getSettings(): AudioSettings {
    return { ...this.settings };
  }

  setSettings(patch: Partial<AudioSettings>): AudioSettings {
    if (this.disposed) return this.getSettings();
    this.settings = normalizeAudioSettings({ ...this.settings, ...patch });
    saveAudioSettings(this.settings);
    this.syncVolumes();
    this.syncMusic();
    return this.getSettings();
  }

  /** Browser and mobile WebView autoplay policies require an actual user gesture. */
  activate(): void {
    if (this.disposed) return;
    this.activated = true;
    if (this.settings.muted || !this.supported) return;
    const context = this.ensureContext();
    if (!context) return;
    if (context.state === 'running') {
      this.syncMusic();
    } else {
      void context.resume().then(() => this.syncMusic()).catch(() => {
        // Audio may be blocked by system settings; keep gameplay functional.
      });
    }
  }

  play(cue: AudioCue): void {
    this.activate();
    if (this.settings.muted || !this.settings.effectsEnabled || this.settings.effectsVolume === 0) return;
    const context = this.context;
    if (!context) return;
    if (context.state === 'running') {
      this.scheduleCue(cue);
    } else {
      void context.resume().then(() => {
        if (!this.disposed && !this.settings.muted && this.settings.effectsEnabled) this.scheduleCue(cue);
      }).catch(() => {});
    }
  }

  private ensureContext(): AudioContext | null {
    if (this.context) return this.context;
    try {
      if (!this.supported) return null;
      const context = new window.AudioContext();
      const master = context.createGain();
      this.musicBus = context.createGain();
      this.effectsBus = context.createGain();
      this.musicBus.connect(master);
      this.effectsBus.connect(master);
      master.gain.value = 0.7; // Keep mixed cues and music below clipping.
      master.connect(context.destination);
      this.context = context;
      this.syncVolumes();
      return context;
    } catch {
      return null;
    }
  }

  private syncVolumes(): void {
    const context = this.context;
    if (!context) return;
    const music = !this.settings.muted && this.settings.musicEnabled ? this.settings.musicVolume : 0;
    const effects = !this.settings.muted && this.settings.effectsEnabled ? this.settings.effectsVolume : 0;
    this.musicBus?.gain.setTargetAtTime(music, context.currentTime, 0.03);
    this.effectsBus?.gain.setTargetAtTime(effects, context.currentTime, 0.02);
  }

  private canPlayMusic(): boolean {
    return this.activated && !this.disposed && !this.settings.muted &&
      this.settings.musicEnabled && this.settings.musicVolume > 0 &&
      !!this.context && this.context.state === 'running' &&
      (typeof document === 'undefined' || !document.hidden);
  }

  private syncMusic(): void {
    if (!this.canPlayMusic()) {
      if (this.timer !== null) clearInterval(this.timer);
      this.timer = null;
      return;
    }
    if (this.timer !== null) return;
    this.beatIndex = 0;
    this.nextBeatTime = this.context!.currentTime + 0.05;
    this.scheduleMusic();
    this.timer = setInterval(() => this.scheduleMusic(), 90);
  }

  private scheduleMusic(): void {
    const context = this.context;
    const bus = this.musicBus;
    if (!context || !bus || !this.canPlayMusic()) {
      this.syncMusic();
      return;
    }
    // Schedule slightly ahead to prevent gaps on slower phones or tab throttling.
    // Never schedule more than one phrase if the tab was suspended.
    if (this.nextBeatTime < context.currentTime - BEAT_SECONDS) {
      this.nextBeatTime = context.currentTime + 0.05;
    }
    while (this.nextBeatTime < context.currentTime + 0.22) {
      const step = this.beatIndex % MELODY.length;
      if (step % 4 === 0) {
        this.tone(bus, BASS[Math.floor(step / 4)], BASS[Math.floor(step / 4)], 1.1, 0.12, 'sine', this.nextBeatTime);
      }
      const pitch = MELODY[step];
      if (pitch) this.tone(bus, pitch, pitch * 0.996, 0.28, 0.09, 'triangle', this.nextBeatTime);
      this.beatIndex++;
      this.nextBeatTime += BEAT_SECONDS;
    }
  }

  /** Short pitched envelopes; no network assets, external licenses or download delay. */
  private tone(
    destination: GainNode,
    startHz: number,
    endHz: number,
    duration: number,
    volume: number,
    waveform: OscillatorType,
    at: number
  ): void {
    const context = this.context;
    if (!context) return;
    const oscillator = context.createOscillator();
    const envelope = context.createGain();
    oscillator.type = waveform;
    oscillator.frequency.setValueAtTime(Math.max(20, startHz), at);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, endHz), at + duration);
    envelope.gain.setValueAtTime(0.0001, at);
    envelope.gain.exponentialRampToValueAtTime(Math.max(0.0001, volume), at + 0.012);
    envelope.gain.exponentialRampToValueAtTime(0.0001, at + duration);
    oscillator.connect(envelope);
    envelope.connect(destination);
    oscillator.onended = () => { oscillator.disconnect(); envelope.disconnect(); };
    oscillator.start(at);
    oscillator.stop(at + duration + 0.02);
  }

  private scheduleCue(cue: AudioCue): void {
    const context = this.context;
    const bus = this.effectsBus;
    if (!context || !bus || this.disposed) return;
    const now = context.currentTime + 0.008;
    const beep = (
      from: number, to: number, seconds: number, level: number,
      shape: OscillatorType = 'sine', offset = 0
    ) => this.tone(bus, from, to, seconds, level, shape, now + offset);

    switch (cue) {
      case 'select':
        beep(510, 620, 0.075, 0.13); break;
      case 'build':
        beep(240, 345, 0.16, 0.18, 'triangle');
        beep(375, 510, 0.18, 0.16, 'sine', 0.10); break;
      case 'dig':
        beep(160, 80, 0.19, 0.22, 'sawtooth');
        beep(94, 64, 0.12, 0.14, 'triangle', 0.11); break;
      case 'move':
        beep(290, 370, 0.14, 0.14, 'triangle'); break;
      case 'remove':
        beep(260, 105, 0.24, 0.19, 'triangle'); break;
      case 'upgrade':
        beep(330, 440, 0.17, 0.15, 'sine');
        beep(440, 660, 0.22, 0.14, 'triangle', 0.16); break;
      case 'floor':
        beep(195, 265, 0.32, 0.16, 'triangle');
        beep(265, 392, 0.32, 0.14, 'sine', 0.18); break;
      case 'reward':
        beep(392, 523.25, 0.2, 0.16);
        beep(523.25, 783.99, 0.28, 0.14, 'triangle', 0.17); break;
      case 'reset':
        beep(340, 170, 0.26, 0.15, 'sine'); break;
      case 'error':
        beep(145, 120, 0.15, 0.13, 'triangle'); break;
    }
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    if (this.timer !== null) clearInterval(this.timer);
    this.timer = null;
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.onVisibilityChange);
    }
    if (this.context) void this.context.close().catch(() => {});
    this.context = null;
    this.musicBus = null;
    this.effectsBus = null;
  }
}

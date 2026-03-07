import type { AudioTrackManifestEntry } from '../game/types';

export class AudioSystem {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private oscillators: OscillatorNode[] = [];
  private muted = false;

  async loadAndStart(track: AudioTrackManifestEntry): Promise<void> {
    if (track.status !== 'active') {
      return;
    }

    await this.ensureContext();
    this.startSynthLoop(track.volume);
  }

  setMuted(value: boolean): void {
    this.muted = value;
    if (this.master) {
      this.master.gain.value = value ? 0 : 0.2;
    }
  }

  dispose(): void {
    for (const osc of this.oscillators) {
      try {
        osc.stop();
      } catch {
        // no-op
      }
    }
    this.oscillators = [];
    if (this.context) {
      void this.context.close();
      this.context = null;
      this.master = null;
    }
  }

  private async ensureContext(): Promise<void> {
    if (!this.context) {
      this.context = new AudioContext();
      this.master = this.context.createGain();
      this.master.gain.value = this.muted ? 0 : 0.2;
      this.master.connect(this.context.destination);
    }

    if (this.context.state === 'suspended') {
      await this.context.resume();
    }
  }

  private startSynthLoop(volume: number): void {
    if (!this.context || !this.master || this.oscillators.length > 0) {
      return;
    }

    const base = this.context.currentTime;
    const notes = [220, 246.94, 293.66, 329.63, 392, 329.63, 293.66, 246.94];

    notes.forEach((frequency, idx) => {
      const osc = this.context!.createOscillator();
      const gain = this.context!.createGain();
      osc.type = idx % 2 === 0 ? 'triangle' : 'sine';
      osc.frequency.value = frequency;
      gain.gain.value = Math.max(0.02, Math.min(0.12, volume * 0.15));
      osc.connect(gain);
      gain.connect(this.master!);
      osc.start(base + idx * 0.45);
      osc.stop(base + 12 + idx * 0.45);
      this.oscillators.push(osc);
    });

    window.setTimeout(() => {
      this.oscillators = [];
      if (this.context) {
        this.startSynthLoop(volume);
      }
    }, 12000);
  }
}

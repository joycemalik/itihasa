// src/components/Chronicle/ToneManager.js
import * as Tone from 'tone';

class ToneManager {
    constructor() {
        this.currentScene = null;
        this.noise = null;
        this.filter = null;
        this.oscillator = null;
        this.isInitialized = false;
    }

    async init() {
        if (this.isInitialized) return;
        await Tone.start();

        // Base Noise Gen (for Storm/River)
        this.noise = new Tone.Noise("pink").start();
        this.filter = new Tone.Filter(100, "lowpass").toDestination();
        this.noise.connect(this.filter);
        this.noise.volume.value = -Infinity; // Start silent

        // Drone Gen (for War/Space)
        this.oscillator = new Tone.FatOscillator(50, "sawtooth", 40).start();
        this.oscFilter = new Tone.Filter(200, "lowpass").toDestination();
        this.oscillator.connect(this.oscFilter);
        this.oscillator.volume.value = -Infinity;

        this.isInitialized = true;
    }

    setScene(scene) {
        if (!this.isInitialized || this.currentScene === scene) return;
        this.currentScene = scene;
        const now = Tone.now();

        // SCENE LOGIC
        switch (scene) {
            case 'storm':
            case 'intro':
                // Chaotic Pink Noise
                this.noise.type = "pink";
                this.noise.volume.rampTo(-10, 2, now);
                this.filter.frequency.rampTo(400, 2, now);
                this.filter.Q.value = 1;
                this.oscillator.volume.rampTo(-Infinity, 2, now);
                break;

            case 'crime-scene':
            case 'river-dry':
                // Silence / Low Rumble
                this.noise.volume.rampTo(-Infinity, 3, now);
                this.oscillator.volume.rampTo(-20, 3, now);
                this.oscillator.frequency.rampTo(40, 3, now); // Low drone
                this.oscFilter.frequency.value = 100;
                break;

            case 'river-alive':
                // Smooth Brown Noise (Water)
                this.noise.type = "brown";
                this.noise.volume.rampTo(-15, 2, now);
                this.filter.frequency.rampTo(800, 2, now); // Higher freq for flowing water
                this.oscillator.volume.rampTo(-Infinity, 2, now);
                break;

            case 'war':
                // Aggressive Drone
                this.noise.volume.rampTo(-Infinity, 1, now);
                this.oscillator.frequency.rampTo(60, 0.1, now);
                this.oscillator.volume.rampTo(-10, 0.5, now);
                this.oscFilter.frequency.rampTo(500, 4, now); // Open up the filter
                break;

            case 'exodus':
                // Windy
                this.noise.type = "white";
                this.noise.volume.rampTo(-20, 2, now);
                this.filter.frequency.rampTo(300, 2, now);
                this.oscillator.volume.rampTo(-Infinity, 4, now);
                break;

            case 'sky':
                // Ethereal Sine Drone
                this.noise.volume.rampTo(-Infinity, 2, now);
                this.oscillator.type = "sine";
                this.oscillator.frequency.rampTo(110, 5, now);
                this.oscillator.volume.rampTo(-15, 5, now);
                break;

            default:
                // Mute all
                this.noise.volume.rampTo(-Infinity, 1, now);
                this.oscillator.volume.rampTo(-Infinity, 1, now);
                break;
        }
    }

    toggleMute(isMuted) {
        Tone.Destination.mute = isMuted;
    }

    stop() {
        if (this.noise) this.noise.dispose();
        if (this.oscillator) this.oscillator.dispose();
        this.isInitialized = false;
    }
}

export const toneManager = new ToneManager();

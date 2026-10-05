import { scenes } from './timeline';
import { runtime } from './runtime';

// A generative score: every sound is synthesised live, so it follows the scroll exactly.
// Each scene sets a mood (chord, heartbeat, textures); the director blends moods by morph.

const hz = (midi) => 440 * Math.pow(2, (midi - 69) / 12);

// Chords are MIDI notes for the four pad voices. Levels are 0..1 per texture.
const MOODS = {
    sleeper: { chord: [38, 45, 53, 64], cutoff: 650, pad: 0.5, air: 0.25, bpm: 52, beat: 0.45, tick: 0.5 },
    hand: { chord: [34, 41, 50, 57], cutoff: 1000, pad: 0.6, air: 0.2, bpm: 56, beat: 0.3 },
    skeleton: { chord: [34, 41, 52, 57], cutoff: 820, pad: 0.6, air: 0.25, bpm: 60, beat: 0.35, crackle: 0.25 },
    brain: { chord: [31, 38, 46, 57], cutoff: 720, pad: 0.5, air: 0.2, bpm: 60, beat: 0.3, whisper: 0.6, crackle: 0.35 },
    neurons: { chord: [31, 38, 49, 54], cutoff: 1150, pad: 0.5, air: 0.2, bpm: 66, beat: 0.35, whisper: 0.85, crackle: 0.9 },
    onion: { chord: [29, 36, 47, 52], cutoff: 900, pad: 0.55, air: 0.25, bpm: 66, beat: 0.3, tear: 0.8 },
    crowd: { chord: [38, 45, 48, 51], cutoff: 620, pad: 0.45, air: 0.3, bpm: 74, beat: 0.4, babble: 0.8 },
    hole: { chord: [24, 30, 36, 42], cutoff: 320, pad: 0.65, air: 0.4, bpm: 60, beat: 0.3, shepard: -1, rumble: 0.8 },
    fading: { chord: [45, 52, 57, 64], cutoff: 380, pad: 0.12, air: 0, bpm: 0, beat: 0, hum: 0.8, tinnitus: 1 },
    room: { chord: [38, 39, 45, 46], cutoff: 1300, pad: 0.55, air: 0.35, bpm: 120, beat: 0.75, shepard: 1, breath: 0.8 },
    carEx: { chord: [38, 45, 53, 57], cutoff: 700, pad: 0.4, air: 0.3, bpm: 70, beat: 0.25, road: 0.9 },
    carIn: { chord: [38, 45, 53, 60], cutoff: 600, pad: 0.4, air: 0.15, bpm: 70, beat: 0.3, road: 0.6, blinker: 0.7 },
    eye: { chord: [57, 64, 69, 70], cutoff: 2400, pad: 0.45, air: 0.15, bpm: 64, beat: 0.55, rise: 1, tinnitus: 0.35 },
    void: { chord: [26, 38, 50, 62], cutoff: 200, pad: 0, air: 0, bpm: 0, beat: 0 },
};
const LEVELS = ['pad', 'air', 'beat', 'tick', 'crackle', 'whisper', 'tear', 'babble', 'shepard', 'rumble', 'hum', 'tinnitus', 'breath', 'road', 'blinker', 'rise'];

function noiseBuffer(ctx, kind) {
    const len = ctx.sampleRate * 4;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, last = 0;
    for (let i = 0; i < len; i++) {
        const w = Math.random() * 2 - 1;
        if (kind === 'pink') {
            b0 = 0.99765 * b0 + w * 0.099046;
            b1 = 0.963 * b1 + w * 0.2965164;
            b2 = 0.57 * b2 + w * 1.0526913;
            d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.2;
        } else if (kind === 'brown') {
            last = (last + 0.02 * w) / 1.02;
            d[i] = last * 3.5;
        } else d[i] = w;
    }
    return buf;
}

function impulse(ctx, seconds, decay) {
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
        const d = buf.getChannelData(c);
        for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    return buf;
}

class Score {
    ctx = null;
    muted = false;
    mood = {};
    nextBeat = 0;
    nextTick = 0;
    nextBlink = 0;
    nextCrackle = 0;
    nextTear = 0;
    nextBreath = 0;
    nextSyllable = [0, 0, 0, 0];
    lastBeat = -10;
    shepPhase = 0;
    finaleAt = -1;
    finaleNodes = [];

    // Must be called from a user gesture the first time.
    unlock() {
        try {
            if (!this.ctx) {
                const Ctx = window.AudioContext || window.webkitAudioContext;
                if (!Ctx) return;
                this.ctx = new Ctx();
                this.build();
            }
            if (this.ctx.state === 'suspended') this.ctx.resume();
        } catch {
            this.ctx = null;
        }
    }

    // Leaving the film: silence everything and stop using the CPU.
    sleep() {
        if (!this.ctx) return;
        if (this.finaleAt >= 0) this.cancelFinale();
        this.ctx.suspend();
    }

    // Entering the film again: back to the lit room.
    reset() {
        if (!this.ctx) return;
        if (this.finaleAt >= 0) this.cancelFinale();
        this.nextBeat = this.nextTick = this.nextBlink = this.nextCrackle = this.nextTear = this.nextBreath = 0;
        this.set(this.roomGain.gain, 0.12, 1);
        if (this.ctx.state === 'suspended') this.ctx.resume();
    }

    get ready() {
        return this.ctx && this.ctx.state === 'running';
    }

    setMuted(m) {
        this.muted = m;
        if (this.ctx) this.out.gain.setTargetAtTime(m ? 0 : 0.9, this.ctx.currentTime, 0.3);
    }

    set(param, value, tc = 0.5) {
        param.setTargetAtTime(value, this.ctx.currentTime, tc);
    }

    gain(value = 0, ...dest) {
        const g = this.ctx.createGain();
        g.gain.value = value;
        dest.forEach((d) => g.connect(d));
        return g;
    }

    filter(type, freq, q = 0.7, ...dest) {
        const f = this.ctx.createBiquadFilter();
        f.type = type;
        f.frequency.value = freq;
        f.Q.value = q;
        dest.forEach((d) => f.connect(d));
        return f;
    }

    osc(type, freq, ...dest) {
        const o = this.ctx.createOscillator();
        o.type = type;
        o.frequency.value = freq;
        dest.forEach((d) => o.connect(d));
        o.start();
        return o;
    }

    noise(kind, ...dest) {
        const s = this.ctx.createBufferSource();
        s.buffer = this.buffers[kind];
        s.loop = true;
        s.loopStart = Math.random() * 2;
        dest.forEach((d) => s.connect(d));
        s.start(0, Math.random() * 3);
        return s;
    }

    build() {
        const ctx = this.ctx;
        this.buffers = { white: noiseBuffer(ctx, 'white'), pink: noiseBuffer(ctx, 'pink'), brown: noiseBuffer(ctx, 'brown') };

        const comp = ctx.createDynamicsCompressor();
        comp.threshold.value = -16;
        comp.ratio.value = 3;
        comp.attack.value = 0.01;
        comp.release.value = 0.4;
        comp.connect(ctx.destination);
        this.out = this.gain(0, comp);
        this.out.gain.setTargetAtTime(this.muted ? 0 : 0.9, ctx.currentTime, 1.2);

        const verb = ctx.createConvolver();
        verb.buffer = impulse(ctx, 5.5, 2.4);
        verb.connect(this.out);
        this.verb = this.gain(0.55, verb);
        this.dry = this.gain(1, this.out);

        // The finale plays on its own bus and reverb, so the score can be cut to silence beneath it.
        const finaleVerb = ctx.createConvolver();
        finaleVerb.buffer = impulse(ctx, 8, 2.0);
        finaleVerb.connect(this.out);
        this.finaleWet = this.gain(0.8, finaleVerb);
        this.finaleDry = this.gain(1, this.out);

        // Pad: four voices that glide between chords.
        this.padFilter = this.filter('lowpass', 600, 0.9);
        this.padGain = this.gain(0, this.dry, this.verb);
        this.padFilter.connect(this.padGain);
        this.voices = [0, 1, 2, 3].map((i) => {
            const v = this.gain(i === 0 ? 0.32 : 0.22, this.padFilter);
            return { a: this.osc('sawtooth', 110, v), b: this.osc('triangle', 110, v), sub: i === 0 ? this.osc('sine', 55, this.gain(0.35, this.padFilter)) : null };
        });
        const lfo = this.osc('sine', 0.07);
        lfo.connect(this.gain(180, this.padFilter.frequency));

        // Air: wind that rises with movement and transitions.
        this.airFilter = this.filter('bandpass', 400, 0.8);
        this.airGain = this.gain(0, this.dry, this.verb);
        this.airFilter.connect(this.airGain);
        this.noise('pink', this.airFilter);

        // Sub swell for transitions and the hole.
        this.subGain = this.gain(0, this.dry);
        this.subOsc = this.osc('sine', 38, this.subGain);
        this.rumbleGain = this.gain(0, this.dry);
        this.noise('brown', this.filter('lowpass', 90, 0.7, this.rumbleGain));

        // Shepard tone: endlessly falling (the hole) or rising (the panic).
        this.shepGain = this.gain(0, this.dry, this.verb);
        const shepFilter = this.filter('lowpass', 2200, 0.5, this.shepGain);
        this.shep = Array.from({ length: 7 }, () => {
            const g = this.gain(0, shepFilter);
            return { g, o: this.osc('sine', 100, g) };
        });

        // The silence: mains hum and tinnitus.
        this.humGain = this.gain(0, this.dry);
        [60, 120, 180, 240].forEach((f, i) => this.osc('sine', f, this.gain([0.5, 0.35, 0.15, 0.08][i], this.humGain)));
        this.tinGain = this.gain(0, this.dry, this.verb);
        this.osc('sine', 7350, this.tinGain);
        this.osc('sine', 7362, this.tinGain);

        // Road: brown noise and a low engine.
        this.roadGain = this.gain(0, this.dry);
        this.noise('brown', this.filter('lowpass', 280, 0.6, this.roadGain));
        this.engine = this.osc('sawtooth', 36, this.filter('lowpass', 120, 1.2, this.gain(0.5, this.roadGain)));

        // Whispers (the voice) and babble (the crowd): noise through moving vowel formants.
        this.whisperGain = this.gain(0, this.dry, this.verb);
        this.babbleGain = this.gain(0, this.dry, this.verb);
        const whisperHp = this.filter('highpass', 500, 0.7, this.whisperGain);
        const babbleLp = this.filter('lowpass', 1400, 0.7, this.babbleGain);
        this.speakers = [0, 1, 2, 3].map((i) => {
            const env = this.gain(0, i === 0 ? whisperHp : babbleLp);
            const f1 = this.filter('bandpass', 600, 6, env);
            const f2 = this.filter('bandpass', 1800, 8, env);
            this.noise('white', f1, f2);
            return { env, f1, f2 };
        });

        // Breath for the panic.
        this.breathEnv = this.gain(0, this.dry, this.verb);
        this.breathFilter = this.filter('bandpass', 900, 0.6, this.breathEnv);
        this.noise('pink', this.breathFilter);
        this.breathGain = 0;

        // Intro: the bulb hums, and buzzes when it flickers.
        this.bulbGain = this.gain(0, this.dry);
        this.osc('sine', 100, this.gain(0.6, this.bulbGain));
        this.osc('sine', 200, this.gain(0.25, this.bulbGain));
        this.buzzGain = this.gain(0, this.dry, this.verb);
        this.osc('square', 100, this.filter('bandpass', 1400, 1.5, this.buzzGain));
        this.roomGain = this.gain(0.0, this.dry);
        this.noise('brown', this.filter('lowpass', 220, 0.5, this.roomGain));
        this.set(this.roomGain.gain, 0.12, 1);
    }

    // --- One-shots -----------------------------------------------------------

    envelope(node, t, peak, attack, decay) {
        node.gain.setValueAtTime(0, t);
        node.gain.linearRampToValueAtTime(peak, t + attack);
        node.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
    }

    burst(t, dur, kind, type, freq, q, peak, wet = 0) {
        const s = this.ctx.createBufferSource();
        s.buffer = this.buffers[kind];
        const g = this.gain(0, this.dry);
        if (wet) g.connect(this.verb);
        s.connect(this.filter(type, freq, q, g));
        this.envelope(g, t, peak, 0.002, dur);
        s.start(t, Math.random() * 3);
        s.stop(t + dur + 0.1);
        return g;
    }

    tone(t, freq, peak, attack, decay, type = 'sine', wet = true, glideTo = 0) {
        const g = this.gain(0, this.dry);
        if (wet) g.connect(this.verb);
        const o = this.ctx.createOscillator();
        o.type = type;
        o.frequency.setValueAtTime(freq, t);
        if (glideTo) o.frequency.exponentialRampToValueAtTime(glideTo, t + attack + decay);
        o.connect(g);
        this.envelope(g, t, peak, attack, decay);
        o.start(t);
        o.stop(t + attack + decay + 0.1);
    }

    heartbeat(t, level) {
        for (const [dt, k] of [[0, 1], [0.27, 0.62]]) {
            this.tone(t + dt, 62, 0.9 * level * k, 0.006, 0.22, 'sine', false, 36);
            this.burst(t + dt, 0.05, 'brown', 'lowpass', 180, 0.7, 0.5 * level * k);
        }
        this.lastBeat = t;
    }

    // A soft felt-piano note under each new line.
    line(sceneIndex, lineIndex, emphatic) {
        if (!this.ready) return;
        const mood = MOODS[scenes[sceneIndex].id];
        const t = this.ctx.currentTime + 0.02;
        const note = mood.chord[1 + (lineIndex % 3)] + 24;
        const f = hz(Math.min(note, 84));
        [[1, 0.09], [2, 0.03], [3, 0.012]].forEach(([m, a]) => this.tone(t, f * m * (1 + (Math.random() - 0.5) * 0.002), a, 0.004, 3.2 / m));
        if (emphatic) {
            this.tone(t, hz(mood.chord[0]), 0.3, 0.02, 2.5, 'sine', true);
            this.burst(t, 1.2, 'brown', 'lowpass', 120, 0.7, 0.35, 1);
        }
    }


    // One finale voice: swells in, holds, and dies away into the long reverb.
    finaleTone(t, freq, peak, attack, hold, release, type = 'sine', glideTo = 0) {
        const g = this.gain(0, this.finaleDry, this.finaleWet);
        const o = this.ctx.createOscillator();
        o.type = type;
        o.frequency.setValueAtTime(freq, t);
        if (glideTo) o.frequency.exponentialRampToValueAtTime(glideTo, t + attack + hold + release);
        const lp = this.filter('lowpass', 1800, 0.5, g);
        o.connect(lp);
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(peak, t + attack);
        g.gain.setValueAtTime(peak, t + attack + hold);
        g.gain.exponentialRampToValueAtTime(0.0001, t + attack + hold + release);
        o.start(t);
        o.stop(t + attack + hold + release + 0.2);
        this.finaleNodes.push({ o, g });
    }

    // The ending: smash to silence, a last heartbeat, the bell, and one chord that finally
    // resolves (D major after a film in D minor) and fades out over the reverb.
    startFinale() {
        const t0 = this.ctx.currentTime;
        this.finaleAt = t0;
        runtime.finaleAt = performance.now();
        this.set(this.dry.gain, 0, 0.08);
        this.set(this.verb.gain, 0, 0.3);

        this.finaleTone(t0 + 0.9, 62, 0.6, 0.006, 0.02, 0.5, 'sine', 34);
        for (const [m, a] of [[1, 0.2], [2.76, 0.08], [5.4, 0.04], [8.93, 0.02]]) {
            this.finaleTone(t0 + 1.7, hz(74) * m, a, 0.003, 0, 8 / Math.sqrt(m));
            this.finaleTone(t0 + 1.7, hz(62) * m, a * 0.7, 0.003, 0, 9 / Math.sqrt(m));
        }
        const chord = [38, 45, 50, 54, 57, 64];
        chord.forEach((n, i) => {
            const at = t0 + 2.6 + i * 0.35;
            this.finaleTone(at, hz(n), 0.032, 5, 4.5, 13);
            this.finaleTone(at, hz(n) * 1.003, 0.016, 6, 4, 13, 'triangle');
        });
        this.finaleTone(t0 + 2.6, hz(26), 0.12, 6, 4, 11);
        this.finaleTone(t0 + 6, hz(81), 0.012, 4, 3, 12);
    }

    cancelFinale() {
        const now = this.ctx.currentTime;
        for (const { o, g } of this.finaleNodes) {
            g.gain.cancelScheduledValues(now);
            g.gain.setTargetAtTime(0, now, 0.15);
            try {
                o.stop(now + 1);
            } catch {
                // already stopped
            }
        }
        this.finaleNodes = [];
        this.finaleAt = -1;
        runtime.finaleAt = -1;
        this.set(this.dry.gain, 1, 0.4);
        this.set(this.verb.gain, 0.55, 0.4);
    }

    switchClick() {
        if (!this.ready) return;
        const t = this.ctx.currentTime;
        this.burst(t, 0.012, 'white', 'highpass', 2500, 0.7, 0.5);
        this.burst(t + 0.07, 0.02, 'white', 'bandpass', 1400, 2, 0.35);
    }

    // Lights out: impact, glass, and the room falling away.
    lightsOut() {
        if (!this.ready) return;
        const t = this.ctx.currentTime;
        this.tone(t, 72, 1.0, 0.004, 3.2, 'sine', true, 22);
        this.burst(t, 2.2, 'brown', 'lowpass', 500, 0.7, 0.9, 1);
        this.burst(t, 0.5, 'white', 'highpass', 3000, 0.7, 0.35, 1);
        for (let i = 0; i < 18; i++) {
            const at = t + Math.random() * 0.5;
            this.tone(at, 2500 + Math.random() * 6000, 0.03 + Math.random() * 0.05, 0.001, 0.2 + Math.random() * 0.5);
        }
        this.set(this.bulbGain.gain, 0, 0.05);
        this.set(this.roomGain.gain, 0.05, 2);
        runtime.shake = 1;
    }

    // --- Per frame -------------------------------------------------------------

    update(dt) {
        if (!this.ready) return;
        const ctx = this.ctx;
        const now = ctx.currentTime;
        const f = runtime.frame;
        const story = runtime.igniteTime >= 0;

        if (!story) {
            // The lit room before the pull.
            const light = runtime.light;
            this.set(this.bulbGain.gain, 0.05 * light, 0.02);
            this.set(this.buzzGain.gain, light > 0 && light < 1 ? 0.12 : 0, 0.01);
            runtime.pulse = 0;
            return;
        }
        this.set(this.buzzGain.gain, 0, 0.05);
        if (!f) return;

        const A = MOODS[scenes[f.prev].id];
        const B = MOODS[scenes[f.index].id];
        const m = f.morph;
        const mix = (k) => (A[k] || 0) + ((B[k] || 0) - (A[k] || 0)) * m;
        for (const k of LEVELS) this.mood[k] = mix(k);
        const mood = this.mood;
        const transit = f.prev === f.index ? 0 : Math.sin(m * Math.PI);
        const speed = Math.min(1, Math.abs(runtime.scrollTarget - runtime.scroll) * 1.5);
        const ending = 1 - f.tail;

        // Pad: chord glides at mid-morph; the eye climbs as the pupil tightens.
        const chord = m < 0.5 ? A.chord : B.chord;
        const rise = mood.rise * f.q * 3;
        this.voices.forEach((v, i) => {
            const fr = hz(chord[i] + rise);
            this.set(v.a.frequency, fr, 0.9);
            this.set(v.b.frequency, fr * 1.004, 0.9);
            if (v.sub) this.set(v.sub.frequency, fr / 2, 0.9);
        });
        this.set(this.padFilter.frequency, mix('cutoff') * (1 + rise * 0.15) + transit * 800, 0.4);
        this.set(this.padGain.gain, mood.pad * 0.16 * ending, 0.6);

        this.set(this.airFilter.frequency, 300 + transit * 2600 + speed * 1500, 0.15);
        this.set(this.airGain.gain, (mood.air * 0.25 + transit * 0.35 + speed * 0.25) * ending, 0.2);
        this.set(this.subGain.gain, (transit * 0.35 + mood.rumble * 0.25) * ending, 0.3);
        this.set(this.rumbleGain.gain, mood.rumble * 0.3, 0.5);
        this.set(this.humGain.gain, mood.hum * 0.07, 0.6);
        this.set(this.tinGain.gain, mood.tinnitus * (0.006 + 0.01 * f.q), 0.6);
        this.set(this.roadGain.gain, mood.road * 0.26, 0.5);
        this.set(this.engine.frequency, 34 + speed * 12 + Math.sin(now * 0.3) * 2, 0.3);
        this.set(this.whisperGain.gain, mood.whisper * 0.5, 0.4);
        this.set(this.babbleGain.gain, mood.babble * 0.35, 0.4);

        // Shepard glide.
        const dir = (A.shepard || 0) * (1 - m) + (B.shepard || 0) * m;
        this.shepPhase += dir * dt * 0.08;
        this.set(this.shepGain.gain, Math.abs(dir) * 0.09 * ending, 0.5);
        this.shep.forEach((s, k) => {
            const p = (((k + this.shepPhase) % 7) + 7) % 7;
            const freq = 55 * Math.pow(2, p);
            const amp = Math.exp(-Math.pow((p - 3.5) / 1.6, 2));
            s.o.frequency.setTargetAtTime(freq, now, 0.02);
            s.g.gain.setTargetAtTime(amp * 0.4, now, 0.05);
        });

        // Scheduled events, a little ahead of time.
        const ahead = now + 0.12;
        const bpm = mix('bpm');
        if (bpm > 1 && mood.beat > 0.01) {
            if (this.nextBeat < now) this.nextBeat = now + 0.05;
            while (this.nextBeat < ahead) {
                this.heartbeat(this.nextBeat, mood.beat * (0.6 + 0.4 * ending) * (1 + mood.rise * f.q * 0.6));
                this.nextBeat += 60 / bpm;
            }
        }
        if (mood.tick > 0.02 && this.nextTick < ahead) {
            this.nextTick = Math.max(this.nextTick + 1, now + 0.05);
            this.burst(this.nextTick, 0.01, 'white', 'highpass', 3500, 0.7, 0.16 * mood.tick, 1);
        }
        if (mood.blinker > 0.02 && this.nextBlink < ahead) {
            this.nextBlink = Math.max(this.nextBlink + 0.38, now + 0.05);
            this.blinkHigh = !this.blinkHigh;
            this.burst(this.nextBlink, 0.03, 'white', 'bandpass', this.blinkHigh ? 2400 : 1800, 4, 0.5 * mood.blinker, 1);
        }
        if (mood.crackle > 0.02 && this.nextCrackle < ahead) {
            this.nextCrackle = now + 0.05 + Math.random() * (0.6 / mood.crackle);
            this.burst(this.nextCrackle, 0.008 + Math.random() * 0.02, 'white', 'bandpass', 2000 + Math.random() * 5000, 3, 0.25 * mood.crackle, 1);
        }
        if (mood.tear > 0.02 && this.nextTear < ahead) {
            this.nextTear = now + 1.2 + Math.random() * 2.5;
            const dur = 0.15 + Math.random() * 0.35;
            this.burst(this.nextTear, dur, 'white', 'bandpass', 900 + Math.random() * 2500, 1.2, 0.22 * mood.tear, 1);
        }
        if (mood.breath > 0.02 && this.nextBreath < ahead) {
            const period = 60 / Math.max(bpm, 40) * 4;
            const t = Math.max(this.nextBreath, now + 0.05);
            const g = this.breathEnv.gain;
            const peak = 0.3 * mood.breath;
            g.setValueAtTime(0.0001, t);
            g.linearRampToValueAtTime(peak, t + period * 0.35);
            g.linearRampToValueAtTime(0.0001, t + period * 0.5);
            g.linearRampToValueAtTime(peak * 0.7, t + period * 0.65);
            g.linearRampToValueAtTime(0.0001, t + period * 0.98);
            this.breathFilter.frequency.setValueAtTime(700, t);
            this.breathFilter.frequency.linearRampToValueAtTime(1300, t + period * 0.35);
            this.breathFilter.frequency.linearRampToValueAtTime(600, t + period);
            this.nextBreath = t + period;
        }
        // Syllables: random vowels with speech-like rhythm.
        this.speakers.forEach((sp, i) => {
            const level = i === 0 ? mood.whisper : mood.babble;
            if (level < 0.02 || this.nextSyllable[i] > ahead) return;
            const t = Math.max(this.nextSyllable[i], now + 0.02);
            const len = 0.08 + Math.random() * 0.22;
            const pause = Math.random() < 0.15 ? 0.4 + Math.random() * 0.8 : 0.02;
            const [a, b] = [[700, 1200], [400, 2000], [300, 2300], [600, 900], [500, 1700]][Math.floor(Math.random() * 5)];
            const shift = i === 0 ? 1 : 0.8 + i * 0.1;
            sp.f1.frequency.setTargetAtTime(a * shift, t, 0.02);
            sp.f2.frequency.setTargetAtTime(b * shift, t, 0.02);
            sp.env.gain.setValueAtTime(0.0001, t);
            sp.env.gain.linearRampToValueAtTime(1.6, t + len * 0.3);
            sp.env.gain.linearRampToValueAtTime(0.0001, t + len);
            this.nextSyllable[i] = t + len + pause;
        });

        // The ending begins as "Who?" appears, and plays out in its own time.
        const isVoid = scenes[f.index].id === 'void';
        if (isVoid && (f.line >= 0 || f.tail > 0) && this.finaleAt < 0) this.startFinale();
        if (!isVoid && this.finaleAt >= 0) this.cancelFinale();

        // Feed the picture: heartbeat pulse and shake.
        const sinceBeat = now - this.lastBeat;
        runtime.pulse = sinceBeat >= 0 ? Math.exp(-sinceBeat * 7) * mood.beat : 0;
        runtime.intensity = transit * 0.7 + speed * 0.3;
    }
}

export const score = new Score();

// Dev hook for measuring the mix from devtools.
if (import.meta.env.DEV) window.__score = score;

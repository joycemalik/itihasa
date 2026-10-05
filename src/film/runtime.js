import { create } from 'zustand';
import * as THREE from 'three';

// Coarse phase changes go through React (they swap what is mounted).
export const useExperience = create((set) => ({
    phase: 'loading', // loading -> intro (lamp on) -> story (lights out, scroll drives the film)
    loadProgress: 0,
    error: null,
    setPhase: (phase) => set({ phase }),
    setLoadProgress: (loadProgress) => set({ loadProgress }),
    setError: (error) => set({ error }),
    reset: () => set({ phase: 'loading', loadProgress: 0, error: null }),
}));

// Per-frame values shared by the canvas and the DOM overlay.
// Mutated in place every frame, never through React state.
export const runtime = {
    scrollTarget: 0, // story units, straight from the scroll position
    scroll: 0, // smoothed story units, what everything actually follows
    frame: null, // latest timeline sample (see timeline.sample)
    igniteTime: -1, // clock time the light went out
    bulb: new THREE.Vector3(0, 1.2, 0), // where the particles burst from
    tone: 0, // 0 = dark film, 1 = paper
    light: 1, // the lamp's brightness during the intro
    pulse: 0, // heartbeat envelope from the score, 0..1
    shake: 0, // camera shake, decays on its own
    intensity: 0, // transitions + scroll speed, drives the grade
    focus: 8, // camera focus distance for depth of field
    finaleAt: -1, // performance.now() when the closing music began
};

export function resetRuntime() {
    runtime.scrollTarget = 0;
    runtime.scroll = 0;
    runtime.frame = null;
    runtime.igniteTime = -1;
    runtime.bulb.set(0, 1.2, 0);
    runtime.tone = 0;
    runtime.light = 1;
    runtime.pulse = 0;
    runtime.shake = 0;
    runtime.intensity = 0;
    runtime.focus = 8;
    runtime.finaleAt = -1;
}

// Handy for poking at the film from devtools: __itihas.scrollTarget = 20
if (import.meta.env.DEV) window.__itihas = runtime;

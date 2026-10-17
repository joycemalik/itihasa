import { useEffect, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { EffectComposer, Bloom, Noise } from '@react-three/postprocessing';
import { ChromaticAberrationEffect, VignetteEffect } from 'postprocessing';
import * as THREE from 'three';
import ParticleField from './ParticleField';
import Lamp from './Lamp';
import CameraRig from './CameraRig';
import Overlay from './Overlay';
import { ForegroundDust, SoundDirector } from './Atmosphere';
import { score } from './audio';
import { loadClouds, buildShapes } from './shapes';
import { totalUnits, UNIT_VH, INTRO_CAMERA } from './timeline';
import { runtime, resetRuntime, useExperience } from './runtime';
import './experience.css';

// Created directly (not via the JSX wrappers) so the frame loop can drive them: the wrappers
// serialise their props, and in React 19 a ref is a prop, which they cannot serialise.
const aberration = new ChromaticAberrationEffect({ offset: new THREE.Vector2(0.0007, 0.0009), radialModulation: true, modulationOffset: 0.35 });
const vignette = new VignetteEffect({ offset: 0.22, darkness: 0.82 });

// Auto-scroll pace in story units (script lines) per second: one line every ~9 seconds.
const AUTO_SPEED = 0.11;
// Wait for the lamp's flicker and the first breath of dark before rolling.
const AUTO_DELAY = 2600;
const SCROLL_KEYS = new Set(['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End', ' ']);

function Film({ shapes }) {
    const phase = useExperience((s) => s.phase);
    const [lampGone, setLampGone] = useState(false);

    // The grade breathes with the heartbeat and tears at the edges during transitions.
    useFrame(() => {
        const kick = runtime.pulse + runtime.intensity * 0.5 + runtime.shake;
        aberration.offset.set(0.0006 + kick * 0.0028, 0.0008 + kick * 0.0022);
        vignette.darkness = 0.8 + runtime.pulse * 0.25 + runtime.shake * 0.2;
    });

    // The lamp lingers a moment after lights-out so its flicker can finish.
    useEffect(() => {
        if (phase !== 'story') return;
        const id = setTimeout(() => setLampGone(true), 1500);
        return () => clearTimeout(id);
    }, [phase]);

    return (
        <>
            {!lampGone && <Lamp />}
            <ParticleField shapes={shapes} />
            <ForegroundDust />
            <CameraRig />
            <SoundDirector />
            <EffectComposer multisampling={0}>
                <Bloom mipmapBlur luminanceThreshold={0.86} luminanceSmoothing={0.1} intensity={0.55} />
                <primitive object={aberration} />
                <Noise opacity={0.07} />
                <primitive object={vignette} />
            </EffectComposer>
        </>
    );
}

export default function Experience() {
    const rootRef = useRef(null);
    const scrollerRef = useRef(null);
    const phase = useExperience((s) => s.phase);
    const autoScroll = useExperience((s) => s.autoScroll);
    const [shapes, setShapes] = useState(null);
    const touched = useRef(false);

    useEffect(() => {
        let alive = true;
        const { setLoadProgress, setPhase, setError } = useExperience.getState();
        score.reset();
        loadClouds((p) => alive && setLoadProgress(p))
            .then((clouds) => {
                if (!alive) return;
                setShapes(buildShapes(clouds));
                setPhase('intro');
            })
            .catch((e) => alive && setError(e.message));
        return () => {
            alive = false;
            useExperience.getState().reset();
            resetRuntime();
            score.sleep();
            if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
        };
    }, []);

    useEffect(() => {
        if (phase === 'story' && scrollerRef.current) scrollerRef.current.scrollTop = 0;
    }, [phase]);

    // After the pull, the film rolls on by itself once the lights-out has landed.
    useEffect(() => {
        if (phase !== 'story') return;
        const id = setTimeout(() => !touched.current && useExperience.getState().setAutoScroll(true), AUTO_DELAY);
        return () => clearTimeout(id);
    }, [phase]);

    // Any touch of the film hands it back to the viewer, and unticks the box.
    useEffect(() => {
        const el = scrollerRef.current;
        if (phase !== 'story' || !el) return;
        const stop = () => {
            touched.current = true;
            if (useExperience.getState().autoScroll) useExperience.getState().setAutoScroll(false);
        };
        const onKey = (e) => SCROLL_KEYS.has(e.key) && stop();
        el.addEventListener('wheel', stop, { passive: true });
        el.addEventListener('touchstart', stop, { passive: true });
        el.addEventListener('pointerdown', stop);
        window.addEventListener('keydown', onKey);
        return () => {
            el.removeEventListener('wheel', stop);
            el.removeEventListener('touchstart', stop);
            el.removeEventListener('pointerdown', stop);
            window.removeEventListener('keydown', onKey);
        };
    }, [phase]);

    useEffect(() => {
        const el = scrollerRef.current;
        if (!autoScroll || !el) return;
        let raf;
        let last = performance.now();
        // Kept as a float: scrollTop rounds, and the pace is too slow to survive rounding.
        let pos = el.scrollTop;
        const tick = (now) => {
            const dt = Math.min((now - last) / 1000, 0.1);
            last = now;
            // Picks up from wherever the viewer left it.
            if (Math.abs(el.scrollTop - pos) > 2) pos = el.scrollTop;
            const end = el.scrollHeight - el.clientHeight;
            pos = Math.min(end, pos + AUTO_SPEED * ((window.innerHeight * UNIT_VH) / 100) * dt);
            el.scrollTop = pos;
            if (pos >= end) {
                useExperience.getState().setAutoScroll(false);
                return;
            }
            raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, [autoScroll]);

    const onScroll = (e) => {
        runtime.scrollTarget = e.currentTarget.scrollTop / ((window.innerHeight * UNIT_VH) / 100);
    };

    return (
        // Any touch of the page wakes the sound (browsers need a gesture), e.g. on a direct visit.
        <div ref={rootRef} className={`exp-root phase-${phase}`} onPointerDown={() => score.unlock()}>
            <Canvas
                className="exp-canvas"
                eventSource={rootRef}
                eventPrefix="client"
                dpr={[1, 1.75]}
                gl={{ antialias: false, powerPreference: 'high-performance' }}
                camera={{ fov: 40, near: 0.05, far: 120, position: INTRO_CAMERA }}
            >
                {shapes && <Film shapes={shapes} />}
            </Canvas>
            <div ref={scrollerRef} className="exp-scroller" onScroll={onScroll}>
                <div style={{ height: `calc(${totalUnits * UNIT_VH}vh + 100vh)` }} />
            </div>
            <Overlay />
        </div>
    );
}

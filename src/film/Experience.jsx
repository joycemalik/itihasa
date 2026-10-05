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
    const [shapes, setShapes] = useState(null);

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

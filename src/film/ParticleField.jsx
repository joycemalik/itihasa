import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { GPUComputationRenderer } from 'three/examples/jsm/misc/GPUComputationRenderer.js';
import { SIM_SIZE, COUNT } from './shapes';
import { velocityShader, positionShader, renderVertex, renderFragment } from './shaders';
import { scenes, sample } from './timeline';
import { runtime, useExperience } from './runtime';

const CHALK = new THREE.Color('#efe9dc');
const GRAPHITE = new THREE.Color('#1c1914');
const BASE_SPRING = 18;

function createSimulation(gl, shapes) {
    const gpu = new GPUComputationRenderer(SIM_SIZE, SIM_SIZE, gl);
    if (!gl.extensions.has('EXT_color_buffer_float')) gpu.setDataType(THREE.HalfFloatType);

    const pos0 = gpu.createTexture();
    const vel0 = gpu.createTexture();
    const p = pos0.image.data;
    for (let i = 0; i < COUNT; i++) {
        p[i * 4] = runtime.bulb.x + (Math.random() - 0.5) * 0.2;
        p[i * 4 + 1] = runtime.bulb.y + (Math.random() - 0.5) * 0.2;
        p[i * 4 + 2] = runtime.bulb.z + (Math.random() - 0.5) * 0.2;
        p[i * 4 + 3] = 1;
    }

    // Velocity first, so positions integrate this frame's velocity.
    const velVar = gpu.addVariable('textureVelocity', velocityShader, vel0);
    const posVar = gpu.addVariable('texturePosition', positionShader, pos0);
    gpu.setVariableDependencies(velVar, [posVar, velVar]);
    gpu.setVariableDependencies(posVar, [posVar, velVar]);

    const first = shapes[scenes[0].id];
    Object.assign(velVar.material.uniforms, {
        uTime: { value: 0 },
        uDelta: { value: 0 },
        uMorph: { value: 1 },
        uChaos: { value: 0.14 },
        uIntro: { value: 1 },
        uBurst: { value: 0 },
        uSpring: { value: BASE_SPRING },
        uDrag: { value: 5.5 },
        uMouseForce: { value: 0 },
        uBulb: { value: runtime.bulb.clone() },
        uRayO: { value: new THREE.Vector3(0, 0, 100) },
        uRayD: { value: new THREE.Vector3(0, 0, -1) },
        uTargetA: { value: first.positions },
        uTargetB: { value: first.positions },
    });
    posVar.material.uniforms.uDelta = { value: 0 };

    const error = gpu.init();
    if (error) throw new Error(`Particle simulation failed to start: ${error}`);

    const geometry = new THREE.BufferGeometry();
    const refs = new Float32Array(COUNT * 2);
    for (let i = 0; i < COUNT; i++) {
        refs[i * 2] = ((i % SIM_SIZE) + 0.5) / SIM_SIZE;
        refs[i * 2 + 1] = (Math.floor(i / SIM_SIZE) + 0.5) / SIM_SIZE;
    }
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(COUNT * 3), 3));
    geometry.setAttribute('aRef', new THREE.BufferAttribute(refs, 2));

    const material = new THREE.ShaderMaterial({
        vertexShader: renderVertex,
        fragmentShader: renderFragment,
        transparent: true,
        depthWrite: false,
        uniforms: {
            uPositions: { value: null },
            uVelocities: { value: null },
            uTargetA: { value: first.positions },
            uTargetB: { value: first.positions },
            uNormalA: { value: first.normals },
            uNormalB: { value: first.normals },
            uMorph: { value: 1 },
            uTime: { value: 0 },
            uSceneTA: { value: 0 },
            uSceneTB: { value: 0 },
            uStroke: { value: 0.034 },
            uProj: { value: 1000 },
            uDpr: { value: 1 },
            uReveal: { value: 0 },
            uTone: { value: 0 },
            uFocus: { value: 8 },
            uLightDir: { value: new THREE.Vector3(-0.5, 0.8, 0.6).normalize() },
            uInk: { value: CHALK.clone() },
        },
    });
    const points = new THREE.Points(geometry, material);
    points.frustumCulled = false;

    return {
        gpu, velVar, posVar, points, material,
        dispose() {
            gpu.dispose();
            geometry.dispose();
            material.dispose();
        },
    };
}

export default function ParticleField({ shapes }) {
    const gl = useThree((s) => s.gl);
    const [sim, setSim] = useState(null);
    const simRef = useRef(null);

    useEffect(() => {
        const s = createSimulation(gl, shapes);
        simRef.current = s;
        // The simulation owns GPU resources, so it is created and disposed with this effect
        // (surviving StrictMode's mount/unmount/mount); state only tells React to mount it.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setSim(s);
        return () => {
            simRef.current = null;
            s.dispose();
        };
    }, [gl, shapes]);

    const bg = useMemo(() => scenes.map((s) => new THREE.Color(s.bg)), []);
    const local = useRef({ lastPointer: new THREE.Vector2(9, 9), mouse: 0, reveal: 0, burstDone: false });

    // The director: smooth the scroll and sample the timeline before anything else reads it.
    useFrame((_, delta) => {
        const dt = Math.min(delta, 0.05);
        runtime.scroll = THREE.MathUtils.damp(runtime.scroll, runtime.scrollTarget, 3.2, dt);
        runtime.frame = sample(runtime.scroll);
    }, -2);

    useFrame((three, delta) => {
        const sim = simRef.current;
        if (!sim) return;
        const state = local.current;
        const { velVar, posVar, gpu, material } = sim;
        const vu = velVar.material.uniforms;
        const mu = material.uniforms;
        const t = three.clock.elapsedTime;
        const dt = Math.min(delta, 0.05);
        const f = runtime.frame;
        const story = useExperience.getState().phase === 'story' && runtime.igniteTime >= 0;

        const A = scenes[f.prev];
        const B = scenes[f.index];
        const sA = shapes[A.id];
        const sB = shapes[B.id];
        vu.uTargetA.value = mu.uTargetA.value = sA.positions;
        vu.uTargetB.value = mu.uTargetB.value = sB.positions;
        mu.uNormalA.value = sA.normals;
        mu.uNormalB.value = sB.normals;
        vu.uMorph.value = mu.uMorph.value = f.morph;
        mu.uSceneTA.value = f.prev === f.index ? f.q : 1;
        mu.uSceneTB.value = f.q;

        // Light-out: one frame of outward impulse, then chaos that settles over a few seconds.
        const since = story ? t - runtime.igniteTime : -1;
        vu.uIntro.value = story ? 0 : 1;
        vu.uBurst.value = story && !state.burstDone ? 9 : 0;
        if (story) state.burstDone = true;
        const sceneChaos = THREE.MathUtils.lerp(A.chaos, B.chaos, f.morph);
        vu.uChaos.value = sceneChaos + (since >= 0 ? 2.6 * Math.exp(-since * 0.7) : 0);
        vu.uSpring.value = since >= 0 ? BASE_SPRING * Math.min(1, 0.15 + since * 0.35) : BASE_SPRING;
        vu.uBulb.value.copy(runtime.bulb);
        state.reveal = THREE.MathUtils.damp(state.reveal, story ? 1 : 0, 3, dt);
        mu.uReveal.value = state.reveal * (1 - f.tail * 0.85);

        // The cursor pushes particles aside while it moves.
        three.raycaster.setFromCamera(three.pointer, three.camera);
        const moved = state.lastPointer.distanceToSquared(three.pointer) > 1e-6;
        state.lastPointer.copy(three.pointer);
        state.mouse = THREE.MathUtils.damp(state.mouse, story && moved ? 1 : 0, moved ? 8 : 1.2, dt);
        vu.uMouseForce.value = state.mouse;
        vu.uRayO.value.copy(three.raycaster.ray.origin);
        vu.uRayD.value.copy(three.raycaster.ray.direction);

        vu.uTime.value = mu.uTime.value = t;
        vu.uDelta.value = posVar.material.uniforms.uDelta.value = dt;
        gpu.compute();
        mu.uPositions.value = gpu.getCurrentRenderTarget(posVar).texture;
        mu.uVelocities.value = gpu.getCurrentRenderTarget(velVar).texture;

        // Paper or film, and the stroke scale for this screen.
        runtime.tone = THREE.MathUtils.lerp(A.tone, B.tone, f.morph);
        mu.uTone.value = runtime.tone;
        mu.uInk.value.copy(CHALK).lerp(GRAPHITE, runtime.tone);
        if (story) {
            if (!three.scene.background) three.scene.background = new THREE.Color();
            three.scene.background.copy(bg[f.prev]).lerp(bg[f.index], f.morph);
        }
        const buffer = gl.getDrawingBufferSize(new THREE.Vector2());
        mu.uProj.value = buffer.y / (2 * Math.tan(THREE.MathUtils.degToRad(three.camera.fov) / 2));
        mu.uDpr.value = gl.getPixelRatio();
        mu.uFocus.value = runtime.focus;
    }, -1);

    return sim ? <primitive object={sim.points} /> : null;
}

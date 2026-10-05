import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { runtime } from './runtime';
import { score } from './audio';

const NEAR_COUNT = 700;
const BOX = 7;

// Out-of-focus motes floating right in front of the lens. They live in a box that wraps
// around the camera, so every camera move slides them past: the strongest depth cue we have.
// Built once at module level: only one film is ever mounted.
const dustMaterial = new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        uniforms: { uCam: { value: new THREE.Vector3() }, uTime: { value: 0 }, uProj: { value: 800 }, uInk: { value: new THREE.Color() }, uReveal: { value: 0 } },
        vertexShader: /* glsl */ `
  uniform vec3 uCam;
  uniform float uTime;
  uniform float uProj;
  uniform float uReveal;
  attribute float aSeed;
  varying float vAlpha;
  void main() {
    vec3 p = position + vec3(sin(uTime * 0.1 + aSeed * 20.0), sin(uTime * 0.07 + aSeed * 13.0) + uTime * 0.03, cos(uTime * 0.08 + aSeed * 7.0)) * 0.4;
    p = mod(p - uCam + ${(BOX / 2).toFixed(1)}, ${BOX.toFixed(1)}) - ${(BOX / 2).toFixed(1)} + uCam;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    float d = -mv.z;
    gl_PointSize = clamp((0.05 + aSeed * 0.06) * uProj / max(d, 0.1), 1.0, 140.0);
    // Visible only between the lens and the subject; fade at the box edges.
    vAlpha = smoothstep(0.25, 0.9, d) * (1.0 - smoothstep(2.0, 3.4, d)) * (0.1 + aSeed * 0.14) * uReveal;
  }
`,
        fragmentShader: /* glsl */ `
  uniform vec3 uInk;
  varying float vAlpha;
  void main() {
    float r = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.15, r) * vAlpha;
    if (a < 0.003) discard;
    gl_FragColor = vec4(uInk, a);
  }
`,
});

const dustGeometry = (() => {
    let seed = 11;
    const rand = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
    const g = new THREE.BufferGeometry();
    const pos = new Float32Array(NEAR_COUNT * 3);
    const seeds = new Float32Array(NEAR_COUNT);
    for (let i = 0; i < NEAR_COUNT; i++) {
        pos.set([(rand() - 0.5) * BOX, (rand() - 0.5) * BOX, (rand() - 0.5) * BOX], i * 3);
        seeds[i] = rand();
    }
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
    return g;
})();

export function ForegroundDust() {
    const reveal = useRef(0);

    useFrame((state, delta) => {
        const u = dustMaterial.uniforms;
        u.uCam.value.copy(state.camera.position);
        u.uTime.value = state.clock.elapsedTime;
        const h = state.gl.getDrawingBufferSize(new THREE.Vector2()).y;
        u.uProj.value = h / (2 * Math.tan(THREE.MathUtils.degToRad(state.camera.fov) / 2));
        u.uInk.value.set('#efe9dc').lerp(new THREE.Color('#1c1914'), runtime.tone);
        reveal.current = THREE.MathUtils.damp(reveal.current, runtime.igniteTime >= 0 ? 1 : 0, 0.8, delta);
        u.uReveal.value = reveal.current * (1 - (runtime.frame?.tail ?? 0));
    });

    return <points geometry={dustGeometry} material={dustMaterial} frustumCulled={false} />;
}

// Runs the score once per frame.
export function SoundDirector() {
    useFrame((_, delta) => {
        const dt = Math.min(delta, 0.05);
        score.update(dt);
        runtime.shake *= Math.exp(-dt * 1.8);
    });
    return null;
}

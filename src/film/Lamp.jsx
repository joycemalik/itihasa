import { useEffect, useMemo, useRef } from 'react';
import { extend, useFrame, useThree } from '@react-three/fiber';
import { Line, shaderMaterial } from '@react-three/drei';
import * as THREE from 'three';
import { runtime, useExperience } from './runtime';
import { score } from './audio';

// The lamp's light on paper, computed in screen space; uLight = 0 is a dark room.
const LightPoolMaterial = shaderMaterial(
    { uLightPos: new THREE.Vector2(0.5, 0.6), uRes: new THREE.Vector2(1, 1), uLight: 1 },
    /* glsl */ `
    void main() {
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
    /* glsl */ `
    uniform vec2 uLightPos;
    uniform vec2 uRes;
    uniform float uLight;
    float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    void main() {
      vec2 uv = gl_FragCoord.xy / uRes;
      float aspect = uRes.x / uRes.y;
      vec2 d = (uv - uLightPos) * vec2(aspect, 1.0);
      float below = -d.y;
      // Cone falling from the shade, a halo round the bulb, and a pool where it lands.
      float spread = max(below, 0.0) * 0.62 + 0.04;
      float cone = smoothstep(spread, spread * 0.35, abs(d.x)) * smoothstep(-0.02, 0.05, below);
      cone *= 0.55 * (1.0 - smoothstep(0.0, 1.2, below));
      float halo = exp(-dot(d, d) * 22.0);
      vec2 pd = vec2(d.x * 0.55, (uv.y - 0.06) * 2.4);
      float pool = exp(-dot(pd, pd) * 9.0) * 0.6;
      float light = clamp(cone + halo + pool + 0.1, 0.0, 1.0);
      vec3 paper = vec3(0.925, 0.894, 0.824);
      vec3 shadow = vec3(0.075, 0.068, 0.056);
      vec3 col = mix(shadow, paper, pow(light, 0.8));
      col *= 0.95 + 0.05 * hash(floor(gl_FragCoord.xy));
      gl_FragColor = vec4(col * uLight, 1.0);
    }
  `
);
extend({ LightPoolMaterial });

const SEGMENTS = 8;
const LINK = 0.4;
const GRAVITY = 9.81;
const ANCHOR_Y = 4;
const PULL_Y = 0.5;
// Light level over time after the pull: a dying bulb, flickering out.
const FLICKER = [[0.07, 0], [0.16, 1], [0.3, 0], [0.36, 0.55], [0.44, 0]];
const IGNITE_AT = 0.44;
const INITIAL_CORD = Array.from({ length: SEGMENTS }, (_, i) => [0, ANCHOR_Y - i * LINK, 0]);

// The pull is still inside the pointer gesture's activation window, so the browser allows it.
function enterFullscreen() {
    const el = document.documentElement;
    if (document.fullscreenElement || !el.requestFullscreen) return;
    el.requestFullscreen({ navigationUI: 'hide' }).catch(() => {});
}

function makeCord() {
    return INITIAL_CORD.map((p, i) => {
        const pos = new THREE.Vector3(...p);
        return { pos, old: pos.clone(), pinned: i === 0 };
    });
}

export default function Lamp() {
    const { camera, viewport } = useThree();
    const setPhase = useExperience((s) => s.setPhase);
    const bgRef = useRef();
    const lineRef = useRef();
    const lampRef = useRef();
    const bulbMat = useRef();
    const groupRef = useRef();

    const cordRef = useRef(makeCord());
    const drag = useRef(false);
    const pulledAt = useRef(-1);
    const flat = useMemo(() => new Float32Array(SEGMENTS * 3), []);

    useEffect(() => {
        const up = () => {
            drag.current = false;
            document.body.style.cursor = '';
            // pointerup is a user gesture too: a fallback if the pull's own request was refused.
            if (pulledAt.current >= 0) enterFullscreen();
        };
        window.addEventListener('pointerup', up);
        return () => {
            window.removeEventListener('pointerup', up);
            document.body.style.cursor = '';
        };
    }, []);

    useFrame((state, delta) => {
        const dt = Math.min(delta, 1 / 30);
        const t = state.clock.elapsedTime;
        const cord = cordRef.current;
        const knob = cord[SEGMENTS - 1];

        // Verlet rope.
        for (const p of cord) {
            if (p.pinned) continue;
            const vx = (p.pos.x - p.old.x) * 0.95, vy = (p.pos.y - p.old.y) * 0.95, vz = (p.pos.z - p.old.z) * 0.95;
            p.old.copy(p.pos);
            p.pos.x += vx;
            p.pos.y += vy - GRAVITY * dt * dt * 0.5;
            p.pos.z += vz;
        }
        if (drag.current && pulledAt.current < 0) {
            const v = new THREE.Vector3(state.pointer.x, state.pointer.y, 0.5).unproject(camera);
            const dir = v.sub(camera.position).normalize();
            const target = camera.position.clone().add(dir.multiplyScalar(-camera.position.z / dir.z));
            target.y = Math.max(target.y, PULL_Y - 0.6);
            knob.pos.lerp(target, 0.35);
            knob.old.copy(knob.pos);
        }
        // While held, the lamp is pinned to the hand and the cord stretches to follow it.
        const held = drag.current && pulledAt.current < 0;
        for (let iter = 0; iter < 6; iter++) {
            for (let i = 0; i < SEGMENTS - 1; i++) {
                const a = cord[i], b = cord[i + 1];
                const d = b.pos.clone().sub(a.pos);
                const len = d.length() || 1e-4;
                const bFixed = held && i + 1 === SEGMENTS - 1;
                const share = a.pinned || bFixed ? 1 : 0.5;
                const off = d.multiplyScalar(((len - LINK) / len) * share);
                if (!a.pinned) a.pos.add(off);
                if (!bFixed) b.pos.sub(off);
            }
        }

        runtime.bulb.copy(knob.pos);
        if (lampRef.current) lampRef.current.position.copy(knob.pos);
        cord.forEach((p, i) => flat.set([p.pos.x, p.pos.y, p.pos.z], i * 3));
        lineRef.current?.geometry.setPositions(flat);

        if (pulledAt.current < 0 && knob.pos.y < PULL_Y) {
            pulledAt.current = t;
            drag.current = false;
            enterFullscreen();
            score.switchClick();
        }

        let light = 1;
        if (pulledAt.current >= 0) {
            const since = t - pulledAt.current;
            light = 0;
            for (const [end, level] of FLICKER) {
                if (since < end) {
                    light = level;
                    break;
                }
            }
            if (since >= IGNITE_AT && runtime.igniteTime < 0) {
                runtime.igniteTime = t;
                score.lightsOut();
                setPhase('story');
            }
            if (since > IGNITE_AT + 0.1 && groupRef.current) groupRef.current.visible = false;
        }

        runtime.light = light;
        if (bgRef.current) {
            const p = knob.pos.clone().project(camera);
            bgRef.current.uLightPos.set(p.x * 0.5 + 0.5, p.y * 0.5 + 0.5);
            bgRef.current.uLight = light;
            state.gl.getDrawingBufferSize(bgRef.current.uRes);
        }
        if (bulbMat.current) bulbMat.current.color.setRGB(1, 0.95, 0.82).multiplyScalar(0.15 + 0.85 * light);
    });

    return (
        <group ref={groupRef}>
            <mesh position={[0, 0, -5]} scale={[viewport.width * 3, viewport.height * 3, 1]}>
                <planeGeometry />
                <lightPoolMaterial ref={bgRef} depthWrite={false} />
            </mesh>
            <Line ref={lineRef} points={INITIAL_CORD} color="#1c1914" lineWidth={1.6} />
            <group ref={lampRef}>
                <mesh position={[0, 0.32, 0]}>
                    <coneGeometry args={[0.46, 0.62, 48, 1, true]} />
                    <meshBasicMaterial color="#1c1914" side={THREE.DoubleSide} />
                </mesh>
                <mesh position={[0, 0.02, 0]}>
                    <sphereGeometry args={[0.17, 32, 16]} />
                    <meshBasicMaterial ref={bulbMat} toneMapped={false} />
                </mesh>
                {/* Grab target. Kept "visible" (but fully transparent): raycasting skips invisible meshes. */}
                <mesh
                    onPointerDown={(e) => {
                        e.stopPropagation();
                        drag.current = true;
                        document.body.style.cursor = 'grabbing';
                    }}
                    onPointerOver={() => !drag.current && (document.body.style.cursor = 'grab')}
                    onPointerOut={() => !drag.current && (document.body.style.cursor = '')}
                >
                    <sphereGeometry args={[1.1, 16, 16]} />
                    <meshBasicMaterial transparent opacity={0} depthWrite={false} />
                </mesh>
            </group>
        </group>
    );
}

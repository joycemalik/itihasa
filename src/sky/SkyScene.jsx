import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { EffectComposer, Bloom, Noise, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import { buildSky, buildDust, buildHills, BAND, SKY_R } from './build';
import {
    domeVertex, domeFragment, dustVertex, dustFragment, starVertex, starFragment,
    wordVertex, wordFragment, lineVertex, lineFragment,
} from './skyShaders';

const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
// Lens: wide enough to hold the whole field, narrow enough to read one answer up close.
const FOV = 100;
const FOCUS_FOV = 28;
const ZOOM = [14, 104];
const PITCH = [-0.12, 1.45];
const HOME_PITCH = 0.72;

// Where to look so a mark's star and its words are both in frame.
function aimAt(sky, i) {
    const d = sky.dirs[i].clone().multiplyScalar(SKY_R).add(sky.centers[i]).normalize();
    return { yaw: Math.atan2(-d.x, -d.z), pitch: Math.asin(d.y) };
}

// Zoom the lens, keeping whatever is under `ndc` (the cursor, or a pinch) where it is.
function zoomTo(view, fov, ndc, aspect) {
    const next = clamp(fov, ZOOM[0], ZOOM[1]);
    const before = Math.tan(THREE.MathUtils.degToRad(view.tFov) / 2);
    const after = Math.tan(THREE.MathUtils.degToRad(next) / 2);
    if (ndc) {
        view.tYaw -= Math.atan(ndc.x * before * aspect) - Math.atan(ndc.x * after * aspect);
        view.tPitch += Math.atan(ndc.y * before) - Math.atan(ndc.y * after);
    }
    view.tFov = next;
    view.flying = false;
    view.lastInput = performance.now();
}

// Shortest way round to an angle.
const nearAngle = (from, to) => from + Math.atan2(Math.sin(to - from), Math.cos(to - from));

function Dome() {
    const mat = useMemo(() => new THREE.ShaderMaterial({
        vertexShader: domeVertex,
        fragmentShader: domeFragment,
        uniforms: { uTime: { value: 0 }, uBand: { value: BAND } },
        side: THREE.BackSide,
        depthWrite: false,
    }), []);
    const ref = useRef();
    useFrame((s) => (ref.current.material.uniforms.uTime.value = s.clock.elapsedTime));
    return (
        <mesh ref={ref} material={mat} renderOrder={-2}>
            <sphereGeometry args={[95, 64, 32]} />
        </mesh>
    );
}

function Hills() {
    const geo = useMemo(() => buildHills(), []);
    return (
        <mesh geometry={geo} renderOrder={2}>
            <meshBasicMaterial color="#020203" side={THREE.DoubleSide} />
        </mesh>
    );
}

function ShootingStars() {
    const ref = useRef();
    const state = useRef({ next: 3, start: -1, from: new THREE.Vector3(), to: new THREE.Vector3() });
    const geo = useMemo(() => {
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
        g.setAttribute('color', new THREE.BufferAttribute(new Float32Array([1, 0.96, 0.88, 0, 1, 0.96, 0.88, 1]), 4));
        return g;
    }, []);
    useFrame(({ clock }) => {
        const t = clock.elapsedTime;
        const s = state.current;
        if (s.start < 0 && t > s.next) {
            s.start = t;
            const az = Math.random() * Math.PI * 2, el = 0.5 + Math.random() * 0.6;
            s.from.set(Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el)).multiplyScalar(70);
            const dir = new THREE.Vector3(Math.random() - 0.5, -0.4 - Math.random() * 0.4, Math.random() - 0.5).normalize();
            s.to.copy(s.from).addScaledVector(dir, 18 + Math.random() * 14);
        }
        const line = ref.current;
        const pos = line.geometry.attributes.position;
        if (s.start >= 0) {
            const k = (t - s.start) / 0.9;
            if (k >= 1) {
                s.start = -1;
                s.next = t + 4 + Math.random() * 9;
                line.visible = false;
                return;
            }
            line.visible = true;
            const head = new THREE.Vector3().lerpVectors(s.from, s.to, Math.min(1, k * 1.3));
            const tail = new THREE.Vector3().lerpVectors(s.from, s.to, Math.max(0, k * 1.3 - 0.35));
            tail.toArray(pos.array, 0);
            head.toArray(pos.array, 3);
            pos.needsUpdate = true;
            line.material.opacity = Math.sin(k * Math.PI);
        }
    });
    return (
        <line ref={ref} geometry={geo} visible={false}>
            <lineBasicMaterial vertexColors transparent depthWrite={false} toneMapped={false} />
        </line>
    );
}

function Observers({ marks, sky, focusIndex, viewRef, tipRef, onHover, hoverRef }) {
    const { camera, size, gl } = useThree();
    const dust = useMemo(() => buildDust(), []);
    const shared = useMemo(() => ({
        uTime: { value: 0 },
        uPixel: { value: 1 },
        uHover: { value: -1 },
        uFocus: { value: -1 },
        uMouse: { value: new THREE.Vector2(9, 9) },
        uAspect: { value: 1 },
        uMouseOn: { value: 0 },
    }), []);
    const mats = useMemo(() => {
        const points = (vertexShader, fragmentShader, blending = THREE.AdditiveBlending) =>
            new THREE.ShaderMaterial({ vertexShader, fragmentShader, uniforms: shared, transparent: true, depthWrite: false, blending });
        return {
            dust: points(dustVertex, dustFragment),
            stars: points(starVertex, starFragment),
            words: points(wordVertex, wordFragment),
            lines: new THREE.ShaderMaterial({
                vertexShader: lineVertex,
                fragmentShader: lineFragment,
                uniforms: { uTime: shared.uTime, uOpacity: { value: 0.16 } },
                transparent: true,
                depthWrite: false,
                blending: THREE.AdditiveBlending,
            }),
        };
    }, [shared]);
    const t0 = useRef(-1);
    const starsRef = useRef();
    const screen = useRef(new THREE.Vector3());

    useEffect(() => () => {
        sky.stars.dispose();
        sky.words.dispose();
        sky.lines.dispose();
    }, [sky]);

    useFrame(({ clock }) => {
        // Every material shares one uniforms object, so this updates them all.
        const u = starsRef.current.material.uniforms;
        const view = viewRef.current;
        if (t0.current < 0) t0.current = clock.elapsedTime;
        u.uTime.value = clock.elapsedTime - t0.current;
        u.uPixel.value = gl.getPixelRatio();
        u.uAspect.value = size.width / size.height;
        u.uMouse.value.copy(view.mouse);
        u.uMouseOn.value += ((view.mouseOn ? 1 : 0) - u.uMouseOn.value) * 0.08;
        u.uFocus.value = focusIndex;

        // Hover: the nearest star, or the words beneath it, under the cursor.
        let best = -1;
        let bestD = Infinity;
        if (view.mouseOn && !view.dragging) {
            const mx = ((view.mouse.x + 1) / 2) * size.width, my = ((1 - view.mouse.y) / 2) * size.height;
            const toScreen = (v) => {
                const sc = screen.current.copy(v).project(camera);
                if (sc.z > 1) return null;
                return [((sc.x + 1) / 2) * size.width, ((1 - sc.y) / 2) * size.height];
            };
            marks.forEach((_, i) => {
                const s = toScreen(sky.dirs[i].clone().multiplyScalar(SKY_R));
                const w = toScreen(sky.centers[i]);
                for (const [p, reach] of [[s, 34], [w, 70]]) {
                    if (!p) continue;
                    const d = Math.hypot(p[0] - mx, p[1] - my);
                    if (d < reach && d < bestD) {
                        bestD = d;
                        best = i;
                    }
                }
            });
        }
        u.uHover.value = best;
        if (best !== hoverRef.current) {
            hoverRef.current = best;
            onHover(best >= 0 ? marks[best] : null);
        }
        if (tipRef.current && best >= 0) {
            const mx = ((view.mouse.x + 1) / 2) * size.width, my = ((1 - view.mouse.y) / 2) * size.height;
            tipRef.current.style.transform = `translate3d(${mx + 18}px, ${my + 18}px, 0)`;
        }
    });

    return (
        <>
            <points geometry={dust} material={mats.dust} />
            <lineSegments geometry={sky.lines} material={mats.lines} />
            <points geometry={sky.words} material={mats.words} />
            <points ref={starsRef} geometry={sky.stars} material={mats.stars} />
        </>
    );
}

// Looking around from where you stand: drag to turn, it glides, and drifts when left alone.
function Gaze({ viewRef, zoomRef }) {
    useFrame(({ camera }, delta) => {
        camera.rotation.order = 'YXZ';
        const dt = Math.min(delta, 1 / 20);
        const view = viewRef.current;
        if (!view.dragging) {
            view.tYaw += view.vYaw * dt;
            view.tPitch += view.vPitch * dt;
            view.vYaw *= Math.exp(-dt * 2.5);
            view.vPitch *= Math.exp(-dt * 2.5);
            // Left alone, the gaze sways slowly across the field.
            if (view.focus < 0 && performance.now() - view.lastInput > 4000) view.tYaw += Math.sin(performance.now() / 22000) * 0.008 * dt;
        }
        view.tPitch = clamp(view.tPitch, PITCH[0], PITCH[1]);
        const ease = 1 - Math.exp(-dt * (view.flying ? 1.6 : 7));
        view.yaw += (view.tYaw - view.yaw) * ease;
        view.pitch += (view.tPitch - view.pitch) * ease;
        view.tFov = clamp(view.tFov, ZOOM[0], ZOOM[1]);
        view.fov += (view.tFov - view.fov) * (1 - Math.exp(-dt * (view.flying ? 1.4 : 5)));
        if (zoomRef.current) zoomRef.current.style.transform = `scaleY(${(ZOOM[1] - view.fov) / (ZOOM[1] - ZOOM[0])})`;
        if (view.flying && Math.abs(view.tYaw - view.yaw) < 0.01) view.flying = false;
        camera.rotation.set(view.pitch, view.yaw, 0);
        if (Math.abs(camera.fov - view.fov) > 0.01) {
            camera.fov = view.fov;
            camera.updateProjectionMatrix();
        }
    });
    return null;
}

export default function SkyScene({ marks, focus, surfaceRef, tipRef, zoomRef, apiRef, onHover, onPick }) {
    const sky = useMemo(() => buildSky(marks), [marks]);
    const hoverRef = useRef(-1);
    const focusIndex = focus ? marks.findIndex((m) => m.number === focus.number) : -1;
    // The gaze: mutated every frame and by every pointer move, so it lives outside React.
    const viewRef = useRef({
        yaw: 0, pitch: -0.1, fov: 78,
        tYaw: 0, tPitch: HOME_PITCH, tFov: FOV,
        vYaw: 0, vPitch: 0,
        dragging: false, flying: false, lastInput: 0, focus: -1,
        mouse: new THREE.Vector2(9, 9), mouseOn: false,
    });

    // First look: at the whole field (or the chosen star), eyes lifting from the hills.
    const aimed = useRef(false);
    useEffect(() => {
        if (!marks.length) return;
        const view = viewRef.current;
        if (!aimed.current) {
            aimed.current = true;
            view.yaw = view.tYaw = 0;
            view.tPitch = HOME_PITCH;
        }
        view.focus = focusIndex;
        if (focusIndex >= 0) {
            const { yaw, pitch } = aimAt(sky, focusIndex);
            view.tYaw = nearAngle(view.yaw, yaw);
            view.tPitch = pitch;
            view.tFov = FOCUS_FOV;
            view.vYaw = view.vPitch = 0;
            view.flying = true;
        } else {
            // Back out to the whole field.
            view.tYaw = nearAngle(view.yaw, 0);
            view.tPitch = HOME_PITCH;
            view.tFov = FOV;
            view.flying = true;
        }
    }, [marks, sky, focusIndex]);

    // For the on-screen controls.
    useEffect(() => {
        apiRef.current = {
            zoom: (factor) => zoomTo(viewRef.current, viewRef.current.tFov * factor, null, 1),
            wander: () => {
                if (!marks.length) return;
                let i = Math.floor(Math.random() * marks.length);
                if (i === focusIndex) i = (i + 1) % marks.length;
                onPick(marks[i]);
            },
        };
    }, [apiRef, marks, focusIndex, onPick]);

    useEffect(() => {
        const el = surfaceRef.current;
        const view = viewRef.current;
        if (!el) return;
        let last = null;
        let moved = 0;
        // Touches currently down, and the pinch they make when there are two.
        const touches = new Map();
        let pinch = null;
        const aspect = () => el.clientWidth / el.clientHeight;
        const toNdc = (x, y) => {
            const r = el.getBoundingClientRect();
            return new THREE.Vector2(((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1);
        };
        const ndc = (e) => {
            const r = el.getBoundingClientRect();
            view.mouse.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
        };
        const ours = (e) => !e.target.closest('button, a, input, textarea, [data-ui]');
        const down = (e) => {
            if (!ours(e) || e.button > 0) return;
            if (e.pointerType === 'touch') {
                touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
                if (touches.size === 2) {
                    const [a, b] = [...touches.values()];
                    pinch = { dist: Math.hypot(a.x - b.x, a.y - b.y) || 1, fov: view.tFov };
                    view.dragging = false;
                    moved = 99; // a pinch is never a tap
                    return;
                }
            }
            view.dragging = true;
            view.flying = false;
            last = { x: e.clientX, y: e.clientY, t: performance.now() };
            moved = 0;
            el.setPointerCapture?.(e.pointerId);
        };
        const move = (e) => {
            if (touches.has(e.pointerId)) touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
            if (pinch && touches.size === 2) {
                const [a, b] = [...touches.values()];
                const dist = Math.hypot(a.x - b.x, a.y - b.y) || 1;
                const mid = toNdc((a.x + b.x) / 2, (a.y + b.y) / 2);
                zoomTo(view, (pinch.fov * pinch.dist) / dist, mid, aspect());
                pinch = { dist, fov: view.tFov };
                return;
            }
            ndc(e);
            view.mouseOn = e.pointerType === 'mouse';
            if (!view.dragging || !last) return;
            const k = (THREE.MathUtils.degToRad(view.fov) / el.clientHeight) * 1.1;
            const dx = e.clientX - last.x, dy = e.clientY - last.y;
            const dt = Math.max((performance.now() - last.t) / 1000, 1 / 240);
            moved += Math.abs(dx) + Math.abs(dy);
            view.tYaw += dx * k;
            view.tPitch += dy * k;
            view.vYaw = (dx * k) / dt * 0.5;
            view.vPitch = (dy * k) / dt * 0.5;
            last = { x: e.clientX, y: e.clientY, t: performance.now() };
            view.lastInput = performance.now();
        };
        const up = (e) => {
            touches.delete(e.pointerId);
            if (pinch) {
                if (touches.size < 2) pinch = null;
                return;
            }
            if (!view.dragging) return;
            view.dragging = false;
            view.lastInput = performance.now();
            if (performance.now() - last.t > 80) view.vYaw = view.vPitch = 0;
            if (moved < 6) {
                ndc(e);
                view.vYaw = view.vPitch = 0;
                // A tap picks what's under it (touch has no hover, so look it up now).
                if (hoverRef.current >= 0) onPick(marks[hoverRef.current]);
                else if (e.pointerType !== 'mouse') {
                    view.mouseOn = true;
                    requestAnimationFrame(() => requestAnimationFrame(() => {
                        if (hoverRef.current >= 0) onPick(marks[hoverRef.current]);
                        view.mouseOn = false;
                    }));
                }
            }
        };
        const leave = () => (view.mouseOn = false);
        // Scroll up to lean in. Scroll down to pull back out, and once the whole field is in
        // view, the page carries on scrolling down to what the observers said.
        const wheel = (e) => {
            if (window.scrollY > 2 && !e.ctrlKey) return;
            const step = Math.exp(e.deltaY * (e.ctrlKey ? 0.01 : 0.0018));
            if (!e.ctrlKey && e.deltaY > 0 && view.tFov >= ZOOM[1] - 0.5) return;
            e.preventDefault();
            zoomTo(view, view.tFov * step, toNdc(e.clientX, e.clientY), aspect());
        };
        const dbl = (e) => {
            if (!ours(e)) return;
            zoomTo(view, view.tFov * 0.5, toNdc(e.clientX, e.clientY), aspect());
        };
        const key = (e) => {
            if (e.target.closest?.('input, textarea') || window.scrollY > el.clientHeight * 0.5) return;
            const pan = THREE.MathUtils.degToRad(view.fov) * 0.08;
            const acts = {
                '+': () => zoomTo(view, view.tFov * 0.8, null, 1),
                '=': () => zoomTo(view, view.tFov * 0.8, null, 1),
                '-': () => zoomTo(view, view.tFov * 1.25, null, 1),
                ArrowLeft: () => (view.tYaw += pan),
                ArrowRight: () => (view.tYaw -= pan),
                ArrowUp: () => (view.tPitch += pan),
                ArrowDown: () => (view.tPitch -= pan),
            };
            if (!acts[e.key]) return;
            e.preventDefault();
            acts[e.key]();
            view.flying = false;
            view.lastInput = performance.now();
        };
        el.addEventListener('wheel', wheel, { passive: false });
        el.addEventListener('dblclick', dbl);
        window.addEventListener('keydown', key);
        el.addEventListener('pointerdown', down);
        el.addEventListener('pointermove', move);
        el.addEventListener('pointerup', up);
        el.addEventListener('pointercancel', up);
        el.addEventListener('pointerleave', leave);
        return () => {
            el.removeEventListener('pointerdown', down);
            el.removeEventListener('pointermove', move);
            el.removeEventListener('pointerup', up);
            el.removeEventListener('pointercancel', up);
            el.removeEventListener('pointerleave', leave);
            el.removeEventListener('wheel', wheel);
            el.removeEventListener('dblclick', dbl);
            window.removeEventListener('keydown', key);
        };
    }, [surfaceRef, marks, onPick]);

    return (
        <Canvas
            dpr={[1, 1.75]}
            gl={{ antialias: false, powerPreference: 'high-performance' }}
            camera={{ fov: 78, near: 0.1, far: 200, position: [0, 0, 0] }}
            style={{ position: 'fixed', inset: 0, zIndex: 0 }}
        >
            <color attach="background" args={['#020306']} />
            <Dome />
            {marks.length > 0 && (
                <Observers marks={marks} sky={sky} focusIndex={focusIndex} viewRef={viewRef} tipRef={tipRef} onHover={onHover} hoverRef={hoverRef} />
            )}
            <ShootingStars />
            <Hills />
            <Gaze viewRef={viewRef} zoomRef={zoomRef} />
            <EffectComposer multisampling={0}>
                <Bloom mipmapBlur luminanceThreshold={0.55} luminanceSmoothing={0.2} intensity={0.9} />
                <Noise opacity={0.06} />
                <Vignette offset={0.25} darkness={0.75} />
            </EffectComposer>
        </Canvas>
    );
}

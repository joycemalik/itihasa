import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { scenes, shotAt, INTRO_CAMERA, INTRO_LOOK } from './timeline';
import { runtime, useExperience } from './runtime';

// Flies the camera along each scene's shot, with a little handheld drift and pointer parallax.
// Lens shift that puts the subject on the third opposite its caption.
const SHIFT = { left: 0.16, right: -0.16 };
const shiftOf = (scene) => SHIFT[scene.caption] ?? 0;

export default function CameraRig() {
    const rig = useRef({
        pos: new THREE.Vector3(...INTRO_CAMERA),
        look: new THREE.Vector3(...INTRO_LOOK),
        goalPos: new THREE.Vector3(),
        goalLook: new THREE.Vector3(),
        tmp: new THREE.Vector3(),
        fov: 40,
        shift: 0,
        parallax: new THREE.Vector2(),
    });

    useFrame((state, delta) => {
        const s = rig.current;
        const dt = Math.min(delta, 0.05);
        const cam = state.camera;
        const story = useExperience.getState().phase === 'story';

        if (!story) {
            cam.clearViewOffset();
            cam.position.set(...INTRO_CAMERA);
            cam.lookAt(...INTRO_LOOK);
            return;
        }

        const f = runtime.frame;
        const from = shotAt(scenes[f.prev], 1);
        const to = shotAt(scenes[f.index], f.q);
        const k = f.prev === f.index ? 1 : THREE.MathUtils.smootherstep(f.morph, 0, 1);
        s.goalPos.fromArray(from.pos).lerp(s.tmp.fromArray(to.pos), k);
        s.goalLook.fromArray(from.look).lerp(s.tmp.fromArray(to.look), k);
        const goalFov = THREE.MathUtils.lerp(from.fov, to.fov, k);

        // Slower right after lights-out, so the first glide into the room feels like a breath.
        const since = state.clock.elapsedTime - runtime.igniteTime;
        const lambda = since < 4 ? 0.6 + since * 0.4 : 2.4;
        s.pos.x = THREE.MathUtils.damp(s.pos.x, s.goalPos.x, lambda, dt);
        s.pos.y = THREE.MathUtils.damp(s.pos.y, s.goalPos.y, lambda, dt);
        s.pos.z = THREE.MathUtils.damp(s.pos.z, s.goalPos.z, lambda, dt);
        s.look.x = THREE.MathUtils.damp(s.look.x, s.goalLook.x, lambda, dt);
        s.look.y = THREE.MathUtils.damp(s.look.y, s.goalLook.y, lambda, dt);
        s.look.z = THREE.MathUtils.damp(s.look.z, s.goalLook.z, lambda, dt);
        s.fov = THREE.MathUtils.damp(s.fov, goalFov, lambda, dt);
        const goalShift = THREE.MathUtils.lerp(shiftOf(scenes[f.prev]), shiftOf(scenes[f.index]), k);
        s.shift = THREE.MathUtils.damp(s.shift, goalShift, 1.6, dt);

        s.parallax.x = THREE.MathUtils.damp(s.parallax.x, state.pointer.x, 2, dt);
        s.parallax.y = THREE.MathUtils.damp(s.parallax.y, state.pointer.y, 2, dt);
        const t = state.clock.elapsedTime;
        // Impact shake decays from the score; each heartbeat gives the frame a small kick.
        const shake = runtime.shake * 0.09 + runtime.pulse * 0.012;
        cam.position.set(
            s.pos.x + Math.sin(t * 0.31) * 0.035 + s.parallax.x * 0.3 + (Math.random() - 0.5) * shake,
            s.pos.y + Math.sin(t * 0.43 + 1.3) * 0.025 + s.parallax.y * 0.16 + (Math.random() - 0.5) * shake,
            s.pos.z + Math.sin(t * 0.27 + 2.1) * 0.03
        );
        runtime.focus = cam.position.distanceTo(s.look);
        cam.lookAt(s.look.x + Math.sin(t * 0.21) * 0.02, s.look.y + Math.sin(t * 0.37) * 0.015, s.look.z);
        const { width, height } = state.size;
        cam.fov = s.fov;
        cam.setViewOffset(width, height, -s.shift * width, 0, width, height);
    });

    return null;
}

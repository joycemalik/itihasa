import { content } from '../data/filmScript';

// Scroll distance for one line of the script, in viewport heights.
export const UNIT_VH = 62;
// Story units spent morphing into each new scene before its first line.
const TRANSITION = 1.5;
// Extra units after the final line so the ending can breathe.
const TAIL = 2.5;

// Camera shots. Every shot is evaluated with q = progress through its scene (0..1).
const dolly = (fromPos, toPos, fromLook, toLook, fov = [40, 40]) => ({ type: 'dolly', fromPos, toPos, fromLook, toLook, fov });
const orbit = (center, radius, height, angle, look, fov = [40, 40]) => ({ type: 'orbit', center, radius, height, angle, look, fov });

// Shown on the loader and the closing credit.
export const FILM_TITLE = 'ITIHASA';

export const INTRO_CAMERA = [0, 1.9, 10];
export const INTRO_LOOK = [0, 1.9, 0];

const DARK = '#050505';
const PAPER = '#e4ddcd';

// Each scene begins at the line in content_blog_2.js that starts with `from`,
// so the script can be edited freely as long as these opening lines stay.
const SCENE_DEFS = [
    {
        id: 'sleeper', title: 'the sleeper', from: 'I am trying to sleep',
        shot: orbit([0, 0, 0], [6.6, 5.2], [2.2, 3.6], [0.3, 2.6], [[0, 0.3, 0], [-0.6, 1.4, 0]], [38, 36]), caption: 'left',
        bg: '#040507',
    },
    {
        id: 'hand', title: 'the hand', from: 'I look at my hand',
        shot: orbit([0, 0.2, 0], [8.6, 6.6], [0.9, -0.1], [-0.55, 0.4], [[0, 0.3, 0], [0, 0.2, 0]], [36, 34]), caption: 'left',
        bg: '#060504',
    },
    {
        id: 'skeleton', title: 'meat and bone', from: 'But today, it is not a hand',
        shot: orbit([0, 0.2, 0], [6.6, 5.4], [-0.1, 0.5], [0.4, 1.15], [[0, 0.2, 0], [0, 0.1, 0]], [34, 32]), caption: 'right',
        bg: '#030507',
    },
    {
        id: 'brain', title: 'the voice', from: 'But who commanded it',
        shot: orbit([0, 0, 0], [7.8, 5.8], [1.6, -0.3], [-1.3, 0.7], [[0, 0.1, 0], [0, 0.1, 0]], [38, 38]), caption: 'left',
        bg: '#040507',
    },
    {
        id: 'neurons', title: 'the listener', from: 'But I heard that voice',
        shot: dolly([0, 0.3, 10], [0.7, 0.1, -1.8], [0, 0, 0], [0.4, 0, -6], [44, 58]), caption: 'center',
        bg: '#050308',
    },
    {
        id: 'onion', title: 'the onion', from: 'I am peeling an onion',
        shot: orbit([0, 0, 0], [8.0, 5.0], [2.4, 0.2], [0.7, -0.9], [[0, 0, 0], [0, 0, 0]], [38, 38]), caption: 'right',
        bg: '#060605',
    },
    {
        id: 'crowd', title: 'the masks', from: 'I walked down the street',
        shot: dolly([0, 0.2, 8], [0.25, 0.05, -2.6], [0, 0.05, 0], [0, 0.05, -9], [42, 46]), caption: 'top',
        bg: '#060504',
    },
    {
        id: 'hole', title: 'the hole', from: 'I want to go back',
        shot: dolly([1.6, 4.8, 5.6], [-0.3, 1.0, 1.4], [0, -1.0, 0], [0, -2.8, 0], [40, 54]), caption: 'top',
        bg: '#020202',
    },
    {
        id: 'fading', title: 'the silence', from: 'It is so loud',
        shot: orbit([0, 0, 0], [8.4, 5.6], [0.9, 0.2], [-0.45, 0.45], [[0, 0.1, 0], [0, 0.3, 0]], [38, 36]), caption: 'right',
        bg: PAPER, tone: 1,
    },
    {
        id: 'room', title: 'the empty room', from: 'There is a panic rising',
        shot: dolly([2.8, 0.8, 3.6], [-2.2, 0.3, 1.6], [-0.8, -0.2, -3], [1.1, -0.5, -3.2], [56, 50]), caption: 'left',
        bg: '#070404', chaos: 0.55,
    },
    {
        id: 'carEx', title: 'autopilot', from: 'There is no one driving',
        shot: orbit([0, 0, 0], [7.8, 6.2], [0.5, 1.2], [0.35, -0.8], [[0, -0.1, 0], [0, 0, 0]], [38, 38]), caption: 'top',
        bg: '#040405',
    },
    {
        id: 'carIn', title: 'the empty seat', from: 'The steering wheel is turning',
        shot: dolly([3.4, 2.8, 2.6], [1.8, 1.8, 1.2], [-0.3, -0.4, 0], [-0.5, -0.5, 0], [44, 48]), caption: 'bottom',
        bg: '#040405',
    },
    {
        id: 'eye', title: 'who is looking', from: 'So who is asking this',
        shot: dolly([0.6, 0.9, 11], [0, 0.75, 4.4], [0, 0.7, 0], [0, 0.75, 0], [38, 30]), caption: 'top',
        bg: '#050505',
    },
    {
        id: 'void', title: '', from: 'Who?',
        shot: dolly([0, 0, 7], [0, 0, 4], [0, 0, 0], [0, 0, 0], [38, 38]), caption: 'bottom',
        bg: '#000000',
    },
];

function buildScenes() {
    const starts = SCENE_DEFS.map((d) => content.findIndex((l) => l.trim().startsWith(d.from)));
    starts.forEach((s, i) => {
        if (s < 0) throw new Error(`timeline: no line in content_blog_2.js starts with "${SCENE_DEFS[i].from}"`);
    });

    let cursor = 0;
    return SCENE_DEFS.map((def, i) => {
        const end = i + 1 < starts.length ? starts[i + 1] : content.length;
        // Whitespace-only lines are kept as silent beats.
        const lines = content.slice(starts[i], end).map((l) => l.trim());
        const transition = i === 0 ? 0.5 : TRANSITION;
        const scene = {
            ...def,
            index: i,
            tone: def.tone ?? 0,
            chaos: def.chaos ?? 0.14,
            lines,
            start: cursor,
            transition,
            lineStart: cursor + transition,
            end: cursor + transition + lines.length + (i === SCENE_DEFS.length - 1 ? TAIL : 0),
        };
        cursor = scene.end;
        return scene;
    });
}

export const scenes = buildScenes();
export const totalUnits = scenes[scenes.length - 1].end;

const clamp01 = (x) => Math.min(1, Math.max(0, x));

// Everything the film needs to know about one scroll position (in story units).
export function sample(u) {
    let index = scenes.findIndex((s) => u < s.end);
    if (index < 0) index = scenes.length - 1;
    const s = scenes[index];
    const morph = clamp01((u - s.start) / s.transition);
    const q = clamp01((u - s.start) / (s.end - s.start));
    const rel = u - s.lineStart;
    const line = rel >= 0 && rel < s.lines.length ? Math.floor(rel) : -1;
    return {
        index,
        prev: Math.max(0, index - 1),
        morph,
        q,
        line,
        lineT: line >= 0 ? rel - line : 0,
        tail: index === scenes.length - 1 ? clamp01((rel - s.lines.length) / TAIL) : 0,
    };
}

const lerp = (a, b, t) => a + (b - a) * t;
const lerp3 = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];

export function shotAt(scene, q) {
    const s = scene.shot;
    const fov = lerp(s.fov[0], s.fov[1], q);
    if (s.type === 'dolly') {
        return { pos: lerp3(s.fromPos, s.toPos, q), look: lerp3(s.fromLook, s.toLook, q), fov };
    }
    const a = lerp(s.angle[0], s.angle[1], q);
    const r = lerp(s.radius[0], s.radius[1], q);
    const h = lerp(s.height[0], s.height[1], q);
    return {
        pos: [s.center[0] + Math.sin(a) * r, s.center[1] + h, s.center[2] + Math.cos(a) * r],
        look: lerp3(s.look[0], s.look[1], q),
        fov,
    };
}

export { DARK, PAPER };

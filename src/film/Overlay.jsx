import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { scenes, FILM_TITLE } from './timeline';
import { runtime, useExperience } from './runtime';
import { score } from './audio';
import { leaveMark } from '../lib/supabase';

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV'];
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const easeOut = (x) => 1 - Math.pow(1 - x, 3);
// Short lines land as title cards.
const isTitle = (text) => text.length <= 24;

// Letterbox, chapter cards, and captions that fly in from depth as you scroll.
export default function Overlay() {
    const phase = useExperience((s) => s.phase);
    const loadProgress = useExperience((s) => s.loadProgress);
    const error = useExperience((s) => s.error);
    const [line, setLine] = useState({ key: null, text: '', scene: 0 });
    const [chapter, setChapter] = useState(-1);
    const [muted, setMuted] = useState(false);
    const navigate = useNavigate();
    const [answer, setAnswer] = useState('');
    const [marking, setMarking] = useState(false);
    const [markError, setMarkError] = useState('');

    // The keepsake: answer the film's question, become a star in the shared sky.
    const submitMark = async (e) => {
        e.preventDefault();
        setMarking(true);
        setMarkError('');
        try {
            const mark = await leaveMark(answer.trim());
            navigate(`/sky/${mark.number}`);
        } catch (err) {
            setMarkError(err.message);
            setMarking(false);
        }
    };
    const lineRef = useRef(null);
    const scrimRef = useRef(null);
    const charsRef = useRef([]);
    const cueRef = useRef(null);
    const endRef = useRef(null);
    const rootRef = useRef(null);

    useLayoutEffect(() => {
        charsRef.current = lineRef.current ? Array.from(lineRef.current.querySelectorAll('.exp-ch')) : [];
    }, [line]);

    useEffect(() => {
        let raf;
        let lastKey = null;
        let lastScene = -1;
        const pointer = { x: 0, y: 0, sx: 0, sy: 0 };
        const onMove = (e) => {
            pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
            pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
        };
        window.addEventListener('pointermove', onMove);

        const tick = () => {
            raf = requestAnimationFrame(tick);
            const f = runtime.frame;
            if (!f || useExperience.getState().phase !== 'story') return;

            const scene = scenes[f.index];
            const text = f.line >= 0 ? scene.lines[f.line] : '';
            const key = text ? `${f.index}:${f.line}` : null;
            if (key !== lastKey) {
                lastKey = key;
                setLine({ key, text, scene: f.index });
                if (text) score.line(f.index, f.line, isTitle(text));
            }
            if (f.index !== lastScene) {
                lastScene = f.index;
                setChapter(f.index);
            }

            // In: from deep and blurred. Hold: drifts slowly toward you. Out: flies past.
            const isLast = f.index === scenes.length - 1 && f.line === scene.lines.length - 1;
            const enter = easeOut(clamp01(f.lineT / 0.22));
            const exit = isLast ? 0 : clamp01((f.lineT - 0.8) / 0.2) ** 2;
            const vis = enter * (1 - exit);
            pointer.sx += (pointer.x - pointer.sx) * 0.05;
            pointer.sy += (pointer.y - pointer.sy) * 0.05;
            const el = lineRef.current;
            if (el) {
                const z = -340 * (1 - enter) + f.lineT * 90 + exit * 320;
                el.style.transform = `translate3d(${-pointer.sx * 16}px, ${-pointer.sy * 10 + (1 - enter) * 24}px, ${z}px) rotateX(${(1 - enter) * 10}deg)`;
                el.style.opacity = vis;
                el.style.filter = `blur(${(1 - enter) * 6 + exit * 9}px)`;
                if (el.classList.contains('is-title')) el.style.letterSpacing = `${0.02 + (1 - enter) * 0.25 + f.lineT * 0.05}em`;
            }
            if (scrimRef.current) scrimRef.current.style.opacity = vis * 0.9;

            // Characters write themselves in across the first half of the line.
            const reveal = clamp01(f.lineT / 0.45);
            const chars = charsRef.current;
            const n = chars.length;
            for (let i = 0; i < n; i++) {
                const a = clamp01(reveal * (n + 8) - i) ** 0.8;
                const st = chars[i].style;
                st.opacity = a;
                st.filter = a < 1 ? `blur(${(1 - a) * 8}px)` : 'none';
                st.transform = a < 1 ? `translate3d(0, ${(1 - a) * 0.35}em, ${(1 - a) * -60}px)` : 'none';
            }

            const tone = runtime.tone;
            const c = Math.round(239 - (239 - 28) * tone);
            const h = Math.round(228 * tone);
            const root = rootRef.current;
            if (root) {
                root.style.setProperty('--ink', `rgb(${c}, ${Math.round(c * 0.976)}, ${Math.round(c * 0.92)})`);
                root.style.setProperty('--halo', `rgba(${h}, ${Math.round(h * 0.97)}, ${Math.round(h * 0.9)}, 0.85)`);
                root.style.setProperty('--scrim', `rgba(${h}, ${Math.round(h * 0.97)}, ${Math.round(h * 0.9)}, 0.72)`);
            }
            if (cueRef.current) cueRef.current.style.opacity = 1 - clamp01(runtime.scroll / 0.4);
            // The credit rises with the final chord, or with scrolling past the end.
            const sinceFinale = runtime.finaleAt >= 0 ? (performance.now() - runtime.finaleAt) / 1000 : 0;
            const credit = Math.max(clamp01((f.tail - 0.3) / 0.5), clamp01((sinceFinale - 4) / 4));
            if (endRef.current) {
                endRef.current.style.opacity = credit;
                // Hidden (not just transparent) until it shows, so the return button can't be hit blind.
                endRef.current.style.visibility = credit > 0.02 ? 'visible' : 'hidden';
            }
            // The last caption gives way to the question.
            if (el && credit > 0) el.style.opacity = vis * (1 - credit);
        };
        raf = requestAnimationFrame(tick);
        return () => {
            cancelAnimationFrame(raf);
            window.removeEventListener('pointermove', onMove);
        };
    }, []);

    const story = phase === 'story';
    const words = line.text ? line.text.split(' ') : [];
    const caption = scenes[line.scene].caption || 'bottom';
    let ci = 0;

    return (
        <div ref={rootRef} className={`exp-overlay ${story ? 'is-story' : ''}`}>
            <div className="exp-bar exp-bar-top">
                {story && chapter >= 0 && scenes[chapter].title && (
                    <div key={chapter} className="exp-chapter">
                        <span>{ROMAN[chapter]}</span>
                        {scenes[chapter].title}
                    </div>
                )}
            </div>
            <div className="exp-bar exp-bar-bottom" />

            <div className={`exp-caption pos-${caption}`} aria-live="polite">
                <div ref={scrimRef} className="exp-scrim" />
                <div ref={lineRef} key={line.key} className={`exp-line ${isTitle(line.text) ? 'is-title' : ''}`}>
                    {words.map((w, wi) => (
                        <span key={wi} className="exp-word">
                            {Array.from(w).map((ch) => (
                                <span key={ci++} className="exp-ch">{ch}</span>
                            ))}
                            {wi < words.length - 1 ? ' ' : ''}
                        </span>
                    ))}
                </div>
            </div>

            {story && (
                <div ref={cueRef} className="exp-cue">
                    <span>scroll</span>
                    <i />
                </div>
            )}
            <div ref={endRef} className="exp-end">
                <div className="exp-end-title">{FILM_TITLE}</div>
                <div className="exp-end-bottom">
                <form className="exp-mark" onSubmit={submitMark}>
                    <label htmlFor="exp-answer">Who is looking?</label>
                    <input
                        id="exp-answer"
                        value={answer}
                        onChange={(e) => setAnswer(e.target.value)}
                        maxLength={120}
                        required
                        autoComplete="off"
                        placeholder="answer in one line"
                    />
                    <button type="submit" disabled={marking}>{marking ? 'placing your star…' : 'leave your mark'}</button>
                    {markError && <p>{markError}</p>}
                </form>
                <button className="exp-return" onClick={() => navigate('/sky')}>see the sky of observers</button>
                </div>
            </div>

            {phase !== 'loading' && (
                <button className="exp-exit" onClick={() => navigate('/')} aria-label="Leave the film">
                    leave
                </button>
            )}

            {phase !== 'loading' && (
                <button
                    className="exp-sound"
                    onClick={() => {
                        score.unlock();
                        score.setMuted(!muted);
                        setMuted(!muted);
                    }}
                >
                    <span className={muted ? 'is-off' : ''}>
                        <i /><i /><i /><i />
                    </span>
                    {muted ? 'sound off' : 'sound on'}
                </button>
            )}

            {phase === 'intro' && <div className="exp-hint">pull the light down</div>}

            {phase === 'loading' && (
                <div className="exp-loader">
                    <div className="exp-loader-title">{FILM_TITLE}</div>
                    {error ? (
                        <p className="exp-error">{error}</p>
                    ) : (
                        <>
                            <div className="exp-loader-bar">
                                <i style={{ transform: `scaleX(${loadProgress})` }} />
                            </div>
                            <p className="exp-loader-note">best with headphones</p>
                        </>
                    )}
                </div>
            )}

            {/* Mobile Portrait Orientation Overlay */}
            <div className="exp-orientation-overlay">
                <div className="exp-orientation-content">
                    <svg className="exp-phone-icon" viewBox="0 0 24 24" width="54" height="54" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <rect x="5" y="2" width="14" height="20" rx="3" ry="3" />
                        <path d="M12 18h.01" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                    <h2>Rotate Your Device</h2>
                    <p>{FILM_TITLE} is a 3D visual journey designed exclusively for landscape orientation.</p>
                    <div className="exp-orientation-badge">Turn to Landscape</div>
                </div>
            </div>
        </div>
    );
}


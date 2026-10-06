import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { getMarks, getMark } from '../lib/supabase';
import Comments from '../components/Comments';

const SITE = 'https://itihasaa.netlify.app';
// Rig Veda 10.129.7, the last verse of the Nasadiya Sukta (Griffith, 1896).
const VERSE = [
    'He, the first origin of this creation, whether he formed it all or did not form it,',
    'Whose eye controls this world in highest heaven, he verily knows it, or perhaps he knows not.',
];
const pad = (n) => String(n).padStart(4, '0');

// Deterministic per-mark randomness, so a keepsake always redraws the same.
const rng = (seed) => () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);

function wrap(ctx, text, maxWidth) {
    const words = text.split(/\s+/);
    const lines = [];
    let line = '';
    for (const w of words) {
        const test = line ? `${line} ${w}` : w;
        if (ctx.measureText(test).width > maxWidth && line) {
            lines.push(line);
            line = w;
        } else line = test;
    }
    if (line) lines.push(line);
    return lines;
}

// Rasterise the answer, then keep one stroke per lit pixel cell: the words, drawn as particles.
function answerStrokes(answer, seed, W, top, height) {
    const c = document.createElement('canvas');
    c.width = W;
    c.height = height;
    const ctx = c.getContext('2d');
    let size = 120;
    let lines;
    do {
        ctx.font = `italic 300 ${size}px "Cormorant Garamond", Georgia, serif`;
        lines = wrap(ctx, `“${answer}”`, W * 0.8);
        size -= 6;
    } while (lines.length * size * 1.25 > height * 0.9 && size > 34);
    size += 6;
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const lh = size * 1.22;
    lines.forEach((l, i) => ctx.fillText(l, W / 2, height / 2 + (i - (lines.length - 1) / 2) * lh));
    const data = ctx.getImageData(0, 0, W, height).data;
    const r = rng(seed);
    const pts = [];
    const step = 3;
    for (let y = 0; y < height; y += step) {
        for (let x = 0; x < W; x += step) {
            if (data[(y * W + x) * 4 + 3] > 120) {
                pts.push({ x: x + (r() - 0.5) * 2, y: y + top + (r() - 0.5) * 2, a: 0.78 + (r() > 0.7 ? 1.57 : 0), sx: r() * W, sy: r() * 1350, d: r() * 0.5 });
            }
        }
    }
    return pts;
}

function drawCard(ctx, mark, strokes, t) {
    const W = 1080, H = 1350;
    ctx.fillStyle = '#0c0a08';
    ctx.fillRect(0, 0, W, H);
    // Paper tooth and a faint vignette.
    const r = rng(mark.seed);
    ctx.fillStyle = 'rgba(239,233,220,0.035)';
    for (let i = 0; i < 2600; i++) ctx.fillRect(r() * W, r() * H, 1, 1);
    const g = ctx.createRadialGradient(W / 2, H * 0.45, 100, W / 2, H / 2, 900);
    g.addColorStop(0, 'rgba(239,233,220,0.06)');
    g.addColorStop(1, 'rgba(0,0,0,0.5)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(239,233,220,0.55)';
    ctx.font = '300 26px Outfit, sans-serif';
    ctx.letterSpacing = '12px';
    ctx.fillText('WHO ARE YOU?', W / 2, 150);
    ctx.letterSpacing = '0px';

    // The hanging lamp, lit.
    ctx.strokeStyle = 'rgba(239,233,220,0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(W / 2, 190);
    ctx.lineTo(W / 2, 250);
    ctx.stroke();
    ctx.fillStyle = 'rgba(239,233,220,0.85)';
    ctx.beginPath();
    ctx.moveTo(W / 2 - 22, 282);
    ctx.lineTo(W / 2 + 22, 282);
    ctx.lineTo(W / 2, 250);
    ctx.fill();
    ctx.shadowColor = 'rgba(255,243,214,0.9)';
    ctx.shadowBlur = 30;
    ctx.fillStyle = '#fff3d6';
    ctx.beginPath();
    ctx.arc(W / 2, 288, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // The answer, assembling from scattered strokes.
    ctx.strokeStyle = '#efe9dc';
    ctx.lineWidth = 1.3;
    for (const p of strokes) {
        const k = Math.min(1, Math.max(0, (t - p.d) / 1.2));
        const e = 1 - Math.pow(1 - k, 3);
        const x = p.sx + (p.x - p.sx) * e, y = p.sy + (p.y - p.sy) * e;
        const len = 3 + (1 - e) * 14;
        ctx.globalAlpha = 0.25 + 0.6 * e;
        ctx.beginPath();
        ctx.moveTo(x - Math.cos(p.a) * len, y - Math.sin(p.a) * len);
        ctx.lineTo(x + Math.cos(p.a) * len, y + Math.sin(p.a) * len);
        ctx.stroke();
    }
    ctx.globalAlpha = 1;

    const fade = Math.min(1, Math.max(0, t - 1.2));
    ctx.globalAlpha = fade;
    ctx.fillStyle = 'rgba(239,233,220,0.85)';
    ctx.font = '300 34px Outfit, sans-serif';
    ctx.letterSpacing = '10px';
    ctx.fillText(`OBSERVER  No. ${pad(mark.number)}`, W / 2, 1010);
    ctx.letterSpacing = '0px';
    ctx.fillStyle = 'rgba(239,233,220,0.45)';
    ctx.font = 'italic 300 26px "Cormorant Garamond", Georgia, serif';
    VERSE.forEach((l, i) => ctx.fillText(l, W / 2, 1090 + i * 38));
    ctx.font = '300 20px Outfit, sans-serif';
    ctx.fillText('Rig Veda 10.129.7', W / 2, 1180);
    ctx.fillStyle = 'rgba(239,233,220,0.4)';
    ctx.font = '300 22px Outfit, sans-serif';
    ctx.letterSpacing = '6px';
    ctx.fillText(`ITIHASA  ·  ${SITE.replace('https://', '')}/sky/${mark.number}`, W / 2, 1280);
    ctx.letterSpacing = '0px';
    ctx.globalAlpha = 1;
}

function Keepsake({ mark }) {
    const canvasRef = useRef(null);
    const strokes = useMemo(() => answerStrokes(mark.answer, mark.seed, 1080, 340, 600), [mark]);
    const [copied, setCopied] = useState(false);
    const url = `${SITE}/sky/${mark.number}`;

    useEffect(() => {
        let raf;
        const t0 = performance.now();
        document.fonts?.ready.then(() => {
            const tick = () => {
                const t = (performance.now() - t0) / 1000;
                drawCard(canvasRef.current.getContext('2d'), mark, strokes, t);
                if (t < 3) raf = requestAnimationFrame(tick);
            };
            tick();
        });
        return () => cancelAnimationFrame(raf);
    }, [mark, strokes]);

    const download = () => {
        const c = document.createElement('canvas');
        c.width = 1080;
        c.height = 1350;
        drawCard(c.getContext('2d'), mark, strokes, 10);
        const a = document.createElement('a');
        a.download = `itihasa-observer-${pad(mark.number)}.png`;
        a.href = c.toDataURL('image/png');
        a.click();
    };

    const share = async () => {
        const text = `Before the light went out, they asked me who I am. I'm Observer No. ${mark.number}.`;
        if (navigator.share) {
            try {
                await navigator.share({ title: 'Who are you?', text, url });
            } catch {
                // dismissed
            }
            return;
        }
        await navigator.clipboard.writeText(`${text} ${url}`);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="flex flex-col items-center gap-8">
            <canvas ref={canvasRef} width={1080} height={1350} className="w-[min(86vw,440px)] shadow-[0_30px_80px_rgba(0,0,0,0.7)] border border-[#e8e6e1]/10" />
            <div className="flex gap-6 font-ancient text-xs tracking-[0.25em]">
                <button onClick={download} className="px-6 py-3 border border-[#e8e6e1]/40 text-[#e8e6e1] hover:bg-[#e8e6e1] hover:text-[#0c0a08] transition-colors cursor-pointer">
                    [ KEEP IT ]
                </button>
                <button onClick={share} className="px-6 py-3 border border-[#e8e6e1]/40 text-[#e8e6e1] hover:bg-[#e8e6e1] hover:text-[#0c0a08] transition-colors cursor-pointer">
                    {copied ? '[ LINK COPIED ]' : '[ SEND IT ]'}
                </button>
            </div>
        </div>
    );
}

// The shared sky: every answer ever given, as a star.
function SkyCanvas({ marks, focus, onHover }) {
    const ref = useRef(null);
    useEffect(() => {
        const canvas = ref.current;
        const ctx = canvas.getContext('2d');
        let raf;
        let w = 0, h = 0;
        const resize = () => {
            const dpr = Math.min(window.devicePixelRatio, 2);
            w = canvas.width = window.innerWidth * dpr;
            h = canvas.height = window.innerHeight * dpr;
        };
        resize();
        window.addEventListener('resize', resize);
        // Faint constellation lines: each star reaches for the nearest earlier stars.
        const links = [];
        marks.forEach((m, i) => {
            const near = marks.slice(Math.max(0, i - 60), i)
                .map((o) => ({ o, d: (o.x - m.x) ** 2 + (o.y - m.y) ** 2 }))
                .sort((a, b) => a.d - b.d)
                .slice(0, 2);
            near.forEach(({ o }) => links.push([m, o]));
        });
        const move = (e) => {
            const mx = e.clientX / window.innerWidth, my = e.clientY / window.innerHeight;
            let best = null, bd = 0.0009;
            for (const m of marks) {
                const d = (m.x - mx) ** 2 + (m.y - my) ** 2;
                if (d < bd) { bd = d; best = m; }
            }
            onHover(best ? { mark: best, x: e.clientX, y: e.clientY } : null);
        };
        window.addEventListener('pointermove', move);
        const tick = (now) => {
            const t = now / 1000;
            ctx.fillStyle = '#05060a';
            ctx.fillRect(0, 0, w, h);
            ctx.strokeStyle = 'rgba(239,233,220,0.06)';
            ctx.lineWidth = 1;
            for (const [a, b] of links) {
                ctx.beginPath();
                ctx.moveTo(a.x * w, a.y * h);
                ctx.lineTo(b.x * w, b.y * h);
                ctx.stroke();
            }
            for (const m of marks) {
                const tw = 0.55 + 0.45 * Math.sin(t * (0.6 + (m.seed % 100) / 80) + m.seed);
                const isFocus = focus && m.number === focus.number;
                const r = (isFocus ? 3.2 : 1.2 + (m.seed % 7) / 6) * (w / window.innerWidth);
                ctx.globalAlpha = isFocus ? 1 : 0.35 + 0.65 * tw;
                ctx.fillStyle = '#efe9dc';
                ctx.beginPath();
                ctx.arc(m.x * w, m.y * h, r, 0, Math.PI * 2);
                ctx.fill();
                if (isFocus) {
                    const ring = (t % 2.4) / 2.4;
                    ctx.globalAlpha = 1 - ring;
                    ctx.strokeStyle = '#fff3d6';
                    ctx.beginPath();
                    ctx.arc(m.x * w, m.y * h, r + ring * 40 * (w / window.innerWidth), 0, Math.PI * 2);
                    ctx.stroke();
                    ctx.strokeStyle = 'rgba(239,233,220,0.06)';
                }
            }
            ctx.globalAlpha = 1;
            raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
        return () => {
            cancelAnimationFrame(raf);
            window.removeEventListener('resize', resize);
            window.removeEventListener('pointermove', move);
        };
    }, [marks, focus, onHover]);
    return <canvas ref={ref} className="fixed inset-0 w-full h-full z-0" />;
}

const Sky = () => {
    const { number } = useParams();
    const navigate = useNavigate();
    const [marks, setMarks] = useState([]);
    const [focus, setFocus] = useState(null);
    const [hover, setHover] = useState(null);
    const [missing, setMissing] = useState(false);

    useEffect(() => {
        window.scrollTo(0, 0);
        getMarks().then(setMarks).catch(() => setMarks([]));
    }, []);
    useEffect(() => {
        if (!number) return;
        getMark(number).then((m) => (m ? setFocus(m) : setMissing(true))).catch(() => setMissing(true));
    }, [number]);

    const watch = () => {
        import('../film/audio').then(({ score }) => score.unlock());
        navigate('/film');
    };

    return (
        <motion.div className="relative min-h-screen text-[#e8e6e1]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 1 }}>
            <SkyCanvas marks={marks} focus={focus} onHover={setHover} />
            {hover && (
                <div className="fixed z-20 pointer-events-none max-w-xs px-4 py-3 bg-[#0c0a08]/90 border border-[#e8e6e1]/15 font-scholar italic text-lg" style={{ left: hover.x + 16, top: hover.y + 16 }}>
                    “{hover.mark.answer}”
                    <div className="not-italic font-hand text-base text-[#e8e6e1]/50 mt-1">Observer No. {pad(hover.mark.number)}</div>
                </div>
            )}

            <nav className="fixed top-0 left-0 w-full z-30 p-8 flex justify-between pointer-events-none">
                <button onClick={() => navigate('/')} className="pointer-events-auto font-ancient text-xs tracking-[0.3em] text-[#e8e6e1]/60 hover:text-[#e8e6e1] cursor-pointer">
                    ← ITIHASA
                </button>
            </nav>

            <main className="relative z-10 flex flex-col items-center px-6 pt-32 pb-16 pointer-events-none">
                <div className="pointer-events-auto flex flex-col items-center text-center">
                    <h1 className="font-ancient text-4xl md:text-6xl mb-4">THE SKY OF OBSERVERS</h1>
                    <p className="font-scholar italic text-xl text-[#e8e6e1]/60 max-w-xl mb-3">
                        Before the light goes out, everyone who enters the film is asked one question: who are you? Each answer is a star.
                    </p>
                    <p className="font-hand text-2xl text-[#e8e6e1]/50 mb-16">
                        {marks.length ? `${marks.length} ${marks.length === 1 ? 'observer has' : 'observers have'} answered` : 'The sky is waiting for its first star'}
                    </p>

                    {focus && <Keepsake mark={focus} />}
                    {missing && <p className="font-scholar italic text-xl text-[#e8e6e1]/60">That star could not be found.</p>}

                    <button onClick={watch} className="mt-16 px-8 py-3 border border-[#e8e6e1]/40 font-ancient text-sm tracking-[0.2em] hover:bg-[#e8e6e1] hover:text-[#0c0a08] transition-colors cursor-pointer">
                        {focus ? '[ WATCH THE FILM ]' : '[ ENTER THE FILM TO ANSWER ]'}
                    </button>
                </div>
            </main>

            <div className="relative z-10 bg-gradient-to-b from-transparent to-[#05060a]/95">
                <Comments chronicle="film" title="WHAT THE OBSERVERS SAID" prompt="Speak about the film. Others will read it here." />
            </div>
        </motion.div>
    );
};

export default Sky;

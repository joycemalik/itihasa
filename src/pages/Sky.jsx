import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { getMarks, getMark } from '../lib/supabase';
import Comments from '../components/Comments';
import SkyScene from '../sky/SkyScene';
import { SITE, shareStar } from '../lib/share';
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
        if ((await shareStar(mark.number)) !== 'copied') return;
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

const Sky = () => {
    const { number } = useParams();
    const navigate = useNavigate();
    const surfaceRef = useRef(null);
    const tipRef = useRef(null);
    const [marks, setMarks] = useState([]);
    const [focus, setFocus] = useState(null);
    const [hover, setHover] = useState(null);
    const [missing, setMissing] = useState(false);

    useEffect(() => {
        window.scrollTo(0, 0);
        // The answers are written in Cormorant: wait for it, or they'd be spelt in Georgia.
        const font = document.fonts?.load('italic 300 76px "Cormorant Garamond"').catch(() => {}) ?? Promise.resolve();
        Promise.all([getMarks(), font]).then(([m]) => setMarks(m)).catch(() => setMarks([]));
    }, []);
    useEffect(() => {
        setMissing(false);
        if (!number) return setFocus(null);
        getMark(number).then((m) => (m ? setFocus(m) : setMissing(true))).catch(() => setMissing(true));
    }, [number]);

    const pick = useCallback((m) => navigate(`/sky/${m.number}`), [navigate]);

    const watch = () => {
        import('../film/audio').then(({ score }) => score.unlock());
        navigate('/film');
    };

    return (
        <motion.div className="relative min-h-screen bg-[#020306] text-[#e8e6e1]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 1.4 }}>
            <SkyScene marks={marks} focus={focus} surfaceRef={surfaceRef} tipRef={tipRef} onHover={setHover} onPick={pick} />

            <div ref={tipRef} className="fixed top-0 left-0 z-40 pointer-events-none" style={{ opacity: hover ? 1 : 0, transition: 'opacity 0.3s' }}>
                {hover && (
                    <div className="max-w-xs px-4 py-3 bg-[#020306]/80 backdrop-blur-sm border border-[#e8e6e1]/15">
                        <div className="font-scholar italic text-lg leading-snug">“{hover.answer}”</div>
                        <div className="font-ancient text-[10px] tracking-[0.3em] text-[#e8e6e1]/50 mt-2">OBSERVER No. {pad(hover.number)}</div>
                    </div>
                )}
            </div>

            <section ref={surfaceRef} className="relative z-10 h-[100svh] select-none cursor-grab active:cursor-grabbing" style={{ touchAction: 'pan-y' }}>
                <nav className="absolute top-0 left-0 w-full p-6 md:p-8 flex justify-between items-start">
                    <button onClick={() => navigate('/')} className="font-ancient text-xs tracking-[0.3em] text-[#e8e6e1]/60 hover:text-[#e8e6e1] cursor-pointer">
                        ← ITIHASA
                    </button>
                    <span className="font-ancient text-[10px] tracking-[0.3em] text-[#e8e6e1]/40 text-right">
                        {marks.length ? `${marks.length} ${marks.length === 1 ? 'OBSERVER' : 'OBSERVERS'}` : ''}
                    </span>
                </nav>

                <motion.div
                    className="absolute top-[12vh] left-0 w-full flex flex-col items-center text-center px-6 pointer-events-none"
                    initial={{ opacity: 0, y: 12, filter: 'blur(8px)' }}
                    // Says its piece, then gives the sky back.
                    animate={focus ? { opacity: 0 } : { opacity: [0, 1, 1, 0], y: 0, filter: ['blur(8px)', 'blur(0px)', 'blur(0px)', 'blur(6px)'] }}
                    transition={focus ? { duration: 1 } : { duration: 11, times: [0, 0.2, 0.75, 1], delay: 0.6 }}
                >
                    <h1 className="font-ancient text-2xl md:text-4xl tracking-[0.35em] pl-[0.35em] mb-3">THE SKY OF OBSERVERS</h1>
                    <p className="font-scholar italic text-lg md:text-xl text-[#e8e6e1]/60 max-w-xl">
                        {marks.length
                            ? 'Before the light goes out, everyone is asked who they are. Every answer stays up here.'
                            : 'The sky is waiting for its first star.'}
                    </p>
                </motion.div>

                {focus && (
                    <motion.div
                        key={focus.number}
                        data-ui
                        className="absolute left-6 md:left-12 bottom-[16vh] max-w-sm"
                        initial={{ opacity: 0, x: -16 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 1.2, delay: 0.8 }}
                    >
                        <div className="font-ancient text-[10px] tracking-[0.35em] text-[#e8e6e1]/50 mb-3">OBSERVER No. {pad(focus.number)}</div>
                        <div className="font-scholar italic text-3xl md:text-4xl leading-tight mb-6">“{focus.answer}”</div>
                        <div className="flex gap-5 font-ancient text-[10px] tracking-[0.3em]">
                            <button onClick={() => document.getElementById('keepsake')?.scrollIntoView({ behavior: 'smooth' })} className="text-[#e8e6e1]/70 hover:text-[#e8e6e1] border-b border-[#e8e6e1]/30 pb-1 cursor-pointer">
                                KEEPSAKE ↓
                            </button>
                            <button onClick={() => navigate('/sky')} className="text-[#e8e6e1]/50 hover:text-[#e8e6e1] pb-1 cursor-pointer">
                                SEE THEM ALL
                            </button>
                        </div>
                    </motion.div>
                )}
                {missing && (
                    <p className="absolute left-0 w-full bottom-[22vh] text-center font-scholar italic text-xl text-[#e8e6e1]/60">That star could not be found.</p>
                )}

                <div className="absolute bottom-0 left-0 w-full pb-[5vh] flex flex-col items-center gap-5 pointer-events-none">
                    <p className="font-scholar italic text-sm md:text-base text-[#e8e6e1]/45 tracking-wide">drag to look around · touch a star to read it</p>
                    <button onClick={watch} className="pointer-events-auto px-7 py-3 border border-[#e8e6e1]/30 bg-[#020306]/40 backdrop-blur-sm font-ancient text-xs tracking-[0.25em] hover:bg-[#e8e6e1] hover:text-[#0c0a08] transition-colors cursor-pointer">
                        {focus ? '[ WATCH THE FILM ]' : '[ ENTER THE FILM TO ANSWER ]'}
                    </button>
                </div>
            </section>

            <div className="relative z-10 bg-gradient-to-b from-transparent via-[#020306]/85 to-[#020306]">
                {focus && (
                    <section id="keepsake" className="flex flex-col items-center px-6 pt-24 pb-8">
                        <Keepsake mark={focus} />
                    </section>
                )}
                <Comments chronicle="film" title="WHAT THE OBSERVERS SAID" prompt="Speak about the film. Others will read it here." />
            </div>
        </motion.div>
    );
};

export default Sky;

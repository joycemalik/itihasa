import { useEffect, useRef } from 'react';

// Every observer's star, lighting one by one behind the closing credit.
// Drawn only while the credit is showing; `shownRef` is the credit element.
export default function EndSky({ marks, mine, shownRef }) {
    const ref = useRef(null);

    useEffect(() => {
        const canvas = ref.current;
        if (!canvas || !marks.length) return;
        const ctx = canvas.getContext('2d');
        let raf;
        let w = 0, h = 0, dpr = 1;
        let litAt = -1;
        const resize = () => {
            dpr = Math.min(window.devicePixelRatio, 2);
            w = canvas.width = canvas.clientWidth * dpr;
            h = canvas.height = canvas.clientHeight * dpr;
        };
        resize();
        window.addEventListener('resize', resize);

        // Same constellation as the sky page: each star reaches for its nearest earlier stars.
        const links = [];
        marks.forEach((m, i) => {
            marks.slice(Math.max(0, i - 60), i)
                .map((o) => ({ o, d: (o.x - m.x) ** 2 + (o.y - m.y) ** 2 }))
                .sort((a, b) => a.d - b.d)
                .slice(0, 2)
                .forEach(({ o }) => links.push([m, o]));
        });
        // One by one, but never longer than a few seconds in all.
        const stagger = Math.min(0.12, 3.5 / marks.length);

        const tick = (now) => {
            raf = requestAnimationFrame(tick);
            const shown = shownRef.current?.style.visibility === 'visible';
            if (!shown) {
                litAt = -1;
                return;
            }
            if (litAt < 0) litAt = now;
            const since = (now - litAt) / 1000;
            const t = now / 1000;
            // Inside the letterbox, with a margin so no star sits on the bars.
            const frame = Math.min(h, w / 2.39);
            const top = (h - frame) / 2 + frame * 0.08;
            const span = frame * 0.84;
            const px = (m) => w * 0.06 + m.x * w * 0.88;
            const py = (m) => top + m.y * span;
            const lit = (i) => Math.min(1, Math.max(0, (since - i * stagger) / 0.8));
            const index = new Map(marks.map((m, i) => [m, i]));

            ctx.clearRect(0, 0, w, h);
            ctx.lineWidth = dpr;
            for (const [a, b] of links) {
                ctx.strokeStyle = `rgba(239,233,220,${0.07 * Math.min(lit(index.get(a)), lit(index.get(b)))})`;
                ctx.beginPath();
                ctx.moveTo(px(a), py(a));
                ctx.lineTo(px(b), py(b));
                ctx.stroke();
            }
            marks.forEach((m, i) => {
                const a = lit(i);
                if (!a) return;
                const isMine = String(m.number) === mine;
                const tw = 0.55 + 0.45 * Math.sin(t * (0.6 + (m.seed % 100) / 80) + m.seed);
                const r = (isMine ? 2.8 : 0.9 + (m.seed % 7) / 7) * dpr;
                ctx.globalAlpha = a * (isMine ? 1 : 0.3 + 0.5 * tw);
                ctx.fillStyle = isMine ? '#fff3d6' : '#efe9dc';
                ctx.beginPath();
                ctx.arc(px(m), py(m), r, 0, Math.PI * 2);
                ctx.fill();
                if (isMine) {
                    const ring = (t % 2.4) / 2.4;
                    ctx.globalAlpha = a * (1 - ring) * 0.8;
                    ctx.strokeStyle = '#fff3d6';
                    ctx.beginPath();
                    ctx.arc(px(m), py(m), r + ring * 28 * dpr, 0, Math.PI * 2);
                    ctx.stroke();
                }
            });
            ctx.globalAlpha = 1;
        };
        raf = requestAnimationFrame(tick);
        return () => {
            cancelAnimationFrame(raf);
            window.removeEventListener('resize', resize);
        };
    }, [marks, mine, shownRef]);

    return <canvas ref={ref} className="exp-endsky" aria-hidden="true" />;
}

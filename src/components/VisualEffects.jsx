import React, { useEffect, useRef } from 'react';

// ... Keep GrainTexture, InkBlot, BloodSplash, TornPaper exactly as they were ...
export const GrainTexture = () => (
    <div className="pointer-events-none fixed inset-0 z-50 opacity-[0.08] mix-blend-multiply"
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}>
    </div>
);

export const InkBlot = ({ className, color = "fill-stone-900", style }) => (
    <svg viewBox="0 0 200 200" className={className} style={style} xmlns="http://www.w3.org/2000/svg">
        <path
            fill="currentColor"
            d="M44.7,-76.4C58.9,-69.2,71.8,-59.1,79.6,-46.3C87.4,-33.5,90.1,-17.9,86.9,-3.3C83.7,11.3,74.6,24.9,64.3,37.6C54,50.3,42.5,62.1,29.3,69.5C16.1,76.9,1.2,79.9,-12.3,77.3C-25.8,74.7,-37.9,66.5,-49.4,57C-60.9,47.5,-71.8,36.7,-78.6,23.3C-85.4,9.9,-88.1,-6.1,-82.6,-19.9C-77.1,-33.7,-63.4,-45.3,-49.8,-52.8C-36.2,-60.3,-22.7,-63.7,-8.9,-64.8C4.9,-65.9,20,-64.8,30.5,-83.6"
            transform="translate(100 100) scale(1.1)"
        />
    </svg>
);

export const BloodSplash = ({ active }) => (
    <div className={`absolute inset-0 pointer-events-none transition-opacity duration-700 ${active ? 'opacity-100' : 'opacity-0'}`}>
        <svg viewBox="0 0 200 200" className="w-full h-full mix-blend-multiply text-red-900" xmlns="http://www.w3.org/2000/svg">
            <path fill="currentColor" d="M42.7,-72.6C56.3,-65.9,69,-58.3,76.8,-47.4C84.6,-36.5,87.5,-22.3,86.4,-8.6C85.3,5.1,80.2,18.3,72.3,29.8C64.4,41.3,53.7,51.1,41.9,59.3C30.1,67.5,17.2,74.1,3.4,75.2C-10.4,76.3,-25.1,71.9,-38.4,64.7C-51.7,57.5,-63.6,47.5,-71.8,35.2C-80,22.9,-84.5,8.3,-83.4,-5.8C-82.3,-19.9,-75.6,-33.5,-66,-44.7C-56.4,-55.9,-43.9,-64.7,-30.9,-71.9C-17.9,-79.1,-4.4,-84.7,8.6,-83.6" transform="translate(100 100)" />
            <circle cx="150" cy="150" r="5" fill="currentColor" className="animate-ping" />
            <circle cx="50" cy="50" r="3" fill="currentColor" className="animate-ping delay-100" />
            <circle cx="120" cy="40" r="8" fill="currentColor" opacity="0.6" />
        </svg>
    </div>
);

export const TornPaper = ({ children, className }) => (
    <div className={`relative p-8 bg-[#F4F1EA] shadow-xl ${className}`} style={{
        clipPath: "polygon(3% 0, 7% 1%, 11% 0%, 16% 2%, 20% 0, 23% 2%, 28% 2%, 32% 1%, 35% 4%, 39% 3%, 41% 1%, 45% 0%, 50% 2%, 55% 0, 60% 2%, 65% 1%, 66% 4%, 70% 2%, 75% 0, 80% 2%, 83% 1%, 89% 0, 91% 2%, 94% 1%, 98% 3%, 100% 0, 100% 7%, 99% 11%, 100% 16%, 98% 20%, 100% 25%, 99% 29%, 100% 34%, 99% 39%, 100% 45%, 98% 51%, 100% 57%, 99% 62%, 100% 68%, 98% 74%, 100% 81%, 99% 87%, 100% 93%, 98% 100%, 93% 99%, 88% 100%, 84% 98%, 79% 100%, 74% 99%, 69% 100%, 64% 98%, 59% 100%, 54% 99%, 49% 100%, 44% 98%, 39% 100%, 34% 98%, 29% 100%, 25% 98%, 20% 100%, 15% 98%, 10% 100%, 5% 98%, 0% 100%, 1% 94%, 0% 88%, 2% 82%, 0% 76%, 1% 70%, 0% 64%, 2% 58%, 0% 52%, 1% 46%, 0% 40%, 2% 34%, 0% 28%, 1% 22%, 0% 16%, 2% 10%, 0% 4%)"
    }}>
        {children}
    </div>
);

// --- CANVAS STORM SYSTEM (Redesigned: Subtle & Visible) ---
export const StormOverlay = () => {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        let width = canvas.width = window.innerWidth;
        let height = canvas.height = window.innerHeight;
        let animationFrameId;

        // Particle Configuration
        const particles = [];
        const particleCount = 150; // Fewer particles for "subtle" feel, but distinct

        // Initialize Particles
        for (let i = 0; i < particleCount; i++) {
            particles.push({
                x: Math.random() * width,
                y: Math.random() * height,
                size: Math.random() * 2 + 0.5, // Visible size
                speedY: Math.random() * 1 + 0.2, // Slow drizzle/dust
                speedX: Math.random() * 0.5 - 0.25, // Slight drift
                opacity: Math.random() * 0.5 + 0.3 // Visible opacity
            });
        }

        const resize = () => {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
        };
        window.addEventListener('resize', resize);

        // Animation Loop
        const animate = () => {
            ctx.clearRect(0, 0, width, height);

            // Subtle Background Tint (Atmosphere)
            ctx.fillStyle = 'rgba(20, 24, 30, 0.2)'; // Very faint blue-black tint
            ctx.fillRect(0, 0, width, height);

            // Draw Particles
            ctx.fillStyle = '#cbd5e1'; // Light slate color for visibility

            particles.forEach(p => {
                ctx.globalAlpha = p.opacity; // Use individual opacity
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();

                // Move
                p.y += p.speedY;
                p.x += p.speedX;

                // Reset loops
                if (p.y > height) p.y = -5;
                if (p.x > width) p.x = 0;
                if (p.x < 0) p.x = width;
            });
            ctx.globalAlpha = 1.0; // Reset

            animationFrameId = requestAnimationFrame(animate);
        };

        animate();

        return () => {
            window.removeEventListener('resize', resize);
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className="absolute inset-0 z-10 pointer-events-none" // Absolute + Z-10 to ensure visibility
        />
    );
};

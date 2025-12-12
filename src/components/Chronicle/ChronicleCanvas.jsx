// src/components/Chronicle/ChronicleCanvas.jsx
import React, { useEffect, useRef } from 'react';

export const ChronicleCanvas = ({ effect }) => {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        let width = canvas.width = window.innerWidth;
        let height = canvas.height = window.innerHeight;
        let animationId;
        let particles = [];

        // --- INIT SCENE ---
        const initScene = () => {
            particles = [];
            if (effect === 'stars') {
                for (let i = 0; i < 400; i++) particles.push({
                    x: Math.random() * width, y: Math.random() * height, z: Math.random() * 2, type: 'star'
                });
            } else if (effect === 'river-flow') {
                for (let i = 0; i < 300; i++) particles.push({
                    x: Math.random() * width, y: Math.random() * height, speed: Math.random() * 5 + 2, type: 'water'
                });
            } else if (effect === 'war-map') {
                for (let i = 0; i < 100; i++) particles.push({
                    x: width / 2, y: height / 2, vx: (Math.random() - 0.5) * 10, vy: (Math.random() - 0.5) * 10, life: 1, type: 'spark'
                });
            } else if (effect === 'storm') {
                // Reusing your storm logic in simplified form
                for (let i = 0; i < 150; i++) particles.push({
                    x: Math.random() * width, y: Math.random() * height, size: Math.random() * 2 + 0.5, speedY: Math.random() * 2 + 1, type: 'rain'
                });
            }
            // ... Add other initializers
        };

        initScene();

        // --- RENDER LOOP ---
        const render = () => {
            // Fade effect for trails (except stars)
            ctx.fillStyle = (effect === 'war-map' || effect === 'river-flow') ? 'rgba(26, 21, 16, 0.2)' : 'rgba(26, 21, 16, 1)';
            ctx.fillRect(0, 0, width, height);

            // 1. STAR FIELD
            if (effect === 'stars') {
                ctx.fillStyle = '#FFF';
                particles.forEach(p => {
                    p.x -= 0.2 * p.z; // Rotate left
                    if (p.x < 0) p.x = width;
                    const size = Math.random() * 1.5 * p.z;
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
                    ctx.fill();
                });
            }

            // 2. RIVER FLOW (Blue flowing lines)
            if (effect === 'river-flow') {
                ctx.strokeStyle = '#4A90E2';
                ctx.lineWidth = 2;
                ctx.beginPath();
                particles.forEach(p => {
                    ctx.moveTo(p.x, p.y);
                    ctx.lineTo(p.x - p.speed * 2, p.y + p.speed); // Diagonal flow
                    p.x -= p.speed * 2;
                    p.y += p.speed;
                    if (p.y > height) { p.y = -10; p.x = Math.random() * width + 200; }
                });
                ctx.stroke();
            }

            // 3. WAR (Red Chaos)
            if (effect === 'war-map') {
                particles.forEach(p => {
                    p.x += p.vx;
                    p.y += p.vy;
                    p.life -= 0.01;

                    if (p.life <= 0) {
                        p.x = width / 2; p.y = height / 2; p.life = 1;
                        p.vx = (Math.random() - 0.5) * 15; p.vy = (Math.random() - 0.5) * 15;
                    }

                    ctx.fillStyle = `rgba(139, 58, 58, ${p.life})`;
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, Math.random() * 4, 0, Math.PI * 2);
                    ctx.fill();
                });
            }

            // 4. STORM (Rain)
            if (effect === 'storm') {
                ctx.fillStyle = '#cbd5e1';
                particles.forEach(p => {
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                    ctx.fill();
                    p.y += p.speedY;
                    if (p.y > height) p.y = -5;
                });
            }

            // ... Add logic for other effects

            animationId = requestAnimationFrame(render);
        };

        render();

        const handleResize = () => {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
            initScene();
        };
        window.addEventListener('resize', handleResize);

        return () => {
            cancelAnimationFrame(animationId);
            window.removeEventListener('resize', handleResize);
        };
    }, [effect]);

    return <canvas ref={canvasRef} className="fixed inset-0 w-full h-full z-0 transition-opacity duration-1000" />;
};

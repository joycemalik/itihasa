// src/components/Chronicle/GenerativeCanvas.jsx
import React, { useRef, useEffect } from 'react';
import Sketch from 'react-p5';

export const GenerativeCanvas = ({ activeScene }) => {
    const sceneRef = useRef(activeScene);
    const particlesRef = useRef([]);
    const blobsRef = useRef([]); // NEW: Large Ink Blobs
    const canvasRef = useRef(null);

    // DEBUG: Monitor Prop Changes
    useEffect(() => {
        sceneRef.current = activeScene;
    }, [activeScene]);

    // --- 1. BACKGROUND TEXTURE PARTICLE ---
    const createParticle = (p5) => {
        const isBig = p5.random() < 0.05;
        const baseSize = isBig ? p5.random(20, 40) : p5.random(2, 4);
        const baseAlpha = isBig ? p5.random(5, 15) : p5.random(100, 200);

        return {
            x: p5.random(p5.width),
            y: p5.random(p5.height),
            vx: 0, vy: 0,
            size: baseSize,
            alpha: baseAlpha,
            originalAlpha: baseAlpha,
            isBig: isBig,
            seed: p5.random(1000),
            noiseOffset: p5.random(1000)
        };
    };

    // --- 2. INK BLOB ENTITY (The "Sumi-e" look) ---
    const createBlob = (p5) => {
        return {
            x: p5.random(p5.width),
            y: p5.random(p5.height),
            r: p5.random(50, 150), // Base radius
            verts: [],
            noiseOffset: p5.random(1000),
            color: [20, 20, 20], // Ink black
            alpha: p5.random(10, 40), // Very ghostly
            vx: 0,
            vy: 0
        };
    };

    const initPool = (p5) => {
        // 1. Dust/Texture Particles
        const pool = [];
        for (let i = 0; i < 300; i++) {
            pool.push(createParticle(p5));
        }
        particlesRef.current = pool;

        // 2. Ink Blobs (Fewer, larger)
        const blobs = [];
        for (let i = 0; i < 8; i++) {
            blobs.push(createBlob(p5));
        }
        blobsRef.current = blobs;
    };

    const setup = (p5, canvasParentRef) => {
        canvasRef.current = p5.createCanvas(window.innerWidth, window.innerHeight).parent(canvasParentRef);
        initPool(p5);
    };

    const draw = (p5) => {
        if (!sceneRef.current) {
            p5.clear();
            return;
        }

        const width = p5.width;
        const height = p5.height;
        const time = p5.millis() * 0.001;

        let particles = particlesRef.current;
        let blobs = blobsRef.current;
        const currentScene = sceneRef.current;

        if (particles.length === 0) initPool(p5);

        // --- GLOBAL ATMOSPHERE & SWAY ---

        // 1. "The Boat" Sway Effect:
        // Rotate the entire world slightly to create instability/sea-sickness
        p5.push();
        const swayAngle = p5.sin(time * 0.5) * 0.02; // Subtle rotation
        const swayX = p5.cos(time * 0.3) * 10;
        const swayY = p5.sin(time * 0.4) * 10;

        // Center pivot
        p5.translate(width / 2 + swayX, height / 2 + swayY);
        p5.rotate(swayAngle);
        p5.translate(-width / 2, -height / 2);

        // Background Clear - Persistent Trails
        if (currentScene === 'stars') {
            p5.background(0, 0, 0, 100); // Less trails for stars
        } else if (currentScene === 'white-room') {
            p5.background(230, 230, 230, 50);
        } else {
            // Smokey trails
            p5.background(26, 21, 16, 25);
        }

        p5.noStroke();

        // --- DRAW INK BLOBS (Back Layer) ---
        blobs.forEach(b => {
            // Deform logic
            const n = p5.noise(b.x * 0.001, b.y * 0.001, time * 0.1);

            // Scene Specific Motion
            let tVx = (n - 0.5) * 0.5;
            let tVy = (n - 0.5) * 0.5;

            if (currentScene === 'river-flow' || currentScene === 'river-alive') {
                tVx = 2; // Flow right
                tVy = p5.sin(time + b.x * 0.01) * 0.5;
            }
            else if (currentScene === 'storm') {
                tVx = 3;
                tVy = 2;
            }

            b.vx = p5.lerp(b.vx, tVx, 0.05);
            b.vy = p5.lerp(b.vy, tVy, 0.05);
            b.x += b.vx;
            b.y += b.vy;

            // Wrap
            if (b.x > width + 200) b.x = -200;
            if (b.x < -200) b.x = width + 200;
            if (b.y > height + 200) b.y = -200;
            if (b.y < -200) b.y = height + 200;

            // Draw Blob
            p5.fill(b.color[0], b.color[1], b.color[2], b.alpha);
            p5.beginShape();
            for (let a = 0; a < p5.TWO_PI; a += 0.1) {
                // Deform radius with noise
                let xoff = p5.map(p5.cos(a), -1, 1, 0, 2);
                let yoff = p5.map(p5.sin(a), -1, 1, 0, 2);
                let rOffset = p5.map(p5.noise(xoff + b.noiseOffset, yoff + b.noiseOffset, time * 0.5), 0, 1, -30, 30);
                let r = b.r + rOffset;

                let x = b.x + r * p5.cos(a);
                let y = b.y + r * p5.sin(a);
                p5.curveVertex(x, y);
            }
            p5.endShape(p5.CLOSE);
        });


        // --- DRAW PARTICLES (Texture Layer) ---
        particles.forEach(p => {
            let tVx = 0;
            let tVy = 0;
            let colorVals = [200, 200, 200];

            // Noise Field
            const n = p5.noise(p.x * 0.002, p.y * 0.002, time * 0.1 + p.noiseOffset);

            // --- SCENE LOGIC ---
            switch (currentScene) {
                case 'intro':
                case 'amnesia':
                    // Foggy drift
                    tVx = (n - 0.5) * 0.5;
                    tVy = -0.2; // Slow rise like smoke
                    break;

                case 'storm':
                    // Hard rain / Chaos
                    tVx = (n - 0.5) * 5 + 2;
                    tVy = 8; // Fast fall
                    colorVals = [150, 160, 170];
                    break;

                case 'river-flow':
                case 'river-alive':
                    // Smooth stream
                    tVx = p5.noise(p.y * 0.01) * 3 + 1;
                    tVy = p5.sin(p.x * 0.01 + time) * 0.5;
                    colorVals = [100, 150, 200]; // Blueish hint
                    break;

                case 'river-dry':
                    // Static dust
                    tVx = (n - 0.5) * 0.1;
                    tVy = (n - 0.5) * 0.1;
                    colorVals = [160, 120, 80]; // Brown
                    break;

                case 'war':
                case 'war-map':
                    // Aggressive Jitter
                    tVx = (p5.random() - 0.5) * 5;
                    tVy = (p5.random() - 0.5) * 5;
                    // Occasional RED flash
                    if (p5.random() < 0.01) colorVals = [180, 40, 40];
                    else colorVals = [50, 50, 50]; // Ash
                    break;

                case 'dna':
                case 'dna-strands':
                    // Double Helix simulation visual
                    let wave = p5.sin(p.y * 0.05 + time);
                    tVx = wave * 0.5;
                    tVy = 0.5;
                    break;

                case 'stars':
                    // Do nothing, handled in draw loop
                    break;

                case 'fire':
                case 'embers':
                    // Rising Sparks
                    tVx = (n - 0.5);
                    tVy = -2 - p5.random(1);
                    colorVals = [255, 100, 50];
                    break;

                default:
                    tVx = (n - 0.5);
                    tVy = (n - 0.5);
            }

            // Lerp Physics
            p.vx = p5.lerp(p.vx, tVx, 0.05);
            p.vy = p5.lerp(p.vy, tVy, 0.05);

            p.x += p.vx;
            p.y += p.vy;

            // Wrap
            if (p.x < -50) p.x = width + 50;
            if (p.x > width + 50) p.x = -50;
            if (p.y < -50) p.y = height + 50;
            if (p.y > height + 50) p.y = -50;

            // Draw
            if (currentScene === 'stars') {
                // Star Logic (Simple 2D parallax for now)
                p5.fill(255, p.alpha);
                p5.circle(p.x, p.y, p.isBig ? p.size * 0.5 : p.size);
            } else {
                p5.fill(colorVals[0], colorVals[1], colorVals[2], p.alpha);
                p5.circle(p.x, p.y, p.size);
            }
        });

        p5.pop(); // End Sway
    };

    const windowResized = (p5) => {
        p5.resizeCanvas(window.innerWidth, window.innerHeight);
    };

    return <Sketch setup={setup} draw={draw} windowResized={windowResized} className="fixed inset-0 z-0" />;
};

import React, { useState, useEffect, useRef } from 'react';
import { X, Volume2, VolumeX, Scroll } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { toneManager } from './ToneManager';
import { bharatChronicle } from '../../data/bharatChronicle';
import { useScene } from '../../context/SceneContext';
import Comments from '../Comments';

const ChronicleView = ({ onClose }) => {
    const [activeEffect, setActiveEffect] = useState('intro');
    const [visibleSegmentId, setVisibleSegmentId] = useState('amnesia');
    const [isMuted, setIsMuted] = useState(false);
    const [hasStartedAudio, setHasStartedAudio] = useState(false);

    // Scene Context
    const { setActiveScene } = useScene();

    // Refs for all segments
    const segmentsRef = useRef([]);

    // Initialize Tone.js & Scene Reset
    useEffect(() => {
        toneManager.stop();
        // Initialize scene
        setActiveScene('intro');

        return () => {
            toneManager.stop();
            // Reset scene on unmount
            setActiveScene(null);
        };
    }, [setActiveScene]);

    // Sync Scene to Context
    useEffect(() => {
        setActiveScene(activeEffect);
    }, [activeEffect, setActiveScene]);

    // Sync Audio Scene
    useEffect(() => {
        if (hasStartedAudio) {
            toneManager.setScene(activeEffect);
        }
    }, [activeEffect, hasStartedAudio]);

    const handleToggleMute = async () => {
        if (!hasStartedAudio) {
            await toneManager.init();
            toneManager.setScene(activeEffect);
            setHasStartedAudio(true);
            setIsMuted(false);
            toneManager.toggleMute(false);
        } else {
            const newState = !isMuted;
            setIsMuted(newState);
            toneManager.toggleMute(newState);
        }
    };

    // Robust Intersection Observer
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    // Only trigger if IS INTERSECTING the middle zone
                    if (entry.isIntersecting) {
                        const effect = entry.target.getAttribute('data-effect');
                        const id = entry.target.getAttribute('data-id');



                        // Update State
                        if (effect) setActiveEffect(effect);
                        if (id) setVisibleSegmentId(id);
                    }
                });
            },
            {
                // Trigger ONLY when the element hits the CENTER of the screen
                root: null, // viewport
                rootMargin: '-45% 0px -45% 0px', // Shrink hit zone to huge middle strip
                threshold: 0 // As soon as 1 pixel enters the middle zone
            }
        );

        // Observe all refs
        segmentsRef.current.forEach((el) => {
            if (el) observer.observe(el);
        });

        return () => observer.disconnect();
    }, []);

    return (
        <>
            {/* --- SCROLLABLE CONTENT --- */}
            <div className="relative z-10 w-full min-h-screen text-[#e8e6e1] overflow-x-hidden">

                {/* Header Controls */}
                <div className="fixed top-8 right-8 z-50 flex gap-4">
                    <button onClick={handleToggleMute} className="p-3 bg-black/40 border border-[#8b3a3a]/30 rounded-full hover:bg-[#8b3a3a] text-[#e8e6e1] transition-all backdrop-blur-md cursor-pointer hover:scale-110">
                        {isMuted || !hasStartedAudio ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6 animate-pulse" />}
                    </button>
                    <button onClick={onClose} className="p-3 bg-black/40 border border-[#8b3a3a]/30 rounded-full hover:bg-[#8b3a3a] text-[#e8e6e1] transition-all backdrop-blur-md cursor-pointer hover:scale-110">
                        <X className="w-6 h-6" />
                    </button>
                </div>



                {/* Main Text Content */}
                <div className="w-full max-w-5xl mx-auto px-6 md:px-12 pt-[40vh] pb-[40vh]">
                    {bharatChronicle.map((segment, index) => {
                        const isFocused = visibleSegmentId === segment.id;

                        return (
                            <div
                                key={segment.id}
                                ref={el => segmentsRef.current[index] = el} // DIRECT REF ASSIGNMENT
                                data-id={segment.id}
                                data-effect={segment.effect}
                                className={`story-segment min-h-[100vh] flex flex-col justify-center items-start w-full mb-32 transition-all duration-1000 ease-out ${isFocused ? 'opacity-100 blur-none scale-100' : 'opacity-40 blur-sm scale-95'}`}
                            >
                                <div
                                    style={{
                                        perspective: '1000px',
                                        transformStyle: 'preserve-3d'
                                    }}
                                    className="w-full"
                                >
                                    <div
                                        className="w-full pl-8 border-l-4 border-[#8b3a3a]"
                                        style={{
                                            transform: isFocused ? 'rotateX(0deg) translateZ(0)' : 'rotateX(10deg) translateZ(-50px)',
                                            transformOrigin: 'left center',
                                            transition: 'transform 1s cubic-bezier(0.2, 0.8, 0.2, 1)'
                                        }}
                                    >
                                        <div className="prose prose-invert prose-xl md:prose-2xl max-w-none prose-p:font-scholar prose-headings:font-ancient prose-headings:text-[#d4cfc7] prose-p:text-[#d6cfc2] prose-strong:text-[#8b3a3a] prose-li:text-[#d6cfc2]">
                                            <ReactMarkdown
                                                components={{
                                                    h2: ({ node, ...props }) => <h2 className="font-ancient text-5xl md:text-7xl text-[#d4cfc7] mb-8 leading-[0.9]" {...props} />,
                                                    h3: ({ node, ...props }) => <h3 className="font-ancient text-3xl md:text-5xl text-[#d4cfc7] mb-6 mt-12" {...props} />,
                                                    p: ({ node, ...props }) => <p className="font-scholar text-xl md:text-3xl leading-relaxed text-[#d6cfc2] mb-8 max-w-4xl" {...props} />,
                                                    strong: ({ node, ...props }) => <strong className="text-[#8b3a3a] font-bold" {...props} />,
                                                    ul: ({ node, ...props }) => <ul className="list-disc pl-6 space-y-4 mb-8" {...props} />,
                                                    li: ({ node, ...props }) => <li className="font-scholar text-lg md:text-2xl text-[#d6cfc2]" {...props} />
                                                }}
                                            >
                                                {segment.markdown}
                                            </ReactMarkdown>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}

                    <Comments chronicle="bharat" />

                    {/* Footer / Subscribe */}
                    <div className="min-h-[50vh] flex flex-col items-center justify-center pb-32">
                        <Scroll className="w-12 h-12 text-[#8b3a3a] mb-8 animate-pulse" />
                        <p className="font-scholar text-xl md:text-2xl italic text-[#d6cfc2]/60 mb-12 text-center max-w-xl">
                            "The timeline is still being written. Be the first to read the next chapter."
                        </p>

                        <form name="subscribe" method="POST" data-netlify="true" className="flex flex-col items-center gap-6 w-full max-w-md">
                            <input type="hidden" name="form-name" value="subscribe" />

                            <input
                                type="email"
                                name="email"
                                placeholder="Enter your email"
                                required
                                className="w-full px-6 py-3 bg-transparent border-b border-[#8b3a3a] text-[#e8e6e1] placeholder-[#5c5346] font-scholar text-xl focus:outline-none focus:border-[#d6cfc2] transition-colors text-center"
                            />

                            <button type="submit" className="mt-8 px-8 py-3 border border-[#8b3a3a] text-[#8b3a3a] font-ancient text-sm tracking-[0.3em] hover:bg-[#8b3a3a] hover:text-[#1a1510] transition-all duration-500 cursor-pointer uppercase">
                                [ Join the Chronicle ]
                            </button>
                        </form>
                    </div>

                    <div className="h-[20vh]"></div>
                </div>
            </div>
        </>
    );
};

export default ChronicleView;


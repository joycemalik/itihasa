import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import ArticleView from '../components/ArticleView';
import ChronicleView from '../components/Chronicle/ChronicleView';
import { articles } from '../data/content';

const Chronicle = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    // State to manage the sequence: 'intro' -> 'loading' -> 'scroll-cue' -> 'content'
    const [viewState, setViewState] = useState('intro');

    // Find the article based on ID param, fallback to first if not found
    const article = articles.find(a => a.id === id) || articles[0];

    // Scroll to top on mount
    useEffect(() => {
        window.scrollTo(0, 0);

    }, []);

    // Handle "Unravel" click for Bharat
    const handleStartJourney = () => {

        setViewState('loading');
    };

    // Loading Sequence Logic
    useEffect(() => {
        if (viewState === 'loading') {
            // 1. Wait 2 seconds showing Generative Loader
            const timer1 = setTimeout(() => {
                setViewState('scroll-cue');
            }, 2000);

            return () => clearTimeout(timer1);
        }

        if (viewState === 'scroll-cue') {
            // 2. Wait for USER SCROLL
            const handleScrollStart = () => {
                setViewState('content');
            };

            window.addEventListener('wheel', handleScrollStart);
            window.addEventListener('touchmove', handleScrollStart);
            window.addEventListener('keydown', handleScrollStart);

            return () => {
                window.removeEventListener('wheel', handleScrollStart);
                window.removeEventListener('touchmove', handleScrollStart);
                window.removeEventListener('keydown', handleScrollStart);
            };
        }
    }, [viewState]);


    const pageTransition = {
        initial: { opacity: 0, scale: 1.05, filter: 'blur(10px)' },
        animate: { opacity: 1, scale: 1, filter: 'blur(0px)' },
        exit: { opacity: 0, scale: 0.95, filter: 'blur(10px)' },
        transition: { duration: 1.0, ease: [0.22, 1, 0.36, 1] }
    };

    // --- RENDER LOGIC ---

    // 1. Loading / Scroll Cue Overlay
    if (viewState === 'loading' || viewState === 'scroll-cue') {
        return (
            <motion.div
                className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center text-[#e8e6e1]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
            >
                {viewState === 'loading' && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex flex-col items-center"
                    >
                        {/* Generative Loader (Pure CSS) */}
                        <div className="relative w-32 h-32 flex items-center justify-center mb-8">
                            <div className="absolute inset-0 border-t-2 border-[#8b3a3a] rounded-full animate-spin"></div>
                            <div className="absolute inset-4 border-r-2 border-[#d6cfc2] rounded-full animate-spin-slow"></div>
                            <span className="font-ancient text-4xl animate-pulse">ॐ</span>
                        </div>
                        <p className="font-ancient tracking-[0.3em] text-xs text-[#8b3a3a] animate-pulse">GENERATING TIMELINE</p>
                    </motion.div>
                )}

                {viewState === 'scroll-cue' && (
                    <motion.div
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex flex-col items-center gap-4 cursor-ns-resize"
                        onClick={() => setViewState('content')}
                    >
                        <span className="font-ancient text-4xl md:text-6xl tracking-[0.2em] text-[#e8e6e1] drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]">SCROLL</span>
                        <span className="font-hand text-xl text-[#8b3a3a] italic">to unravel the truth</span>

                        <motion.div
                            animate={{ y: [0, 20, 0] }}
                            transition={{ repeat: Infinity, duration: 1.5 }}
                            className="w-[1px] h-24 bg-gradient-to-b from-[#8b3a3a] via-[#e8e6e1] to-transparent mt-4"
                        ></motion.div>
                    </motion.div>
                )}
            </motion.div>
        );
    }

    // 2. The Boat Scrolly-telling Content
    // KEY FIX: Use standard transition, but ensure it allows scrolling of body
    if (id === 'bharat' && viewState === 'content') {
        return (
            <motion.div
                className="relative z-50 bg-transparent min-h-screen" // Removed fixed/overflow to allow body scroll
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 1.5 }}
            >
                <ChronicleView onClose={() => navigate('/')} />
            </motion.div>
        );
    }

    // 3. Intro View (Front Face of Article)
    if (id === 'bharat') {
        return (
            <motion.div
                className="fixed inset-0 z-50 bg-[#1a1510]"
                {...pageTransition}
            >
                <ArticleView
                    article={article}
                    onClose={() => navigate('/')}
                    onStartJourney={handleStartJourney}
                />
            </motion.div>
        );
    }

    return (
        <motion.div
            className="fixed inset-0 z-50 bg-[#1a1510]"
            {...pageTransition}
        >
            <ArticleView
                article={article}
                onClose={() => navigate(-1)}
            />
        </motion.div>
    );
};

export default Chronicle;

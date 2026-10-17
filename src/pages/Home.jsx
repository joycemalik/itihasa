import React, { useRef, useEffect } from 'react';
import { Scroll, Compass, Feather } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { GrainTexture, InkBlot, TornPaper } from '../components/VisualEffects';
import { articles } from '../data/content';

const Home = () => {
    const navigate = useNavigate();
    const blob1Ref = useRef(null);
    const blob2Ref = useRef(null);

    useEffect(() => {
        let requestRef;
        const handleMouseMove = (e) => {
            if (requestRef) return;
            requestRef = requestAnimationFrame(() => {
                const { clientX, clientY } = e;
                if (blob1Ref.current) {
                    blob1Ref.current.style.transform = `translate(${clientX * -0.02}px, ${clientY * -0.02}px)`;
                }
                if (blob2Ref.current) {
                    blob2Ref.current.style.transform = `translate(${clientX * 0.03}px, ${clientY * 0.03}px) rotate(90deg)`;
                }
                requestRef = null;
            });
        };

        const isDesktop = window.matchMedia("(pointer: fine)").matches;
        if (isDesktop) {
            window.addEventListener('mousemove', handleMouseMove);
        }

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            if (requestRef) cancelAnimationFrame(requestRef);
        }
    }, []);

    const pageTransition = {
        initial: { opacity: 0, scale: 0.98, filter: 'blur(5px)' },
        animate: { opacity: 1, scale: 1, filter: 'blur(0px)' },
        exit: { opacity: 0, scale: 1.02, filter: 'blur(5px)' },
        transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] }
    };

    return (
        <motion.div
            className="min-h-screen bg-[#d6cfc2] font-sans text-[#2c241b] selection:bg-[#8b3a3a] selection:text-white relative"
            {...pageTransition}
        >
            <GrainTexture />

            {/* Background Blobs */}
            <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
                <div ref={blob1Ref} className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] text-[#2c241b] opacity-10 transition-transform duration-75 ease-out">
                    <InkBlot className="w-full h-full" />
                </div>
                <div ref={blob2Ref} className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] text-[#8b3a3a] opacity-5 transition-transform duration-75 ease-out">
                    <InkBlot className="w-full h-full" />
                </div>
            </div>

            <nav className="fixed top-0 left-0 w-full z-50 p-8 flex justify-between items-start pointer-events-none">
                {/* Home / Reset Button */}
                <div className="pointer-events-auto cursor-pointer group" onClick={() => navigate('/')}>
                    <div className="relative">
                        <InkBlot className="w-16 h-16 text-[#2c241b] group-hover:scale-110 transition-transform duration-500" />
                        <span className="absolute inset-0 flex items-center justify-center font-ancient text-2xl text-[#d6cfc2]">ॐ</span>
                    </div>
                </div>

                {/* Right side is now empty, focusing all attention on the content */}
                <div className="pointer-events-auto flex flex-col gap-4 items-end">
                    {/* You can put a single "SUBSCRIBE" button here later if you want */}
                </div>
            </nav>

            <main className="relative z-10 pt-24 pb-32 container mx-auto px-6 md:px-12">
                {/* Hero Section */}
                <div className="text-center mb-32 relative">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-32 bg-[#b8ad9e] blur-3xl -z-10 opacity-40"></div>
                    <h1 className="font-ancient text-5xl md:text-8xl text-[#1a1510] leading-[0.9] mb-6">
                        ANCIENT NARRATIVES <br />
                        <span className="text-4xl md:text-6xl text-[#5c5346]">& TEXTUAL WORLDS</span>
                    </h1>
                    <div className="flex justify-center gap-4 text-[#8b3a3a] mb-8">
                        <span className="text-2xl">~</span>
                        <span className="text-2xl font-ancient">۞</span>
                        <span className="text-2xl">~</span>
                    </div>
                    <p className="font-hand text-2xl text-[#5c5346] max-w-2xl mx-auto">
                        "We read history as a list of events. What if we read it as a map of the human mind?"
                    </p>
                </div>

                {/* The Mission */}
                <div className="flex flex-col lg:flex-row gap-16 items-center justify-center mb-40">
                    <div className="lg:w-1/2 max-w-xl">
                        <div className="relative z-10 p-2 bg-[#1a1510]" style={{ clipPath: "polygon(5% 0%, 100% 0%, 100% 90%, 95% 100%, 0% 100%, 0% 10%)" }}>
                            <div className="relative overflow-hidden grayscale hover:grayscale-0 transition-all duration-1000">
                                <img
                                    src="https://images.unsplash.com/photo-1608717310359-3a1e90a53504?q=80&w=1170&auto=format&fit=crop"
                                    alt="Ancient Inscriptions"
                                    className="w-full h-[500px] object-cover opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all duration-1000"
                                />
                                <div className="absolute inset-0 bg-[#8b3a3a] mix-blend-multiply opacity-20 group-hover:opacity-0 transition-opacity"></div>
                            </div>
                        </div>
                    </div>

                    <div className="lg:w-1/2 max-w-xl">
                        <TornPaper className="bg-[#e8e6e1] hover:-translate-y-2 transition-transform duration-500">
                            <Feather className="w-8 h-8 text-[#8b3a3a] mb-4" />
                            <h2 className="font-ancient text-3xl mb-6 text-[#1a1510]">THE INQUIRY</h2>
                            <div className="font-scholar text-xl leading-relaxed text-[#4a3f35] space-y-4">
                                <p>
                                    <span className="text-5xl float-left mr-3 mt-[-10px] text-[#8b3a3a] font-ancient">H</span>
                                    istory is often taught as a series of answers. I believe it is actually a series of questions.
                                </p>
                                <p>
                                    When we look at the Mahabharata, do we see just a story, or do we see the complex morality of a civilization trying to understand war? When we look at a temple, do we see just stone, or the desperate human desire to touch the divine?
                                </p>
                                <p className="border-l-4 border-[#8b3a3a] pl-4 italic bg-[#d6cfc2]/30 py-2">
                                    I am here to explore these questions. To move beyond the dry facts and find the logic, the fear, and the brilliance of the people who stood here before us.
                                </p>
                            </div>
                            <div className="mt-8">
                                <button onClick={() => document.getElementById('latest-chronicle').scrollIntoView({ behavior: 'smooth' })} className="px-6 py-2 border-2 border-[#2c241b] font-ancient text-xs tracking-widest hover:bg-[#2c241b] hover:text-[#e8e6e1] transition-colors cursor-pointer">
                                    [ THE ARCHIVE ]
                                </button>
                            </div>
                        </TornPaper>
                    </div>
                </div>

                {/* Latest Chronicle */}
                <section id="latest-chronicle" className="py-20 mb-32">
                    <div className="text-center mb-12">
                        <h3 className="font-hand text-2xl text-[#8b3a3a] mb-2 tracking-widest">CHRONICLE I</h3>
                    </div>

                    <div className="max-w-4xl mx-auto relative group cursor-pointer" onClick={() => {
                        // Navigate to specific article (defaulting to bharat for now)
                        navigate('/chronicle/bharat');
                    }}>
                        <div className="absolute inset-0 bg-[#e3ded6] transform rotate-1 rounded-sm shadow-xl transition-transform duration-500 group-hover:rotate-0"></div>
                        <div className="relative bg-[#e8e6e1] p-12 md:p-16 border border-[#d6cfc2] shadow-2xl flex flex-col items-center text-center transition-transform duration-500 group-hover:-translate-y-2">
                            <div className="absolute top-0 left-0 w-full h-1 bg-[#8b3a3a] opacity-50"></div>

                            <div className="mb-6">
                                <Compass className="w-12 h-12 text-[#8b3a3a]" />
                            </div>

                            <h2 className="font-ancient text-4xl md:text-6xl text-[#1a1510] mb-6">THE ORIGINS OF BHARAT</h2>

                            <p className="font-hand text-xl text-[#5c5346] mb-2 italic">
                                "When does a piece of land become an idea?"
                            </p>

                            <p className="font-ancient text-xs tracking-[0.25em] text-[#8b3a3a] uppercase mb-8">
                                Published &bull; December 12, 2025
                            </p>

                            <div className="font-scholar text-lg md:text-xl text-[#4a3f35] max-w-2xl leading-relaxed mb-10">
                                <p>
                                    We say the name "Bharat" effortlessly. But where did it begin?
                                    Was it a King? A Tribe? Or was it a fire lit thousands of years ago that refused to go out?
                                    We trace the word back to its first breath in the Rig Veda to understand not just a name, but an identity.
                                </p>
                            </div>

                            <div className="px-8 py-3 bg-[#1a1510] text-[#e8e6e1] font-ancient text-sm tracking-[0.2em] hover:bg-[#8b3a3a] transition-colors">
                                [ READ THE FULL CHRONICLE ]
                            </div>
                        </div>
                    </div>
                </section>

                {/* Chronicle II: the film */}
                <section id="the-film" className="pb-20 mb-32">
                    <div className="text-center mb-12">
                        <h3 className="font-hand text-2xl text-[#8b3a3a] mb-2 tracking-widest">CHRONICLE II &middot; THE FILM</h3>
                    </div>

                    <div className="max-w-4xl mx-auto relative group cursor-pointer" onClick={() => {
                        // Wake the score inside this click so it can play; the film itself loads lazily.
                        import('../film/audio').then(({ score }) => score.unlock());
                        navigate('/film');
                    }}>
                        <div className="absolute inset-0 bg-[#1a1510] transform -rotate-1 rounded-sm shadow-xl transition-transform duration-500 group-hover:rotate-0"></div>
                        <div className="relative bg-[#0c0a08] p-12 md:p-16 border border-[#2c241b] shadow-2xl flex flex-col items-center text-center overflow-hidden transition-transform duration-500 group-hover:-translate-y-2">
                            <div className="absolute inset-0 opacity-30 pointer-events-none" style={{ background: 'radial-gradient(circle at 50% 35%, rgba(239,233,220,0.18), transparent 60%)' }}></div>
                            <div className="absolute top-0 left-0 w-full h-1 bg-[#e8e6e1] opacity-30"></div>

                            <div className="relative mb-8 flex flex-col items-center">
                                <div className="w-px h-12 bg-[#e8e6e1]/50"></div>
                                <div className="w-6 h-4 bg-[#e8e6e1]/80" style={{ clipPath: 'polygon(50% 0, 100% 100%, 0 100%)' }}></div>
                                <div className="w-3 h-3 -mt-1 rounded-full bg-[#fff3d6] shadow-[0_0_24px_rgba(255,243,214,0.8)] group-hover:shadow-[0_0_40px_rgba(255,243,214,1)] transition-shadow duration-700"></div>
                            </div>

                            <h2 className="relative font-ancient text-4xl md:text-6xl text-[#e8e6e1] mb-6">WHO IS LOOKING?</h2>

                            <p className="relative font-scholar italic text-xl md:text-2xl text-[#b8ad9e] mb-2">
                                "I am trying to sleep but I cannot stop waking up."
                            </p>

                            <p className="relative font-ancient text-xs tracking-[0.25em] text-[#e8e6e1]/70 uppercase mb-8">
                                Published &bull; October 6, 2026
                            </p>

                            <div className="relative font-scholar text-lg md:text-xl text-[#8a8073] max-w-2xl leading-relaxed mb-10">
                                <p>
                                    A short film drawn in sixty-five thousand particles. A hand, a skull full of voices,
                                    an onion with no center, an empty car still driving. Pull the light, then scroll,
                                    and follow the question down to where it ends.
                                </p>
                            </div>

                            <div className="relative px-8 py-3 border border-[#e8e6e1]/40 text-[#e8e6e1] font-ancient text-sm tracking-[0.2em] group-hover:bg-[#e8e6e1] group-hover:text-[#0c0a08] transition-colors">
                                [ ENTER THE FILM ]
                            </div>
                            <p className="relative mt-6 font-hand text-lg text-[#8a8073]">sound on &middot; best with headphones</p>
                            <button
                                onClick={(e) => { e.stopPropagation(); navigate('/sky'); }}
                                className="relative mt-4 font-scholar italic text-lg text-[#b8ad9e] underline decoration-[#e8e6e1]/30 underline-offset-4 hover:text-[#e8e6e1] cursor-pointer"
                            >
                                see the sky of everyone who answered &rarr;
                            </button>
                        </div>
                    </div>
                </section>

                <footer className="mt-32 relative min-h-[400px] flex items-center justify-center">
                    {/* Background Ink - Reacts to success */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none transition-all duration-[2000ms]">
                        <InkBlot className="w-[800px] h-[800px] text-black opacity-10" id="footer-ink" />
                    </div>

                    <div className="relative z-10 text-center max-w-2xl mx-auto w-full px-6">
                        <SubscribeForm />
                    </div>
                </footer>
            </main>
        </motion.div>
    );
};

const SubscribeForm = () => {
    const [status, setStatus] = React.useState(null); // null | 'loading' | 'success' | 'error'
    const [subscribed, setSubscribed] = React.useState(false);

    const handleSubscribe = async (e) => {
        e.preventDefault();
        const email = e.target.email.value;
        setStatus('loading');

        try {
            const res = await fetch('/.netlify/functions/subscribe', {
                method: 'POST',
                body: JSON.stringify({ email }),
            });

            if (res.ok) {
                setStatus('success');
                // 1. Trigger the "Event"
                setTimeout(() => {
                    setSubscribed(true); // Triggers the animation swap

                    // Update background ink
                    const ink = document.getElementById('footer-ink');
                    if (ink) {
                        ink.classList.remove('text-black', 'opacity-10');
                        ink.classList.add('text-[#8b3a3a]', 'opacity-20', 'scale-125');
                    }

                    // Optional: Play a sound
                    const audio = new Audio('/thunder.mp3');
                    audio.volume = 0.3;
                    audio.play().catch(() => { });
                }, 500);
            } else {
                setStatus('error');
            }
        } catch (err) {
            setStatus('error');
        }
    };

    return (
        <AnimatePresence mode="wait">
            {!subscribed ? (
                // STATE 1: THE FORM (Standard)
                <motion.div
                    key="form"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, scale: 0.9, filter: "blur(10px)" }}
                    transition={{ duration: 0.8 }}
                >
                    <Scroll className="w-12 h-12 text-[#8b3a3a] mx-auto mb-6" />
                    <p className="font-scholar text-xl md:text-2xl italic text-[#2c241b]/80 mb-8">
                        "The dust has settled, but the echoes remain. We just have to listen."
                    </p>

                    <form onSubmit={handleSubscribe} className="flex flex-col items-center gap-6">
                        <input
                            type="email"
                            name="email"
                            placeholder="Enter your email"
                            required
                            disabled={status === 'loading'}
                            className="w-full md:w-80 px-4 py-3 bg-transparent border-b-2 border-[#8b3a3a] text-[#1a1510] placeholder-[#5c5346] font-scholar text-xl focus:outline-none focus:border-black transition-colors text-center"
                        />
                        <button
                            type="submit"
                            disabled={status === 'loading'}
                            className="px-8 py-3 border border-[#8b3a3a] font-ancient text-sm tracking-[0.3em] hover:bg-[#8b3a3a] hover:text-[#e8e6e1] transition-all duration-500 cursor-pointer uppercase"
                        >
                            {status === 'loading' ? 'TRANSMITTING...' : '[ SUBSCRIBE FOR UPDATES ]'}
                        </button>
                        {status === 'error' && <p className="text-red-800 text-xs font-ancient mt-4">Transmission Failed. The archive is closed.</p>}
                    </form>
                </motion.div>
            ) : (
                // STATE 2: THE REVELATION (Extraordinary)
                <motion.div
                    key="success"
                    className="flex flex-col items-center space-y-8"
                >
                    {/* The "Seal" slamming down */}
                    <motion.div
                        initial={{ scale: 3, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{
                            type: "spring",
                            stiffness: 200,
                            damping: 20,
                            delay: 0.2
                        }}
                        className="relative"
                    >
                        <div className="w-24 h-24 rounded-full border-4 border-[#8b3a3a] flex items-center justify-center bg-[#e8e6e1] relative z-10 shadow-[0_0_30px_rgba(139,58,58,0.4)]">
                            <Feather className="w-12 h-12 text-[#8b3a3a]" />
                        </div>
                        {/* Ripple Effect */}
                        <motion.div
                            initial={{ scale: 1, opacity: 0.5 }}
                            animate={{ scale: 2, opacity: 0 }}
                            transition={{ duration: 1.5, delay: 0.3 }}
                            className="absolute inset-0 rounded-full border border-[#8b3a3a]"
                        />
                    </motion.div>

                    {/* The Message Fading In */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.8, duration: 1 }}
                        className="space-y-4"
                    >
                        <h3 className="font-ancient text-3xl md:text-5xl text-[#1a1510] tracking-widest uppercase">
                            The Pact is Sealed
                        </h3>

                        <div className="font-scholar text-xl text-[#5c5346]">
                            <p>You are no longer an observer.</p>
                            <p>You are a witness.</p>
                        </div>

                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 2, duration: 1 }}
                            className="pt-6"
                        >
                            <p className="text-[#8b3a3a] font-ancient text-sm tracking-[0.2em] border-t border-[#8b3a3a]/30 pt-4 inline-block">
                                CHECK YOUR FREQUENCY. THE SIGNAL ARRIVES SHORTLY.
                            </p>
                        </motion.div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default Home;

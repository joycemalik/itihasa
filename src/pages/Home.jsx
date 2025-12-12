import React, { useRef, useEffect } from 'react';
import { Scroll, Compass, Feather } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
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
                        <h3 className="font-hand text-2xl text-[#8b3a3a] mb-2 tracking-widest">LATEST CHRONICLE</h3>
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

                            <p className="font-hand text-xl text-[#5c5346] mb-8 italic">
                                "When does a piece of land become an idea?"
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

                <footer className="mt-32 relative">
                    <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none">
                        <InkBlot className="w-[800px] h-[800px]" />
                    </div>
                    <div className="relative z-10 text-center max-w-2xl mx-auto">
                        <Scroll className="w-12 h-12 text-[#8b3a3a] mx-auto mb-6" />
                        <p className="font-scholar text-2xl italic mb-8">
                            "The dust has settled, but the echoes remain. We just have to listen."
                        </p>
                        <form name="subscribe" method="POST" data-netlify="true" className="flex flex-col items-center gap-4">
                            <input type="hidden" name="form-name" value="subscribe" />

                            <input
                                type="email"
                                name="email"
                                placeholder="Enter your email"
                                required
                                className="px-4 py-2 bg-transparent border-b border-[#8b3a3a] text-[#1a1510] placeholder-[#5c5346] font-scholar focus:outline-none focus:border-black transition-colors text-center w-64"
                            />

                            <button type="submit" className="px-6 py-2 border-b-2 border-[#8b3a3a] font-ancient text-sm tracking-widest text-[#1a1510] hover:text-[#8b3a3a] transition-colors cursor-pointer">
                                [ SUBSCRIBE FOR UPDATES ]
                            </button>
                        </form>
                    </div>
                </footer>
            </main>
        </motion.div>
    );
};

export default Home;

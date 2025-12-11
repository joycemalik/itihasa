import React, { useState } from 'react';
import { X, ArrowRight } from 'lucide-react';
import { GrainTexture, InkBlot } from './VisualEffects';

const ArticleView = ({ article, onClose }) => {
    const [isFlipped, setIsFlipped] = useState(false);

    if (!article || !article.content) return null;

    const { front, back } = article.content;
    const FrontIcon = front.icon;
    const BackIcon = back.icon;

    return (
        <div className="fixed inset-0 z-[60] bg-[#1a1510] perspective-2000 overflow-hidden">
            <GrainTexture />

            {/* Navigation / Close */}
            <button
                onClick={onClose}
                className="absolute top-8 right-8 z-50 text-[#e8e6e1] hover:text-[#8b3a3a] transition-colors p-2 bg-black/20 rounded-full backdrop-blur-sm cursor-pointer"
            >
                <X className="w-8 h-8" />
            </button>

            {/* 3D Flip Container */}
            <div
                className={`relative w-full h-full transition-transform duration-[1500ms] ease-in-out transform-style-3d ${isFlipped ? 'rotate-y-180' : ''}`}
            >

                {/* --- FRONT FACE: THE TRAILER (Darkness/Question) --- */}
                <div className="absolute inset-0 backface-hidden bg-[#1a1510] text-[#e8e6e1] flex flex-col items-center justify-center p-6 overflow-y-auto">
                    {/* Ambient Background Elements */}
                    <div className="absolute inset-0 overflow-hidden pointer-events-none">
                        <InkBlot className="absolute top-[-10%] left-[-10%] w-[800px] h-[800px] text-black opacity-40 animate-pulse-slow" />
                        <div className="absolute bottom-0 right-0 w-full h-1/2 bg-gradient-to-t from-[#8b3a3a]/10 to-transparent"></div>
                    </div>

                    <div className="max-w-4xl mx-auto relative z-10 text-center md:text-left space-y-12 my-20">
                        <div className="inline-flex items-center gap-3 text-[#8b3a3a] font-ancient text-lg tracking-[0.3em] border-b border-[#8b3a3a] pb-2 mb-4">
                            {FrontIcon && <FrontIcon className="w-6 h-6" />}
                            <span>{front.category}</span>
                        </div>

                        <h1 className="font-ancient text-4xl md:text-6xl leading-tight text-shadow-glow">
                            {front.title.split('invasion').length > 1 ? (
                                <>
                                    {front.title.split('invasion')[0]} <span className="text-[#8b3a3a] italic">invasion</span>{front.title.split('invasion')[1]}
                                </>
                            ) : front.title}
                        </h1>

                        <div className="font-scholar text-xl md:text-2xl leading-relaxed text-[#d6cfc2] space-y-8">
                            <p>
                                {front.intro && (
                                    <>
                                        <span className="text-6xl float-left mr-4 mt-[-10px] text-[#8b3a3a] font-ancient">{front.intro.charAt(0)}</span>
                                        {front.intro.slice(1)}
                                    </>
                                )}
                            </p>

                            {front.points && (
                                <div className="grid md:grid-cols-2 gap-8 py-8 border-y border-[#3a3025]">
                                    {front.points.map((point, idx) => {
                                        const PointIcon = point.icon;
                                        return (
                                            <div key={idx} className="flex gap-4 items-start">
                                                <PointIcon className="w-8 h-8 text-[#8b3a3a] shrink-0 mt-1" />
                                                <p className="text-lg">{point.text}</p>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            <p>
                                {front.conclusion}
                            </p>

                            <p className="font-ancient text-2xl text-[#8b3a3a] text-center md:text-left pt-4">
                                Are we the children of a migration that rewrote history, or are we the survivors of a civilization so old it forgot its own birthday?
                            </p>
                        </div>

                        <div className="flex justify-center md:justify-start pt-8">
                            <button
                                onClick={() => setIsFlipped(true)}
                                className="group relative px-10 py-5 bg-[#8b3a3a] text-[#e8e6e1] font-ancient text-xl tracking-widest overflow-hidden hover:bg-[#a64b4b] transition-all shadow-[0_0_40px_rgba(139,58,58,0.4)] cursor-pointer"
                            >
                                <span className="relative z-10 flex items-center gap-3">
                                    Unravel The Truth <ArrowRight className="w-6 h-6 group-hover:translate-x-2 transition-transform" />
                                </span>
                                <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-500"></div>
                            </button>
                        </div>
                    </div>
                </div>

                {/* --- BACK FACE: THE REAL CONTENT (Light/Truth) --- */}
                <div className="absolute inset-0 backface-hidden bg-[#e8e6e1] rotate-y-180 flex items-center justify-center overflow-y-auto">
                    <div className="absolute inset-0 pointer-events-none opacity-10">
                        <InkBlot className="absolute bottom-0 right-0 w-[600px] h-[600px] text-[#8b3a3a]" />
                    </div>

                    <div className="max-w-5xl mx-auto px-6 py-20 relative z-10">
                        <div className="text-center mb-16">
                            {BackIcon && (
                                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full border-2 border-[#8b3a3a] text-[#8b3a3a] mb-6 animate-pulse-slow">
                                    <BackIcon className="w-8 h-8" />
                                </div>
                            )}
                            <h2 className="font-ancient text-5xl md:text-7xl text-[#1a1510] mb-4">{back.title}</h2>
                            <p className="font-hand text-2xl text-[#5c5346] rotate-[-2deg]">{back.subtitle}</p>
                        </div>

                        <div className="grid md:grid-cols-3 gap-8 mb-12">
                            {back.blocks.map((i) => (
                                <div key={i} className="h-64 bg-[#d6cfc2] animate-pulse rounded-sm relative overflow-hidden group">
                                    <div className="absolute inset-0 bg-gradient-to-br from-transparent to-[#b8ad9e]/50"></div>
                                    <div className="absolute bottom-4 left-4 right-4 h-4 bg-[#b8ad9e] rounded"></div>
                                    <div className="absolute bottom-12 left-4 w-1/2 h-4 bg-[#b8ad9e] rounded"></div>
                                </div>
                            ))}
                        </div>

                        <div className="text-center font-scholar text-2xl text-[#8b3a3a] italic opacity-60">
                            Content Decryption in Progress...
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default ArticleView;

import React from 'react';
import { Compass, ArrowLeft } from 'lucide-react';
import { GrainTexture, InkBlot } from './VisualEffects';

const NotFound = ({ onReset }) => {
    return (
        <div className="fixed inset-0 z-[100] bg-[#1a1510] text-[#e8e6e1] flex items-center justify-center overflow-hidden">
            <GrainTexture />

            {/* Background Ambience */}
            <div className="absolute inset-0 pointer-events-none">
                <InkBlot
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] text-black opacity-40 animate-pulse-slow"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/60"></div>
            </div>

            <div className="relative z-10 text-center max-w-2xl px-6">

                {/* Icon: A broken compass */}
                <div className="inline-flex items-center justify-center w-24 h-24 mb-8 rounded-full border-2 border-[#8b3a3a] text-[#8b3a3a] animate-[spin_10s_linear_infinite]">
                    <Compass className="w-12 h-12" />
                </div>

                {/* Title */}
                <h1 className="font-ancient text-6xl md:text-8xl text-[#8b3a3a] mb-4 text-shadow-blood">
                    404
                </h1>
                <h2 className="font-ancient text-3xl md:text-4xl text-[#d6cfc2] mb-8 tracking-widest">
                    THE LOST TIMELINE
                </h2>

                {/* Narrative Text */}
                <div className="font-scholar text-xl text-[#d6cfc2]/80 space-y-6 mb-12">
                    <p>
                        You have wandered off the map. The chronicle you are looking for has been erased from history, or perhaps it never existed at all.
                    </p>
                    <p className="italic text-[#8b3a3a]">
                        "Do not chase ghosts in the desert. They will only lead you further astray."
                    </p>
                </div>

                {/* Return Button */}
                <button
                    onClick={onReset}
                    className="group relative px-8 py-3 border border-[#d6cfc2] text-[#d6cfc2] font-ancient text-lg tracking-[0.2em] hover:bg-[#8b3a3a] hover:border-[#8b3a3a] hover:text-white transition-all duration-500 cursor-pointer"
                >
                    <span className="flex items-center gap-4">
                        <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                        RETURN TO SAFETY
                    </span>
                </button>
            </div>
        </div>
    );
};

export default NotFound;

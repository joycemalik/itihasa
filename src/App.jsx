import React, { useState, useEffect, useRef } from 'react'; // Added useRef
import { Scroll, Compass, Feather } from 'lucide-react';
import { GrainTexture, InkBlot, BloodSplash, TornPaper } from './components/VisualEffects';
import ArticleView from './components/ArticleView';
import { articles } from './data/content';

const App = () => {
  const [activeArticle, setActiveArticle] = useState(null);
  const [hoveredArticleId, setHoveredArticleId] = useState(null);

  // PERFORMANCE FIX: Use refs instead of state for animations
  const blob1Ref = useRef(null);
  const blob2Ref = useRef(null);

  useEffect(() => {
    let requestRef;
    const handleMouseMove = (e) => {
      // Use requestAnimationFrame to smooth out the animation
      if (requestRef) return;
      requestRef = requestAnimationFrame(() => {
        const { clientX, clientY } = e;
        // Directly update DOM to avoid React re-renders
        if (blob1Ref.current) {
          blob1Ref.current.style.transform = `translate(${clientX * -0.02}px, ${clientY * -0.02}px)`;
        }
        if (blob2Ref.current) {
          blob2Ref.current.style.transform = `translate(${clientX * 0.03}px, ${clientY * 0.03}px) rotate(90deg)`;
        }
        requestRef = null;
      });
    };

    // Check if device has a fine pointer (mouse)
    const isDesktop = window.matchMedia("(pointer: fine)").matches;
    if (isDesktop) {
      window.addEventListener('mousemove', handleMouseMove);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (requestRef) cancelAnimationFrame(requestRef);
    }
  }, []);

  // SCROLLBAR FIX: Simpler lock logic
  useEffect(() => {
    if (activeArticle) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; }
  }, [activeArticle]);

  return (
    <div className="min-h-screen bg-[#d6cfc2] font-sans text-[#2c241b] selection:bg-[#8b3a3a] selection:text-white relative">
      <GrainTexture />

      {activeArticle && (
        <ArticleView
          article={activeArticle}
          onClose={() => setActiveArticle(null)}
        />
      )}

      {/* FIXED: Attached refs to divs for direct manipulation */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div ref={blob1Ref} className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] text-[#2c241b] opacity-10 transition-transform duration-75 ease-out">
          <InkBlot className="w-full h-full" />
        </div>
        <div ref={blob2Ref} className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] text-[#8b3a3a] opacity-5 transition-transform duration-75 ease-out">
          <InkBlot className="w-full h-full" />
        </div>
      </div>

      <nav className="fixed top-0 left-0 w-full z-50 p-8 flex justify-between items-start pointer-events-none">
        <div className="pointer-events-auto cursor-pointer group" onClick={() => setActiveArticle(null)}>
          <div className="relative">
            <InkBlot className="w-16 h-16 text-[#2c241b] group-hover:scale-110 transition-transform duration-500" />
            <span className="absolute inset-0 flex items-center justify-center font-ancient text-2xl text-[#d6cfc2]">ॐ</span>
          </div>
        </div>
        <div className="pointer-events-auto flex flex-col gap-4 items-end">
          {['THE VAULT', 'RELICS', 'THE FILES'].map((item) => (
            <a key={item} href="#" className="font-ancient text-sm tracking-[0.2em] uppercase hover:text-[#8b3a3a] transition-colors relative group">
              {item}
              <span className="absolute right-0 top-1/2 w-0 h-[2px] bg-[#8b3a3a] group-hover:w-full transition-all duration-300 -z-10"></span>
            </a>
          ))}
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

        {/* The Mission / The Inquiry */}
        <div className="flex flex-col lg:flex-row gap-16 items-center justify-center mb-40">
          <div className="lg:w-1/2 max-w-xl">
            <div className="relative z-10 p-2 bg-[#1a1510]" style={{ clipPath: "polygon(5% 0%, 100% 0%, 100% 90%, 95% 100%, 0% 100%, 0% 10%)" }}>
              <div className="relative overflow-hidden grayscale hover:grayscale-0 transition-all duration-1000">
                <img
                  src="https://images.unsplash.com/photo-1558981420-87aa9dad1c89?q=80&w=1000&auto=format&fit=crop"
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
                <button className="px-6 py-2 border-2 border-[#2c241b] font-ancient text-xs tracking-widest hover:bg-[#2c241b] hover:text-[#e8e6e1] transition-colors cursor-pointer">
                  [ THE ARCHIVE ]
                </button>
              </div>
            </TornPaper>
          </div>
        </div>

        {/* The Featured Section - Latest Chronicle */}
        <section className="py-20 mb-32">
          <div className="text-center mb-12">
            <h3 className="font-hand text-2xl text-[#8b3a3a] mb-2 tracking-widest">LATEST CHRONICLE</h3>
          </div>

          <div className="max-w-4xl mx-auto relative group cursor-pointer" onClick={() => {
            const featuredArticle = articles.find(a => a.id === 'bharat') || articles[0];
            if (featuredArticle) setActiveArticle(featuredArticle);
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

              <button className="px-8 py-3 bg-[#1a1510] text-[#e8e6e1] font-ancient text-sm tracking-[0.2em] hover:bg-[#8b3a3a] transition-colors">
                [ READ THE FULL CHRONICLE ]
              </button>
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
            <button className="px-6 py-2 border-b-2 border-[#8b3a3a] font-ancient text-sm tracking-widest text-[#1a1510] hover:text-[#8b3a3a] transition-colors">
              [ SUBSCRIBE FOR UPDATES ]
            </button>
          </div>
        </footer>
      </main>
    </div>
  );
};

export default App;

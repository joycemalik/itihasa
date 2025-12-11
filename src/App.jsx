import React, { useState, useEffect } from 'react';
import { Scroll, Compass, Feather } from 'lucide-react';
import { GrainTexture, InkBlot, BloodSplash, TornPaper } from './components/VisualEffects';
import ArticleView from './components/ArticleView';
import { articles } from './data/content';

// --- Main Application ---

const App = () => {
  const [activeArticle, setActiveArticle] = useState(null);
  const [hoveredArticleId, setHoveredArticleId] = useState(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // Parallax effect for ink blobs
  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Lock Body Scroll when Article is Open
  useEffect(() => {
    if (activeArticle) {
      document.body.classList.add('no-scroll');
      document.documentElement.classList.add('no-scroll');
    } else {
      document.body.classList.remove('no-scroll');
      document.documentElement.classList.remove('no-scroll');
    }
    return () => {
      document.body.classList.remove('no-scroll');
      document.documentElement.classList.remove('no-scroll');
    }
  }, [activeArticle]);

  return (
    <div className="min-h-screen bg-[#d6cfc2] font-sans text-[#2c241b] overflow-x-hidden selection:bg-[#8b3a3a] selection:text-white relative">
      <GrainTexture />

      {/* Show Article View if Active */}
      {activeArticle && (
        <ArticleView
          article={activeArticle}
          onClose={() => setActiveArticle(null)}
        />
      )}

      {/* Floating Abstract Elements (Curiosity) */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <InkBlot
          className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] text-[#2c241b] opacity-10"
          style={{ transform: `translate(${mousePos.x * -0.02}px, ${mousePos.y * -0.02}px)` }}
        />
        <InkBlot
          className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] text-[#8b3a3a] opacity-5"
          style={{ transform: `translate(${mousePos.x * 0.03}px, ${mousePos.y * 0.03}px) rotate(90deg)` }}
        />
      </div>

      {/* Navigation - Hidden/Mysterious */}
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

      {/* Hero Section - The Scholar's Desk */}
      <main className="relative z-10 pt-24 pb-32 container mx-auto px-6 md:px-12">

        {/* Title Area */}
        <div className="text-center mb-24 relative">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-32 bg-[#b8ad9e] blur-3xl -z-10 opacity-40"></div>
          <p className="font-hand text-2xl text-[#8b3a3a] rotate-[-2deg] mb-4">"We’re ditching the boring dates. We’re here for the bloodshed, the brilliance, and the absolute chaos of the past."</p>
          <h1 className="font-ancient text-5xl md:text-8xl text-[#1a1510] leading-[0.9] mb-6">
            Ancient Narratives <br />
            <span className="text-4xl md:text-6xl text-[#5c5346]">& Textual Worlds</span>
          </h1>
          <div className="flex justify-center gap-4 text-[#8b3a3a]">
            <span className="text-2xl">~</span>
            <span className="text-2xl font-ancient">۞</span>
            <span className="text-2xl">~</span>
          </div>
        </div>

        {/* The "Profile" - Presented as a Manuscript */}
        <div className="flex flex-col lg:flex-row gap-16 items-center justify-center mb-40">

          <div className="lg:w-1/2 relative group">
            {/* Image Frame - Rough Edges */}
            <div className="relative z-10 p-2 bg-[#1a1510]" style={{ clipPath: "polygon(5% 0%, 100% 0%, 100% 90%, 95% 100%, 0% 100%, 0% 10%)" }}>
              <div className="relative overflow-hidden grayscale hover:grayscale-0 transition-all duration-1000">
                <img
                  src="https://images.unsplash.com/photo-1590053153540-366a6eeec4c8?q=80&w=1000&auto=format&fit=crop"
                  alt="Ancient Inscriptions"
                  className="w-full h-[500px] object-cover opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all duration-1000"
                />
                <div className="absolute inset-0 bg-[#8b3a3a] mix-blend-multiply opacity-20 group-hover:opacity-0 transition-opacity"></div>
              </div>
            </div>
            {/* Decorative handwritten note */}
            <div className="absolute -bottom-10 -right-10 max-w-[200px] font-hand text-xl text-[#2c241b] rotate-[-5deg] bg-[#e8e6e1] p-4 shadow-lg z-20" style={{ clipPath: "polygon(0% 0%, 100% 0%, 100% 85%, 90% 100%, 0% 100%)" }}>
              "Tracing cultural migration through the whispers of myth."
            </div>
          </div>

          <div className="lg:w-1/2 max-w-xl">
            <TornPaper className="bg-[#e8e6e1] hover:-translate-y-2 transition-transform duration-500">
              <Feather className="w-8 h-8 text-[#8b3a3a] mb-4" />
              <h2 className="font-ancient text-3xl mb-6 text-[#1a1510]">THE MISSION</h2>
              <div className="font-scholar text-xl leading-relaxed text-[#4a3f35] space-y-4">
                <p>
                  <span className="text-5xl float-left mr-3 mt-[-10px] text-[#8b3a3a] font-ancient">H</span>
                  istory isn’t just polite statues and dusty books. It is raw, human drama. It is the engineering swag of the Cholas that makes modern skyscrapers look lazy. It is the psychological breakdown of heroes and the strategies of villains.
                </p>
                <p>
                  We are here to bridge the gap between academic rigor and internet chaos. We dig into the Sanskrit texts, the forgotten inscriptions, and the "controversial" bits your history teacher skipped.
                </p>
                <p className="border-l-4 border-[#8b3a3a] pl-4 italic bg-[#d6cfc2]/30 py-2">
                  Treating the Mahabharata like the political thriller it is, and architecture like the sci-fi tech it was.
                </p>
              </div>
              <div className="mt-8 flex gap-4">
                <button className="px-6 py-2 border-2 border-[#2c241b] font-ancient text-xs tracking-widest hover:bg-[#2c241b] hover:text-[#e8e6e1] transition-colors">
                  [ ENTER THE CHAOS ]
                </button>
                <button className="px-6 py-2 border-2 border-transparent text-[#8b3a3a] font-ancient text-xs tracking-widest hover:border-[#8b3a3a] transition-all">
                  [ THE EVIDENCE ]
                </button>
              </div>
            </TornPaper>
          </div>
        </div>

        {/* Interactive Curiosity Grid - "No Straight Lines" */}
        <section className="py-20">
          <div className="text-center mb-16">
            <h3 className="font-hand text-3xl text-[#5c5346] mb-2">Curiosities & Inquiries</h3>
            <h2 className="font-ancient text-5xl text-[#1a1510]">Choose a Path</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">

            {articles.map((article) => {
              const Icon = article.icon;
              const isHovered = hoveredArticleId === article.id;

              return (
                <div
                  key={article.id}
                  className="relative group cursor-pointer min-h-[400px] flex items-center justify-center p-8"
                  onMouseEnter={() => setHoveredArticleId(article.id)}
                  onMouseLeave={() => setHoveredArticleId(null)}
                  onClick={() => {
                    if (article.content) setActiveArticle(article);
                  }}
                >
                  {/* Dynamic Background */}
                  <div className={`absolute inset-0 bg-[#e3ded6] transition-all duration-500 rounded-[40%_60%_70%_30%/40%_50%_60%_50%] group-hover:rounded-[50%_50%_30%_70%/60%_40%_70%_30%] shadow-lg group-hover:shadow-2xl ${isHovered ? 'scale-105' : 'scale-100'} ${article.effect === 'gold' ? 'group-hover:shadow-[0_0_30px_rgba(212,175,55,0.3)]' : ''} ${article.effect === 'gold' ? 'group-hover:border-[#D4AF37] border-2 border-transparent' : ''}`}></div>

                  {/* Specific Effects */}
                  {article.effect === 'blood' && <BloodSplash active={isHovered} />}

                  {article.effect === 'ink' && (
                    <>
                      <div className="absolute inset-0 bg-[#1a1510] transition-all duration-500 rounded-[60%_40%_30%_70%/60%_30%_70%_40%] shadow-lg group-hover:scale-105"></div>
                      <div className="absolute inset-0 opacity-0 group-hover:opacity-20 bg-[url('https://www.transparenttextures.com/patterns/black-scales.png')] transition-opacity duration-500 rounded-[60%_40%_30%_70%/60%_30%_70%_40%]"></div>
                    </>
                  )}

                  {/* Content */}
                  <div className={`relative z-10 text-center transition-transform duration-300 ${isHovered ? '-translate-y-4' : ''} ${article.effect === 'ink' ? 'text-[#e8e6e1]' : ''}`}>
                    <div className={`w-16 h-16 mx-auto mb-6 flex items-center justify-center rounded-full border-2 border-[#2c241b] transition-colors duration-300 
                                ${article.effect === 'ink' ? 'border-[#e8e6e1] group-hover:bg-[#e8e6e1] group-hover:text-[#1a1510]' : ''}
                                ${article.effect === 'blood' && isHovered ? 'bg-[#8b3a3a] border-[#8b3a3a] text-white' : ''}
                                ${article.effect === 'gold' && isHovered ? 'border-[#D4AF37] text-[#D4AF37]' : ''}
                            `}>
                      <Icon className="w-8 h-8" />
                    </div>

                    <h3 className={`font-ancient text-2xl mb-4 transition-colors ${article.effect === 'gold' ? 'group-hover:text-[#D4AF37] text-shadow-glow' : ''} ${article.effect === 'blood' ? 'group-hover:text-[#8b3a3a]' : ''}`}>
                      {article.title}
                    </h3>

                    <p className={`font-scholar text-lg opacity-80 mx-auto ${article.effect === 'ink' ? 'opacity-70 group-hover:opacity-100' : ''}`}>
                      {article.teaser}
                    </p>

                    {article.content && isHovered && (
                      <p className="font-hand text-[#8b3a3a] mt-4 animate-pulse">
                        Click to bleed the truth...
                      </p>
                    )}
                  </div>
                </div>
              );
            })}

          </div>
        </section>

        {/* Footer / Call to Action */}
        <footer className="mt-32 relative">
          <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none">
            <InkBlot className="w-[800px] h-[800px]" />
          </div>

          <div className="relative z-10 text-center max-w-2xl mx-auto">
            <Scroll className="w-12 h-12 text-[#8b3a3a] mx-auto mb-6" />
            <p className="font-scholar text-2xl italic mb-8">
              "Warning: This archive contains heavy doses of reality, brilliance, and existential dread. Browse at your own risk."
            </p>
            <div className="inline-block relative group cursor-pointer">
              <span className="font-ancient text-3xl text-[#1a1510] border-b-2 border-[#1a1510] group-hover:text-[#8b3a3a] group-hover:border-[#8b3a3a] transition-colors pb-2">
                JOIN THE ADVENTURE
              </span>
            </div>
          </div>
        </footer>

      </main>
    </div>
  );
};

export default App;

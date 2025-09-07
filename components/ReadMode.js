import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchAllWords, markSwipeRead } from '../api';
import InfoGrid from './InfoGrid';
import Examples from './Examples';
import PillList from './PillList';
import Links from './Links';
import './UniversalReadMode.css';
import ThemeToggle from './ThemeToggle';

/* =========================
   🎨 Color helpers (robust)
   ========================= */
const parseToRgb = (c) => {
  if (!c) return { r: 79, g: 70, b: 229 }; // indigo-600 default
  const s = c.toString().trim();

  if (s.startsWith('#')) {
    let hex = s.slice(1);
    if (hex.length === 3) {
      hex = hex.split('').map(x => x + x).join('');
    }
    const int = parseInt(hex, 16);
    const r = (int >> 16) & 255;
    const g = (int >> 8) & 255;
    const b = int & 255;
    return { r, g, b };
  }

  const rgbMatch = s.match(/rgb\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/i);
  if (rgbMatch) {
    return {
      r: Number(rgbMatch[1]),
      g: Number(rgbMatch[2]),
      b: Number(rgbMatch[3])
    };
  }

  return { r: 79, g: 70, b: 229 };
};

const toRgba = (color, alpha = 1) => {
  const { r, g, b } = parseToRgb(color);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const COLOR_PALETTE = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#6366f1',
  '#14b8a6', '#f43f5e', '#a855f7', '#22c55e', '#eab308'
];

/* =========================
   🎪 HORIZONTAL CAROUSEL VARIANTS
   ========================= */
const cardVariants = {
  enter: (direction) => ({
    x: direction > 0 ? '100%' : '-100%',
    opacity: 0
  }),
  center: {
    x: 0,
    opacity: 1
  },
  exit: (direction) => ({
    x: direction < 0 ? '100%' : '-100%',
    opacity: 0
  })
};

/* =========================================
   🌈 Advanced color extraction
   ========================================= */
const useColorExtraction = () => {
  const canvasRef = useRef(null);

  const extractVibeColor = useCallback(async (imageUrl) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';

      img.onload = () => {
        try {
          const canvas = canvasRef.current;
          const ctx = canvas.getContext('2d');
          const maxSize = 200;
          const ratio = Math.min(maxSize / img.width, maxSize / img.height);
          canvas.width = Math.max(1, Math.floor(img.width * ratio));
          canvas.height = Math.max(1, Math.floor(img.height * ratio));

          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const color = getVibrancyColor(imageData);
          resolve(color);
        } catch {
          resolve(generateWordColor(imageUrl));
        }
      };

      img.onerror = () => resolve(generateWordColor(imageUrl));
      img.src = imageUrl;
    });
  }, []);

  const getVibrancyColor = (imageData) => {
    const data = imageData.data;
    const colorMap = new Map();

    for (let i = 0; i < data.length; i += 16) {
      const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
      const brightness = (r + g + b) / 3;
      const saturation = Math.max(r, g, b) - Math.min(r, g, b);

      if (brightness < 50 || brightness > 200 || saturation < 30) continue;

      const key = [
        Math.round(r / 25) * 25,
        Math.round(g / 25) * 25,
        Math.round(b / 25) * 25
      ].join(',');

      const score = saturation + (brightness > 127 ? 255 - brightness : brightness);
      colorMap.set(key, (colorMap.get(key) || 0) + score);
    }

    let best = '79,70,229';
    let maxScore = 0;
    for (const [color, score] of colorMap) {
      if (score > maxScore) {
        maxScore = score;
        best = color;
      }
    }
    return `rgb(${best})`;
  };

  const generateWordColor = (seed) => {
    const s = (seed || '').toString();
    const hash = s.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
    return COLOR_PALETTE[hash % COLOR_PALETTE.length];
  };

  return { extractVibeColor, canvasRef };
};

/* ====================================
   🎮 Carousel Navigation with Drag
   ==================================== */
const useNavigation = (filteredWords, onSwipe) => {
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(0);

  const navigate = useCallback((dir) => {
    if (!filteredWords.length) return;
    setDirection(dir);
    setIndex((prev) => {
      const next = (prev + dir + filteredWords.length) % filteredWords.length;
      onSwipe?.(dir, filteredWords[prev]);
      return next;
    });
  }, [filteredWords, onSwipe]);

  const handleDragEnd = useCallback((_, info) => {
    if (Math.abs(info.offset.x) > 100 || Math.abs(info.velocity.x) > 300) {
      navigate(info.offset.x < 0 ? 1 : -1);
    }
  }, [navigate]);

  useEffect(() => {
    const shortcuts = {
      ArrowLeft: () => navigate(-1),
      ArrowRight: () => navigate(1),
      ' ': () => navigate(1),
      h: () => navigate(-1),
      l: () => navigate(1),
      j: () => navigate(1),
      k: () => navigate(-1)
    };

    const handler = (e) => {
      const action = shortcuts[e.key];
      if (action) {
        e.preventDefault();
        action();
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [navigate]);

  useEffect(() => {
    setIndex(0);
  }, [filteredWords]);

  return { index, direction, navigate, handleDragEnd };
};

const useUIVisibility = () => {
  const [showUI, setShowUI] = useState(true);
  const timeoutRef = useRef();

  const resetTimer = useCallback(() => {
    setShowUI(true);
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setShowUI(false), 4000);
  }, []);

  useEffect(() => {
    const events = ['mousemove', 'touchstart', 'keydown'];
    events.forEach(event => window.addEventListener(event, resetTimer));
    resetTimer();
    return () => {
      events.forEach(event => window.removeEventListener(event, resetTimer));
      clearTimeout(timeoutRef.current);
    };
  }, [resetTimer]);

  return { showUI, resetTimer };
};

/* =========================
   🎯 Main Component
   ========================= */
export default function ReadMode() {
  const [allWords, setAllWords] = useState([]);
  const [filteredWords, setFilteredWords] = useState([]);
  const [wordFilter, setWordFilter] = useState('all');
  const [dominantColor, setDominantColor] = useState('#4f46e5');
  const [isLoading, setIsLoading] = useState(true);

  const [logoLoaded, setLogoLoaded] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);
  const [heroLoaded, setHeroLoaded] = useState(false);
  const [heroFailed, setHeroFailed] = useState(false);

  const { extractVibeColor, canvasRef } = useColorExtraction();
  const { showUI, resetTimer } = useUIVisibility();

  const handleSwipe = useCallback((direction, word) => {
    if (direction === 1 && word) {
      markSwipeRead(word.id).catch(() => {});
    }
  }, []);

  const { index, direction, navigate, handleDragEnd } = useNavigation(filteredWords, handleSwipe);

  // Load words
  useEffect(() => {
    let cancelled = false;
    const loadWords = async () => {
      try {
        setIsLoading(true);
        const words = await fetchAllWords();
        if (cancelled) return;
        setAllWords(words);
        setFilteredWords(words);
      } catch (error) {
        console.error('Failed to load words:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadWords();
    return () => { cancelled = true; };
  }, []);

  // Filtering
  useEffect(() => {
    const filters = {
      all: () => allWords,
      'low-mastery': () => allWords.filter(w => (w.mastery ?? 0) <= 2),
      favorites: () => allWords.filter(w => w.favorite),
      recent: () => [...allWords]
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 50)
    };
    setFilteredWords(filters[wordFilter]?.() || allWords);
  }, [wordFilter, allWords]);

  const currentWord = filteredWords[index];
  const progress = useMemo(() => {
    if (!filteredWords.length) return 0;
    return ((index + 1) / filteredWords.length) * 100;
  }, [index, filteredWords.length]);

  const wordSlug = useMemo(() => {
    return currentWord
      ? currentWord.word.toLowerCase().replace(/[^a-z0-9]/g, '')
      : '';
  }, [currentWord]);

  const needPracticeCount = useMemo(() => allWords.filter(w => (w.mastery ?? 0) <= 2).length, [allWords]);

  // Reset image states on word change
  useEffect(() => {
    setLogoLoaded(false);
    setLogoFailed(false);
    setHeroLoaded(false);
    setHeroFailed(false);
  }, [wordSlug]);

  // Dynamic color updates
  useEffect(() => {
    const updateVibes = async () => {
      if (!currentWord) return;
      const imageUrl = `/images/${wordSlug}.png`;
      try {
        const color = await extractVibeColor(imageUrl);
        setDominantColor(color);
      } catch {
        const fallback = COLOR_PALETTE[currentWord.word.length % COLOR_PALETTE.length];
        setDominantColor(fallback);
      }
    };
    updateVibes();
  }, [currentWord, wordSlug, extractVibeColor]);

  /* ================ Loading / Empty ================ */
  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
        <div className="text-center text-white">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-white/20 rounded-full animate-spin mx-auto mb-6"></div>
            <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin absolute top-0 left-1/2 -translate-x-1/2"></div>
          </div>
          <h2 className="text-2xl font-bold mb-2">Loading your words...</h2>
          <p className="text-white/70">Preparing something awesome ✨</p>
        </div>
      </div>
    );
  }

  if (!filteredWords.length) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-900 text-white">
        <div className="text-center">
          <h2 className="text-3xl font-bold mb-4">No words found! 📚</h2>
          <p className="text-gray-400">Try adjusting your filter settings.</p>
        </div>
      </div>
    );
  }

  /* ================ 🎪 HORIZONTAL CAROUSEL RENDER ================ */
  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden"
      style={{
        background: `radial-gradient(ellipse at top, ${toRgba(dominantColor, 0.08)} 0%, #1a1a2e 50%, #16213e 100%)`
      }}
      onMouseMove={resetTimer}
      onTouchStart={resetTimer}
    >
      <canvas ref={canvasRef} className="hidden" />

      {/* 🎮 Top controls */}
      {showUI && (
        <div
          className="absolute top-0 left-0 right-0 z-10 p-6 transition-opacity duration-300"
          style={{
            background: `linear-gradient(135deg, ${toRgba(dominantColor, 0.44)} 0%, ${toRgba(dominantColor, 0.25)} 50%, transparent 100%)`
          }}
        >
          <div className="flex items-center justify-between text-white backdrop-blur-lg rounded-xl p-4 bg-white/10">
            <ThemeToggle size="md" />
            
            <select
              value={wordFilter}
              onChange={(e) => setWordFilter(e.target.value)}
              className="bg-white/20 text-white border-2 border-white/30 rounded-xl px-6 py-3 focus:outline-none focus:border-white/60 backdrop-blur-sm font-medium cursor-pointer hover:bg-white/30 transition-all"
            >
              <option value="all" className="text-black">All Words ({allWords.length})</option>
              <option value="low-mastery" className="text-black">Need Practice ({needPracticeCount})</option>
              <option value="recent" className="text-black">Recent Additions</option>
            </select>

            <div className="flex items-center space-x-8">
              <span className="text-xl font-bold tracking-wider">
                {index + 1} / {filteredWords.length}
              </span>
              <div className="relative w-48 h-4 bg-white/20 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    background: `linear-gradient(90deg, ${toRgba(dominantColor, 1)}, ${toRgba(dominantColor, 0.5)})`,
                    width: `${progress}%`
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 🎪 CAROUSEL CONTAINER */}
      <div className="h-full flex items-center justify-center p-8 pt-24">
        <div className="w-full max-w-6xl mx-auto h-full relative">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={currentWord.id}
              custom={direction}
              variants={cardVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ type: 'tween', ease: [0.4, 0.0, 0.2, 1], duration: 0.2 }}
              className="absolute inset-0 flex items-center justify-center"
              
              // 📱 DRAG/SWIPE FUNCTIONALITY
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.2}
              onDragEnd={handleDragEnd}
              
              style={{ willChange: 'transform' }}
            >
              {/* 🎨 FIXED SCROLLING WORD CARD */}
              <div
                className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden w-full h-full flex flex-col hover:shadow-3xl transition-shadow duration-300"
                style={{
                  boxShadow: `0 25px 80px -12px ${toRgba(dominantColor, 0.38)}, 0 0 0 1px ${toRgba(dominantColor, 0.12)}`
                }}
              >
                {/* Accent bar - FIXED */}
                <div
                  className="h-2 w-full flex-shrink-0"
                  style={{
                    background: `linear-gradient(90deg, ${toRgba(dominantColor, 1)} 0%, transparent 70%, ${toRgba(dominantColor, 0.5)} 100%)`
                  }}
                />

                {/* Hero image section - FIXED */}
                <div className="relative h-80 w-full flex items-center justify-center overflow-hidden bg-transparent flex-shrink-0">
                  {!heroFailed && (
                    <img
                      src={`/images/${wordSlug}.png`}
                      alt={currentWord.word}
                      className={`w-full h-full object-contain transition-opacity duration-300 ${heroLoaded ? 'opacity-100' : 'opacity-0'}`}
                      onLoad={() => setHeroLoaded(true)}
                      onError={() => {
                        setHeroFailed(true);
                        setHeroLoaded(false);
                      }}
                    />
                  )}

                  {/* Fallback */}
                  {(heroFailed || !heroLoaded) && (
                    <div
                      className="absolute inset-0 flex items-center justify-center text-white"
                      style={{
                        background: `linear-gradient(135deg, ${toRgba(dominantColor, 1)} 0%, ${toRgba(dominantColor, 0.9)} 100%)`
                      }}
                    >
                      <div className="text-center">
                        <div className="text-8xl font-black mb-4 drop-shadow-2xl">
                          {currentWord.word.charAt(0).toUpperCase()}
                        </div>
                        <div className="text-2xl font-light opacity-80">
                          {currentWord.word}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Overlay */}
                  <div
                    className="absolute inset-0 opacity-40 mix-blend-overlay pointer-events-none"
                    style={{
                      background: `radial-gradient(ellipse at 30% 30%, ${toRgba(dominantColor, 0.38)} 0%, transparent 50%)`
                    }}
                  />
                </div>

                {/* Logo/Title section - FIXED */}
                <div
                  className="mx-auto w-full h-auto px-3 py-2 flex-shrink-0"
                  style={{
                    background: logoLoaded
                      ? 'transparent'
                      : `linear-gradient(135deg, ${toRgba(dominantColor, 0.95)} 0%, ${toRgba(dominantColor, 0.8)} 60%, ${toRgba(dominantColor, 0.7)} 100%)`,
                    transition: 'background 240ms ease'
                  }}
                >
                  {!logoFailed ? (
                    <img
                      src={`/images/${wordSlug}_logo.png`}
                      alt={`${currentWord.word} logo`}
                      className={`h-12 object-contain mx-auto block ${logoLoaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`}
                      onLoad={() => setLogoLoaded(true)}
                      onError={() => {
                        setLogoFailed(true);
                        setLogoLoaded(false);
                      }}
                    />
                  ) : (
                    <div className='flex flex-row items-center justify-between px-4'>
                      <div className='flex flex-col items-start'>
                        <h1 className="text-2xl md:text-3xl font-extrabold leading-tight tracking-tight mb-1 text-white">
                          {currentWord.word}
                        </h1>
                        {currentWord.pronunciation && (
                          <p className="text-base md:text-lg font-light italic text-white/90">
                            /{currentWord.pronunciation}/
                          </p>
                        )}
                      </div>
                      <p className="text-lg md:text-xl font-bold leading-tight tracking-tight text-white flex-1 ml-4">
                        {currentWord.meaning || 'No definition available.'}
                      </p>
                    </div>
                  )}
                </div>

                {/* 📜 SCROLLABLE MAIN CONTENT - THIS IS THE KEY FIX */}
                <main
                  className="flex-1 overflow-y-auto overflow-x-hidden px-6 py-4 space-y-8"
                  style={{ 
                    background: `linear-gradient(to bottom, ${toRgba(dominantColor, 0.03)} 0%, transparent 30%)`,
                    scrollbarWidth: 'thin',
                    scrollbarColor: `${toRgba(dominantColor, 0.3)} transparent`
                  }}
                >
                  {currentWord.part_of_speech && (
                    <div className="flex justify-center">
                      <span
                        className="px-6 py-2 rounded-full text-white text-sm font-bold tracking-widest shadow-lg hover:scale-105 transition-transform cursor-pointer"
                        style={{ background: `linear-gradient(45deg, ${toRgba(dominantColor, 1)}, ${toRgba(dominantColor, 0.8)})` }}
                      >
                        {currentWord.part_of_speech.toUpperCase()}
                      </span>
                    </div>
                  )}

                  <InfoGrid word={currentWord} />
                  <Examples word={currentWord} />

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <PillList title="Synonyms" items={currentWord.synonyms} accentColor={toRgba(dominantColor, 1)} />
                    <PillList title="Antonyms" items={currentWord.antonyms} accentColor={toRgba(dominantColor, 0.8)} />
                    <PillList title="Groups" items={currentWord.word_grouping} accentColor={toRgba(dominantColor, 0.6)} />
                    <PillList title="Tags" items={currentWord.tags} accentColor={toRgba(dominantColor, 0.45)} />
                  </div>

                  <Links word={currentWord} />

                  <div
                    className="text-center mt-8 p-4 rounded-xl backdrop-blur-sm"
                    style={{ background: toRgba(dominantColor, 0.06) }}
                  >
                    <p className="text-gray-600 font-medium text-sm">
                      🎮 <kbd>←</kbd> <kbd>→</kbd> <kbd>H</kbd> <kbd>L</kbd> to navigate • <kbd>Space</kbd> to mark as read • Swipe to navigate
                    </p>
                  </div>
                </main>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Enhanced global styles */}
      <style>{`
        .motion-card { 
          will-change: transform; 
          backface-visibility: hidden; 
          transform: translateZ(0); 
        }
        
        /* Custom scrollbar styling */
        .overflow-y-auto {
          scrollbar-width: thin;
        }
        
        .overflow-y-auto::-webkit-scrollbar {
          width: 6px;
        }
        
        .overflow-y-auto::-webkit-scrollbar-track {
          background: transparent;
        }
        
        .overflow-y-auto::-webkit-scrollbar-thumb {
          background-color: rgba(0,0,0,0.2);
          border-radius: 3px;
        }
        
        .overflow-y-auto::-webkit-scrollbar-thumb:hover {
          background-color: rgba(0,0,0,0.3);
        }
        
        .backdrop-blur-xl { 
          backdrop-filter: blur(20px) saturate(150%); 
          -webkit-backdrop-filter: blur(20px) saturate(150%); 
        }
        
        kbd {
          background: linear-gradient(45deg, #333, #555);
          color: white; 
          padding: 2px 6px; 
          border-radius: 4px; 
          font-size: 12px; 
          font-weight: bold;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3); 
          border: 1px solid #666;
        }
        
        .shadow-3xl { 
          box-shadow: 0 35px 100px -12px rgba(0,0,0,0.25); 
        }
      `}</style>
    </div>
  );
}

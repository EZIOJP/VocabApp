import React, { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchAllWords, markSwipeRead } from '../api';
import InfoGrid from './InfoGrid';
import Examples from './Examples';
import PillList from './PillList';
import Links from './Links';
import './UniversalReadMode.css';
import ThemeToggle from './ThemeToggle';
// 🎨 Color palette
const COLOR_PALETTE = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#6366f1',
  '#14b8a6', '#f43f5e', '#a855f7', '#22c55e', '#eab308'
];

// ⚡ Ultra-fast card transitions
const cardVariants = {
  enter: (direction) => ({
    x: direction > 0 ? '100%' : '-100%',
    opacity: 0,
    scale: 0.98
  }),
  center: {
    x: 0,
    opacity: 1,
    scale: 1
  },
  exit: (direction) => ({
    x: direction < 0 ? '100%' : '-100%',
    opacity: 0,
    scale: 0.98
  })
};

// 🚀 Lightning-fast transitions
const transitionConfig = {
  type: 'tween',
  ease: [0.25, 0.1, 0.25, 1],
  duration: 0.12
};

// 🎭 Image preloader
const useCardPreloader = (words, currentIndex) => {
  const [preloadedImages, setPreloadedImages] = useState(new Set());

  const preloadImage = useCallback((src) => {
    if (preloadedImages.has(src)) return;
    
    const img = new Image();
    img.onload = () => {
      setPreloadedImages(prev => new Set([...prev, src]));
    };
    img.src = src;
  }, [preloadedImages]);

  useEffect(() => {
    const indicesToPreload = [
      currentIndex - 1,
      currentIndex,
      currentIndex + 1
    ].filter(i => i >= 0 && i < words.length);

    indicesToPreload.forEach(index => {
      const word = words[index];
      if (word) {
        const baseName = word.word.toLowerCase().replace(/[^a-z0-9]/g, '');
        preloadImage(`/images/${baseName}.png`);
        preloadImage(`/images/${baseName}_logo.png`);
      }
    });
  }, [words, currentIndex, preloadImage]);

  return preloadedImages;
};

// 🌈 Color extraction
const useColorExtraction = () => {
  const canvasRef = useRef(null);
  const colorCache = useRef(new Map());

  const extractColor = useCallback(async (imageUrl, fallbackWord) => {
    if (colorCache.current.has(imageUrl)) {
      return colorCache.current.get(imageUrl);
    }

    return new Promise((resolve) => {
      const img = new Image();
      
      img.onload = () => {
        try {
          const canvas = canvasRef.current;
          const ctx = canvas.getContext('2d');
          
          const size = 80;
          canvas.width = size;
          canvas.height = size;
          
          ctx.drawImage(img, 0, 0, size, size);
          const imageData = ctx.getImageData(0, 0, size, size);
          const color = getVibrancyColor(imageData);
          
          colorCache.current.set(imageUrl, color);
          resolve(color);
        } catch {
          const fallback = generateWordColor(fallbackWord);
          resolve(fallback);
        }
      };
      
      img.onerror = () => {
        const fallback = generateWordColor(fallbackWord);
        resolve(fallback);
      };
      
      img.src = imageUrl;
    });
  }, []);

  const getVibrancyColor = (imageData) => {
    const data = imageData.data;
    const colorMap = new Map();
    
    for (let i = 0; i < data.length; i += 16) {
      const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
      const saturation = Math.max(r, g, b) - Math.min(r, g, b);
      const brightness = (r + g + b) / 3;
      
      if (brightness < 40 || brightness > 200 || saturation < 30) continue;
      
      const key = [
        Math.round(r / 25) * 25,
        Math.round(g / 25) * 25,
        Math.round(b / 25) * 25
      ].join(',');
      
      colorMap.set(key, (colorMap.get(key) || 0) + saturation);
    }
    
    let bestColor = '79,70,229';
    let maxScore = 0;
    
    for (const [color, score] of colorMap) {
      if (score > maxScore) {
        maxScore = score;
        bestColor = color;
      }
    }
    
    return `rgb(${bestColor})`;
  };

  const generateWordColor = (word) => {
    const hash = (word || '').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return COLOR_PALETTE[hash % COLOR_PALETTE.length];
  };

  return { extractColor, canvasRef };
};

// 🎮 Navigation with momentum
const useNavigation = (filteredWords, onSwipe) => {
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const lastSwipeTime = useRef(0);

  const navigate = useCallback((dir) => {
    const now = Date.now();
    if (now - lastSwipeTime.current < 100) return;
    
    lastSwipeTime.current = now;
    
    if (!filteredWords.length) return;
    
    setDirection(dir);
    const newIndex = (index + dir + filteredWords.length) % filteredWords.length;
    setIndex(newIndex);
    onSwipe?.(dir, filteredWords[index]);
  }, [index, filteredWords, onSwipe]);

  useEffect(() => {
    const shortcuts = {
      'ArrowLeft': () => navigate(-1),
      'ArrowRight': () => navigate(1),
      ' ': () => navigate(1),
      'h': () => navigate(-1),
      'l': () => navigate(1),
      'j': () => navigate(1),
      'k': () => navigate(-1)
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

  return { index, direction, navigate };
};

// 🎪 UI visibility
const useUIVisibility = () => {
  const [showUI, setShowUI] = useState(true);
  const timeoutRef = useRef();

  const resetTimer = useCallback(() => {
    setShowUI(true);
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setShowUI(false), 3000);
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

// 📜 Enhanced sticky header with image section detection
const useScrollHeader = (contentRef, imageRef) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      if (contentRef.current && imageRef.current) {
        const contentElement = contentRef.current;
        const imageElement = imageRef.current;
        const scrollTop = contentElement.scrollTop;
        
        // Get image section bounds relative to content container
        const imageRect = imageElement.getBoundingClientRect();
        const contentRect = contentElement.getBoundingClientRect();
        
        // Calculate when image section is out of view
        const imageBottom = imageRect.bottom - contentRect.top;
        const isImageOutOfView = imageBottom <= 0;
        
        // Smooth progress calculation
        const maxScroll = contentElement.scrollHeight - contentElement.clientHeight;
        const progress = Math.min(scrollTop / Math.max(maxScroll * 0.2, 1), 1);
        
        setIsScrolled(isImageOutOfView);
        setScrollProgress(progress);
      }
    };

    const element = contentRef.current;
    if (element) {
      element.addEventListener('scroll', handleScroll, { passive: true });
      return () => element.removeEventListener('scroll', handleScroll);
    }
  }, [contentRef, imageRef]);

  return { isScrolled, scrollProgress };
};

// 🔧 Image utilities
const getImageUrls = (word) => {
  const baseName = word.word.toLowerCase().replace(/[^a-z0-9]/g, '');
  return {
    mainImage: `/images/${baseName}.png`,
    textLogo: `/images/${baseName}_logo.png`,
    fallbackImage: `/images/${baseName}.jpg`
  };
};

// 🚀 Main component
export default function ReadMode() {
  const [allWords, setAllWords] = useState([]);
  const [filteredWords, setFilteredWords] = useState([]);
  const [wordFilter, setWordFilter] = useState('all');
  const [dominantColor, setDominantColor] = useState('#4f46e5');
  const [isLoading, setIsLoading] = useState(true);

  const contentRef = useRef(null);
  const imageRef = useRef(null);
  const { extractColor, canvasRef } = useColorExtraction();
  const { showUI, resetTimer } = useUIVisibility();
  const { isScrolled, scrollProgress } = useScrollHeader(contentRef, imageRef);
  
  const handleSwipe = useCallback((direction, word) => {
    if (direction === 1 && word) {
      markSwipeRead(word.id).catch(() => {});
    }
  }, []);
  
  const { index, direction, navigate } = useNavigation(filteredWords, handleSwipe);
  const preloadedImages = useCardPreloader(filteredWords, index);

  // Color updates
  useEffect(() => {
    const updateColor = async () => {
      if (!filteredWords[index]) return;
      
      const word = filteredWords[index];
      const { mainImage } = getImageUrls(word);
      
      try {
        const color = await extractColor(mainImage, word.word);
        setDominantColor(color);
      } catch {
        const fallback = COLOR_PALETTE[word.word.length % COLOR_PALETTE.length];
        setDominantColor(fallback);
      }
    };

    updateColor();
  }, [index, filteredWords, extractColor]);

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
      'all': () => allWords,
      'low-mastery': () => allWords.filter(w => w.mastery <= 2),
      'favorites': () => allWords.filter(w => w.favorite),
      'recent': () => [...allWords]
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 50)
    };

    setFilteredWords(filters[wordFilter]?.() || allWords);
  }, [wordFilter, allWords]);

  // Loading screen
  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
        <div className="text-center text-white">
          <div className="relative mb-6">
            <div className="w-12 h-12 border-3 border-white/30 rounded-full animate-spin"></div>
            <div className="w-12 h-12 border-3 border-white border-t-transparent rounded-full animate-spin absolute top-0"></div>
          </div>
          <h2 className="text-xl font-bold">Loading...</h2>
        </div>
      </div>
    );
  }

  if (!filteredWords.length) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-900 text-white">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">No words found! 📚</h2>
          <p className="text-gray-400">Try adjusting your filter.</p>
        </div>
      </div>
    );
  }

  const currentWord = filteredWords[index];
  const progress = ((index + 1) / filteredWords.length) * 100;
  const { mainImage, textLogo } = getImageUrls(currentWord);

  return (
    <div 
      className="fixed inset-0 z-50 overflow-hidden select-none"
      style={{
        background: `linear-gradient(135deg, ${dominantColor}08 0%, #0a0a0a 100%)`
      }}
      onMouseMove={resetTimer}
      onTouchStart={resetTimer}
    >
      {/* Hidden canvas */}
      <canvas ref={canvasRef} className="hidden" />

      {/* 🎮 Top controls */}
      <AnimatePresence>
        {showUI && (
          <motion.div
            initial={{ opacity: 0, y: -60 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -60 }}
            transition={transitionConfig}
            className="absolute top-0 left-0 right-0 z-20 p-4"
          >
            <div 
              className="backdrop-blur-xl rounded-2xl p-4 border border-white/10"
              style={{ 
                background: `linear-gradient(135deg, ${dominantColor}25, ${dominantColor}15)`
              }}
            >
              <div className="flex items-center justify-between text-white">
                <select
                  value={wordFilter}
                  onChange={(e) => setWordFilter(e.target.value)}
                  className="bg-white/10 text-white border border-white/20 rounded-xl px-4 py-2 focus:outline-none focus:border-white/40"
                >
                  <option value="all" className="text-black">All ({allWords.length})</option>
                  <option value="low-mastery" className="text-black">Practice ({allWords.filter(w => w.mastery <= 2).length})</option>
                  <option value="recent" className="text-black">Recent</option>
                </select>

                <div className="flex items-center space-x-4">
                  <span className="font-bold">{index + 1} / {filteredWords.length}</span>
                  <div className="w-24 h-2 bg-white/20 rounded-full overflow-hidden">
                    <motion.div 
                      className="h-full rounded-full"
                      style={{ backgroundColor: dominantColor }}
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      transition={transitionConfig}
                    />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 📌 Enhanced sticky scroll header with smooth transitions */}
      <AnimatePresence>
        {isScrolled && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ 
              opacity: 1, 
              y: 0, 
              scale: 1
            }}
            exit={{ 
              opacity: 0, 
              y: -50, 
              scale: 0.9
            }}
            transition={{
              type: 'spring',
              damping: 25,
              stiffness: 300,
              mass: 0.5
            }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-30"
          >
            <div 
              className="px-8 py-3 rounded-2xl text-white font-bold text-xl shadow-2xl border border-white/20 backdrop-blur-xl"
              style={{ 
                background: `linear-gradient(135deg, ${dominantColor}95, ${dominantColor}80)`,
                boxShadow: `0 20px 40px -12px ${dominantColor}40, 0 0 0 1px ${dominantColor}20`
              }}
            >
              <div className="flex items-center space-x-3">
                <span>{currentWord.word}</span>
                <div 
                  className="w-2 h-2 rounded-full"
                  style={{ 
                    backgroundColor: 'white',
                    opacity: 0.8 
                  }}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 🎪 Main card container */}
      <div className="h-full flex items-center justify-center p-2 pt-20 pb-4">
        <div className="w-full max-w-6xl h-full relative">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={currentWord.id}
              custom={direction}
              variants={cardVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={transitionConfig}
              className="absolute inset-0 flex items-center justify-center"
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.15}
              dragMomentum={false}
              onDragEnd={(_, info) => {
                if (Math.abs(info.offset.x) > 60) {
                  navigate(info.offset.x < 0 ? 1 : -1);
                }
              }}
            >
              {/* 🎨 Main card */}
              <motion.div 
                className="w-full h-full bg-white/97 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden relative flex flex-col"
                style={{
                  boxShadow: `0 25px 50px -12px ${dominantColor}30`
                }}
              >
                {/* Dynamic accent bar */}
                <motion.div 
                  className="h-1 w-full flex-shrink-0"
                  style={{ backgroundColor: dominantColor }}
                  layoutId="accent"
                />

                {/* 📱 Mobile: Vertical Layout | 🖥️ Desktop: Horizontal Layout */}
                <div className="flex flex-col lg:flex-row h-full min-h-0">
                  
                  {/* 🖼️ Image section */}
                  <div 
                    ref={imageRef}
                    className="relative flex-shrink-0 h-[35vh] lg:h-full lg:w-[45%]"
                  >
                    
                    {/* Main background image */}
                    <motion.img
                      src={mainImage}
                      alt={currentWord.word}
                      className="absolute inset-0 w-full h-full object-cover"
                      loading="eager"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextElementSibling.style.display = 'flex';
                      }}
                      layoutId={`image-${currentWord.id}`}
                    />

                    {/* Fallback gradient */}
                    <div 
                      className="absolute inset-0 hidden items-center justify-center text-white"
                      style={{
                        background: `linear-gradient(135deg, ${dominantColor}, ${dominantColor}80)`
                      }}
                    >
                      <div className="text-8xl font-black opacity-80">
                        {currentWord.word.charAt(0).toUpperCase()}
                      </div>
                    </div>

                    {/* Subtle overlay */}
                    <div 
                      className="absolute inset-0 opacity-20"
                      style={{
                        background: `linear-gradient(135deg, ${dominantColor}40 0%, transparent 70%)`
                      }}
                    />

                    {/* Centered text logo overlay */}
                    <div className="absolute inset-0 flex items-center justify-center p-6">
                      <motion.img
                        src={textLogo}
                        alt={`${currentWord.word} logo`}
                        className="max-h-[60%] max-w-[90%] object-contain"
                        loading="eager"
                        style={{ 
                          filter: 'drop-shadow(0 6px 12px rgba(0,0,0,0.4))',
                          imageRendering: 'high-quality'
                        }}
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                        initial={{ opacity: 0, scale: 0.8, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        transition={{ 
                          delay: 0.2,
                          type: 'spring',
                          damping: 20,
                          stiffness: 200 
                        }}
                      />
                    </div>
                  </div>

                  {/* 📝 Content section with scroll */}
                  <div className="flex-1 flex flex-col min-h-0">
                    
                    {/* 🎯 Header section (non-scrollable) */}
                    <div className="flex-shrink-0 p-6 lg:p-8 border-b border-gray-100">
                      
                      {/* Traditional heading */}
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                      >
                        <h1 className="text-4xl lg:text-5xl font-black text-gray-900 mb-3 leading-tight">
                          {currentWord.word}
                        </h1>
                        {currentWord.pronunciation && (
                          <p className="text-xl text-gray-600 italic mb-4">
                            /{currentWord.pronunciation}/
                          </p>
                        )}
                        
                        {/* Part of speech */}
                        {currentWord.part_of_speech && (
                          <motion.span 
                            className="inline-block px-4 py-2 rounded-full text-white text-sm font-bold uppercase tracking-wider"
                            style={{ backgroundColor: dominantColor }}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            {currentWord.part_of_speech}
                          </motion.span>
                        )}
                      </motion.div>
                    </div>

                    {/* 📚 Scrollable content */}
                    <div 
                      ref={contentRef}
                      className="flex-1 overflow-y-auto p-6 lg:p-8 space-y-8 scroll-smooth"
                      style={{
                        scrollbarWidth: 'thin',
                        scrollbarColor: `${dominantColor}40 transparent`
                      }}
                    >
                      
                      <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                      >
                        <InfoGrid word={currentWord} />
                      </motion.div>

                      <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                      >
                        <Examples word={currentWord} />
                      </motion.div>

                      <motion.div
                        className="grid grid-cols-1 sm:grid-cols-2 gap-6"
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6 }}
                      >
                        <PillList title="Synonyms" items={currentWord.synonyms} accentColor={dominantColor} />
                        <PillList title="Antonyms" items={currentWord.antonyms} accentColor={`${dominantColor}CC`} />
                      </motion.div>

                      <motion.div
                        className="grid grid-cols-1 sm:grid-cols-2 gap-6"
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.7 }}
                      >
                        <PillList title="Groups" items={currentWord.word_grouping} accentColor={`${dominantColor}80`} />
                        <PillList title="Tags" items={currentWord.tags} accentColor={`${dominantColor}60`} />
                      </motion.div>

                      <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.8 }}
                      >
                        <Links word={currentWord} />
                      </motion.div>

                      {/* Navigation hints */}
                      <motion.div 
                        className="text-center p-6 rounded-2xl text-sm text-gray-500 bg-gray-50"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.9 }}
                      >
                        <p className="mb-2">
                          🎮 <kbd>←</kbd> <kbd>→</kbd> <kbd>H</kbd> <kbd>L</kbd> to navigate
                        </p>
                        <p>
                          <kbd>Space</kbd> to mark read • Swipe horizontally
                        </p>
                      </motion.div>

                      {/* Bottom spacer */}
                      <div className="h-8"></div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* 🎨 Enhanced styles */}
      <style>{`
        /* Smooth scrolling and custom scrollbars */
        .overflow-y-auto {
          scrollbar-width: thin;
          scrollbar-color: ${dominantColor}40 transparent;
        }
        .overflow-y-auto::-webkit-scrollbar {
          width: 6px;
        }
        .overflow-y-auto::-webkit-scrollbar-track {
          background: transparent;
        }
        .overflow-y-auto::-webkit-scrollbar-thumb {
          background: ${dominantColor}40;
          border-radius: 3px;
        }
        .overflow-y-auto::-webkit-scrollbar-thumb:hover {
          background: ${dominantColor}60;
        }

        /* Enhanced keyboard shortcuts styling */
        kbd {
          background: linear-gradient(45deg, #334155, #475569);
          color: white;
          padding: 3px 8px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 600;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.1);
          border: 1px solid #64748b;
          font-family: 'SF Mono', 'Monaco', 'Inconsolata', monospace;
        }

        /* Prevent text selection for smooth swiping */
        .select-none {
          -webkit-user-select: none;
          -moz-user-select: none;
          -ms-user-select: none;
          user-select: none;
        }

        /* High-quality image rendering */
        img {
          image-rendering: -webkit-optimize-contrast;
          image-rendering: optimize-contrast;
          image-rendering: crisp-edges;
        }

        /* Enhanced backdrop blur with better browser support */
        .backdrop-blur-xl {
          backdrop-filter: blur(24px) saturate(180%) brightness(110%);
          -webkit-backdrop-filter: blur(24px) saturate(180%) brightness(110%);
        }

        /* Mobile-first responsive text sizing */
        @media (max-width: 640px) {
          h1 {
            font-size: 2.5rem !important;
          }
        }

        /* Smooth scroll behavior */
        .scroll-smooth {
          scroll-behavior: smooth;
        }

        /* Enhanced contrast */
        .text-gray-900 {
          color: #111827;
        }
        
        .text-gray-600 {
          color: #4b5563;
        }

        .border-gray-100 {
          border-color: #f3f4f6;
        }

        /* Logo centering improvements */
        .object-contain {
          object-fit: contain;
          object-position: center;
        }
      `}</style>
    </div>
  );
}
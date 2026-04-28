import React, { useState } from 'react';
import { Question, QuizConfig } from '../types.ts';

interface PreviewInterfaceProps {
  questions: Question[];
  config: QuizConfig;
  onClose: () => void;
}

const PreviewInterface: React.FC<PreviewInterfaceProps> = ({ questions, config, onClose }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const { title: testTitle, theme, withPicture, optionsOff, isVertical, revealImageWithAnswer } = config;
  const currentQuestion = questions[currentIndex];

  const handleNext = () => {
    if (currentIndex + 1 < questions.length) {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  const themeStyles = {
    '--theme-bg': theme.bg,
    '--theme-card': theme.card,
    '--accent-color': theme.accent,
    '--accent-light': `${theme.accent}40`,
    '--accent-dim': `${theme.accent}20`
  } as React.CSSProperties;

  const getQuestionFontSize = () => {
    const len = currentQuestion.question.length;
    const hasImage = withPicture;
    const baseClasses = `tracking-wide text-center transition-all duration-300 ${isVertical ? 'leading-[1.2]' : 'leading-[3.5]'}`;

    if (isVertical) {
      if (hasImage) {
        if (len < 60) return `text-2xl lg:text-3xl font-black ${baseClasses}`;
        if (len < 100) return `text-xl lg:text-2xl font-black ${baseClasses}`;
        return `text-lg lg:text-xl font-bold ${baseClasses}`;
      } else {
        if (len < 40) return `text-4xl lg:text-5xl font-black ${baseClasses}`;
        if (len < 80) return `text-3xl lg:text-4xl font-black ${baseClasses}`;
        if (len < 140) return `text-2xl lg:text-3xl font-bold ${baseClasses}`;
        return `text-xl lg:text-2xl font-bold ${baseClasses}`;
      }
    }

    if (hasImage) {
      if (len < 80) return `text-5xl lg:text-6xl font-black ${baseClasses}`;
      if (len < 120) return `text-4xl lg:text-5xl font-black ${baseClasses}`;
      return `text-3xl lg:text-4xl font-bold ${baseClasses}`;
    }

    if (len < 40) return `text-6xl lg:text-8xl font-black ${baseClasses}`;
    if (len < 80) return `text-5xl lg:text-7xl font-black ${baseClasses}`;
    if (len < 140) return `text-4xl lg:text-6xl font-black ${baseClasses}`;
    if (len < 200) return `text-3xl lg:text-5xl font-bold ${baseClasses}`;
    return `text-2xl lg:text-4xl font-bold ${baseClasses}`;
  };

  return (
    <div className="flex-grow flex flex-col relative overflow-hidden bg-[var(--theme-bg)] h-screen" style={themeStyles}>
      
      {/* Progress Bar */}
      <div className="h-2 w-full bg-white/10 sticky top-0 z-[100]">
        <div
          className="h-full transition-all duration-300"
          style={{ width: `${((currentIndex + 1) / questions.length) * 100}%`, backgroundColor: theme.accent, boxShadow: `0 0 15px ${theme.accent}60` }}
        />
      </div>

      <div className="flex-grow flex flex-col w-full h-full relative z-10 overflow-hidden">
        <div className={`flex-grow flex flex-col items-center justify-center transition-all w-full relative bg-black`}>
          <div className={`relative z-10 flex flex-col w-full h-full max-h-screen ${isVertical ? 'aspect-[9/16] max-w-[calc(100vh*9/16)] self-center' : 'aspect-video max-w-full'}`}>
            <div className={`w-full h-full bg-[var(--theme-bg)] flex flex-col relative overflow-hidden ${isVertical ? 'rounded-none sm:rounded-[2rem] sm:my-2 shadow-[0_0_50px_rgba(0,0,0,0.8)]' : ''}`}>
              
              <div className={`flex flex-col h-full relative z-10 ${isVertical ? 'px-4 py-8' : 'px-6 py-8 lg:px-16 lg:py-10'}`}>
                
                {/* PREVIEW INDICATOR */}
                <div className="absolute top-6 right-6 lg:top-10 lg:right-10 z-30">
                  <div className="px-4 py-2 rounded-2xl font-black text-xs lg:text-sm tracking-[0.2em] uppercase backdrop-blur-lg border border-amber-500/30 bg-amber-500/15 text-amber-500 shadow-[0_4px_20px_-5px_rgba(245,158,11,0.4)]">
                    PREVIEW MODE
                  </div>
                </div>

                <div className="absolute top-6 left-6 lg:top-10 lg:left-10 z-30">
                  <div className="px-4 py-2 rounded-2xl font-black text-xs lg:text-sm tracking-[0.2em] uppercase backdrop-blur-lg border"
                    style={{ backgroundColor: `${theme.accent}15`, color: theme.accent, borderColor: `${theme.accent}30`, boxShadow: `0 4px 20px -5px ${theme.accent}40` }}>
                    {isVertical ? String(currentIndex + 1).padStart(2, '0') : `Question ${String(currentIndex + 1).padStart(2, '0')}`}
                  </div>
                </div>

                <div className={`flex-grow flex ${withPicture ? (isVertical ? 'flex-col items-center justify-center gap-2 lg:gap-4' : 'flex-row items-center gap-8 lg:gap-12') : 'flex-col justify-center'} min-h-0 ${isVertical ? 'mb-2 lg:mb-4' : 'mb-6 lg:mb-8'}`}>
                  
                  {withPicture && isVertical && (
                    <div className={`relative shrink-0 w-[85%] max-w-[20rem] lg:max-w-[24rem] aspect-[4/3] max-h-[30vh] flex justify-center items-center mx-auto ${currentQuestion.imageUrl ? 'overflow-hidden rounded-[2rem] shadow-[0_0_20px_rgba(0,0,0,0.5)] border-[3px] border-white/20 bg-black/40' : ''}`}>
                      {currentQuestion.imageUrl && (
                        <img src={currentQuestion.imageUrl} alt="Visual Context" className={`w-full h-full object-cover transition-all ${revealImageWithAnswer ? 'opacity-100' : 'opacity-100'}`} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; e.currentTarget.parentElement!.className = 'hidden'; }} />
                      )}
                    </div>
                  )}

                  <div className={`w-full max-h-full overflow-y-auto no-scrollbar ${isVertical ? 'py-1 lg:py-2' : 'py-6 lg:py-8'} flex flex-col justify-center ${withPicture && !isVertical ? 'flex-1' : ''}`}>
                    <h2 className={`${getQuestionFontSize()} text-white transition-all`}>
                      <span dangerouslySetInnerHTML={{ __html: currentQuestion.question }} />
                    </h2>
                  </div>

                  {withPicture && !isVertical && (
                    <div className={`relative shrink-0 w-64 h-64 lg:w-[28rem] lg:h-[28rem] aspect-square transition-all ${currentQuestion.imageUrl ? 'overflow-hidden rounded-[2.5rem] shadow-[0_0_30px_rgba(0,0,0,0.5)] border-[4px] border-white/20 bg-black/40' : ''}`}>
                      {currentQuestion.imageUrl && (
                        <img src={currentQuestion.imageUrl} alt="Visual Context" className={`w-full h-full object-cover transition-all ${revealImageWithAnswer ? 'opacity-100' : 'opacity-100'}`} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; e.currentTarget.parentElement!.className = 'relative shrink-0 w-64 h-64 lg:w-[28rem] lg:h-[28rem] aspect-square'; }} />
                      )}
                    </div>
                  )}
                </div>

                {!optionsOff && (
                  <div className="flex-shrink-0 flex flex-col justify-end">
                    <div className={`grid ${isVertical ? 'gap-3 lg:gap-4 grid-cols-1' : 'gap-5 lg:gap-8 grid-cols-1 md:grid-cols-2'}`}>
                      {(['A', 'B', 'C', 'D'] as const).map((key) => {
                        // In preview mode, permanently highlight the correct answer so user can verify
                        const isCorrect = key === currentQuestion.correctAnswer;

                        return (
                          <div
                            key={key}
                            className={`flex items-center px-4 lg:px-6 rounded-[1.2rem] lg:rounded-[2rem] text-left border-[3px] shadow-lg ${isVertical ? 'min-h-[3.5rem] lg:min-h-[4.5rem] py-2' : 'min-h-[7rem] lg:min-h-[9rem] py-4'}
                              ${isCorrect ? 'scale-[1.05] z-30 bg-emerald-500 border-emerald-400 text-white' : 'bg-white border-transparent'}`}
                          >
                            <div className={`shrink-0 flex items-center justify-center rounded-[1rem] font-black mr-3 lg:mr-6 ${isVertical ? 'w-10 h-10 lg:w-12 lg:h-12 text-xl' : 'w-16 h-16 lg:w-20 lg:h-20 text-3xl lg:text-5xl lg:rounded-[1.5rem]'}
                                ${isCorrect ? 'bg-white text-emerald-600' : 'bg-slate-100 text-slate-400'}`}
                            >
                              {key}
                            </div>
                            <span className={`font-bold tracking-wide flex-grow leading-[1.2] ${isVertical ? 'text-lg lg:text-xl' : 'text-2xl lg:text-4xl'}
                                ${isCorrect ? 'text-white' : 'text-slate-900'}`}>
                              {currentQuestion[`option${key}`]}
                            </span>
                            {isCorrect && (
                              <div className="ml-4 shrink-0">
                                <div className="rounded-full flex items-center justify-center w-10 h-10 bg-white text-emerald-500">
                                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="4"><path d="M5 13l4 4L19 7" /></svg>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* BOTTOM CONTROL DECK FOR PREVIEW */}
        <div className="w-full px-8 py-4 flex items-center justify-between bg-[var(--theme-bg)] border-t border-white/5 z-20 shrink-0 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
          <div className="flex items-center gap-4">
            <button 
              onClick={onClose} 
              className="px-6 py-4 rounded-xl font-black text-xs uppercase tracking-widest text-white/40 hover:text-white bg-white/5 hover:bg-white/10 transition-all border border-transparent hover:border-white/30"
            >
              Exit Preview
            </button>
            <div className="px-4 py-2 rounded-xl bg-white/5 text-white/60 font-bold text-sm tracking-widest uppercase">
              {currentIndex + 1} of {questions.length}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={handlePrev}
              disabled={currentIndex === 0}
              className="px-6 py-4 rounded-xl font-black text-sm uppercase tracking-widest bg-white/10 text-white hover:bg-white/20 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={handleNext}
              disabled={currentIndex + 1 === questions.length}
              className="px-8 py-4 rounded-xl font-black text-sm uppercase tracking-widest bg-white hover:opacity-90 transition-all shadow-lg flex items-center gap-3 disabled:opacity-30 disabled:cursor-not-allowed"
              style={{ backgroundColor: theme.accent, color: 'white', boxShadow: `0 10px 20px -5px ${theme.accent}60` }}
            >
              <span>Next</span>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3"><path d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default PreviewInterface;

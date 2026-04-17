
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Question, UserAnswer, QuizConfig } from '../types.ts';
import CircularTimer from './CircularTimer.tsx';
import { SoundEngine } from '../utils/SoundEngine.ts';
import { useScreenRecorder } from '../hooks/useScreenRecorder.ts';
import { speakText, prefetchTTS } from '../services/ttsAdapter.ts';

type SlideType = 'INTRO' | 'QUESTION' | 'OUTRO';

interface QuizInterfaceProps {
  questions: Question[];
  config: QuizConfig;
  onFinish: (answers: UserAnswer[]) => void;
  onExit: () => void;
}

// Estimate timer duration based on question + options word count and TTS speaking rate
const TTS_WORDS_PER_SECOND = 2.0;
const THINKING_GAP = 2;       // seconds of silence between question readout and answer
const ANSWER_LINGER = 2;      // seconds to stay on screen after reading out the answer
const MIN_TIMER = 10;         // minimum timer in seconds

// Calculate how long the answer phrase will take to speak
const getAnswerReadTime = (q: Question): number => {
  const correctText = q[`option${q.correctAnswer}`];
  const answerPhrase = `answer is option ${q.correctAnswer} ${correctText}`;
  const wordCount = answerPhrase.trim().split(/\s+/).length;
  return Math.max(1, Math.ceil(wordCount / TTS_WORDS_PER_SECOND)); // pure read time
};

const calculateDynamicTimer = (q: Question, optionsOff: boolean): number => {
  const fullTTSText = optionsOff 
    ? `${q.question}` 
    : `${q.question}. Options are: A, ${q.optionA}. B, ${q.optionB}. C, ${q.optionC}. D, ${q.optionD}.`;
  const wordCount = fullTTSText.trim().split(/\s+/).length;
  const questionReadTime = Math.ceil(wordCount / TTS_WORDS_PER_SECOND); // Force integer
  const answerReadTime = getAnswerReadTime(q);
  const total = questionReadTime + THINKING_GAP + answerReadTime + ANSWER_LINGER;
  return Math.max(MIN_TIMER, total);
};


const QuizInterface: React.FC<QuizInterfaceProps> = ({ questions, config, onFinish, onExit }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userChoices, setUserChoices] = useState<Record<number, 'A' | 'B' | 'C' | 'D' | null>>({});
  const [isAutoSelecting, setIsAutoSelecting] = useState(false);

  // States for Start Sequence
  const [hasStarted, setHasStarted] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [isQuizActive, setIsQuizActive] = useState(false);
  const [slideType, setSlideType] = useState<SlideType>(config.addIntroOutro ? 'INTRO' : 'QUESTION');

  const hasReadAnswerRef = useRef<number | null>(null);
  const autoTransitionRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  // Use a ref for isAutoSelecting so cleanup closures always see the latest value
  const isAutoSelectingRef = useRef(false);

  const { isTimed, isAutomatic, autoTimeLimit, title: testTitle, recordSession, theme, enableSound, enableTTS, withPicture, optionsOff, voiceId, addIntroOutro, isVertical, ttsProvider } = config;
  const currentQuestion = questions[currentIndex];
  const selectedOption = userChoices[currentIndex] || null;

  // Init Hook
  const { setupRecording, stopRecording, isRecording, getStream } = useScreenRecorder({
    title: testTitle,
    enableSound
  });

  useEffect(() => {
    if (enableSound) SoundEngine.init();
    return () => {
      SoundEngine.stopTTS();
    };
  }, [enableSound]);

  // Reset answer read ref on question change
  useEffect(() => {
    hasReadAnswerRef.current = null;
  }, [currentIndex]);

  const prepareFinalAnswers = useCallback(() => {
    if (recordSession) stopRecording();
    return questions.map((q, idx) => {
      const choice = userChoices[idx] || null;
      return {
        questionId: q.id,
        selectedOption: choice,
        isCorrect: choice === q.correctAnswer,
        timeSpent: 0
      };
    });
  }, [questions, userChoices, recordSession, stopRecording]);

  // TTS Question Effect
  useEffect(() => {
    if (enableTTS && isQuizActive && slideType === 'QUESTION' && !isAutoSelectingRef.current) {
      const textToSpeak = optionsOff 
        ? `${currentQuestion.question}` 
        : `${currentQuestion.question}. Options are: A, ${currentQuestion.optionA}. B, ${currentQuestion.optionB}. C, ${currentQuestion.optionC}. D, ${currentQuestion.optionD}.`;

      const triggerTTS = async () => {
        const audioData = await speakText(textToSpeak, voiceId, ttsProvider);
        if (audioData) {
          SoundEngine.playBase64Audio(audioData);

          // Immediately kick off next question prefetch in the background
          // so it's cached by the time the user moves to the next slide
          const nextIndex = currentIndex + 1;
          if (nextIndex < questions.length) {
            const nextQ = questions[nextIndex];
            const nextText = optionsOff
              ? `${nextQ.question}`
              : `${nextQ.question}. Options are: A, ${nextQ.optionA}. B, ${nextQ.optionB}. C, ${nextQ.optionC}. D, ${nextQ.optionD}.`;
            // Fire and forget — don't await, let it cache silently
            prefetchTTS(nextText, voiceId, ttsProvider);
          }
        }

        // Prefetch the answer for this question (pre-loads for reveal)
        const correctLetter = currentQuestion.correctAnswer;
        const correctText = currentQuestion[`option${correctLetter}`];
        const answerText = `answer is option ${correctLetter} ${correctText}`;
        prefetchTTS(answerText, voiceId, ttsProvider);
      };

      triggerTTS();
    }

    return () => {
      // ONLY stop TTS when navigating manually — never during answer reveal
      if (!isAutoSelectingRef.current) SoundEngine.stopTTS();
    };
  }, [currentIndex, isQuizActive, slideType, enableTTS, currentQuestion.question, currentQuestion.optionA, currentQuestion.optionB, currentQuestion.optionC, currentQuestion.optionD, optionsOff, voiceId]);

  // INTRO Slide Effect
  useEffect(() => {
    if (isQuizActive && slideType === 'INTRO') {
      const runIntro = async () => {
        if (enableTTS) {
          const introAudioData = await speakText(`Welcome to ${testTitle}`, voiceId, ttsProvider);
          if (introAudioData) SoundEngine.playBase64Audio(introAudioData);
          
          // Prefetch Q1 (Wait, we will already do this in handleStart now, so just ensure it's not duplicating sequentially)
          const firstQ = questions[0];
          const questionText = optionsOff ? `${firstQ.question}` : `${firstQ.question}. Options are: A, ${firstQ.optionA}. B, ${firstQ.optionB}. C, ${firstQ.optionC}. D, ${firstQ.optionD}.`;
          if (ttsProvider !== 'gemini') { 
              // For Gemini, it's already fired in parallel at handleStart
              prefetchTTS(questionText, voiceId, ttsProvider);
          }
        }
        
        const words = testTitle.split(/\s+/).length;
        const durationMs = Math.max(3000, words * 400 + 1500); // Standard dynamic wait based on title length
        
        setTimeout(() => {
           setSlideType('QUESTION');
        }, durationMs);
      };
      runIntro();
    }
  }, [isQuizActive, slideType, testTitle, enableTTS, voiceId, questions, optionsOff]);

  // OUTRO Slide Effect
  useEffect(() => {
    if (isQuizActive && slideType === 'OUTRO') {
      const runOutro = async () => {
        const outroText = "Thanks for playing! How many did you get right? Let us know in the comments!";
        if (enableTTS) {
          const outroAudioData = await speakText(outroText, voiceId, ttsProvider);
          if (outroAudioData) SoundEngine.playBase64Audio(outroAudioData);
        }
        setTimeout(() => {
           onFinish(prepareFinalAnswers());
        }, 5000); 
      };
      runOutro();
    }
  }, [isQuizActive, slideType, enableTTS, voiceId, onFinish, prepareFinalAnswers]);

  // TTS Answer Effect
  // Answer TTS — ONLY for manual option selection (user clicked), NOT auto-reveal
  useEffect(() => {
    if (enableTTS && isQuizActive && slideType === 'QUESTION' && selectedOption && !isAutoSelectingRef.current && hasReadAnswerRef.current !== currentIndex) {
      hasReadAnswerRef.current = currentIndex;
      const correctLetter = currentQuestion.correctAnswer;
      const correctText = currentQuestion[`option${correctLetter}`];
      const textToSpeak = `answer is option ${correctLetter} ${correctText}`;

      const triggerTTS = async () => {
        // Small delay to let the "Success/Error" sound play first if enabled
        await new Promise(resolve => setTimeout(resolve, 500));
        const audioData = await speakText(textToSpeak, voiceId, ttsProvider);
        if (audioData) {
          SoundEngine.playBase64Audio(audioData);
        }
      };

      triggerTTS();
    }
  }, [selectedOption, enableTTS, isQuizActive, slideType, currentQuestion, currentIndex, voiceId]);

  const handleNext = useCallback(() => {
    if (autoTransitionRef.current) {
      clearTimeout(autoTransitionRef.current);
      autoTransitionRef.current = null;
    }
    setIsAutoSelecting(false);
    isAutoSelectingRef.current = false;

    if (currentIndex + 1 < questions.length) {
      setCurrentIndex(prev => prev + 1);
    } else {
      if (addIntroOutro && slideType !== 'OUTRO') {
         setSlideType('OUTRO');
      } else {
         onFinish(prepareFinalAnswers());
      }
    }
  }, [currentIndex, questions.length, onFinish, prepareFinalAnswers, addIntroOutro, slideType]);

  const handleOptionSelect = useCallback((key: 'A' | 'B' | 'C' | 'D') => {
    if (!isAutoSelectingRef.current) SoundEngine.stopTTS(); // Only stop TTS on manual select
    if (enableSound) {
      if (key === currentQuestion.correctAnswer) SoundEngine.playSuccess();
      else SoundEngine.playError();
    }
    setUserChoices(prev => ({ ...prev, [currentIndex]: key }));
  }, [currentIndex, currentQuestion.correctAnswer, enableSound]);

  const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const handleStart = async () => {
    if (enableSound || enableTTS) SoundEngine.init();

    // Eagerly prefetch first slide TTS
    let firstTTSPromise: Promise<any> | null = null;
    
    if (enableTTS) {
       const firstQ = questions[0];
       const questionText = optionsOff 
         ? `${firstQ.question}` 
         : `${firstQ.question}. Options are: A, ${firstQ.optionA}. B, ${firstQ.optionB}. C, ${firstQ.optionC}. D, ${firstQ.optionD}.`;
       const correctLetter = firstQ.correctAnswer;
       const correctText = firstQ[`option${correctLetter}`];
       const answerText = `answer is option ${correctLetter} ${correctText}`;

       if (addIntroOutro) {
          // Sequential: intro first, then Q1 gets prefetched during intro playback
          firstTTSPromise = prefetchTTS(`Welcome to ${testTitle}`, voiceId, ttsProvider);
       } else {
          // Sequential: question first, then answer
          firstTTSPromise = prefetchTTS(questionText, voiceId, ttsProvider).then(() => {
            return prefetchTTS(answerText, voiceId, ttsProvider);
          });
       }
    }

    if (recordSession) {
      const recorder = await setupRecording();
      if (recorder) {
        setIsInitializing(true);
        if (firstTTSPromise) await firstTTSPromise;

        // --- WORLD CLASS START SEQUENCE ---
        // 1. Stabilize — TTS prefetch runs during this wait
        await wait(4000);

        // 2. Reveal UI
        setHasStarted(true);

        // 3. Buffer (1s)
        await wait(1000);

        // 4. Region Capture (Experimental Feature Support)
        const stream = getStream();
        const videoTrack = stream?.getVideoTracks()[0];
        if (videoTrack && (window as any).CropTarget && cardRef.current) {
          try {
            const cropTarget = await (window as any).CropTarget.fromElement(cardRef.current);
            await (videoTrack as any).cropTo(cropTarget);
          } catch (e) {
            console.warn("Region Capture not supported or failed", e);
          }
        }

        // 5. Start Recording Bytes
        recorder.start(1000);
        setIsQuizActive(true);
        setIsInitializing(false);
      }
    } else {
      setIsInitializing(true);
      if (firstTTSPromise) await firstTTSPromise;
      setIsInitializing(false);
      
      setHasStarted(true);
      setIsQuizActive(true);
    }
  };

  const handleTimeUp = () => {
    if (!isQuizActive) return;
    if (isAutomatic) {
      // In automatic mode, visual reveal already happened in handleTick.
      // This is just a fallback in case the tab was inactive and handleTick skipped.
      if (!isAutoSelectingRef.current) {
        setIsAutoSelecting(true);
        isAutoSelectingRef.current = true;
        setUserChoices(prev => ({ ...prev, [currentIndex]: currentQuestion.correctAnswer }));
      }
      handleNext();
    } else if (isTimed) {
      handleNext();
    }
  };

  const handleTick = (remainingTime: number) => {
    if (!isQuizActive || isAutoSelectingRef.current) return;

    if (enableSound && !isAutomatic) {
      if (remainingTime > 0 && remainingTime <= 5) SoundEngine.playUrgentTick();
      else if (remainingTime === 10) SoundEngine.playTick();
    }

    if (isAutomatic) {
      // Trigger SYNCHRONIZED Answer Readout and Visual Reveal
      const answerReadTime = getAnswerReadTime(currentQuestion);
      const revealTime = answerReadTime + ANSWER_LINGER; // e.g. 1s read + 2s linger = 3s remaining

      if (remainingTime <= revealTime && hasReadAnswerRef.current !== currentIndex) {
        hasReadAnswerRef.current = currentIndex;

        // 1. Visual Reveal (Green Highlight instantly)
        setIsAutoSelecting(true);
        isAutoSelectingRef.current = true;
        setUserChoices(prev => ({ ...prev, [currentIndex]: currentQuestion.correctAnswer }));

        // 2. Play Audio (Syncs with visual)
        if (enableTTS) {
          const correctLetter = currentQuestion.correctAnswer;
          const correctText = currentQuestion[`option${correctLetter}`];
          const textToSpeak = `answer is option ${correctLetter} ${correctText}`;
          speakText(textToSpeak, voiceId, ttsProvider).then(audioData => {
            if (audioData) SoundEngine.playBase64Audio(audioData);
          });
        }
      }
    }
  };

  const timerDuration = (enableTTS && isAutomatic)
    ? calculateDynamicTimer(currentQuestion, optionsOff)
    : isAutomatic
      ? (autoTimeLimit - 3)
      : (currentQuestion.timeLimit || 20);
  const progressPercent = ((currentIndex + 1) / questions.length) * 100;

  const themeStyles = {
    '--theme-bg': theme.bg,
    '--theme-card': theme.card,
    '--accent-color': theme.accent,
    '--accent-light': `${theme.accent}40`,
    '--accent-dim': `${theme.accent}20`
  } as React.CSSProperties;

  // --- TYPOGRAPHY SYSTEM v2.0 ---
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

    // Landscape Mode
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

      {/* Precision Progress Bar */}
      <div className="h-2 w-full bg-white/10 sticky top-0 z-[100]">
        <div
          className="h-full transition-all duration-1000 cubic-bezier(0.16, 1, 0.3, 1)"
          style={{ width: `${progressPercent}%`, backgroundColor: theme.accent, boxShadow: `0 0 15px ${theme.accent}60` }}
        />
      </div>

      {/* Main Container */}
      <div className="flex-grow flex flex-col w-full h-full relative z-10 overflow-hidden">

        {/* THE ARENA */}
        <div className={`flex-grow flex flex-col items-center justify-center transition-all duration-500 w-full relative bg-black`}>

          {/* STABLE WRAPPER - DYNAMIC DIMENSIONS */}
          <div
            ref={cardRef}
            className={`relative z-10 flex flex-col w-full h-full max-h-screen ${isVertical ? 'aspect-[9/16] max-w-[calc(100vh*9/16)] self-center' : 'aspect-video max-w-full'}`}
          >
            {/* INNER ANIMATING CARD  */}
            <div className={`w-full h-full bg-[var(--theme-bg)] flex flex-col relative transition-all duration-700 overflow-hidden ${isVertical ? 'rounded-none sm:rounded-[2rem] sm:my-2 shadow-[0_0_50px_rgba(0,0,0,0.8)]' : ''}
                 ${!hasStarted ? 'opacity-80 scale-95' : 'opacity-100 scale-100'}`}
            >

              {!hasStarted && (
                <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-3xl flex items-center justify-center p-8">
                  <div className="text-center bg-[var(--theme-card)] p-10 rounded-[3rem] shadow-2xl max-w-sm animate-fade-in border border-white/10">
                    <div className="w-20 h-20 rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-inner bg-white/5 text-white">
                      {isInitializing ? (
                        <div className="w-8 h-8 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
                      ) : (
                        <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3"><path d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      )}
                    </div>
                    <h3 className="text-2xl font-black text-white mb-6 tracking-tighter uppercase">
                      {isInitializing ? 'Stabilizing Feed...' : 'Ready to Broadcast'}
                    </h3>
                    <button
                      onClick={handleStart}
                      disabled={isInitializing}
                      className="w-full py-6 text-white font-black rounded-[1.5rem] hover:opacity-90 transition-all uppercase tracking-[0.3em] active:scale-95 shadow-xl disabled:opacity-50 disabled:cursor-wait"
                      style={{ backgroundColor: theme.accent }}
                    >
                      {isInitializing ? 'Please Wait' : (recordSession ? 'Start Broadcast' : 'Start Engine')}
                    </button>
                  </div>
                </div>
              )}

              {/* Internal Content */}
              <div className={`flex flex-col h-full relative z-10 ${isVertical ? 'px-4 py-8' : 'px-6 py-8 lg:px-16 lg:py-10'}`}>
              
                {slideType === 'INTRO' && (
                  <div className={`flex-grow flex flex-col items-center justify-center transition-all duration-700 w-full px-12`}>
                      <h2 className="text-6xl lg:text-8xl font-black text-white text-center leading-tight tracking-tight drop-shadow-2xl animate-in zoom-in duration-700">
                         {testTitle}
                      </h2>
                      <div className="w-24 h-1 bg-white/20 mt-12 rounded-full overflow-hidden">
                         <div className="w-full h-full bg-white/80 animate-[shimmer_2s_infinite]"></div>
                      </div>
                  </div>
                )}

                {slideType === 'OUTRO' && (
                  <div className={`flex-grow flex flex-col items-center justify-center transition-all duration-700 w-full px-12`}>
                      <h2 className="text-5xl lg:text-7xl font-black text-white text-center leading-tight tracking-tight drop-shadow-2xl mb-8 animate-in slide-in-from-bottom-8 duration-700">
                         Thanks for playing!
                      </h2>
                      <p className="text-3xl lg:text-5xl font-bold text-center tracking-wide animate-in fade-in duration-1000 delay-300" style={{ color: theme.accent }}>
                         How many did you get right? Let us know in the comments!
                      </p>
                  </div>
                )}

                {slideType === 'QUESTION' && (
                  <>
                    <div className="absolute top-6 left-6 lg:top-10 lg:left-10 z-30 transition-all duration-700 animate-fade-in">
                      <div 
                        className="px-4 py-2 rounded-2xl font-black text-xs lg:text-sm tracking-[0.2em] uppercase backdrop-blur-lg border"
                        style={{ 
                          backgroundColor: `${theme.accent}15`, 
                          color: theme.accent,
                          borderColor: `${theme.accent}30`,
                          boxShadow: `0 4px 20px -5px ${theme.accent}40`
                        }}
                      >
                        {isVertical ? String(currentIndex + 1).padStart(2, '0') : `Question ${String(currentIndex + 1).padStart(2, '0')}`}
                      </div>
                    </div>

                    <div className={`flex-grow flex ${withPicture ? (isVertical ? 'flex-col items-center justify-center gap-2 lg:gap-4' : 'flex-row items-center gap-8 lg:gap-12') : 'flex-col justify-center'} min-h-0 ${isVertical ? 'mb-2 lg:mb-4' : 'mb-6 lg:mb-8'} transition-all`}>
                      
                      {/* Image Block MUST move before Text if vertical */}
                      {withPicture && isVertical && (
                         <div className={`relative shrink-0 w-[85%] max-w-[20rem] lg:max-w-[24rem] aspect-[4/3] max-h-[30vh] flex justify-center items-center transition-all duration-700 mx-auto ${currentQuestion.imageUrl ? 'overflow-hidden rounded-[2rem] shadow-[0_0_20px_rgba(0,0,0,0.5)] border-[3px] border-white/20 bg-black/40' : ''}`}>
                          {currentQuestion.imageUrl && (
                            <img src={currentQuestion.imageUrl} alt="Visual Context" className={`w-full h-full object-cover transition-all duration-700 ${config.revealImageWithAnswer && !isAutoSelecting && !selectedOption ? 'opacity-0 scale-90 blur-2xl' : 'opacity-100 scale-100 blur-0 group-hover:scale-105'}`} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; e.currentTarget.parentElement!.className = 'hidden'; }} />
                          )}
                          {/* Title Overlay — visible while image is hidden */}
                          {config.revealImageWithAnswer && (
                            <div className={`absolute inset-0 z-10 flex items-center justify-center p-4 transition-all duration-700 pointer-events-none ${!isAutoSelecting && !selectedOption ? 'opacity-100 scale-100' : 'opacity-0 scale-110'}`}>
                              <p className="text-lg lg:text-xl font-black text-white/60 text-center uppercase tracking-[0.15em] leading-tight drop-shadow-lg" style={{ textShadow: '0 2px 12px rgba(0,0,0,0.8)' }}>{testTitle}</p>
                            </div>
                          )}
                        </div>
                      )}

                      <div className={`w-full max-h-full overflow-y-auto no-scrollbar ${isVertical ? 'py-1 lg:py-2' : 'py-6 lg:py-8'} flex flex-col justify-center ${withPicture && !isVertical ? 'flex-1' : ''}`}>
                        <h2 className={`${getQuestionFontSize()} text-white transition-all duration-700 ${!hasStarted ? 'blur-2xl opacity-0' : 'blur-0 opacity-100'}`}>
                          <span dangerouslySetInnerHTML={{ __html: currentQuestion.question }} />
                        </h2>
                      </div>

                      {/* Image Block stays beside Text if landscape */}
                      {withPicture && !isVertical && (
                        <div className={`relative shrink-0 group w-64 h-64 lg:w-[28rem] lg:h-[28rem] aspect-square transition-all duration-700 ${currentQuestion.imageUrl ? 'overflow-hidden rounded-[2.5rem] shadow-[0_0_30px_rgba(0,0,0,0.5)] border-[4px] border-white/20 bg-black/40' : ''}`}>
                          {currentQuestion.imageUrl && (
                            <img src={currentQuestion.imageUrl} alt="Visual Context" className={`w-full h-full object-cover transition-all duration-700 ${config.revealImageWithAnswer && !isAutoSelecting && !selectedOption ? 'opacity-0 scale-90 blur-2xl' : 'opacity-100 scale-100 blur-0 group-hover:scale-105'}`} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; e.currentTarget.parentElement!.className = 'relative shrink-0 group w-64 h-64 lg:w-[28rem] lg:h-[28rem] aspect-square transition-all duration-700'; }} />
                          )}
                          {/* Title Overlay — visible while image is hidden */}
                          {config.revealImageWithAnswer && (
                            <div className={`absolute inset-0 z-10 flex items-center justify-center p-6 transition-all duration-700 pointer-events-none ${!isAutoSelecting && !selectedOption ? 'opacity-100 scale-100' : 'opacity-0 scale-110'}`}>
                              <p className="text-2xl lg:text-3xl font-black text-white/60 text-center uppercase tracking-[0.15em] leading-tight drop-shadow-lg" style={{ textShadow: '0 2px 12px rgba(0,0,0,0.8)' }}>{testTitle}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex-shrink-0 flex flex-col justify-end">
                      <div className={`grid ${isVertical ? 'gap-3 lg:gap-4 grid-cols-1' : 'gap-5 lg:gap-8 grid-cols-1 md:grid-cols-2'} transition-all duration-1000 delay-300
                        ${!hasStarted ? 'opacity-0 translate-y-12' : 'opacity-100 translate-y-0'}`}>

                        {(['A', 'B', 'C', 'D'] as const).map((key) => {
                          const isCorrect = isAutoSelecting && key === currentQuestion.correctAnswer;
                          const isWrong = isAutoSelecting && selectedOption === key && key !== currentQuestion.correctAnswer;
                          const isSelected = selectedOption === key;

                          return (
                            <button
                              key={key}
                              onClick={() => !isAutomatic && !isAutoSelecting && handleOptionSelect(key)}
                              disabled={!isQuizActive || isAutomatic || isAutoSelecting}
                              className={`group relative flex items-center px-4 lg:px-6 rounded-[1.2rem] lg:rounded-[2rem] text-left transition-all border-[3px] shadow-lg ${isVertical ? 'min-h-[3.5rem] lg:min-h-[4.5rem] py-2' : 'min-h-[7rem] lg:min-h-[9rem] py-4'}
                                ${isSelected && !isAutoSelecting ? 'scale-[1.02] z-20 bg-slate-100' :
                                  isCorrect ? 'scale-[1.05] z-30 bg-emerald-500 border-emerald-400 text-white' :
                                    isWrong ? 'bg-rose-500 border-rose-400 opacity-80 text-white' : 'bg-white border-transparent hover:border-white/50'} 
                                ${isSelected && !isAutoSelecting ? '' : !isCorrect && !isWrong ? '' : ''}`}
                              style={isSelected && !isAutoSelecting ? { borderColor: theme.accent } : {}}
                            >
                              <div className={`shrink-0 flex items-center justify-center rounded-[1rem] font-black transition-all duration-500 mr-3 lg:mr-6 ${isVertical ? 'w-10 h-10 lg:w-12 lg:h-12 text-xl' : 'w-16 h-16 lg:w-20 lg:h-20 text-3xl lg:text-5xl lg:rounded-[1.5rem]'}
                                 ${isCorrect ? 'bg-white text-emerald-600 rotate-[360deg]' :
                                  isWrong ? 'bg-white text-rose-500' :
                                    isSelected ? 'bg-[var(--theme-bg)] text-white' : 'bg-slate-100 text-slate-400 group-hover:bg-slate-200 group-hover:text-slate-600'}`}
                                style={isSelected && !isCorrect ? { backgroundColor: theme.accent } : {}}
                              >
                                {key}
                              </div>

                              <span className={`font-bold tracking-wide transition-all duration-300 flex-grow leading-[1.2] ${isVertical ? 'text-lg lg:text-xl' : 'text-2xl lg:text-4xl'}
                                 ${isCorrect || isWrong ? 'text-white' : 'text-slate-900'}`}>
                                {currentQuestion[`option${key}`]}
                              </span>

                              {(isCorrect || (isSelected && !isAutoSelecting)) && (
                                <div className="ml-4 animate-in zoom-in duration-500 shrink-0">
                                  <div className="rounded-full flex items-center justify-center w-10 h-10"
                                    style={{ backgroundColor: isCorrect ? 'white' : theme.accent, color: isCorrect ? '#10B981' : 'white' }}
                                  >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="4"><path d="M5 13l4 4L19 7" /></svg>
                                  </div>
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>

                      {(isTimed || isAutomatic) && hasStarted && (
                        <div className="mt-6 lg:mt-8 w-full h-3 lg:h-4 bg-white/10 rounded-full overflow-hidden relative">
                          {isQuizActive && slideType === 'QUESTION' && !isAutoSelecting ? (
                            <div
                              key={currentIndex}
                              className="h-full bg-[#FFD700] origin-left rounded-full"
                              style={{
                                width: '0%',
                                animation: `grow ${timerDuration}s linear forwards`
                              }}
                            />
                          ) : (
                            <div className="h-full w-full bg-transparent" />
                          )}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* BOTTOM CONTROL DECK */}
        <div className="w-full px-8 py-4 flex items-center justify-between bg-[var(--theme-bg)] border-t border-white/5 z-20 shrink-0 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
          {/* Left: Status & Timer */}
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-4 p-3 pr-6 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
              {(isTimed || isAutomatic) && slideType === 'QUESTION' && (
                <div className="w-12 h-12">
                  <CircularTimer key={`timer-${currentIndex}`} duration={timerDuration} onTimeUp={handleTimeUp} isActive={isQuizActive && (!isAutoSelecting || isAutomatic)} onTick={handleTick} />
                </div>
              )}
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-white/40 mb-0.5">Engine Status</p>
                <p className="text-lg font-black text-white italic tracking-tight leading-none" style={{ color: isAutoSelecting ? theme.accent : 'white' }}>
                  {slideType === 'INTRO' ? 'Title Sequence' : slideType === 'OUTRO' ? 'Ending Sequence' : isAutoSelecting ? 'Revealing...' : (isQuizActive ? 'Live Session' : 'Standby')}
                </p>
              </div>
            </div>

            <div className="hidden xl:block">
              <h1 className="text-lg font-black text-white tracking-tighter truncate max-w-[300px]">{testTitle}</h1>
              <div className="flex items-center gap-2 mt-1">
                <span className={`w-2 h-2 rounded-full ${isQuizActive ? 'bg-emerald-500 animate-pulse' : 'bg-orange-500'}`}></span>
                <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em]">
                  {slideType === 'INTRO' ? 'CINEMATIC INTRO' : slideType === 'OUTRO' ? 'CINEMATIC OUTRO' : `Slide ${currentIndex + 1} / ${questions.length}`}
                </p>
              </div>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-4">
            <button onClick={() => window.confirm("Abort current session?") && onExit()} className="px-6 py-4 rounded-xl font-black text-xs uppercase tracking-widest text-white/40 hover:text-rose-400 bg-white/5 hover:bg-white/10 transition-all border border-transparent hover:border-rose-500/30">
              Abort
            </button>
            <button
              onClick={handleNext}
              disabled={!isQuizActive || isAutomatic || isAutoSelecting}
              className="px-8 py-4 rounded-xl font-black text-sm uppercase tracking-widest bg-white hover:opacity-90 transition-all shadow-lg flex items-center gap-3 disabled:opacity-50 disabled:grayscale"
              style={{ backgroundColor: theme.accent, color: 'white', boxShadow: `0 10px 20px -5px ${theme.accent}60` }}
            >
              <span>Next Slide</span>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3"><path d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default QuizInterface;

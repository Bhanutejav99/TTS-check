
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Question, UserAnswer, QuizConfig } from '../types.ts';
import CircularTimer from './CircularTimer.tsx';
import { SoundEngine } from '../utils/SoundEngine.ts';
import { useScreenRecorder } from '../hooks/useScreenRecorder.ts';
import { speakText, prefetchTTS } from '../services/elevenLabsTTS.ts';

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

const calculateDynamicTimer = (q: Question): number => {
  const fullTTSText = `${q.question}. Options are: A, ${q.optionA}. B, ${q.optionB}. C, ${q.optionC}. D, ${q.optionD}.`;
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

  const hasReadAnswerRef = useRef<number | null>(null);
  const autoTransitionRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  // Use a ref for isAutoSelecting so cleanup closures always see the latest value
  const isAutoSelectingRef = useRef(false);

  const { isTimed, isAutomatic, autoTimeLimit, title: testTitle, recordSession, themeColor, enableSound, enableTTS, withPicture } = config;
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

  // TTS Question Effect
  useEffect(() => {
    if (enableTTS && isQuizActive && !isAutoSelectingRef.current) {
      const textToSpeak = `${currentQuestion.question}. Options are: A, ${currentQuestion.optionA}. B, ${currentQuestion.optionB}. C, ${currentQuestion.optionC}. D, ${currentQuestion.optionD}.`;

      const triggerTTS = async () => {
        const audioData = await speakText(textToSpeak);
        if (audioData) {
          SoundEngine.playBase64Audio(audioData);
        }

        // Sequential prefetching to explicitly avoid ElevenLabs Concurrency Limits (429)
        const correctLetter = currentQuestion.correctAnswer;
        const correctText = currentQuestion[`option${correctLetter}`];
        await prefetchTTS(`answer is option ${correctLetter} ${correctText}`);

        if (currentIndex < questions.length - 1) {
          const nextQ = questions[currentIndex + 1];
          await prefetchTTS(`${nextQ.question}. Options are: A, ${nextQ.optionA}. B, ${nextQ.optionB}. C, ${nextQ.optionC}. D, ${nextQ.optionD}.`);
        }
      };

      triggerTTS();
    }

    return () => {
      // ONLY stop TTS when navigating manually — never during answer reveal
      if (!isAutoSelectingRef.current) SoundEngine.stopTTS();
    };
  }, [currentIndex, isQuizActive, enableTTS, currentQuestion.question, currentQuestion.optionA, currentQuestion.optionB, currentQuestion.optionC, currentQuestion.optionD]);

  // TTS Answer Effect
  // Answer TTS — ONLY for manual option selection (user clicked), NOT auto-reveal
  useEffect(() => {
    if (enableTTS && isQuizActive && selectedOption && !isAutoSelectingRef.current && hasReadAnswerRef.current !== currentIndex) {
      hasReadAnswerRef.current = currentIndex;
      const correctLetter = currentQuestion.correctAnswer;
      const correctText = currentQuestion[`option${correctLetter}`];
      const textToSpeak = `answer is option ${correctLetter} ${correctText}`;

      const triggerTTS = async () => {
        // Small delay to let the "Success/Error" sound play first if enabled
        await new Promise(resolve => setTimeout(resolve, 500));
        const audioData = await speakText(textToSpeak);
        if (audioData) {
          SoundEngine.playBase64Audio(audioData);
        }
      };

      triggerTTS();
    }
  }, [selectedOption, enableTTS, isQuizActive, currentQuestion, currentIndex]);

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
      onFinish(prepareFinalAnswers());
    }
  }, [currentIndex, questions.length, onFinish, prepareFinalAnswers]);

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

    // Eagerly prefetch first question TTS so it's cached and plays instantly
    if (enableTTS) {
      const firstQ = questions[0];
      const questionText = `${firstQ.question}. Options are: A, ${firstQ.optionA}. B, ${firstQ.optionB}. C, ${firstQ.optionC}. D, ${firstQ.optionD}.`;
      const correctLetter = firstQ.correctAnswer;
      const correctText = firstQ[`option${correctLetter}`];
      // Sequentially prefetch to avoid concurrency limits
      prefetchTTS(questionText).then(() => {
        prefetchTTS(`answer is option ${correctLetter} ${correctText}`);
      });
    }

    if (recordSession) {
      const recorder = await setupRecording();
      if (recorder) {
        setIsInitializing(true);

        // --- WORLD CLASS START SEQUENCE ---
        // 1. Stabilize (4s) — TTS prefetch runs during this wait
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
          speakText(textToSpeak).then(audioData => {
            if (audioData) SoundEngine.playBase64Audio(audioData);
          });
        }
      }
    }
  };

  const timerDuration = (enableTTS && isAutomatic)
    ? calculateDynamicTimer(currentQuestion)
    : isAutomatic
      ? (autoTimeLimit - 3)
      : (currentQuestion.timeLimit || 20);
  const progressPercent = ((currentIndex + 1) / questions.length) * 100;

  const themeStyles = {
    '--accent-color': themeColor,
    '--accent-light': `${themeColor}40`,
    '--accent-dim': `${themeColor}20`
  } as React.CSSProperties;

  // --- TYPOGRAPHY SYSTEM v2.0 (HERO SCALE - LANDSCAPE ONLY) ---
  const getQuestionFontSize = () => {
    const len = currentQuestion.question.length;
    const hasImage = withPicture && !!currentQuestion.imageUrl;
    // Increased leading from 2.5 to 3.5 for maximum line spacing
    // Changed text-left to text-center
    const baseClasses = 'leading-[3.5] tracking-wide text-center transition-all duration-300';

    // Landscape Mode - Image
    if (hasImage) {
      if (len < 60) return `text-5xl lg:text-6xl font-black ${baseClasses}`;
      if (len < 120) return `text-3xl lg:text-4xl font-bold ${baseClasses}`;
      return `text-2xl lg:text-3xl font-bold ${baseClasses}`;
    }

    // Landscape Mode - Text Only (CINEMATIC HERO)
    if (len < 40) return `text-6xl lg:text-8xl font-black ${baseClasses}`;
    if (len < 80) return `text-5xl lg:text-7xl font-black ${baseClasses}`;
    if (len < 140) return `text-4xl lg:text-6xl font-black ${baseClasses}`;
    if (len < 200) return `text-3xl lg:text-5xl font-bold ${baseClasses}`;
    return `text-2xl lg:text-4xl font-bold ${baseClasses}`;
  };

  return (
    <div className="flex-grow flex flex-col relative overflow-hidden bg-[#04192c] h-screen" style={themeStyles}>

      {/* Precision Progress Bar */}
      <div className="h-2 w-full bg-white/10 sticky top-0 z-[100]">
        <div
          className="h-full transition-all duration-1000 cubic-bezier(0.16, 1, 0.3, 1)"
          style={{ width: `${progressPercent}%`, backgroundColor: themeColor, boxShadow: `0 0 15px ${themeColor}60` }}
        />
      </div>

      {/* Main Container */}
      <div className="flex-grow flex flex-col w-full h-full relative z-10 overflow-hidden">

        {/* THE ARENA */}
        <div className={`flex-grow flex flex-col items-center justify-center transition-all duration-500 w-full relative bg-black`}>

          {/* STABLE WRAPPER - FIXED 16:9 LANDSCAPE FULL SCREEN */}
          <div
            ref={cardRef}
            className={`relative z-10 flex flex-col aspect-video w-full h-full max-h-screen max-w-full`}
          >
            {/* INNER ANIMATING CARD - FLUSH FULL 16:9 */}
            <div className={`w-full h-full bg-[#04192c] flex flex-col relative transition-all duration-700 overflow-hidden
                 ${!hasStarted ? 'opacity-80 scale-95' : 'opacity-100 scale-100'}`}
            >

              {!hasStarted && (
                <div className="absolute inset-0 z-50 bg-[#04192c]/80 backdrop-blur-3xl flex items-center justify-center p-8">
                  <div className="text-center bg-[#0B2545] p-10 rounded-[3rem] shadow-2xl max-w-sm animate-fade-in border border-white/10">
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
                      style={{ backgroundColor: themeColor }}
                    >
                      {isInitializing ? 'Please Wait' : (recordSession ? 'Start Broadcast' : 'Start Engine')}
                    </button>
                  </div>
                </div>
              )}

              {/* Internal Content */}
              <div className="flex flex-col h-full relative z-10 px-6 py-8 lg:px-16 lg:py-10">
              
                {/* Question Number Badge (Absolute Top-Left) */}
                {hasStarted && (
                  <div className="absolute top-6 left-6 lg:top-10 lg:left-10 z-30 transition-all duration-700 animate-fade-in">
                    <div 
                      className="px-4 py-2 rounded-2xl font-black text-xs lg:text-sm tracking-[0.2em] uppercase backdrop-blur-lg border"
                      style={{ 
                        backgroundColor: `${themeColor}15`, 
                        color: themeColor,
                        borderColor: `${themeColor}30`,
                        boxShadow: `0 4px 20px -5px ${themeColor}40`
                      }}
                    >
                      Question {String(currentIndex + 1).padStart(2, '0')}
                    </div>
                  </div>
                )}

                {/* Question Area */}
                <div className={`flex-grow flex ${withPicture && currentQuestion.imageUrl ? 'flex-row items-center gap-8 lg:gap-12' : 'flex-col justify-center'} min-h-0 mb-6 lg:mb-8 transition-all`}>

                  <div className={`w-full max-h-full overflow-y-auto no-scrollbar py-6 lg:py-8 flex flex-col justify-center ${withPicture && currentQuestion.imageUrl ? 'flex-1' : ''}`}>
                    <h2 className={`${getQuestionFontSize()} text-white transition-all duration-700 ${!hasStarted ? 'blur-2xl opacity-0' : 'blur-0 opacity-100'}`}>
                      <span dangerouslySetInnerHTML={{ __html: currentQuestion.question }} />
                    </h2>
                  </div>

                  {withPicture && currentQuestion.imageUrl && (
                    <div className="relative shrink-0 overflow-hidden rounded-[2.5rem] shadow-[0_0_30px_rgba(0,0,0,0.5)] border-[4px] border-white/20 bg-black/40 group w-64 h-64 lg:w-[28rem] lg:h-[28rem] aspect-square transition-all duration-700">
                      <img
                        src={currentQuestion.imageUrl}
                        alt="Visual Context"
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    </div>
                  )}
                </div>

                {/* Options Grid - OPTIMIZED FOR 16:9 */}
                <div className="flex-shrink-0 flex flex-col justify-end">
                  <div className={`grid gap-5 lg:gap-8 transition-all duration-1000 delay-300 grid-cols-1 md:grid-cols-2
                    ${!hasStarted ? 'opacity-0 translate-y-12' : 'opacity-100 translate-y-0'}`}>

                    {(['A', 'B', 'C', 'D'] as const).map((key) => {
                      const isCorrect = isAutoSelecting && key === currentQuestion.correctAnswer;
                      const isWrong = isAutoSelecting && selectedOption === key && key !== currentQuestion.correctAnswer;
                      const isSelected = selectedOption === key;

                      return (
                        <button
                          key={key}
                          onClick={() => isQuizActive && !isAutomatic && !isAutoSelecting && handleOptionSelect(key)}
                          disabled={!isQuizActive || isAutomatic || isAutoSelecting}
                          className={`group relative flex items-center px-4 lg:px-6 rounded-[1.2rem] lg:rounded-[2rem] text-left transition-all border-[3px] shadow-lg min-h-[7rem] lg:min-h-[9rem] py-4
                            ${isSelected && !isAutoSelecting ? 'scale-[1.02] z-20 bg-slate-100' :
                              isCorrect ? 'scale-[1.05] z-30 bg-emerald-500 border-emerald-400 text-white' :
                                isWrong ? 'bg-rose-500 border-rose-400 opacity-80 text-white' : 'bg-white border-transparent hover:border-white/50'} 
                            ${isSelected && !isAutoSelecting ? '' : !isCorrect && !isWrong ? '' : ''}`}
                          style={isSelected && !isAutoSelecting ? { borderColor: themeColor } : {}}
                        >
                          {/* Option Label (A/B/C/D) */}
                          <div className={`shrink-0 flex items-center justify-center rounded-[1rem] font-black transition-all duration-500 w-16 h-16 lg:w-20 lg:h-20 mr-6 lg:mr-8 text-3xl lg:text-5xl lg:rounded-[1.5rem]
                             ${isCorrect ? 'bg-white text-emerald-600 rotate-[360deg]' :
                              isWrong ? 'bg-white text-rose-500' :
                                isSelected ? 'bg-[#04192c] text-white' : 'bg-slate-100 text-slate-400 group-hover:bg-slate-200 group-hover:text-slate-600'}`}
                            style={isSelected && !isCorrect ? { backgroundColor: themeColor } : {}}
                          >
                            {key}
                          </div>

                          {/* Option Text */}
                          <span className={`font-bold tracking-wide transition-all duration-300 flex-grow leading-[1.6] text-2xl lg:text-4xl
                             ${isCorrect || isWrong ? 'text-white' : 'text-slate-900'}`}>
                            {currentQuestion[`option${key}`]}
                          </span>

                          {(isCorrect || (isSelected && !isAutoSelecting)) && (
                            <div className="ml-4 animate-in zoom-in duration-500 shrink-0">
                              <div className="rounded-full flex items-center justify-center w-10 h-10"
                                style={{ backgroundColor: isCorrect ? 'white' : themeColor, color: isCorrect ? '#10B981' : 'white' }}
                              >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="4"><path d="M5 13l4 4L19 7" /></svg>
                              </div>
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Timer Progress Bar */}
                  {(isTimed || isAutomatic) && hasStarted && (
                    <div className="mt-6 lg:mt-8 w-full h-3 lg:h-4 bg-white/10 rounded-full overflow-hidden relative">
                      {isQuizActive && !isAutoSelecting ? (
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
              </div>
            </div>
          </div>
        </div>

        {/* BOTTOM CONTROL DECK */}
        <div className="w-full px-8 py-4 flex items-center justify-between bg-[#04192c] border-t border-white/5 z-20 shrink-0 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
          {/* Left: Status & Timer */}
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-4 p-3 pr-6 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
              {(isTimed || isAutomatic) && (
                <div className="w-12 h-12">
                  <CircularTimer key={`timer-${currentIndex}`} duration={timerDuration} onTimeUp={handleTimeUp} isActive={isQuizActive && (!isAutoSelecting || isAutomatic)} onTick={handleTick} />
                </div>
              )}
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-white/40 mb-0.5">Engine Status</p>
                <p className="text-lg font-black text-white italic tracking-tight leading-none" style={{ color: isAutoSelecting ? themeColor : 'white' }}>
                  {isAutoSelecting ? 'Revealing...' : (isQuizActive ? 'Live Session' : 'Standby')}
                </p>
              </div>
            </div>

            <div className="hidden xl:block">
              <h1 className="text-lg font-black text-white tracking-tighter truncate max-w-[300px]">{testTitle}</h1>
              <div className="flex items-center gap-2 mt-1">
                <span className={`w-2 h-2 rounded-full ${isQuizActive ? 'bg-emerald-500 animate-pulse' : 'bg-orange-500'}`}></span>
                <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em]">Slide {currentIndex + 1} / {questions.length}</p>
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
              className="px-8 py-4 rounded-xl font-black text-sm uppercase tracking-widest text-[#04192c] bg-white hover:opacity-90 transition-all shadow-lg flex items-center gap-3 disabled:opacity-50 disabled:grayscale"
              style={{ backgroundColor: themeColor, color: 'white', boxShadow: `0 10px 20px -5px ${themeColor}60` }}
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

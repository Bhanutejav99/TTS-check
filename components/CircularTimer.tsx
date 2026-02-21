
import React, { useEffect, useState, useRef } from 'react';

interface CircularTimerProps {
  duration: number;
  onTimeUp: () => void;
  isActive: boolean;
  onTick?: (timeLeft: number) => void;
}

const CircularTimer: React.FC<CircularTimerProps> = ({ duration, onTimeUp, isActive, onTick }) => {
  const [timeLeft, setTimeLeft] = useState(duration);
  const hasTriggeredRef = useRef(false);
  const strokeWidth = 4;
  const radius = 32;
  const circumference = 2 * Math.PI * radius;

  // Reset trigger flag and time when duration changes (new question)
  useEffect(() => {
    setTimeLeft(duration);
    hasTriggeredRef.current = false;
  }, [duration]);

  useEffect(() => {
    if (!isActive) return;
    
    // Safety check to prevent multiple triggers
    if (timeLeft <= 0) {
      if (!hasTriggeredRef.current) {
        hasTriggeredRef.current = true;
        onTimeUp();
      }
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        const newVal = prev - 1;
        if (onTick) onTick(newVal);
        
        if (newVal <= 0) {
          clearInterval(timer);
          return 0;
        }
        return newVal;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, onTimeUp, isActive, onTick]);

  const offset = circumference - (timeLeft / duration) * circumference;

  return (
    <div className="relative flex items-center justify-center w-24 h-24">
      <svg className="w-full h-full transform -rotate-90">
        <circle
          cx="48"
          cy="48"
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="transparent"
          className="text-white/10"
        />
        <circle
          cx="48"
          cy="48"
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={`transition-all duration-1000 ease-linear ${
            timeLeft <= 5 ? 'text-rose-500' : 'text-emerald-500'
          }`}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className={`text-2xl font-black tabular-nums leading-none tracking-tighter ${timeLeft <= 5 ? 'text-rose-400' : 'text-white'}`}>
          {timeLeft}
        </span>
        <span className="text-[7px] font-black text-white/40 uppercase tracking-widest mt-0.5">Left</span>
      </div>
    </div>
  );
};

export default CircularTimer;

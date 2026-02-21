import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { Check, X, Play, Pause } from "lucide-react";
import { useStore } from "@/lib/store";

const FOCUS_DURATION = 45 * 60;

export default function FocusRingPage() {
  const [location] = useLocation();
  const { focusTask } = useStore();
  const [timeLeft, setTimeLeft] = useState(FOCUS_DURATION);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [, setNav] = useLocation();

  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            setIsRunning(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, timeLeft]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const progress = 1 - (timeLeft / FOCUS_DURATION);
  const circumference = 2 * Math.PI * 120;
  const dashOffset = circumference - progress * circumference;

  const handleComplete = () => {
    setIsRunning(false);
    setTimeLeft(FOCUS_DURATION);
    setNav("/app/inbox");
  };

  const handleDefer = () => {
    setIsRunning(false);
    setTimeLeft(FOCUS_DURATION);
    setNav("/app/inbox");
  };

  return (
    <div className="h-full flex items-center justify-center bg-[#f9fafb] p-6 relative min-h-[80vh]" data-testid="focus-ring-page">
      <div className="absolute top-8 left-8 flex items-center space-x-2 text-gray-400 font-medium text-sm">
        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
        <span>Focus Mode Active</span>
      </div>

      <div className="flex flex-col items-center max-w-sm w-full">
        <div className="relative w-64 h-64 md:w-72 md:h-72 flex flex-col items-center justify-center rounded-full bg-white shadow-2xl border-[16px] border-white mb-12">
          <svg className="absolute top-0 left-0 w-full h-full transform -rotate-90" viewBox="0 0 256 256">
            <circle cx="128" cy="128" r="120" stroke="#f1f5f9" strokeWidth="6" fill="transparent" />
            <circle
              cx="128" cy="128" r="120"
              stroke="#8b5cf6"
              strokeWidth="6"
              fill="transparent"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              strokeLinecap="round"
              className="transition-all duration-1000 ease-out"
            />
          </svg>

          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-3 text-center">In Progress</p>
          <h2 className="text-lg md:text-xl font-bold text-gray-900 text-center px-6 leading-tight" data-testid="text-focus-task">
            {focusTask || "Select a task to focus"}
          </h2>

          <button
            onClick={() => setIsRunning(!isRunning)}
            className="flex items-center space-x-2 mt-4 bg-violet-50 border border-violet-100 px-4 py-1.5 rounded-full text-violet-600 shadow-sm hover:bg-violet-100 transition-colors"
            data-testid="button-focus-toggle"
          >
            {isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
            <p className="text-sm font-bold">{String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}</p>
          </button>
        </div>

        <div className="flex space-x-4 w-full">
          <button
            onClick={handleDefer}
            className="flex-1 bg-white border border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-600 py-4 rounded-2xl font-bold text-sm flex items-center justify-center space-x-2 shadow-sm transition-all"
            data-testid="button-focus-defer"
          >
            <X className="w-5 h-5 text-gray-400" />
            <span>Defer</span>
          </button>
          <button
            onClick={handleComplete}
            className="flex-1 bg-violet-600 hover:bg-violet-700 text-white py-4 rounded-2xl font-bold text-sm flex items-center justify-center space-x-2 shadow-lg shadow-violet-200 transition-all"
            data-testid="button-focus-complete"
          >
            <Check className="w-5 h-5" />
            <span>Complete</span>
          </button>
        </div>
      </div>
    </div>
  );
}

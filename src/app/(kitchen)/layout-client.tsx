'use client';

import { useState, useEffect, createContext, useContext, useCallback, useSyncExternalStore } from 'react';
import { Maximize2, Minimize2, History, Volume2, VolumeX } from 'lucide-react';
import { cn } from '@/lib/utils';

const SOUND_STORAGE_KEY = 'kitchen-sound-enabled';

// Custom hook for localStorage with SSR support
function useKitchenSoundPreference() {
  const getSnapshot = useCallback(() => {
    if (typeof window === 'undefined') return 'true';
    return localStorage.getItem(SOUND_STORAGE_KEY) ?? 'true';
  }, []);

  const getServerSnapshot = useCallback(() => 'true', []);

  const subscribe = useCallback((callback: () => void) => {
    window.addEventListener('storage', callback);
    // Also listen for custom events for same-tab updates
    window.addEventListener('kitchen-sound-change', callback);
    return () => {
      window.removeEventListener('storage', callback);
      window.removeEventListener('kitchen-sound-change', callback);
    };
  }, []);

  const value = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return value === 'true';
}

// Context for Recent mode state and sound preference
interface KitchenContextType {
  isRecentMode: boolean;
  setIsRecentMode: (value: boolean) => void;
  soundEnabled: boolean;
  toggleSound: () => void;
}

const KitchenContext = createContext<KitchenContextType | null>(null);

export function useKitchenContext() {
  const context = useContext(KitchenContext);
  if (!context) {
    throw new Error('useKitchenContext must be used within KitchenLayoutClient');
  }
  return context;
}

function LiveClock() {
  const [time, setTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        })
      );
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="font-mono text-xl xl:text-2xl font-bold tracking-wider text-zinc-100 tabular-nums">
      {time || '--:--:--'}
    </div>
  );
}

export function KitchenLayoutClient({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isRecentMode, setIsRecentMode] = useState(false);
  const soundEnabled = useKitchenSoundPreference();

  const toggleSound = useCallback(() => {
    const newValue = !soundEnabled;
    localStorage.setItem(SOUND_STORAGE_KEY, String(newValue));
    // Dispatch custom event for same-tab updates
    window.dispatchEvent(new Event('kitchen-sound-change'));
  }, [soundEnabled]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () =>
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  return (
    <KitchenContext.Provider value={{ isRecentMode, setIsRecentMode, soundEnabled, toggleSound }}>
      <div className="min-h-screen bg-[#050506] text-zinc-100 flex flex-col kds-grid-bg kds-scanline">
        {/* Mission Control Header - responsive padding */}
        <header className="flex-shrink-0 bg-[#0a0a0c]/90 backdrop-blur-md border-b border-white/[0.06] sticky top-0 z-50">
          <div className="px-3 py-2 lg:px-6 lg:py-4 flex items-center justify-between">
            {/* Left: Logo & Title - responsive sizing */}
            <div className="flex items-center gap-2 lg:gap-4">
              {/* Hexagon logo mark - smaller on laptops */}
              <div className="relative w-8 h-8 lg:w-10 lg:h-10 flex items-center justify-center">
                <svg
                  viewBox="0 0 40 40"
                  className="w-full h-full"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M20 2L36.5 11.5V29.5L20 39L3.5 29.5V11.5L20 2Z"
                    stroke="url(#kds-logo-gradient)"
                    strokeWidth="2"
                    fill="rgba(34, 211, 238, 0.05)"
                  />
                  <defs>
                    <linearGradient
                      id="kds-logo-gradient"
                      x1="3.5"
                      y1="2"
                      x2="36.5"
                      y2="39"
                    >
                      <stop stopColor="#22d3ee" />
                      <stop offset="1" stopColor="#06b6d4" />
                    </linearGradient>
                  </defs>
                </svg>
                <span className="absolute text-cyan-400 font-black text-xs lg:text-sm">K</span>
              </div>

              <div>
                <h1 className="text-sm lg:text-lg font-black tracking-tight">
                  <span className="text-cyan-400">KDS</span>
                  <span className="text-zinc-500 ml-1.5 lg:ml-2 text-xs lg:text-sm font-semibold tracking-normal hidden sm:inline">
                    KITCHEN DISPLAY
                  </span>
                </h1>
              </div>
            </div>

            {/* Center: Navigation - Orders + Recent buttons */}
            <nav className="absolute left-1/2 -translate-x-1/2 flex items-center gap-1.5 lg:gap-2">
              <button
                onClick={() => setIsRecentMode(false)}
                className={cn(
                  'px-3 py-2 lg:px-5 lg:py-2.5 rounded-lg border text-xs lg:text-sm font-semibold transition-all',
                  !isRecentMode
                    ? 'bg-zinc-700/60 border-cyan-500/40 text-zinc-100'
                    : 'bg-zinc-800/50 border-white/[0.08] text-zinc-400 hover:bg-zinc-700/50 hover:border-cyan-500/30 hover:text-zinc-200'
                )}
              >
                Orders
              </button>
              <button
                onClick={() => setIsRecentMode(true)}
                className={cn(
                  'px-3 py-2 lg:px-5 lg:py-2.5 rounded-lg border text-xs lg:text-sm font-semibold transition-all flex items-center gap-1.5',
                  isRecentMode
                    ? 'bg-zinc-700/60 border-slate-400/40 text-zinc-100'
                    : 'bg-zinc-800/50 border-white/[0.08] text-zinc-400 hover:bg-zinc-700/50 hover:border-slate-400/30 hover:text-zinc-200'
                )}
              >
                <History className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
                Recent
              </button>
            </nav>

            {/* Right: Clock, Sound Toggle & Fullscreen - responsive spacing */}
            <div className="flex items-center gap-3 lg:gap-6">
              <LiveClock />

              <button
                onClick={toggleSound}
                className={cn(
                  "p-2 lg:p-2.5 rounded-lg border transition-all",
                  soundEnabled
                    ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20"
                    : "bg-zinc-800/50 border-white/[0.08] text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/50"
                )}
                aria-label={soundEnabled ? 'Mute notifications' : 'Unmute notifications'}
              >
                {soundEnabled ? (
                  <Volume2 className="w-4 h-4 lg:w-5 lg:h-5" />
                ) : (
                  <VolumeX className="w-4 h-4 lg:w-5 lg:h-5" />
                )}
              </button>

              <button
                onClick={toggleFullscreen}
                className="p-2 lg:p-2.5 rounded-lg bg-zinc-800/50 border border-white/[0.08] text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/50 transition-all"
                aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
              >
                {isFullscreen ? (
                  <Minimize2 className="w-4 h-4 lg:w-5 lg:h-5" />
                ) : (
                  <Maximize2 className="w-4 h-4 lg:w-5 lg:h-5" />
                )}
              </button>
            </div>
          </div>
        </header>

        {/* Main Content - responsive padding */}
        <main className="flex-1 px-3 py-3 lg:px-6 lg:py-6 overflow-hidden">{children}</main>
      </div>
    </KitchenContext.Provider>
  );
}

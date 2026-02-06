'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Maximize2, Minimize2 } from 'lucide-react';

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
    <div className="font-mono text-2xl font-bold tracking-wider text-zinc-100 tabular-nums">
      {time || '--:--:--'}
    </div>
  );
}

export default function KitchenLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [isFullscreen, setIsFullscreen] = useState(false);

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
    <div className="min-h-screen bg-[#050506] text-zinc-100 flex flex-col kds-grid-bg kds-scanline">
      {/* Mission Control Header */}
      <header className="flex-shrink-0 bg-[#0a0a0c]/90 backdrop-blur-md border-b border-white/[0.06] sticky top-0 z-50">
        <div className="px-6 py-4 flex items-center justify-between">
          {/* Left: Logo & Title */}
          <div className="flex items-center gap-4">
            {/* Hexagon logo mark */}
            <div className="relative w-10 h-10 flex items-center justify-center">
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
              <span className="absolute text-cyan-400 font-black text-sm">K</span>
            </div>

            <div>
              <h1 className="text-lg font-black tracking-tight">
                <span className="text-cyan-400">KDS</span>
                <span className="text-zinc-500 ml-2 text-sm font-semibold tracking-normal">
                  KITCHEN DISPLAY
                </span>
              </h1>
            </div>
          </div>

          {/* Center: Navigation */}
          <nav className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2">
            <Link
              href="/kitchen/orders"
              className="px-5 py-2.5 rounded-lg bg-zinc-800/50 border border-white/[0.08] text-zinc-200 text-sm font-semibold hover:bg-zinc-700/50 hover:border-cyan-500/30 transition-all"
            >
              Orders
            </Link>
          </nav>

          {/* Right: Clock & Fullscreen */}
          <div className="flex items-center gap-6">
            <LiveClock />

            <button
              onClick={toggleFullscreen}
              className="p-2.5 rounded-lg bg-zinc-800/50 border border-white/[0.08] text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/50 transition-all"
              aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            >
              {isFullscreen ? (
                <Minimize2 className="w-5 h-5" />
              ) : (
                <Maximize2 className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-6 py-6 overflow-hidden">{children}</main>
    </div>
  );
}

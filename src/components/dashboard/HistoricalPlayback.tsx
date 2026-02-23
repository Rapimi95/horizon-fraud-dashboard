'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Play, Pause, Square, RotateCcw, Clock, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PlaybackSpeed } from '@/lib/types';

interface HistoricalPlaybackProps {
  isPlaying: boolean;
  progress: number;
  speed: PlaybackSpeed;
  currentTime: Date | null;
  totalTransactions: number;
  visibleCount: number;
  onStartPlayback: () => void;
  onPausePlayback: () => void;
  onResumePlayback: () => void;
  onStopPlayback: () => void;
  onSetSpeed: (speed: PlaybackSpeed) => void;
  onSeekTo: (progress: number) => void;
}

const SPEED_OPTIONS: PlaybackSpeed[] = [1, 2, 5, 10];

function formatTime(date: Date | null): string {
  if (!date) return '--:--:--';
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

export default function HistoricalPlayback({
  isPlaying,
  progress,
  speed,
  currentTime,
  totalTransactions,
  visibleCount,
  onStartPlayback,
  onPausePlayback,
  onResumePlayback,
  onStopPlayback,
  onSetSpeed,
  onSeekTo,
}: HistoricalPlaybackProps) {
  const isComplete = progress >= 100;
  const isActive = isPlaying || progress > 0;

  // Idle state: show prominent start button
  if (!isActive) {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-50">
        <div className="bg-slate-900 border-t border-slate-700 px-4 py-3">
          <div className="max-w-screen-2xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Activity className="h-5 w-5 text-slate-400" />
              <div>
                <p className="text-sm font-medium text-slate-200">Historical Playback</p>
                <p className="text-xs text-slate-400">
                  Replay the last 24 hours to see how the attack unfolded
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-400 hidden sm:inline">
                {totalTransactions.toLocaleString()} transactions available
              </span>
              <Button
                onClick={onStartPlayback}
                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                size="sm"
              >
                <Play className="h-4 w-4" />
                Start Replay
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Complete state
  if (isComplete) {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-50">
        <div className="bg-slate-900 border-t border-emerald-600/50 px-4 py-3">
          <div className="max-w-screen-2xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center h-8 w-8 rounded-full bg-emerald-600/20">
                <Activity className="h-4 w-4 text-emerald-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-emerald-300">Replay Complete</p>
                <p className="text-xs text-slate-400">
                  All {totalTransactions.toLocaleString()} transactions replayed
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs font-mono text-slate-300">
                {visibleCount.toLocaleString()} / {totalTransactions.toLocaleString()} transactions
              </span>
              <Button
                onClick={() => {
                  onStopPlayback();
                  onStartPlayback();
                }}
                variant="outline"
                size="sm"
                className="border-slate-600 text-slate-200 hover:bg-slate-800 hover:text-white gap-2"
              >
                <RotateCcw className="h-4 w-4" />
                Restart
              </Button>
              <Button
                onClick={onStopPlayback}
                variant="ghost"
                size="sm"
                className="text-slate-400 hover:text-slate-200 hover:bg-slate-800"
              >
                <Square className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Active playback state
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50">
      {/* Animated gradient border when playing */}
      {isPlaying && (
        <div className="h-[2px] w-full bg-gradient-to-r from-emerald-500 via-cyan-500 to-emerald-500 animate-gradient-x" />
      )}

      <div className="bg-slate-900 border-t border-slate-700 px-4 py-3">
        <div className="max-w-screen-2xl mx-auto flex flex-col sm:flex-row items-center gap-3 sm:gap-4">
          {/* Transport controls */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {isPlaying ? (
              <Button
                onClick={onPausePlayback}
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-slate-200 hover:text-white hover:bg-slate-800"
                title="Pause"
              >
                <Pause className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                onClick={onResumePlayback}
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-emerald-400 hover:text-emerald-300 hover:bg-slate-800"
                title="Resume"
              >
                <Play className="h-4 w-4" />
              </Button>
            )}
            <Button
              onClick={onStopPlayback}
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-slate-400 hover:text-slate-200 hover:bg-slate-800"
              title="Stop"
            >
              <Square className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Progress slider */}
          <div className="flex-1 min-w-0 w-full sm:w-auto">
            <Slider
              value={[progress]}
              min={0}
              max={100}
              step={0.1}
              onValueChange={(value) => onSeekTo(value[0])}
              className="w-full [&_[role=slider]]:h-3 [&_[role=slider]]:w-3 [&_[role=slider]]:bg-emerald-400 [&_[data-orientation=horizontal]>.bg-primary]:bg-emerald-500"
            />
          </div>

          {/* Current time */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <Clock className="h-3.5 w-3.5 text-slate-400" />
            <span className="text-xs font-mono text-slate-200 min-w-[60px]">
              {formatTime(currentTime)}
            </span>
          </div>

          {/* Speed selector */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {SPEED_OPTIONS.map((s) => (
              <Button
                key={s}
                onClick={() => onSetSpeed(s)}
                variant="ghost"
                size="sm"
                className={cn(
                  'h-7 px-2 text-xs font-mono',
                  speed === s
                    ? 'bg-emerald-600/30 text-emerald-300 hover:bg-emerald-600/40 hover:text-emerald-200'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                )}
              >
                {s}x
              </Button>
            ))}
          </div>

          {/* Transaction counter */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <Badge
              variant="outline"
              className="text-[10px] border-slate-600 text-slate-300 font-mono px-2 py-0.5"
            >
              {visibleCount.toLocaleString()} / {totalTransactions.toLocaleString()}
            </Badge>
          </div>

          {/* Hint text - hidden on small screens */}
          <p className="text-[10px] text-slate-500 hidden lg:block flex-shrink-0 max-w-[200px]">
            Replay the last 24 hours to see how the attack unfolded
          </p>
        </div>
      </div>
    </div>
  );
}

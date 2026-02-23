'use client';

import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { PlaybackSpeed } from '@/lib/types';
import { generateTransactions } from '@/lib/generate-data';

export function useRealTimeSimulation() {
  // Generate all transactions once — never changes after initial render
  const allTransactions = useMemo(() => generateTransactions(), []);
  const allTransactionsRef = useRef(allTransactions);

  // Initialize at end of dataset (show all by default)
  const [currentIndex, setCurrentIndex] = useState(() => allTransactions.length);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeedState] = useState<PlaybackSpeed>(1);
  const [currentTime, setCurrentTime] = useState<Date | null>(() =>
    allTransactions.length > 0 ? new Date(allTransactions[allTransactions.length - 1].timestamp) : null
  );
  const [isComplete, setIsComplete] = useState(true);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentIndexRef = useRef(allTransactions.length);
  const speedRef = useRef<PlaybackSpeed>(1);
  const isPlayingRef = useRef(false);

  // Derive visibleTransactions from allTransactions and currentIndex
  const visibleTransactions = useMemo(
    () => allTransactions.slice(0, currentIndex),
    [allTransactions, currentIndex]
  );

  // Compute progress as a derived value
  const progress =
    allTransactions.length > 0
      ? Math.round((currentIndex / allTransactions.length) * 100)
      : 0;

  // Clear any running interval
  const clearPlaybackInterval = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  // Core tick function: adds transactions based on speed
  const tick = useCallback(() => {
    const txns = allTransactionsRef.current;
    const idx = currentIndexRef.current;
    const spd = speedRef.current;

    if (idx >= txns.length) {
      clearPlaybackInterval();
      setIsPlaying(false);
      isPlayingRef.current = false;
      setIsComplete(true);
      setCurrentIndex(txns.length);
      currentIndexRef.current = txns.length;
      if (txns.length > 0) {
        setCurrentTime(new Date(txns[txns.length - 1].timestamp));
      }
      return;
    }

    const nextIndex = Math.min(idx + spd, txns.length);

    setCurrentIndex(nextIndex);
    currentIndexRef.current = nextIndex;
    setIsComplete(nextIndex >= txns.length);

    if (nextIndex > 0) {
      setCurrentTime(new Date(txns[nextIndex - 1].timestamp));
    }

    if (nextIndex >= txns.length) {
      clearPlaybackInterval();
      setIsPlaying(false);
      isPlayingRef.current = false;
    }
  }, [clearPlaybackInterval]);

  // Start the interval
  const startInterval = useCallback(() => {
    clearPlaybackInterval();
    const BASE_INTERVAL = 100; // ms
    intervalRef.current = setInterval(tick, BASE_INTERVAL);
  }, [clearPlaybackInterval, tick]);

  // Public API: start playback from the beginning
  const startPlayback = useCallback(() => {
    const txns = allTransactionsRef.current;
    if (txns.length === 0) return;

    clearPlaybackInterval();

    setCurrentIndex(0);
    currentIndexRef.current = 0;
    setIsComplete(false);
    setIsPlaying(true);
    isPlayingRef.current = true;
    setCurrentTime(new Date(txns[0].timestamp));

    timeoutRef.current = setTimeout(() => {
      startInterval();
    }, 0);
  }, [clearPlaybackInterval, startInterval]);

  // Public API: pause playback
  const pausePlayback = useCallback(() => {
    clearPlaybackInterval();
    setIsPlaying(false);
    isPlayingRef.current = false;
  }, [clearPlaybackInterval]);

  // Public API: resume playback from current position
  const resumePlayback = useCallback(() => {
    const txns = allTransactionsRef.current;
    const idx = currentIndexRef.current;
    if (idx >= txns.length) return;

    setIsPlaying(true);
    isPlayingRef.current = true;
    startInterval();
  }, [startInterval]);

  // Public API: stop playback and show all transactions
  const stopPlayback = useCallback(() => {
    clearPlaybackInterval();
    const txns = allTransactionsRef.current;

    setIsPlaying(false);
    isPlayingRef.current = false;
    setCurrentIndex(txns.length);
    currentIndexRef.current = txns.length;
    setIsComplete(true);
    if (txns.length > 0) {
      setCurrentTime(new Date(txns[txns.length - 1].timestamp));
    }
  }, [clearPlaybackInterval]);

  // Public API: change playback speed
  const setSpeed = useCallback(
    (newSpeed: PlaybackSpeed) => {
      setSpeedState(newSpeed);
      speedRef.current = newSpeed;

      // If currently playing, restart the interval with new speed
      if (isPlayingRef.current) {
        clearPlaybackInterval();
        startInterval();
      }
    },
    [clearPlaybackInterval, startInterval]
  );

  // Public API: seek to a percentage point (0-100)
  const seekTo = useCallback(
    (targetProgress: number) => {
      const txns = allTransactionsRef.current;
      if (txns.length === 0) return;

      const clampedProgress = Math.max(0, Math.min(100, targetProgress));
      const targetIndex = Math.round((clampedProgress / 100) * txns.length);

      setCurrentIndex(targetIndex);
      currentIndexRef.current = targetIndex;
      setIsComplete(targetIndex >= txns.length);

      if (targetIndex > 0) {
        setCurrentTime(new Date(txns[targetIndex - 1].timestamp));
      } else if (txns.length > 0) {
        setCurrentTime(new Date(txns[0].timestamp));
      }
    },
    []
  );

  // Clean up interval on unmount
  useEffect(() => {
    return () => {
      clearPlaybackInterval();
    };
  }, [clearPlaybackInterval]);

  return {
    allTransactions,
    visibleTransactions,
    currentIndex,
    isPlaying,
    speed,
    currentTime,
    isComplete,
    progress,
    startPlayback,
    pausePlayback,
    resumePlayback,
    stopPlayback,
    setSpeed,
    seekTo,
  };
}

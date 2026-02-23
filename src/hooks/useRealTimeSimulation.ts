'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Transaction, PlaybackSpeed } from '@/lib/types';
import { generateTransactions } from '@/lib/generate-data';

interface SimulationState {
  allTransactions: Transaction[];
  visibleTransactions: Transaction[];
  currentIndex: number;
  isPlaying: boolean;
  speed: PlaybackSpeed;
  currentTime: Date | null;
  isComplete: boolean;
  progress: number; // 0-100
}

export function useRealTimeSimulation() {
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [visibleTransactions, setVisibleTransactions] = useState<Transaction[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [speed, setSpeedState] = useState<PlaybackSpeed>(1);
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [isComplete, setIsComplete] = useState<boolean>(false);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const allTransactionsRef = useRef<Transaction[]>([]);
  const currentIndexRef = useRef<number>(0);
  const speedRef = useRef<PlaybackSpeed>(1);
  const isPlayingRef = useRef<boolean>(false);

  // Generate all transactions once on mount and show them all by default
  useEffect(() => {
    const txns = generateTransactions();
    setAllTransactions(txns);
    allTransactionsRef.current = txns;
    setVisibleTransactions(txns);
    setCurrentIndex(txns.length);
    currentIndexRef.current = txns.length;
    if (txns.length > 0) {
      setCurrentTime(new Date(txns[txns.length - 1].timestamp));
    }
    setIsComplete(true);
  }, []);

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
  }, []);

  // Core tick function: adds transactions based on speed
  const tick = useCallback(() => {
    const txns = allTransactionsRef.current;
    const idx = currentIndexRef.current;
    const spd = speedRef.current;

    if (idx >= txns.length) {
      // Playback complete
      clearPlaybackInterval();
      setIsPlaying(false);
      isPlayingRef.current = false;
      setIsComplete(true);
      setVisibleTransactions(txns);
      setCurrentIndex(txns.length);
      currentIndexRef.current = txns.length;
      if (txns.length > 0) {
        setCurrentTime(new Date(txns[txns.length - 1].timestamp));
      }
      return;
    }

    const nextIndex = Math.min(idx + spd, txns.length);
    const nextVisible = txns.slice(0, nextIndex);

    setVisibleTransactions(nextVisible);
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

    setVisibleTransactions([]);
    setCurrentIndex(0);
    currentIndexRef.current = 0;
    setIsComplete(false);
    setIsPlaying(true);
    isPlayingRef.current = true;
    setCurrentTime(new Date(txns[0].timestamp));

    // Delay starting the interval slightly to allow state to settle
    setTimeout(() => {
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
    setVisibleTransactions(txns);
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
      const nextVisible = txns.slice(0, targetIndex);

      setVisibleTransactions(nextVisible);
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

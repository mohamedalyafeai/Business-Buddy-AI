import { useState, useCallback, useRef } from "react";

interface RateLimitConfig {
  maxAttempts: number;
  windowMs: number;
  lockoutMs: number;
}

const DEFAULT_CONFIG: RateLimitConfig = {
  maxAttempts: 5,
  windowMs: 60 * 1000, // 1 minute window
  lockoutMs: 60 * 1000, // 1 minute lockout
};

export function useRateLimit(config: Partial<RateLimitConfig> = {}) {
  const { maxAttempts, windowMs, lockoutMs } = { ...DEFAULT_CONFIG, ...config };
  const attemptsRef = useRef<number[]>([]);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);

  const isLocked = useCallback(() => {
    if (lockedUntil && Date.now() < lockedUntil) {
      return true;
    }
    if (lockedUntil && Date.now() >= lockedUntil) {
      setLockedUntil(null);
      attemptsRef.current = [];
    }
    return false;
  }, [lockedUntil]);

  const getRemainingLockTime = useCallback(() => {
    if (!lockedUntil) return 0;
    return Math.max(0, Math.ceil((lockedUntil - Date.now()) / 1000));
  }, [lockedUntil]);

  const recordAttempt = useCallback((): boolean => {
    if (isLocked()) return false;

    const now = Date.now();
    attemptsRef.current = attemptsRef.current.filter((t) => now - t < windowMs);
    attemptsRef.current.push(now);

    if (attemptsRef.current.length >= maxAttempts) {
      setLockedUntil(now + lockoutMs);
      return false;
    }
    return true;
  }, [isLocked, maxAttempts, windowMs, lockoutMs]);

  const remainingAttempts = Math.max(
    0,
    maxAttempts - attemptsRef.current.filter((t) => Date.now() - t < windowMs).length
  );

  return { isLocked, recordAttempt, getRemainingLockTime, remainingAttempts };
}

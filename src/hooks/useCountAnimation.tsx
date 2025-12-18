import { useState, useEffect, useRef } from 'react';

interface UseCountAnimationOptions {
  duration?: number;
  format?: 'number' | 'currency' | 'percentage' | 'abbreviatedCurrency';
  decimals?: number;
  startOnMount?: boolean;
}

const easeOutCubic = (t: number): number => {
  return 1 - Math.pow(1 - t, 3);
};

export function useCountAnimation(
  targetValue: number,
  options: UseCountAnimationOptions = {}
): number {
  const {
    duration = 1500,
    format = 'number',
    startOnMount = true,
  } = options;

  const [currentValue, setCurrentValue] = useState(startOnMount ? 0 : targetValue);
  const startValueRef = useRef(0);
  const startTimeRef = useRef<number | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const targetValueRef = useRef(targetValue);

  useEffect(() => {
    targetValueRef.current = targetValue;
  }, [targetValue]);

  useEffect(() => {
    if (!startOnMount && currentValue === 0) {
      return;
    }

    const startValue = currentValue;
    const endValue = targetValueRef.current;
    const difference = endValue - startValue;

    if (Math.abs(difference) < 0.01) {
      setCurrentValue(endValue);
      return;
    }

    startValueRef.current = startValue;
    startTimeRef.current = null;

    const animate = (timestamp: number) => {
      if (startTimeRef.current === null) {
        startTimeRef.current = timestamp;
      }

      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easeOutCubic(progress);

      const newValue = startValue + difference * easedProgress;
      setCurrentValue(newValue);

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        setCurrentValue(endValue);
      }
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [targetValue, duration, startOnMount]);

  // Format the value based on the format option
  const formatValue = (value: number): number => {
    if (format === 'percentage') {
      return value;
    }
    return value;
  };

  return formatValue(currentValue);
}


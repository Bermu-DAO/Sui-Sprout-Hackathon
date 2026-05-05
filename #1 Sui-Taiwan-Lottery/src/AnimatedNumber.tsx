import { useEffect, useState, useRef } from 'react';

type AnimatedNumberProps = {
  value: number;
  decimals?: number;
  duration?: number;
};

export function AnimatedNumber({ value, decimals = 0, duration = 800 }: AnimatedNumberProps) {
  const [displayValue, setDisplayValue] = useState(value);
  const startValueRef = useRef(value);
  const targetValueRef = useRef(value);

  useEffect(() => {
    if (value === targetValueRef.current) return;
    
    startValueRef.current = displayValue;
    targetValueRef.current = value;
    
    let startTime: number | null = null;
    let animationFrameId: number;
    
    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // easeOutQuart
      const ease = 1 - Math.pow(1 - progress, 4);
      
      const current = startValueRef.current + (targetValueRef.current - startValueRef.current) * ease;
      setDisplayValue(current);
      
      if (progress < 1) {
        animationFrameId = window.requestAnimationFrame(step);
      } else {
        setDisplayValue(targetValueRef.current);
      }
    };
    
    animationFrameId = window.requestAnimationFrame(step);
    
    return () => {
      window.cancelAnimationFrame(animationFrameId);
    };
  }, [value, duration, displayValue]);

  return <>{displayValue.toFixed(decimals)}</>;
}

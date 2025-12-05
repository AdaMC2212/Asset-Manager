import React, { useEffect, useState, useRef } from "react";

interface CountUpProps {
  end: number;
  duration?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  separator?: string;
  preserveValue?: boolean; // If true, jumps straight to end value without animation on re-renders if value is same
}

export const CountUp: React.FC<CountUpProps> = ({ 
  end, 
  duration = 1500, 
  decimals = 2,
  prefix = "",
  suffix = "",
  separator = ","
}) => {
  const [count, setCount] = useState(0);
  const startTimeRef = useRef<number | null>(null);
  const requestRef = useRef<number | null>(null);

  useEffect(() => {
    startTimeRef.current = null;
    
    const animate = (timestamp: number) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      const progress = timestamp - startTimeRef.current;
      const percentage = Math.min(progress / duration, 1);
      
      // Easing function (easeOutExpo)
      const ease = percentage === 1 ? 1 : 1 - Math.pow(2, -10 * percentage);
      
      setCount(ease * end);

      if (progress < duration) {
        requestRef.current = requestAnimationFrame(animate);
      } else {
        setCount(end);
      }
    };
    
    requestRef.current = requestAnimationFrame(animate);

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [end, duration]);

  const formattedNumber = count.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return <span>{prefix}{formattedNumber}{suffix}</span>;
};
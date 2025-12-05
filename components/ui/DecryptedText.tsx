import React, { useEffect, useState, useRef } from "react";

const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()";

export const DecryptedText = ({ 
  text, 
  className = "",
  speed = 40,
  revealDirection = "start",
  useOriginalCharsOnly = false 
}: { 
  text: string, 
  className?: string,
  speed?: number,
  revealDirection?: "start" | "end" | "center",
  useOriginalCharsOnly?: boolean
}) => {
  const [displayText, setDisplayText] = useState(text);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const iterations = useRef(0);
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (hasAnimated.current && text === displayText) return;
    
    // Reset
    iterations.current = 0;
    
    const animate = () => {
      intervalRef.current = setInterval(() => {
        setDisplayText(prev => 
          text
            .split("")
            .map((letter, index) => {
              if (letter === " ") return " ";
              if (index < iterations.current) {
                return text[index];
              }
              if (useOriginalCharsOnly) {
                 return text[Math.floor(Math.random() * text.length)];
              }
              return letters[Math.floor(Math.random() * letters.length)];
            })
            .join("")
        );

        if (iterations.current >= text.length) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          hasAnimated.current = true;
        }

        iterations.current += 1 / 3;
      }, speed);
    };

    animate();

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [text, speed]);

  return <span className={className}>{displayText}</span>;
};
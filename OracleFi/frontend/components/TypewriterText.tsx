"use client";

import React, { useState, useEffect } from "react";

export function TypewriterText({ 
  text, 
  delay = 0, 
  speed = 50, 
  className = "" 
}: { 
  text: string; 
  delay?: number; 
  speed?: number; 
  className?: string; 
}) {
  const [displayed, setDisplayed] = useState("");
  const [hasPlayed, setHasPlayed] = useState(false);

  useEffect(() => {
    if (hasPlayed) {
      setDisplayed(text);
      return;
    }

    let i = 0;
    const timer = setTimeout(() => {
      const interval = setInterval(() => {
        setDisplayed(text.substring(0, i + 1));
        i++;
        if (i >= text.length) {
          clearInterval(interval);
          setHasPlayed(true);
        }
      }, speed);
      return () => clearInterval(interval);
    }, delay);

    return () => clearTimeout(timer);
  }, [text, delay, speed, hasPlayed]);

  return (
    <span className={className}>
      {displayed}
      {!hasPlayed && (
        <span 
          className="animate-pulse border-r-4 border-current ml-1 opacity-70" 
          style={{ animationDuration: '0.8s' }}
        >
          &nbsp;
        </span>
      )}
    </span>
  );
}

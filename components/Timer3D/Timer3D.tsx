'use client';

import React, { useState, useEffect } from 'react';
import './Timer3D.scss';

interface Timer3DProps {
  digits: string[]; // Array of 6 digit characters ['0', '0', '0', '0', '0', '0']
  color?: string;   // Timer color (hex)
}

const TOTAL_BLOCKS = 94;
const DEFAULT_DIGITS = ['0', '0', '0', '0', '0', '0'];
const DEFAULT_COLOR = '#74d447';

export const Timer3D: React.FC<Timer3DProps> = ({ digits, color = DEFAULT_COLOR }) => {
  // Use mounted state to avoid hydration mismatch with time-based values
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  // Use default digits during SSR, actual digits after mount
  const displayDigits = mounted ? digits : DEFAULT_DIGITS;
  
  // Ensure we always have 6 digits
  const normalizedDigits = displayDigits.slice(0, 6).map((d) => d || '0');
  while (normalizedDigits.length < 6) {
    normalizedDigits.unshift('0');
  }

  return (
    <div 
      className="timer-container"
      style={{ '--timer-color': color } as React.CSSProperties}
    >
      {/* Digit elements - these control which blocks are visible via CSS sibling selectors */}
      {normalizedDigits.map((digit, index) => (
        <div key={`digit-${index}`} className={`digit _${digit}`} />
      ))}
      
      {/* Surface containing all 3D blocks */}
      <div className="surface">
        {Array.from({ length: TOTAL_BLOCKS }, (_, i) => (
          <div key={`block-${i + 1}`} className={`block b${i + 1}`}>
            <div className="block-outer">
              <div className="block-inner">
                <div className="bottom" />
                <div className="front" />
                <div className="left" />
                <div className="right" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Timer3D;

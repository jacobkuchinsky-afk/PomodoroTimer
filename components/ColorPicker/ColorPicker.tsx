'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import './ColorPicker.scss';

interface ColorPickerProps {
  color: string;
  onChange: (color: string) => void;
}

const PRESET_COLORS = [
  '#74d447', // Green (default)
  '#47d4a4', // Teal
  '#47b0d4', // Cyan
  '#4787d4', // Blue
  '#7447d4', // Purple
  '#d447c9', // Magenta
  '#d44747', // Red
  '#d47447', // Orange
  '#d4a447', // Gold
  '#d4d447', // Yellow
  '#a4d447', // Lime
  '#ffffff', // White
];

// Convert hex to HSV
function hexToHsv(hex: string): { h: number; s: number; v: number } {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;

  let h = 0;
  const s = max === 0 ? 0 : d / max;
  const v = max;

  if (d !== 0) {
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return { h: h * 360, s: s * 100, v: v * 100 };
}

// Convert HSV to hex
function hsvToHex(h: number, s: number, v: number): string {
  s /= 100;
  v /= 100;
  h /= 360;

  const i = Math.floor(h * 6);
  const f = h * 6 - i;
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);

  let r = 0, g = 0, b = 0;
  switch (i % 6) {
    case 0: r = v; g = t; b = p; break;
    case 1: r = q; g = v; b = p; break;
    case 2: r = p; g = v; b = t; break;
    case 3: r = p; g = q; b = v; break;
    case 4: r = t; g = p; b = v; break;
    case 5: r = v; g = p; b = q; break;
  }

  const toHex = (x: number) => Math.round(x * 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export const ColorPicker: React.FC<ColorPickerProps> = ({ color, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [hsv, setHsv] = useState(() => hexToHsv(color));
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const gradientRef = useRef<HTMLDivElement>(null);
  const hueRef = useRef<HTMLDivElement>(null);
  const isDraggingGradient = useRef(false);
  const isDraggingHue = useRef(false);

  // Update HSV when color prop changes
  useEffect(() => {
    setHsv(hexToHsv(color));
  }, [color]);

  // Calculate dropdown position when opened
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 12,
        left: rect.left + rect.width / 2,
      });
    }
  }, [isOpen]);

  // Close picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const isOutsideButton = buttonRef.current && !buttonRef.current.contains(target);
      const isOutsideDropdown = dropdownRef.current && !dropdownRef.current.contains(target);
      
      if (isOutsideButton && isOutsideDropdown) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const updateColor = useCallback((newHsv: { h: number; s: number; v: number }) => {
    setHsv(newHsv);
    const hex = hsvToHex(newHsv.h, newHsv.s, newHsv.v);
    onChange(hex);
  }, [onChange]);

  const handleGradientInteraction = useCallback((clientX: number, clientY: number) => {
    if (!gradientRef.current) return;
    const rect = gradientRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
    updateColor({ ...hsv, s: x * 100, v: (1 - y) * 100 });
  }, [hsv, updateColor]);

  const handleHueInteraction = useCallback((clientX: number) => {
    if (!hueRef.current) return;
    const rect = hueRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    updateColor({ ...hsv, h: x * 360 });
  }, [hsv, updateColor]);

  // Mouse event handlers
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingGradient.current) {
        handleGradientInteraction(e.clientX, e.clientY);
      } else if (isDraggingHue.current) {
        handleHueInteraction(e.clientX);
      }
    };

    const handleMouseUp = () => {
      isDraggingGradient.current = false;
      isDraggingHue.current = false;
    };

    if (isOpen) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isOpen, handleGradientInteraction, handleHueInteraction]);

  // Touch event handlers
  useEffect(() => {
    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 0) return;
      const touch = e.touches[0];
      if (isDraggingGradient.current) {
        e.preventDefault();
        handleGradientInteraction(touch.clientX, touch.clientY);
      } else if (isDraggingHue.current) {
        e.preventDefault();
        handleHueInteraction(touch.clientX);
      }
    };

    const handleTouchEnd = () => {
      isDraggingGradient.current = false;
      isDraggingHue.current = false;
    };

    if (isOpen) {
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('touchend', handleTouchEnd);
    }

    return () => {
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isOpen, handleGradientInteraction, handleHueInteraction]);

  const handleColorSelect = (newColor: string) => {
    onChange(newColor);
    setHsv(hexToHsv(newColor));
  };

  const handleCircleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(!isOpen);
  };

  const handleGradientMouseDown = (e: React.MouseEvent) => {
    isDraggingGradient.current = true;
    handleGradientInteraction(e.clientX, e.clientY);
  };

  const handleGradientTouchStart = (e: React.TouchEvent) => {
    isDraggingGradient.current = true;
    const touch = e.touches[0];
    handleGradientInteraction(touch.clientX, touch.clientY);
  };

  const handleHueMouseDown = (e: React.MouseEvent) => {
    isDraggingHue.current = true;
    handleHueInteraction(e.clientX);
  };

  const handleHueTouchStart = (e: React.TouchEvent) => {
    isDraggingHue.current = true;
    const touch = e.touches[0];
    handleHueInteraction(touch.clientX);
  };

  const hueColor = hsvToHex(hsv.h, 100, 100);

  return (
    <div className="color-picker">
      <button
        ref={buttonRef}
        className="color-circle"
        style={{ backgroundColor: color }}
        onClick={handleCircleClick}
        title="Change timer color"
        aria-label="Change timer color"
      />
      
      {isOpen && (
        <div
          ref={dropdownRef}
          className="color-dropdown"
          style={{
            position: 'fixed',
            top: dropdownPosition.top,
            left: dropdownPosition.left,
            transform: 'translateX(-50%)',
          }}
        >
          {/* Saturation/Brightness gradient */}
          <div
            ref={gradientRef}
            className="color-gradient"
            style={{ backgroundColor: hueColor }}
            onMouseDown={handleGradientMouseDown}
            onTouchStart={handleGradientTouchStart}
          >
            <div className="gradient-white" />
            <div className="gradient-black" />
            <div
              className="gradient-cursor"
              style={{
                left: `${hsv.s}%`,
                top: `${100 - hsv.v}%`,
                backgroundColor: color,
              }}
            />
          </div>

          {/* Hue slider */}
          <div
            ref={hueRef}
            className="hue-slider"
            onMouseDown={handleHueMouseDown}
            onTouchStart={handleHueTouchStart}
          >
            <div
              className="hue-cursor"
              style={{ left: `${(hsv.h / 360) * 100}%` }}
            />
          </div>

          {/* Preset colors */}
          <div className="color-presets">
            {PRESET_COLORS.map((presetColor) => (
              <button
                key={presetColor}
                className={`color-option ${color.toLowerCase() === presetColor.toLowerCase() ? 'selected' : ''}`}
                style={{ backgroundColor: presetColor }}
                onClick={() => handleColorSelect(presetColor)}
                aria-label={`Select color ${presetColor}`}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ColorPicker;

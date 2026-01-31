'use client';

import React from 'react';
import { Preset, DEFAULT_TIMER_COLOR } from '@/lib/presets';
import { ColorPicker } from '@/components/ColorPicker';
import './PresetTabs.scss';

interface PresetTabsProps {
  presets: Preset[];
  activePresetId: string | null;
  selectedPresetId: string | null;
  onSelectPreset: (presetId: string) => void;
  onAddPreset: () => void;
  onColorChange?: (presetId: string, color: string) => void;
}

// Calculate total duration of all phases in a preset
function getTotalDuration(preset: Preset): number {
  if (!preset.phases || preset.phases.length === 0) {
    return 0;
  }
  return preset.phases.reduce((sum, phase) => sum + phase.durationMinutes, 0);
}

export const PresetTabs: React.FC<PresetTabsProps> = ({
  presets,
  activePresetId,
  selectedPresetId,
  onSelectPreset,
  onAddPreset,
  onColorChange,
}) => {
  return (
    <div className="preset-tabs">
      <div className="tabs-container">
        {presets.map((preset) => (
          <div
            key={preset.id}
            className={`preset-tab ${
              selectedPresetId === preset.id ? 'selected' : ''
            } ${activePresetId === preset.id ? 'active' : ''}`}
          >
            <button
              className="tab-content"
              onClick={() => onSelectPreset(preset.id)}
            >
              <span className="tab-name">{preset.name}</span>
              <span className="tab-duration">
                {preset.phases?.length || 0} phase{preset.phases?.length !== 1 ? 's' : ''} · {getTotalDuration(preset)}m total
              </span>
            </button>
            <div className="tab-color-picker">
              <ColorPicker
                color={preset.color || DEFAULT_TIMER_COLOR}
                onChange={(color) => onColorChange?.(preset.id, color)}
              />
            </div>
            {activePresetId === preset.id && (
              <span className="active-indicator" title="Currently active">
                ●
              </span>
            )}
          </div>
        ))}
        <button className="preset-tab add-tab" onClick={onAddPreset}>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="add-icon"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          New
        </button>
      </div>
    </div>
  );
};

export default PresetTabs;

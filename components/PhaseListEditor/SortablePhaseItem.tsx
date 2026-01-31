'use client';

import React, { useState, useEffect } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Phase } from '@/lib/presets';
import './PhaseListEditor.scss';

interface SortablePhaseItemProps {
  phase: Phase;
  index: number;
  onUpdate: (updates: Partial<Phase>) => void;
  onDelete: () => void;
  canDelete: boolean;
  disabled?: boolean;
}

const DEFAULT_DURATION = 25;

export const SortablePhaseItem: React.FC<SortablePhaseItemProps> = ({
  phase,
  index,
  onUpdate,
  onDelete,
  canDelete,
  disabled = false,
}) => {
  const [showStartTime, setShowStartTime] = useState(!!phase.startTime);
  const [durationValue, setDurationValue] = useState(String(phase.durationMinutes));

  // Sync local state when phase prop changes
  useEffect(() => {
    setDurationValue(String(phase.durationMinutes));
  }, [phase.durationMinutes]);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: phase.id, disabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleToggleStartTime = () => {
    if (showStartTime) {
      onUpdate({ startTime: undefined });
    }
    setShowStartTime(!showStartTime);
  };

  const handleDurationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Allow any input while typing (including empty)
    setDurationValue(e.target.value);
  };

  const handleDurationBlur = () => {
    // On blur, validate and apply default if empty/invalid
    const parsed = parseInt(durationValue, 10);
    if (isNaN(parsed) || parsed < 1) {
      setDurationValue(String(DEFAULT_DURATION));
      onUpdate({ durationMinutes: DEFAULT_DURATION });
    } else {
      const clamped = Math.min(180, parsed);
      setDurationValue(String(clamped));
      onUpdate({ durationMinutes: clamped });
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`phase-item ${isDragging ? 'dragging' : ''}`}
    >
      <div className="phase-item-main">
        <button
          type="button"
          className="drag-handle"
          {...attributes}
          {...listeners}
          disabled={disabled}
        >
          <svg
            viewBox="0 0 24 24"
            fill="currentColor"
            width="20"
            height="20"
          >
            <circle cx="9" cy="6" r="1.5" />
            <circle cx="15" cy="6" r="1.5" />
            <circle cx="9" cy="12" r="1.5" />
            <circle cx="15" cy="12" r="1.5" />
            <circle cx="9" cy="18" r="1.5" />
            <circle cx="15" cy="18" r="1.5" />
          </svg>
        </button>

        <span className="phase-number">{index + 1}</span>

        <input
          type="text"
          className="phase-name-input"
          value={phase.name}
          onChange={(e) => onUpdate({ name: e.target.value })}
          placeholder="Phase name (e.g., Lock in time)"
          disabled={disabled}
          maxLength={30}
        />

        <div className="duration-wrapper">
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            className="phase-duration-input"
            value={durationValue}
            onChange={handleDurationChange}
            onBlur={handleDurationBlur}
            disabled={disabled}
          />
          <span className="duration-suffix">min</span>
        </div>

        <button
          type="button"
          className={`time-toggle-btn ${showStartTime ? 'active' : ''}`}
          onClick={handleToggleStartTime}
          disabled={disabled}
          title={showStartTime ? 'Remove start time' : 'Add start time'}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        </button>

        {canDelete && (
          <button
            type="button"
            className="delete-phase-btn"
            onClick={onDelete}
            disabled={disabled}
            title="Delete phase"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>

      {showStartTime && (
        <div className="phase-start-time">
          <label>Start at:</label>
          <input
            type="time"
            value={phase.startTime || ''}
            onChange={(e) => onUpdate({ startTime: e.target.value })}
            disabled={disabled}
          />
        </div>
      )}
    </div>
  );
};

export default SortablePhaseItem;

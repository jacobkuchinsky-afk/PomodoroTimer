'use client';

import React from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Phase, generatePhaseId } from '@/lib/presets';
import { SortablePhaseItem } from './SortablePhaseItem';
import './PhaseListEditor.scss';

interface PhaseListEditorProps {
  phases: Phase[];
  onChange: (phases: Phase[]) => void;
  disabled?: boolean;
}

export const PhaseListEditor: React.FC<PhaseListEditorProps> = ({
  phases,
  onChange,
  disabled = false,
}) => {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = phases.findIndex((p) => p.id === active.id);
      const newIndex = phases.findIndex((p) => p.id === over.id);

      const newPhases = arrayMove(phases, oldIndex, newIndex).map(
        (phase, index) => ({
          ...phase,
          order: index,
        })
      );

      onChange(newPhases);
    }
  };

  const handleAddPhase = () => {
    const newPhase: Phase = {
      id: generatePhaseId(),
      name: '',
      durationMinutes: 25,
      order: phases.length,
    };
    onChange([...phases, newPhase]);
  };

  const handleUpdatePhase = (id: string, updates: Partial<Phase>) => {
    const newPhases = phases.map((phase) =>
      phase.id === id ? { ...phase, ...updates } : phase
    );
    onChange(newPhases);
  };

  const handleDeletePhase = (id: string) => {
    if (phases.length <= 1) {
      return; // Keep at least one phase
    }
    const newPhases = phases
      .filter((phase) => phase.id !== id)
      .map((phase, index) => ({ ...phase, order: index }));
    onChange(newPhases);
  };

  return (
    <div className="phase-list-editor">
      <div className="phase-list-header">
        <label>Timer Phases</label>
        <span className="phase-hint">Drag to reorder</span>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={phases.map((p) => p.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="phases-list">
            {phases.map((phase, index) => (
              <SortablePhaseItem
                key={phase.id}
                phase={phase}
                index={index}
                onUpdate={(updates) => handleUpdatePhase(phase.id, updates)}
                onDelete={() => handleDeletePhase(phase.id)}
                canDelete={phases.length > 1}
                disabled={disabled}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <button
        type="button"
        className="add-phase-btn"
        onClick={handleAddPhase}
        disabled={disabled}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        Add Phase
      </button>
    </div>
  );
};

export default PhaseListEditor;

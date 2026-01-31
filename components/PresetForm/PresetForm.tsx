'use client';

import React, { useState, useEffect } from 'react';
import { Preset, Phase, createDefaultPhases } from '@/lib/presets';
import { PhaseListEditor } from '@/components/PhaseListEditor';
import './PresetForm.scss';

interface PresetFormProps {
  preset: Preset | null;
  isNew: boolean;
  onSave: (data: {
    name: string;
    phases: Phase[];
    loopPhases: boolean;
  }) => Promise<void>;
  onDelete?: () => Promise<void>;
  onSetActive?: () => Promise<void>;
  isActive?: boolean;
  loading?: boolean;
}

export const PresetForm: React.FC<PresetFormProps> = ({
  preset,
  isNew,
  onSave,
  onDelete,
  onSetActive,
  isActive,
  loading = false,
}) => {
  const [name, setName] = useState('');
  const [phases, setPhases] = useState<Phase[]>(createDefaultPhases());
  const [loopPhases, setLoopPhases] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  // Update form when preset changes
  useEffect(() => {
    if (preset) {
      setName(preset.name);
      setPhases(preset.phases && preset.phases.length > 0 ? preset.phases : createDefaultPhases());
      setLoopPhases(preset.loopPhases ?? false);
    } else if (isNew) {
      setName('');
      setPhases(createDefaultPhases());
      setLoopPhases(false);
    }
    setError('');
  }, [preset, isNew]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Please enter a preset name');
      return;
    }

    if (phases.length === 0) {
      setError('Please add at least one phase');
      return;
    }

    // Validate each phase
    for (const phase of phases) {
      if (!phase.name.trim()) {
        setError('Please enter a name for each phase');
        return;
      }
      if (phase.durationMinutes < 1 || phase.durationMinutes > 180) {
        setError('Phase duration must be between 1 and 180 minutes');
        return;
      }
    }

    setSaving(true);
    try {
      await onSave({
        name: name.trim(),
        phases,
        loopPhases,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save preset');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    if (!confirm('Are you sure you want to delete this preset?')) return;
    
    setSaving(true);
    try {
      await onDelete();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete preset');
    } finally {
      setSaving(false);
    }
  };

  const isDisabled = loading || saving;

  return (
    <form className="preset-form" onSubmit={handleSubmit}>
      <h2>{isNew ? 'Create New Preset' : 'Edit Preset'}</h2>

      <div className="input-group">
        <label htmlFor="preset-name">Preset Name</label>
        <input
          id="preset-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Deep Work"
          disabled={isDisabled}
          maxLength={30}
        />
      </div>

      <PhaseListEditor
        phases={phases}
        onChange={setPhases}
        disabled={isDisabled}
      />

      <div className="loop-group">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={loopPhases}
            onChange={(e) => setLoopPhases(e.target.checked)}
            disabled={isDisabled}
          />
          <span className="toggle-switch" />
          <span>Loop phases after completion</span>
        </label>
        <p className="loop-hint">
          {loopPhases
            ? 'Timer will restart from the first phase when all phases complete'
            : 'Timer will stop after the last phase completes'}
        </p>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="form-actions">
        <button
          type="submit"
          className="save-button"
          disabled={isDisabled}
        >
          {saving ? 'Saving...' : isNew ? 'Create Preset' : 'Save Changes'}
        </button>

        {!isNew && onSetActive && (
          <button
            type="button"
            className={`activate-button ${isActive ? 'is-active' : ''}`}
            onClick={onSetActive}
            disabled={isDisabled || isActive}
          >
            {isActive ? 'Currently Active' : 'Set as Active'}
          </button>
        )}

        {!isNew && onDelete && (
          <button
            type="button"
            className="delete-button"
            onClick={handleDelete}
            disabled={isDisabled}
          >
            Delete
          </button>
        )}
      </div>
    </form>
  );
};

export default PresetForm;

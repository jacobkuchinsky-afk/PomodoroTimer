'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { PresetTabs } from '@/components/PresetTabs';
import { PresetForm } from '@/components/PresetForm';
import { SignupButton } from '@/components/SignupButton';
import {
  Preset,
  Phase,
  getPresets,
  createPreset,
  updatePreset,
  deletePreset,
  setActivePreset,
  getUserSettings,
  createDefaultPhases,
  setSyncTimerState,
} from '@/lib/presets';
import './settings.scss';

export default function SettingsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  
  const [presets, setPresets] = useState<Preset[]>([]);
  const [activePresetId, setActivePresetId] = useState<string | null>(null);
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [loading, setLoading] = useState(true);
  const [syncEnabled, setSyncEnabled] = useState(false);

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth');
    }
  }, [user, authLoading, router]);

  // Load presets and user settings
  useEffect(() => {
    if (!user) return;

    const loadData = async () => {
      setLoading(true);
      try {
        const [fetchedPresets, settings] = await Promise.all([
          getPresets(user.uid),
          getUserSettings(user.uid),
        ]);
        setPresets(fetchedPresets);
        setActivePresetId(settings.activePresetId);
        setSyncEnabled(settings.syncTimerState);
        
        // Select first preset or active preset by default
        if (fetchedPresets.length > 0) {
          const defaultSelect =
            settings.activePresetId &&
            fetchedPresets.find((p) => p.id === settings.activePresetId)
              ? settings.activePresetId
              : fetchedPresets[0].id;
          setSelectedPresetId(defaultSelect);
        }
      } catch (error) {
        console.error('Failed to load presets:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user]);

  const selectedPreset = presets.find((p) => p.id === selectedPresetId) || null;

  const handleSelectPreset = (presetId: string) => {
    setSelectedPresetId(presetId);
    setIsCreatingNew(false);
  };

  const handleAddPreset = () => {
    setSelectedPresetId(null);
    setIsCreatingNew(true);
  };

  const handleSavePreset = async (data: {
    name: string;
    phases: Phase[];
    loopPhases: boolean;
  }) => {
    if (!user) return;

    if (isCreatingNew) {
      // Create new preset
      const newOrder = presets.length;
      const newId = await createPreset(user.uid, { 
        ...data, 
        order: newOrder,
      });
      
      // Refresh presets
      const updatedPresets = await getPresets(user.uid);
      setPresets(updatedPresets);
      setSelectedPresetId(newId);
      setIsCreatingNew(false);
      
      // If this is the first preset, set it as active
      if (presets.length === 0) {
        await setActivePreset(user.uid, newId);
        setActivePresetId(newId);
      }
    } else if (selectedPresetId) {
      // Update existing preset
      await updatePreset(user.uid, selectedPresetId, data);
      
      // Refresh presets
      const updatedPresets = await getPresets(user.uid);
      setPresets(updatedPresets);
    }
  };

  const handleDeletePreset = async () => {
    if (!user || !selectedPresetId) return;

    await deletePreset(user.uid, selectedPresetId);
    
    // If we deleted the active preset, clear it
    if (selectedPresetId === activePresetId) {
      await setActivePreset(user.uid, null);
      setActivePresetId(null);
    }
    
    // Refresh presets
    const updatedPresets = await getPresets(user.uid);
    setPresets(updatedPresets);
    
    // Select another preset or show create form
    if (updatedPresets.length > 0) {
      setSelectedPresetId(updatedPresets[0].id);
    } else {
      setSelectedPresetId(null);
      setIsCreatingNew(true);
    }
  };

  const handleSetActive = async () => {
    if (!user || !selectedPresetId) return;
    
    await setActivePreset(user.uid, selectedPresetId);
    setActivePresetId(selectedPresetId);
  };

  const handleColorChange = async (presetId: string, color: string) => {
    if (!user) return;
    
    // Update the preset color in Firebase
    await updatePreset(user.uid, presetId, { color });
    
    // Refresh presets
    const updatedPresets = await getPresets(user.uid);
    setPresets(updatedPresets);
  };

  const handleSyncToggle = async () => {
    if (!user) return;
    
    const newValue = !syncEnabled;
    setSyncEnabled(newValue);
    await setSyncTimerState(user.uid, newValue);
  };

  // Show loading state while checking auth
  if (authLoading || loading) {
    return (
      <div className="settings-loading">
        <div className="loader" />
      </div>
    );
  }

  // Don't render if user is not logged in (will redirect)
  if (!user) {
    return null;
  }

  return (
    <div className="settings-page">
      <Link href="/" className="back-link">
        ← Back to Timer
      </Link>
      
      <SignupButton />
      
      <div className="settings-container">
        <h1>Timer Presets</h1>
        <p className="settings-description">
          Create and manage your Pomodoro timer presets. Set one as active to use it on the home screen.
        </p>
        
        <PresetTabs
          presets={presets}
          activePresetId={activePresetId}
          selectedPresetId={isCreatingNew ? null : selectedPresetId}
          onSelectPreset={handleSelectPreset}
          onAddPreset={handleAddPreset}
          onColorChange={handleColorChange}
        />
        
        {(isCreatingNew || selectedPreset || presets.length === 0) && (
          <PresetForm
            preset={selectedPreset}
            isNew={isCreatingNew || presets.length === 0}
            onSave={handleSavePreset}
            onDelete={selectedPreset ? handleDeletePreset : undefined}
            onSetActive={selectedPreset ? handleSetActive : undefined}
            isActive={selectedPresetId === activePresetId}
            loading={loading}
          />
        )}
        
        {presets.length === 0 && !isCreatingNew && (
          <div className="no-presets">
            <p>You don&apos;t have any presets yet.</p>
            <p>Create your first preset to get started!</p>
          </div>
        )}
        
        <div className="sync-settings">
          <h2>Timer Sync</h2>
          <div className="sync-toggle-container">
            <div className="sync-info">
              <h3>Cloud Sync</h3>
              <p>Keep your timer state synced across devices. Your timer will persist even if you close the browser completely.</p>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={syncEnabled}
                onChange={handleSyncToggle}
              />
              <span className="toggle-slider" />
            </label>
          </div>
          <p className="sync-note">
            Timer state is always saved locally in your browser. Enable cloud sync for cross-device persistence.
          </p>
        </div>
      </div>
    </div>
  );
}

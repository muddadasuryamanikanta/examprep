import { useState, useEffect } from 'react';
import { FSRSPresetService, type FSRSPreset } from '@/services/FSRSPresetService';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/UI/Input';
import { Plus, Settings, Star, Trash2, Save, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function FSRSPresetSettings() {
    const [presets, setPresets] = useState<FSRSPreset[]>([]);
    const [selectedPreset, setSelectedPreset] = useState<FSRSPreset | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadPresets();
    }, []);

    const loadPresets = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await FSRSPresetService.list();
            setPresets(data);
            if (data.length > 0 && !selectedPreset) {
                setSelectedPreset(data.find(p => p.isDefault) || data[0]);
            }
        } catch (err) {
            setError('Failed to load presets');
            console.error('Failed to load presets:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateNew = () => {
        const newPreset = {
            ...FSRSPresetService.getDefaultValues(),
            _id: 'new',
            userId: '',
            isDefault: false,
            w: Array(17).fill(0),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        } as FSRSPreset;
        setSelectedPreset(newPreset);
    };

    const handleSetDefault = async (presetId: string) => {
        try {
            await FSRSPresetService.setAsDefault(presetId);
            await loadPresets();
        } catch (err) {
            console.error('Failed to set default:', err);
        }
    };

    const handleDelete = async (presetId: string) => {
        if (!confirm('Are you sure you want to delete this preset?')) return;
        
        try {
            await FSRSPresetService.delete(presetId);
            setSelectedPreset(null);
            await loadPresets();
        } catch (err) {
            console.error('Failed to delete preset:', err);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <p className="text-muted-foreground">Loading presets...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold">FSRS Presets</h1>
                    <p className="text-muted-foreground mt-2">
                        Manage your spaced repetition scheduling parameters
                    </p>
                </div>

                {error && (
                    <div className="mb-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center gap-2 text-destructive">
                        <AlertCircle className="w-5 h-5" />
                        <span>{error}</span>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Preset List */}
                    <div className="lg:col-span-1">
                        <div className="bg-card rounded-lg border border-border p-4">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-lg font-semibold">Your Presets</h2>
                                <Button size="sm" onClick={handleCreateNew}>
                                    <Plus className="w-4 h-4" />
                                </Button>
                            </div>

                            <div className="space-y-2">
                                {presets.length === 0 ? (
                                    <p className="text-sm text-muted-foreground text-center py-4">
                                        No presets found
                                    </p>
                                ) : (
                                    presets.map(preset => (
                                        <div
                                            key={preset._id}
                                            className={cn(
                                                "p-3 rounded-lg cursor-pointer transition-colors",
                                                selectedPreset?._id === preset._id
                                                    ? "bg-primary/10 border border-primary"
                                                    : "hover:bg-secondary border border-transparent"
                                            )}
                                            onClick={() => setSelectedPreset(preset)}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex-1">
                                                    <div className="font-medium">{preset.name}</div>
                                                    <div className="text-xs text-muted-foreground mt-1">
                                                        Retention: {(preset.requestRetention * 100).toFixed(0)}%
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {preset.isDefault && (
                                                        <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                                                    )}
                                                    {preset.isGlobal && (
                                                        <span className="text-xs px-2 py-0.5 rounded bg-blue-500/20 text-blue-400">
                                                            Global
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Preset Editor */}
                    <div className="lg:col-span-2">
                        {selectedPreset ? (
                            <PresetEditor
                                preset={selectedPreset}
                                onSave={loadPresets}
                                onSetDefault={handleSetDefault}
                                onDelete={handleDelete}
                            />
                        ) : (
                            <div className="bg-card rounded-lg border border-border p-12 text-center">
                                <Settings className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                                <p className="text-muted-foreground">
                                    Select a preset to edit or create a new one
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

// Preset Editor Component
interface PresetEditorProps {
    preset: FSRSPreset;
    onSave: () => void;
    onSetDefault: (id: string) => void;
    onDelete: (id: string) => void;
}

function PresetEditor({ preset, onSave, onSetDefault, onDelete }: PresetEditorProps) {
    const [formData, setFormData] = useState(preset);
    const [saving, setSaving] = useState(false);
    const isNew = preset._id === 'new';

    const handleSave = async () => {
        setSaving(true);
        try {
            if (isNew) {
                await FSRSPresetService.create(formData);
            } else {
                await FSRSPresetService.update(preset._id, formData);
            }
            onSave();
        } catch (error) {
            console.error('Failed to save:', error);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="bg-card rounded-lg border border-border p-6 space-y-6">
            {/* Header */}
            <div className="flex justify-between items-start">
                <div className="flex-1">
                    <Input
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        disabled={preset.isGlobal}
                        placeholder="Preset Name"
                        className="text-2xl font-bold border-none px-0 focus-visible:ring-0"
                    />
                    <Input
                        value={formData.description || ''}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        disabled={preset.isGlobal}
                        placeholder="Description (optional)"
                        className="text-sm text-muted-foreground border-none px-0 mt-2 focus-visible:ring-0"
                    />
                </div>

                <div className="flex gap-2">
                    {!preset.isDefault && !preset.isGlobal && !isNew && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onSetDefault(preset._id)}
                        >
                            <Star className="w-4 h-4 mr-2" />
                            Set as Default
                        </Button>
                    )}
                </div>
            </div>

            {/* Basic Settings */}
            <div className="space-y-4">
                {/* Retention Target */}
                <div>
                    <div className="flex justify-between items-center mb-2">
                        <label className="text-sm font-medium">Target Retention</label>
                        <span className="text-sm font-bold text-primary">
                            {(formData.requestRetention * 100).toFixed(0)}%
                        </span>
                    </div>
                    <input
                        type="range"
                        value={formData.requestRetention * 100}
                        onChange={(e) => setFormData({
                            ...formData,
                            requestRetention: Number(e.target.value) / 100
                        })}
                        min={70}
                        max={99}
                        step={1}
                        disabled={preset.isGlobal}
                        className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                        Higher = more reviews, better retention. Recommended: 85-95%
                    </p>
                </div>

                {/* Maximum Interval */}
                <div>
                    <div className="flex justify-between items-center mb-2">
                        <label className="text-sm font-medium">Maximum Interval (days)</label>
                        <span className="text-sm font-bold text-primary">
                            {formData.maximumInterval}
                        </span>
                    </div>
                    <input
                        type="range"
                        value={Math.log10(formData.maximumInterval)}
                        onChange={(e) => setFormData({
                            ...formData,
                            maximumInterval: Math.round(Math.pow(10, Number(e.target.value)))
                        })}
                        min={2}
                        max={4.5}
                        step={0.1}
                        disabled={preset.isGlobal}
                        className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                        Cards won't be scheduled beyond this interval
                    </p>
                </div>

                {/* Learning Steps */}
                <div>
                    <label className="text-sm font-medium">Learning Steps (minutes)</label>
                    <div className="flex gap-2 mt-2">
                        {formData.learningSteps.map((step, idx) => (
                            <Input
                                key={idx}
                                type="number"
                                value={step}
                                onChange={(e) => {
                                    const newSteps = [...formData.learningSteps];
                                    newSteps[idx] = Number(e.target.value);
                                    setFormData({ ...formData, learningSteps: newSteps });
                                }}
                                disabled={preset.isGlobal}
                                className="w-24"
                                min={1}
                                max={1439}
                            />
                        ))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                        New cards progress through these intervals
                    </p>
                </div>

                {/* Graduating & Easy Intervals */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-sm font-medium">Graduating Interval (days)</label>
                        <Input
                            type="number"
                            value={formData.graduatingInterval}
                            onChange={(e) => setFormData({
                                ...formData,
                                graduatingInterval: Number(e.target.value)
                            })}
                            disabled={preset.isGlobal}
                            min={1}
                            className="mt-2"
                        />
                    </div>
                    <div>
                        <label className="text-sm font-medium">Easy Interval (days)</label>
                        <Input
                            type="number"
                            value={formData.easyInterval}
                            onChange={(e) => setFormData({
                                ...formData,
                                easyInterval: Number(e.target.value)
                            })}
                            disabled={preset.isGlobal}
                            min={1}
                            className="mt-2"
                        />
                    </div>
                </div>
            </div>

            {/* Advanced Settings */}
            <details className="border-t pt-4">
                <summary className="cursor-pointer font-medium text-sm text-muted-foreground hover:text-foreground mb-4">
                    Advanced Settings
                </summary>
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <label className="text-sm font-medium">Enable Fuzz (interval randomization)</label>
                        <input
                            type="checkbox"
                            checked={formData.enableFuzz}
                            onChange={(e) => setFormData({ ...formData, enableFuzz: e.target.checked })}
                            disabled={preset.isGlobal}
                            className="w-4 h-4 accent-primary"
                        />
                    </div>
                    <div className="flex items-center justify-between">
                        <label className="text-sm font-medium">Enable Short-term Scheduling</label>
                        <input
                            type="checkbox"
                            checked={formData.enableShortTerm}
                            onChange={(e) => setFormData({ ...formData, enableShortTerm: e.target.checked })}
                            disabled={preset.isGlobal}
                            className="w-4 h-4 accent-primary"
                        />
                    </div>
                </div>
            </details>

            {/* Actions */}
            {!preset.isGlobal && (
                <div className="flex justify-end gap-3 border-t pt-4">
                    {!isNew && (
                        <Button
                            variant="destructive"
                            disabled={saving}
                            onClick={() => onDelete(preset._id)}
                        >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                        </Button>
                    )}
                    <Button onClick={handleSave} disabled={saving}>
                        <Save className="w-4 h-4 mr-2" />
                        {saving ? 'Saving...' : isNew ? 'Create Preset' : 'Save Changes'}
                    </Button>
                </div>
            )}
        </div>
    );
}

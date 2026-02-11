import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Pencil, Plus, Trash2, Check, X } from 'lucide-react';
import { useShiftPresets, useUpdateShiftPresets, type ShiftPreset } from '@/hooks/useShiftPresets';
import { useToast } from '@/hooks/use-toast';

interface ShiftModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeName: string;
  dateLabel: string;
  initialStart?: string;
  initialEnd?: string;
  isEdit?: boolean;
  onSave: (start: string, end: string) => void;
}

export function ShiftModal({
  open,
  onOpenChange,
  employeeName,
  dateLabel,
  initialStart = '09:00',
  initialEnd = '17:00',
  isEdit = false,
  onSave,
}: ShiftModalProps) {
  const [start, setStart] = useState(initialStart);
  const [end, setEnd] = useState(initialEnd);
  const [error, setError] = useState('');
  const [editingPresets, setEditingPresets] = useState(false);
  const [editPresets, setEditPresets] = useState<ShiftPreset[]>([]);
  const [newPreset, setNewPreset] = useState<ShiftPreset>({ label: '', start: '08:00', end: '17:00' });

  const { data: presets = [] } = useShiftPresets();
  const updatePresets = useUpdateShiftPresets();
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      setStart(initialStart);
      setEnd(initialEnd);
      setError('');
      setEditingPresets(false);
    }
  }, [open, initialStart, initialEnd]);

  const handleSave = () => {
    const startMin = timeToMin(start);
    const endMin = timeToMin(end);
    if (endMin <= startMin) {
      setError('שעת סיום חייבת להיות אחרי שעת התחלה');
      return;
    }
    onSave(start, end);
    onOpenChange(false);
  };

  const startEditPresets = () => {
    setEditPresets([...presets]);
    setEditingPresets(true);
  };

  const savePresets = () => {
    updatePresets.mutate(editPresets, {
      onSuccess: () => {
        setEditingPresets(false);
        toast({ title: 'האפשרויות עודכנו בהצלחה' });
      },
    });
  };

  const addPreset = () => {
    if (!newPreset.label.trim()) return;
    setEditPresets(prev => [...prev, { ...newPreset }]);
    setNewPreset({ label: '', start: '08:00', end: '17:00' });
  };

  const removePreset = (idx: number) => {
    setEditPresets(prev => prev.filter((_, i) => i !== idx));
  };

  const updatePresetField = (idx: number, field: keyof ShiftPreset, value: string) => {
    setEditPresets(prev => prev.map((p, i) => i === idx ? { ...p, [field]: value } : p));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'עריכת משמרת' : 'שיבוץ משמרת'}</DialogTitle>
          <p className="text-sm text-muted-foreground">
            {employeeName} • {dateLabel}
          </p>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>שעת התחלה</Label>
              <Input
                type="time"
                value={start}
                onChange={(e) => { setStart(e.target.value); setError(''); }}
              />
            </div>
            <div className="space-y-2">
              <Label>שעת סיום</Label>
              <Input
                type="time"
                value={end}
                onChange={(e) => { setEnd(e.target.value); setError(''); }}
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>שיבוץ מהיר</Label>
              {!editingPresets ? (
                <Button variant="ghost" size="sm" className="h-6 text-[10px] gap-1" onClick={startEditPresets}>
                  <Pencil className="h-3 w-3" /> עריכה
                </Button>
              ) : (
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" className="h-6 text-[10px] gap-1" onClick={savePresets}>
                    <Check className="h-3 w-3" /> שמור
                  </Button>
                  <Button variant="ghost" size="sm" className="h-6 text-[10px] gap-1" onClick={() => setEditingPresets(false)}>
                    <X className="h-3 w-3" /> ביטול
                  </Button>
                </div>
              )}
            </div>

            {!editingPresets ? (
              <div className="flex flex-wrap gap-2">
                {presets.map((preset) => {
                  const active = start === preset.start && end === preset.end;
                  return (
                    <Badge
                      key={preset.label}
                      variant={active ? 'default' : 'outline'}
                      className={cn(
                        'cursor-pointer px-3 py-1.5 text-xs',
                        active && 'bg-primary'
                      )}
                      onClick={() => { setStart(preset.start); setEnd(preset.end); setError(''); }}
                    >
                      {preset.label}
                      <span className="mr-1 text-[10px] opacity-70" dir="ltr">
                        {preset.start}–{preset.end}
                      </span>
                    </Badge>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-2 bg-muted/30 rounded-lg p-2">
                {editPresets.map((preset, idx) => (
                  <div key={idx} className="flex items-center gap-1.5">
                    <Input
                      value={preset.label}
                      onChange={(e) => updatePresetField(idx, 'label', e.target.value)}
                      className="h-7 text-xs flex-1"
                      placeholder="שם"
                    />
                    <Input
                      type="time"
                      value={preset.start}
                      onChange={(e) => updatePresetField(idx, 'start', e.target.value)}
                      className="h-7 text-xs w-24"
                    />
                    <Input
                      type="time"
                      value={preset.end}
                      onChange={(e) => updatePresetField(idx, 'end', e.target.value)}
                      className="h-7 text-xs w-24"
                    />
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removePreset(idx)}>
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>
                ))}
                <div className="flex items-center gap-1.5 border-t border-border pt-2">
                  <Input
                    value={newPreset.label}
                    onChange={(e) => setNewPreset(p => ({ ...p, label: e.target.value }))}
                    className="h-7 text-xs flex-1"
                    placeholder="שם חדש"
                  />
                  <Input
                    type="time"
                    value={newPreset.start}
                    onChange={(e) => setNewPreset(p => ({ ...p, start: e.target.value }))}
                    className="h-7 text-xs w-24"
                  />
                  <Input
                    type="time"
                    value={newPreset.end}
                    onChange={(e) => setNewPreset(p => ({ ...p, end: e.target.value }))}
                    className="h-7 text-xs w-24"
                  />
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={addPreset}>
                    <Plus className="h-3 w-3 text-primary" />
                  </Button>
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="bg-destructive/10 border border-destructive/30 rounded-lg px-3 py-2 text-sm text-destructive">
              ⚠️ {error}
            </div>
          )}

          <div className="flex gap-2">
            <Button onClick={handleSave} className="flex-1">
              {isEdit ? 'עדכון' : 'שיבוץ'}
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              ביטול
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function timeToMin(t: string) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

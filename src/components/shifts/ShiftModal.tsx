import { useState } from 'react';
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

const PRESETS = [
  { label: 'בוקר', start: '07:00', end: '12:00' },
  { label: 'בוקר+', start: '08:00', end: '13:00' },
  { label: 'יום מלא', start: '08:00', end: '17:00' },
  { label: 'אחה״צ', start: '13:00', end: '18:00' },
  { label: 'ערב', start: '16:00', end: '20:00' },
];

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
            <Label>שיבוץ מהיר</Label>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((preset) => {
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

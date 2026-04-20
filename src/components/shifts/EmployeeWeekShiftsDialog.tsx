import { useRef, useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, Copy, Check } from 'lucide-react';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { toPng } from 'html-to-image';
import { useToast } from '@/hooks/use-toast';

const HEBREW_DAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

interface ShiftItem {
  id: string;
  start_time: string;
  end_time: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeName: string;
  weekDays: Date[];
  getEmployeeShifts: (date: string) => ShiftItem[];
  departmentName?: string;
}

function formatDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function timeToMin(t: string) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function getInitials(name: string) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2);
}

export function EmployeeWeekShiftsDialog({
  open,
  onOpenChange,
  employeeName,
  weekDays,
  getEmployeeShifts,
  departmentName,
}: Props) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [copying, setCopying] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const weekRange = `${format(weekDays[0], 'd בMMM', { locale: he })} – ${format(weekDays[6], 'd בMMM yyyy', { locale: he })}`;

  let totalMinutes = 0;
  const dayRows = weekDays.map(d => {
    const ds = formatDateStr(d);
    const shifts = getEmployeeShifts(ds);
    const dayMinutes = shifts.reduce((sum, s) => {
      let diff = timeToMin(s.end_time) - timeToMin(s.start_time);
      if (diff < 0) diff += 24 * 60;
      return sum + diff;
    }, 0);
    totalMinutes += dayMinutes;
    return { date: d, ds, shifts, dayMinutes };
  });

  const totalHours = Math.floor(totalMinutes / 60);
  const totalMins = totalMinutes % 60;
  const totalShiftsCount = dayRows.reduce((c, r) => c + r.shifts.length, 0);

  const handleCopyImage = async () => {
    if (!cardRef.current) return;
    setCopying(true);
    try {
      const dataUrl = await toPng(cardRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: '#ffffff',
      });
      const blob = await (await fetch(dataUrl)).blob();

      // Try clipboard image first
      if (navigator.clipboard && (window as any).ClipboardItem) {
        try {
          await navigator.clipboard.write([
            new (window as any).ClipboardItem({ 'image/png': blob }),
          ]);
          setCopied(true);
          toast({ title: 'התמונה הועתקה ללוח', description: 'אפשר להדביק בוואטסאפ או בכל אפליקציה' });
          setTimeout(() => setCopied(false), 2500);
          return;
        } catch {
          // fallback to download
        }
      }

      // Fallback: trigger download
      const link = document.createElement('a');
      link.download = `shifts-${employeeName}-${formatDateStr(weekDays[0])}.png`;
      link.href = dataUrl;
      link.click();
      toast({ title: 'התמונה ירדה למחשב' });
    } catch (e: any) {
      toast({ title: 'שגיאה ביצירת התמונה', description: e?.message, variant: 'destructive' });
    } finally {
      setCopying(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        dir="rtl"
        className="max-w-none w-screen h-screen p-0 m-0 rounded-none border-0 gap-0 flex flex-col bg-background sm:rounded-none translate-x-0 translate-y-0 left-0 top-0 data-[state=open]:slide-in-from-bottom-0 data-[state=open]:slide-in-from-left-0"
        style={{ transform: 'none', left: 0, top: 0 }}
      >
        {/* Action bar (excluded from screenshot) */}
        <div className="shrink-0 flex items-center justify-between px-4 py-2 border-b bg-muted/30">
          <Button
            size="sm"
            onClick={handleCopyImage}
            disabled={copying}
            className="gap-2"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? 'הועתק!' : copying ? 'מכין תמונה...' : 'העתק כתמונה'}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => onOpenChange(false)}>
            סגור
          </Button>
        </div>

        {/* Captured card — fills remaining height */}
        <div className="flex-1 overflow-hidden p-4 md:p-8 flex items-center justify-center bg-muted/20">
          <div
            ref={cardRef}
            className="w-full max-w-2xl h-full max-h-full bg-background rounded-2xl overflow-hidden shadow-xl border-2 flex flex-col"
          >
            {/* Branded header */}
            <div className="bg-gradient-to-br from-primary via-primary to-primary/80 text-primary-foreground p-5 pb-6 shrink-0">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-md bg-primary-foreground/15 flex items-center justify-center">
                    <Calendar className="h-4 w-4" />
                  </div>
                  <div className="leading-tight">
                    <div className="text-sm font-bold">Zabilo Book</div>
                    <div className="text-[10px] opacity-75">סידור משמרות</div>
                  </div>
                </div>
                <Badge className="bg-primary-foreground/20 text-primary-foreground border-0 hover:bg-primary-foreground/20 text-[10px]">
                  שבועי
                </Badge>
              </div>

              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12 border-2 border-primary-foreground/30">
                  <AvatarFallback className="bg-primary-foreground/20 text-primary-foreground font-bold">
                    {getInitials(employeeName)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="text-lg font-bold truncate">{employeeName}</div>
                  {departmentName && (
                    <div className="text-xs opacity-80 truncate">{departmentName}</div>
                  )}
                  <div className="text-xs opacity-90 mt-0.5">{weekRange}</div>
                </div>
              </div>
            </div>

            {/* Days list — fills space, no scroll */}
            <div className="flex-1 p-4 flex flex-col gap-1.5 overflow-hidden">
              {dayRows.map(({ date, ds, shifts, dayMinutes }) => {
                const isEmpty = shifts.length === 0;
                const dayName = HEBREW_DAYS[date.getDay()];
                const dayDate = format(date, 'd בMMM', { locale: he });
                const dh = Math.floor(dayMinutes / 60);
                const dm = dayMinutes % 60;
                return (
                  <div
                    key={ds}
                    className={cn(
                      'flex items-center gap-3 rounded-lg p-2.5 border flex-1 min-h-0',
                      isEmpty ? 'bg-muted/30 border-dashed border-border' : 'bg-card border-border shadow-sm'
                    )}
                  >
                    <div className="w-14 text-center shrink-0">
                      <div className="text-[10px] text-muted-foreground font-medium">{dayName}</div>
                      <div className="text-sm font-bold">{dayDate}</div>
                    </div>
                    <div className="flex-1 min-w-0">
                      {isEmpty ? (
                        <span className="text-xs text-muted-foreground italic">חופש</span>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {shifts.map(s => (
                            <div
                              key={s.id}
                              className="inline-flex items-center gap-1 bg-primary/10 text-primary border border-primary/20 rounded-md px-2 py-0.5"
                            >
                              <Clock className="h-3 w-3" />
                              <span className="text-xs font-bold tabular-nums" dir="ltr">
                                {s.start_time}–{s.end_time}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    {!isEmpty && (
                      <div className="text-[10px] text-muted-foreground font-medium shrink-0 tabular-nums">
                        {dh}:{String(dm).padStart(2, '0')}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Footer summary */}
            <div className="bg-muted/40 border-t px-5 py-3 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="text-muted-foreground">משמרות:</span>
                  <span className="font-bold">{totalShiftsCount}</span>
                </div>
                <div className="h-3 w-px bg-border" />
                <div className="flex items-center gap-1.5">
                  <span className="text-muted-foreground">סה״כ:</span>
                  <span className="font-bold tabular-nums">
                    {totalHours}:{String(totalMins).padStart(2, '0')} שעות
                  </span>
                </div>
              </div>
              <div className="text-[10px] text-muted-foreground">zabilo.lovable.app</div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

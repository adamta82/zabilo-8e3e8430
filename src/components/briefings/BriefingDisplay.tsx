import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Sunrise, Palmtree, Home, AlertCircle, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { parseLocalDate } from '@/lib/calendar-utils';
import type { MorningBriefing } from '@/hooks/useMorningBriefings';
import { Link } from 'react-router-dom';

interface Props {
  briefing: MorningBriefing | null | undefined;
  isLoading?: boolean;
  compact?: boolean;
}

export function BriefingDisplay({ briefing, isLoading, compact }: Props) {
  if (isLoading) {
    return (
      <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </CardContent>
      </Card>
    );
  }

  if (!briefing) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-8 text-center text-muted-foreground">
          <Sunrise className="h-10 w-10 mx-auto mb-2 opacity-50" />
          <p>אין עדיין תדריך בוקר</p>
        </CardContent>
      </Card>
    );
  }

  const dateLabel = format(parseLocalDate(briefing.briefing_date), 'EEEE, d בMMMM', { locale: he });
  const sections = briefing.summary_sections ?? [];
  const attendance = briefing.attendance;

  return (
    <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-primary/15 text-primary flex items-center justify-center">
              <Sunrise className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-lg">תדריך בוקר</CardTitle>
              <p className="text-xs text-muted-foreground">{dateLabel}</p>
            </div>
          </div>
          {briefing.status === 'processing' && (
            <Badge variant="secondary" className="gap-1">
              <Loader2 className="h-3 w-3 animate-spin" /> מעבד
            </Badge>
          )}
          {briefing.status === 'failed' && (
            <Badge variant="destructive" className="gap-1">
              <AlertCircle className="h-3 w-3" /> נכשל
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Attendance */}
        {attendance && (attendance.vacation.length > 0 || attendance.wfh.length > 0) && (
          <div className="flex flex-wrap gap-2">
            {attendance.vacation.length > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-400 text-sm">
                <Palmtree className="h-4 w-4" />
                <span className="font-medium">חופש:</span>
                <span>{attendance.vacation.join(', ')}</span>
              </div>
            )}
            {attendance.wfh.length > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-blue-500/10 text-blue-700 dark:text-blue-400 text-sm">
                <Home className="h-4 w-4" />
                <span className="font-medium">עבודה מהבית:</span>
                <span>{attendance.wfh.join(', ')}</span>
              </div>
            )}
          </div>
        )}

        {/* Sections */}
        {briefing.status === 'processing' && sections.length === 0 && (
          <div className="flex items-center gap-2 text-muted-foreground text-sm py-4">
            <Loader2 className="h-4 w-4 animate-spin" />
            מתמלל ומסכם את התדריך...
          </div>
        )}

        {briefing.status === 'failed' && (
          <div className="text-sm text-destructive bg-destructive/5 p-3 rounded-md">
            עיבוד התדריך נכשל. {briefing.error_message}
          </div>
        )}

        {sections.length > 0 && (
          <div className="space-y-4">
            {sections.map((section, i) => (
              <div key={i}>
                <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                  {section.title}
                </h3>
                <ul className="space-y-1.5 pr-4">
                  {section.bullets.map((b, j) => (
                    <li key={j} className="text-sm text-muted-foreground leading-relaxed list-disc">
                      {b}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}

        {compact && (
          <div className="pt-2 border-t">
            <Link to="/briefings" className="text-sm text-primary hover:underline">
              לארכיון התדריכים ←
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

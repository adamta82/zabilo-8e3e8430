import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Sunrise, Trash2, Loader2, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { parseLocalDate } from '@/lib/calendar-utils';
import { useBriefings, useDeleteBriefing } from '@/hooks/useMorningBriefings';
import { useAuth } from '@/contexts/AuthContext';
import { CreateBriefingDialog } from '@/components/briefings/CreateBriefingDialog';
import { BriefingDisplay } from '@/components/briefings/BriefingDisplay';
import { useState } from 'react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

export default function Briefings() {
  const { canManageShifts, isAdmin } = useAuth();
  const { data: briefings, isLoading } = useBriefings();
  const del = useDeleteBriefing();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="space-y-6 max-w-4xl mx-auto" dir="rtl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/15 text-primary flex items-center justify-center">
            <Sunrise className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">תדריכי בוקר</h1>
            <p className="text-sm text-muted-foreground">ארכיון כל התדריכים</p>
          </div>
        </div>
        {canManageShifts && <CreateBriefingDialog />}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
      ) : !briefings || briefings.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-muted-foreground">
            <Sunrise className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>אין עדיין תדריכים</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {briefings.map((b) => {
            const isExpanded = expandedId === b.id;
            return (
              <div key={b.id}>
                {isExpanded ? (
                  <div className="space-y-2">
                    <BriefingDisplay briefing={b} />
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => setExpandedId(null)}>סגור</Button>
                      {isAdmin && (
                        <Button variant="destructive" size="sm" onClick={() => setDeleteId(b.id)}>
                          <Trash2 className="h-4 w-4 ml-1" /> מחק
                        </Button>
                      )}
                    </div>
                  </div>
                ) : (
                  <Card className="hover:bg-accent/50 transition-colors cursor-pointer" onClick={() => setExpandedId(b.id)}>
                    <CardContent className="py-4 flex items-center justify-between gap-3">
                      <div>
                        <div className="font-medium">
                          {format(parseLocalDate(b.briefing_date), 'EEEE, d בMMMM yyyy', { locale: he })}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {b.summary_sections?.length ?? 0} נושאים
                        </div>
                      </div>
                      {b.status === 'processing' && (
                        <Badge variant="secondary" className="gap-1"><Loader2 className="h-3 w-3 animate-spin" />מעבד</Badge>
                      )}
                      {b.status === 'failed' && (
                        <Badge variant="destructive" className="gap-1"><AlertCircle className="h-3 w-3" />נכשל</Badge>
                      )}
                      {b.status === 'ready' && <Badge variant="outline">מוכן</Badge>}
                    </CardContent>
                  </Card>
                )}
              </div>
            );
          })}
        </div>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>מחיקת תדריך</AlertDialogTitle>
            <AlertDialogDescription>האם אתה בטוח? פעולה זו לא ניתנת לביטול.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ביטול</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (deleteId) { del.mutate(deleteId); setDeleteId(null); setExpandedId(null); } }}>מחק</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

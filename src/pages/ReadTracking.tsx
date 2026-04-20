import { useState } from 'react';
import { useArticles, useArticleReadDetails, useAllArticleReaders, ARTICLE_TYPE_COLORS, ARTICLE_TYPE_LABELS, ArticleType } from '@/hooks/useKnowledge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Send, BarChart2, CheckCircle2, XCircle, Check, ChevronsUpDown } from 'lucide-react';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function ReadTracking() {
  const { data: articles } = useArticles();
  const [selectedId, setSelectedId] = useState<string>('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const { data: details } = useArticleReadDetails(selectedId || undefined);
  const { data: allReaders } = useAllArticleReaders();
  const [sending, setSending] = useState(false);

  const published = (articles || []).filter((a) => a.is_published);
  const selectedArticle = published.find((a) => a.id === selectedId);

  const sendReminder = async () => {
    if (!selectedArticle || !details) return;
    setSending(true);
    try {
      const { error } = await supabase.functions.invoke('send-webhook', {
        body: {
          event: 'read_reminder',
          article_id: selectedArticle.id,
          article_title: selectedArticle.title,
          unread_user_ids: details.unread.map((u) => u.id),
          unread_user_names: details.unread.map((u) => u.full_name),
        },
      });
      if (error) throw error;
      toast.success('תזכורת נשלחה');
    } catch (e: any) {
      toast.error(e.message || 'שגיאה בשליחה');
    } finally {
      setSending(false);
    }
  };

  // Compute stats per article (rough — total employees from biggest read+unread set)
  const totalEmployees = details ? details.reads.length + details.unread.length : 0;

  return (
    <div dir="rtl" className="space-y-6 p-4 md:p-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <BarChart2 className="h-7 w-7 text-primary" />
          מעקב קריאה
        </h1>
        <p className="text-muted-foreground text-sm mt-1">בדוק מי קרא כל מאמר ושלח תזכורות</p>
      </div>

      {/* Article picker */}
      <Card>
        <CardHeader>
          <CardTitle>בחר מאמר לבדיקה</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={pickerOpen}
                className="w-full justify-between font-normal"
              >
                <span className="truncate">{selectedArticle?.title || 'בחר מאמר...'}</span>
                <ChevronsUpDown className="ms-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
              <Command>
                <CommandInput placeholder="חפש מאמר..." />
                <CommandList>
                  <CommandEmpty>לא נמצאו מאמרים</CommandEmpty>
                  <CommandGroup>
                    {published.map((a) => (
                      <CommandItem
                        key={a.id}
                        value={a.title}
                        onSelect={() => {
                          setSelectedId(a.id);
                          setPickerOpen(false);
                        }}
                      >
                        <Check className={cn('me-2 h-4 w-4', selectedId === a.id ? 'opacity-100' : 'opacity-0')} />
                        <span className="truncate">{a.title}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>

          {selectedArticle && details && (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm font-medium">
                  <span>נקרא על ידי {details.reads.length} מתוך {totalEmployees} עובדים</span>
                  <span>{totalEmployees > 0 ? Math.round((details.reads.length / totalEmployees) * 100) : 0}%</span>
                </div>
                <Progress value={totalEmployees > 0 ? (details.reads.length / totalEmployees) * 100 : 0} />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="rounded-lg border p-4 space-y-2">
                  <h4 className="font-semibold flex items-center gap-2 text-green-600">
                    <CheckCircle2 className="h-4 w-4" />
                    קראו ({details.reads.length})
                  </h4>
                  <div className="space-y-1 max-h-64 overflow-y-auto">
                    {details.reads.map((r: any) => (
                      <div key={r.user_id} className="flex justify-between text-sm py-1">
                        <span>{r.profiles?.full_name}</span>
                        <span className="text-muted-foreground text-xs">
                          {format(new Date(r.read_at), 'd/M HH:mm', { locale: he })}
                        </span>
                      </div>
                    ))}
                    {details.reads.length === 0 && <p className="text-sm text-muted-foreground">אף אחד עדיין</p>}
                  </div>
                </div>
                <div className="rounded-lg border p-4 space-y-2">
                  <h4 className="font-semibold flex items-center gap-2 text-red-600">
                    <XCircle className="h-4 w-4" />
                    לא קראו ({details.unread.length})
                  </h4>
                  <div className="space-y-1 max-h-64 overflow-y-auto">
                    {details.unread.map((u) => (
                      <div key={u.id} className="text-sm py-1">{u.full_name}</div>
                    ))}
                    {details.unread.length === 0 && <p className="text-sm text-muted-foreground">כולם קראו! 🎉</p>}
                  </div>
                </div>
              </div>

              {details.unread.length > 0 && (
                <Button onClick={sendReminder} disabled={sending}>
                  <Send className="ms-2 h-4 w-4" />
                  שלח תזכורת ל-{details.unread.length} עובדים
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Overall table */}
      <Card>
        <CardHeader>
          <CardTitle>סקירה כללית</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">מאמר</TableHead>
                <TableHead className="text-right">סוג</TableHead>
                <TableHead className="text-right">תאריך</TableHead>
                <TableHead className="text-right">קריאות</TableHead>
                <TableHead className="text-right">סטטוס</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {published
                .slice()
                .sort((a, b) => (a.read_count || 0) - (b.read_count || 0))
                .map((a) => {
                  const pct = a.read_count || 0; // Without total we use raw count for color heuristic
                  const color =
                    pct === 0 ? 'bg-red-500' : pct < 5 ? 'bg-orange-500' : 'bg-green-500';
                  return (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium">{a.title}</TableCell>
                      <TableCell>
                        <Badge className={ARTICLE_TYPE_COLORS[a.article_type as ArticleType]} variant="secondary">
                          {ARTICLE_TYPE_LABELS[a.article_type as ArticleType]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(a.created_at), 'd בMMMM yyyy', { locale: he })}
                      </TableCell>
                      <TableCell>
                        <Popover>
                          <PopoverTrigger asChild>
                            <button
                              className="underline-offset-4 hover:underline cursor-pointer text-right"
                              disabled={!(a.read_count && a.read_count > 0)}
                            >
                              {a.read_count || 0} קריאות
                            </button>
                          </PopoverTrigger>
                          {a.read_count && a.read_count > 0 && (
                            <PopoverContent className="w-64 p-0" align="end">
                              <div className="p-3 border-b">
                                <p className="text-sm font-semibold">קראו את המאמר</p>
                              </div>
                              <div className="max-h-64 overflow-y-auto p-2 space-y-1">
                                {(allReaders?.[a.id] || []).map((r) => (
                                  <div key={r.id} className="flex justify-between items-center text-sm py-1 px-2 rounded hover:bg-muted">
                                    <span className="truncate">{r.full_name}</span>
                                    <span className="text-xs text-muted-foreground whitespace-nowrap ms-2">
                                      {format(new Date(r.read_at), 'd/M HH:mm', { locale: he })}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </PopoverContent>
                          )}
                        </Popover>
                      </TableCell>
                      <TableCell>
                        <span className={cn('inline-block h-3 w-3 rounded-full', color)} />
                      </TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

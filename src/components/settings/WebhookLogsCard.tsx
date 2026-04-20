import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ScrollText, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';

interface WebhookLog {
  id: string;
  function_name: string;
  method: string;
  url: string | null;
  query_params: Record<string, unknown> | null;
  body: unknown;
  response_status: number | null;
  response_body: unknown;
  error: string | null;
  created_at: string;
}

export function WebhookLogsCard() {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: logs, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['webhook-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('webhook_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as WebhookLog[];
    },
  });

  const statusVariant = (status: number | null) => {
    if (!status) return 'secondary';
    if (status >= 200 && status < 300) return 'default';
    if (status >= 400) return 'destructive';
    return 'secondary';
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ScrollText className="h-5 w-5 text-primary" />
            <CardTitle>היסטוריית קריאות Webhook</CardTitle>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
            רענן
          </Button>
        </div>
        <CardDescription>
          50 הקריאות האחרונות לפונקציות הפומביות (כמו create-article)
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : !logs || logs.length === 0 ? (
          <p className="text-center text-muted-foreground py-8 text-sm">
            עדיין לא התקבלו קריאות
          </p>
        ) : (
          <div className="space-y-2">
            {logs.map((log) => {
              const isOpen = expandedId === log.id;
              return (
                <div key={log.id} className="border rounded-lg overflow-hidden">
                  <button
                    onClick={() => setExpandedId(isOpen ? null : log.id)}
                    className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition text-right"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Badge variant={statusVariant(log.response_status)}>
                        {log.response_status || '—'}
                      </Badge>
                      <Badge variant="outline" className="font-mono text-xs">
                        {log.method}
                      </Badge>
                      <span className="text-sm font-medium truncate">{log.function_name}</span>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString('he-IL')}
                      </span>
                    </div>
                    {isOpen ? <ChevronUp className="h-4 w-4 shrink-0" /> : <ChevronDown className="h-4 w-4 shrink-0" />}
                  </button>
                  {isOpen && (
                    <div className="border-t bg-muted/30 p-3 space-y-3 text-xs" dir="ltr">
                      {log.url && (
                        <div>
                          <div className="font-semibold mb-1 text-right" dir="rtl">URL:</div>
                          <div className="bg-background p-2 rounded break-all">{log.url}</div>
                        </div>
                      )}
                      {log.query_params && Object.keys(log.query_params).length > 0 && (
                        <div>
                          <div className="font-semibold mb-1 text-right" dir="rtl">Query Params:</div>
                          <pre className="bg-background p-2 rounded overflow-x-auto">
                            {JSON.stringify(log.query_params, null, 2)}
                          </pre>
                        </div>
                      )}
                      {log.body !== null && log.body !== undefined && (
                        <div>
                          <div className="font-semibold mb-1 text-right" dir="rtl">Body:</div>
                          <pre className="bg-background p-2 rounded overflow-x-auto max-h-64">
                            {JSON.stringify(log.body, null, 2)}
                          </pre>
                        </div>
                      )}
                      {log.response_body !== null && log.response_body !== undefined && (
                        <div>
                          <div className="font-semibold mb-1 text-right" dir="rtl">תשובה:</div>
                          <pre className="bg-background p-2 rounded overflow-x-auto max-h-64">
                            {JSON.stringify(log.response_body, null, 2)}
                          </pre>
                        </div>
                      )}
                      {log.error && (
                        <div>
                          <div className="font-semibold mb-1 text-right text-destructive" dir="rtl">שגיאה:</div>
                          <div className="bg-destructive/10 text-destructive p-2 rounded">{log.error}</div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

import { useState, useEffect } from 'react';
import { Save, TestTube, Webhook, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useWebhookSettings, useSaveWebhookSettings, useTestWebhook } from '@/hooks/useSettings';
import { WebhookLogsCard } from '@/components/settings/WebhookLogsCard';

export default function Settings() {
  const { data: settings, isLoading } = useWebhookSettings();
  const saveSettings = useSaveWebhookSettings();
  const testWebhook = useTestWebhook();
  
  const [webhookUrl, setWebhookUrl] = useState('');
  const [isEnabled, setIsEnabled] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);

  useEffect(() => {
    if (settings) {
      setWebhookUrl(settings.url || '');
      setIsEnabled(settings.enabled || false);
    }
  }, [settings]);

  const handleTestConnection = async () => {
    if (!webhookUrl) return;
    setTestResult(null);
    
    try {
      await testWebhook.mutateAsync(webhookUrl);
      setTestResult('success');
    } catch {
      setTestResult('error');
    }
  };

  const handleSave = async () => {
    await saveSettings.mutateAsync({
      url: webhookUrl,
      enabled: isEnabled,
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-2xl">
        <div>
          <h1 className="text-2xl font-bold">הגדרות</h1>
          <p className="text-muted-foreground">הגדרות גלובליות למערכת</p>
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">הגדרות</h1>
        <p className="text-muted-foreground">הגדרות גלובליות למערכת</p>
      </div>

      {/* Webhook Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Webhook className="h-5 w-5 text-primary" />
              <CardTitle>Webhook גלובלי</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="webhook-enabled" className="text-sm text-muted-foreground">
                {isEnabled ? 'פעיל' : 'כבוי'}
              </Label>
              <Switch
                id="webhook-enabled"
                checked={isEnabled}
                onCheckedChange={setIsEnabled}
              />
            </div>
          </div>
          <CardDescription>
            הגדר כתובת Webhook שתקבל התראות על כל אירוע במערכת
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="webhook-url">כתובת Webhook</Label>
            <div className="flex gap-2">
              <Input
                id="webhook-url"
                type="url"
                placeholder="https://example.com/webhook"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                dir="ltr"
                className="text-left flex-1"
              />
              <Button
                variant="outline"
                onClick={handleTestConnection}
                disabled={testWebhook.isPending || !webhookUrl}
                className="gap-2"
              >
                {testWebhook.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : testResult === 'success' ? (
                  <CheckCircle className="h-4 w-4 text-success" />
                ) : testResult === 'error' ? (
                  <XCircle className="h-4 w-4 text-destructive" />
                ) : (
                  <TestTube className="h-4 w-4" />
                )}
                בדיקה
              </Button>
            </div>
          </div>

          <div className="pt-4 border-t">
            <h4 className="font-medium mb-2">אירועים שיישלחו:</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• יצירת בקשה חדשה (כל סוג)</li>
              <li>• אישור בקשה</li>
              <li>• דחיית בקשה</li>
              <li>• עדכון סטטוס בקשה (הוזמן, סופק)</li>
            </ul>
          </div>

          <div className="pt-4 border-t">
            <h4 className="font-medium mb-2">מבנה ה-JSON שיישלח:</h4>
            <pre className="text-xs bg-muted p-3 rounded-lg overflow-x-auto" dir="ltr">
{`{
  "event": "request_created | request_approved | ...",
  "timestamp": "2026-02-09T12:00:00Z",
  "request": {
    "id": "uuid",
    "type": "wfh | vacation | equipment | groceries",
    "status": "pending | approved | rejected | ...",
    "created_at": "...",
    "wfh_date": "...",
    "wfh_tasks": [...],
    "vacation_start_date": "...",
    "vacation_end_date": "...",
    "items": [...]
  },
  "user": {
    "id": "uuid",
    "full_name": "שם העובד",
    "email": "email@company.com",
    "phone": "054-1234567",
    "department": { "name": "פיתוח" }
  },
  "approved_by": { ... } // אם רלוונטי
}`}
            </pre>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button 
          onClick={handleSave} 
          disabled={saveSettings.isPending}
          className="gap-2"
        >
          {saveSettings.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          שמירת הגדרות
        </Button>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { Save, TestTube, Webhook, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

export default function Settings() {
  const { toast } = useToast();
  const [webhookUrl, setWebhookUrl] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);

  const handleTestConnection = async () => {
    if (!webhookUrl) {
      toast({
        title: 'שגיאה',
        description: 'יש להזין כתובת Webhook',
        variant: 'destructive',
      });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    // Simulate test
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Mock result
    const success = Math.random() > 0.3;
    setTestResult(success ? 'success' : 'error');
    setIsTesting(false);

    toast({
      title: success ? 'החיבור הצליח!' : 'החיבור נכשל',
      description: success ? 'ה-Webhook מגיב כצפוי' : 'אנא בדוק את הכתובת ונסה שוב',
      variant: success ? 'default' : 'destructive',
    });
  };

  const handleSave = () => {
    toast({
      title: 'ההגדרות נשמרו',
      description: 'כל השינויים נשמרו בהצלחה',
    });
  };

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
          <div className="flex items-center gap-2">
            <Webhook className="h-5 w-5 text-primary" />
            <CardTitle>Webhook גלובלי</CardTitle>
          </div>
          <CardDescription>
            הגדר כתובת Webhook שתקבל התראות על אירועים במערכת
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
                disabled={isTesting}
                className="gap-2"
              >
                {isTesting ? (
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
            <p className="text-xs text-muted-foreground">
              ה-Webhook יקבל התראות על יצירה, אישור ודחייה של בקשות
            </p>
          </div>

          <div className="pt-4 border-t">
            <h4 className="font-medium mb-2">אירועים שיישלחו:</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• יצירת בקשה חדשה</li>
              <li>• אישור בקשה</li>
              <li>• דחיית בקשה</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} className="gap-2">
          <Save className="h-4 w-4" />
          שמירת הגדרות
        </Button>
      </div>
    </div>
  );
}

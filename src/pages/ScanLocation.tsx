import { useEffect, useState } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { Loader2, CheckCircle2, XCircle, LogIn, LogOut } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useQrToggle } from '@/hooks/useAttendance';

export default function ScanLocation() {
  const { locId } = useParams<{ locId: string }>();
  const { user, isLoading: loading } = useAuth();
  const navigate = useNavigate();
  const qrToggle = useQrToggle();
  const [state, setState] = useState<'idle' | 'pending' | 'success' | 'error'>('idle');
  const [resultType, setResultType] = useState<'in' | 'out' | null>(null);
  const [errMsg, setErrMsg] = useState<string>('');

  useEffect(() => {
    if (loading || !user || !locId || state !== 'idle') return;
    setState('pending');
    qrToggle.mutate(locId, {
      onSuccess: (data: any) => {
        setResultType(data?.type ?? null);
        setState('success');
      },
      onError: (e: any) => {
        setErrMsg(e?.message || 'שגיאה ברישום');
        setState('error');
      },
    });
  }, [loading, user, locId, state, qrToggle]);

  if (!loading && !user) {
    return <Navigate to={`/login?redirect=/scan/${locId}`} replace />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md">
        <CardContent className="p-8 text-center space-y-4">
          {state === 'pending' || loading ? (
            <>
              <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
              <h1 className="text-xl font-semibold">רושמ/ת...</h1>
            </>
          ) : state === 'success' ? (
            <>
              <CheckCircle2 className="h-16 w-16 mx-auto text-green-600" />
              <h1 className="text-2xl font-bold">
                {resultType === 'in' ? 'נרשמה כניסה ✓' : 'נרשמה יציאה ✓'}
              </h1>
              <p className="text-sm text-muted-foreground flex items-center justify-center gap-2">
                {resultType === 'in' ? <LogIn className="h-4 w-4" /> : <LogOut className="h-4 w-4" />}
                {new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
              </p>
              <Button className="w-full" onClick={() => navigate('/attendance')}>
                למסך נוכחות
              </Button>
            </>
          ) : state === 'error' ? (
            <>
              <XCircle className="h-16 w-16 mx-auto text-destructive" />
              <h1 className="text-xl font-bold">שגיאה</h1>
              <p className="text-sm text-muted-foreground">{errMsg}</p>
              <Button variant="outline" className="w-full" onClick={() => setState('idle')}>
                נסה שוב
              </Button>
            </>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

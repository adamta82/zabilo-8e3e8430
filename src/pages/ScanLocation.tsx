import { useEffect, useState } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { Loader2, CheckCircle2, XCircle, LogIn, LogOut, MapPin } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useQrToggle } from '@/hooks/useAttendance';
import { captureGpsSilently } from '@/lib/gps';
import { reverseGeocode } from '@/components/attendance/GpsMapSheet';

export default function ScanLocation() {
  const { locId } = useParams<{ locId: string }>();
  const { user, isLoading: loading } = useAuth();
  const navigate = useNavigate();
  const qrToggle = useQrToggle();
  const [state, setState] = useState<'idle' | 'pending' | 'success' | 'error'>('idle');
  const [resultType, setResultType] = useState<'in' | 'out' | null>(null);
  const [errMsg, setErrMsg] = useState<string>('');
  const [gps, setGps] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);
  const [address, setAddress] = useState<string | null>(null);

  useEffect(() => {
    if (loading || !user || !locId || state !== 'idle') return;
    setState('pending');
    qrToggle.mutate(locId, {
      onSuccess: async (data: any) => {
        setResultType(data?.type ?? null);
        setState('success');
        const g = await captureGpsSilently();
        if (g) {
          setGps(g);
          const a = await reverseGeocode(g.lat, g.lng);
          setAddress(a);
        }
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

  const delta = 0.003;
  const mapSrc = gps
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${gps.lng - delta},${gps.lat - delta},${gps.lng + delta},${gps.lat + delta}&layer=mapnik&marker=${gps.lat},${gps.lng}`
    : null;

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

              {gps && mapSrc && (
                <div className="space-y-2 text-right">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground justify-end">
                    <MapPin className="h-3 w-3" />
                    <span>מיקום הסריקה</span>
                  </div>
                  <div className="text-sm font-medium">
                    {address || (
                      <span className="text-muted-foreground text-xs">
                        <Loader2 className="inline h-3 w-3 animate-spin ml-1" />מאתר כתובת...
                      </span>
                    )}
                  </div>
                  <iframe
                    title="map"
                    src={mapSrc}
                    className="w-full h-48 rounded-md border"
                    loading="lazy"
                  />
                  <div dir="ltr" className="text-[10px] text-muted-foreground font-mono text-center">
                    {gps.lat.toFixed(5)}, {gps.lng.toFixed(5)} (±{Math.round(gps.accuracy)}מ׳)
                  </div>
                </div>
              )}

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

import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useQrToggle } from '@/hooks/useAttendance';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SCANNER_ID = 'qr-scanner-region';

export function QrScannerDialog({ open, onOpenChange }: Props) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const qrToggle = useQrToggle();

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setError(null);

    const start = async () => {
      try {
        // Wait for DOM
        await new Promise((r) => setTimeout(r, 100));
        if (cancelled) return;

        const scanner = new Html5Qrcode(SCANNER_ID);
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: 250 },
          async (decoded) => {
            // decoded should be a location id (uuid). Stop scanner before calling.
            try {
              await scanner.stop();
            } catch {}
            scannerRef.current = null;

            // Accept raw uuid, zabilo:loc:<uuid>, or full /scan/<uuid> URL
            let locId = decoded.trim();
            const urlMatch = locId.match(/\/scan\/([0-9a-f-]{36})/i);
            if (urlMatch) locId = urlMatch[1];
            const protoMatch = locId.match(/^zabilo:loc:(.+)$/);
            if (protoMatch) locId = protoMatch[1];

            qrToggle.mutate(locId, {
              onSettled: () => onOpenChange(false),
            });
          },
          () => {
            // ignore decode errors per frame
          }
        );
      } catch (e: any) {
        setError(e?.message || 'שגיאה בפתיחת המצלמה');
      }
    };

    start();

    return () => {
      cancelled = true;
      const s = scannerRef.current;
      scannerRef.current = null;
      if (s) {
        s.stop().catch(() => {}).finally(() => {
          try { s.clear(); } catch {}
        });
      }
    };
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>סריקת QR לכניסה / יציאה</DialogTitle>
        </DialogHeader>
        {error ? (
          <div className="space-y-3">
            <p className="text-sm text-destructive">{error}</p>
            <p className="text-xs text-muted-foreground">ודא שאישרת גישה למצלמה בדפדפן.</p>
            <Button onClick={() => onOpenChange(false)} variant="outline" className="w-full">סגירה</Button>
          </div>
        ) : (
          <div className="space-y-2">
            <div id={SCANNER_ID} className="w-full rounded-lg overflow-hidden bg-muted aspect-square" />
            <p className="text-xs text-muted-foreground text-center">
              כוון את המצלמה אל מדבקת ה-QR במיקום העבודה
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

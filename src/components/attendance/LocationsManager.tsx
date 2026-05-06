import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { MapPin, Plus, Trash2, QrCode, Printer } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  useAdminLocations, useCreateLocation, useUpdateLocation, useDeleteLocation, type Location,
} from '@/hooks/useAttendanceAdmin';

export function LocationsManager() {
  const { data: locations = [] } = useAdminLocations();
  const createLoc = useCreateLocation();
  const updateLoc = useUpdateLocation();
  const deleteLoc = useDeleteLocation();
  const [newOpen, setNewOpen] = useState(false);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [radius, setRadius] = useState(300);

  const [qrLoc, setQrLoc] = useState<Location | null>(null);

  const handleCreate = () => {
    if (!name.trim()) return;
    createLoc.mutate(
      { name: name.trim(), address: address.trim() || undefined, geofence_radius: radius },
      {
        onSuccess: () => {
          setNewOpen(false);
          setName(''); setAddress(''); setRadius(300);
        },
      }
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <h3 className="font-medium">מיקומי עבודה</h3>
        <Dialog open={newOpen} onOpenChange={setNewOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="ml-1 h-4 w-4" />מיקום חדש</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>הוספת מיקום</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>שם</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="משרד ראשי" />
              </div>
              <div>
                <Label>כתובת (אופציונלי)</Label>
                <Input value={address} onChange={(e) => setAddress(e.target.value)} />
              </div>
              <div>
                <Label>רדיוס Geofence (מטרים)</Label>
                <Input type="number" value={radius} onChange={(e) => setRadius(parseInt(e.target.value) || 300)} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setNewOpen(false)}>ביטול</Button>
              <Button onClick={handleCreate} disabled={!name.trim() || createLoc.isPending}>יצירה</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {locations.length === 0 ? (
        <Card><CardContent className="p-6 text-center text-muted-foreground text-sm">אין מיקומים. צור/י מיקום ראשון.</CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {locations.map((loc) => (
            <Card key={loc.id}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium truncate">{loc.name}</span>
                      {!loc.is_active && <Badge variant="secondary" className="text-[10px]">לא פעיל</Badge>}
                    </div>
                    {loc.address && <p className="text-xs text-muted-foreground truncate mt-1">{loc.address}</p>}
                    <p className="text-xs text-muted-foreground mt-1">רדיוס: {loc.geofence_radius}מ׳</p>
                  </div>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setQrLoc(loc)}>
                      <QrCode className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="icon" variant="ghost" className="h-8 w-8">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>למחוק את המיקום?</AlertDialogTitle>
                          <AlertDialogDescription>אירועי הנוכחות הקיימים יישמרו בלי הקישור למיקום.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>ביטול</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteLoc.mutate(loc.id)}>מחיקה</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-xs">פעיל</Label>
                  <Switch
                    checked={loc.is_active}
                    onCheckedChange={(checked) => updateLoc.mutate({ id: loc.id, patch: { is_active: checked } })}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {qrLoc && <QrPrintDialog location={qrLoc} onClose={() => setQrLoc(null)} />}
    </div>
  );
}

function QrPrintDialog({ location, onClose }: { location: Location; onClose: () => void }) {
  const qrValue = `zabilo:loc:${location.id}`;
  const handlePrint = () => {
    const svg = document.getElementById('qr-print-svg');
    if (!svg) return;
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`
      <html dir="rtl"><head><title>QR - ${location.name}</title>
      <style>
        body { font-family: system-ui, sans-serif; text-align: center; padding: 40px; }
        h1 { font-size: 32px; margin-bottom: 8px; }
        p { color: #666; margin-bottom: 24px; }
        svg { max-width: 400px; }
      </style></head><body>
      <h1>${location.name}</h1>
      <p>${location.address || ''}</p>
      ${svg.outerHTML}
      <p style="margin-top:24px;font-size:14px">סרוק כדי לרשום כניסה / יציאה</p>
      </body></html>
    `);
    w.document.close();
    setTimeout(() => w.print(), 300);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader><DialogTitle>QR למיקום: {location.name}</DialogTitle></DialogHeader>
        <div className="flex flex-col items-center gap-3 p-4 bg-white rounded-lg">
          <QRCodeSVG id="qr-print-svg" value={qrValue} size={240} level="M" />
          <p className="text-xs text-muted-foreground text-center">
            הדפס/י את ה-QR ותלה/י במיקום העבודה. עובדים יסרקו כדי לדווח כניסה/יציאה אוטומטית.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>סגירה</Button>
          <Button onClick={handlePrint}><Printer className="ml-2 h-4 w-4" />הדפסה</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import { useEffect, useState } from 'react';
import { MapPin, ExternalLink, Loader2 } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  lat: number | null;
  lng: number | null;
  accuracy?: number | null;
  title?: string;
  subtitle?: string;
}

// In-memory cache to avoid re-querying same coordinates
const addressCache = new Map<string, string>();

export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  const key = `${lat.toFixed(5)},${lng.toFixed(5)}`;
  if (addressCache.has(key)) return addressCache.get(key)!;
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=he&zoom=18`,
      { headers: { 'Accept': 'application/json' } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const addr = data.display_name || null;
    if (addr) addressCache.set(key, addr);
    return addr;
  } catch {
    return null;
  }
}

export function GpsMapSheet({ open, onOpenChange, lat, lng, accuracy, title, subtitle }: Props) {
  const [address, setAddress] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || lat == null || lng == null) return;
    setLoading(true);
    setAddress(null);
    reverseGeocode(lat, lng).then((a) => {
      setAddress(a);
      setLoading(false);
    });
  }, [open, lat, lng]);

  if (lat == null || lng == null) return null;

  // Bounding box around the point with ~250m radius for marker view
  const delta = 0.003;
  const bbox = `${lng - delta},${lat - delta},${lng + delta},${lat + delta}`;
  const mapSrc = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lng}`;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-full sm:max-w-lg flex flex-col p-0">
        <SheetHeader className="p-6 pb-3">
          <SheetTitle className="flex items-center gap-2 text-base">
            <MapPin className="h-4 w-4" />
            {title || 'מיקום הדיווח'}
          </SheetTitle>
          {subtitle && <SheetDescription>{subtitle}</SheetDescription>}
        </SheetHeader>

        <div className="px-6 pb-3 space-y-2 text-sm">
          <div>
            <div className="text-xs text-muted-foreground">כתובת</div>
            <div className="font-medium">
              {loading ? (
                <span className="inline-flex items-center gap-1 text-muted-foreground text-xs">
                  <Loader2 className="h-3 w-3 animate-spin" /> מאתר כתובת...
                </span>
              ) : (address || 'לא נמצאה כתובת לקואורדינטות')}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <div className="text-xs text-muted-foreground">קואורדינטות</div>
              <div dir="ltr" className="text-xs font-mono tabular-nums">{lat.toFixed(5)}, {lng.toFixed(5)}</div>
            </div>
            {accuracy != null && (
              <div>
                <div className="text-xs text-muted-foreground">דיוק GPS</div>
                <div className="text-xs">±{Math.round(accuracy)} מ׳</div>
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 px-6 pb-3 min-h-[300px]">
          <iframe
            title="map"
            src={mapSrc}
            className="w-full h-full min-h-[300px] rounded-md border"
            loading="lazy"
          />
        </div>

        <div className="p-6 pt-3 border-t">
          <Button variant="outline" className="w-full" asChild>
            <a href={`https://www.google.com/maps?q=${lat},${lng}`} target="_blank" rel="noreferrer">
              <ExternalLink className="ml-2 h-4 w-4" />
              פתיחה ב-Google Maps
            </a>
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

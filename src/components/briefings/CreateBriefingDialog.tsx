import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Mic, Upload, FileText, Square, Loader2, Plus } from 'lucide-react';
import { useCreateBriefing } from '@/hooks/useMorningBriefings';
import { formatDateString } from '@/lib/calendar-utils';
import { toast } from 'sonner';

export function CreateBriefingDialog() {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(formatDateString(new Date()));
  const [tab, setTab] = useState('record');

  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const wakeLockRef = useRef<any>(null);

  const requestWakeLock = async () => {
    try {
      if ('wakeLock' in navigator) {
        wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
      }
    } catch (e) {
      console.warn('Wake Lock failed:', e);
    }
  };

  const releaseWakeLock = async () => {
    try {
      await wakeLockRef.current?.release?.();
      wakeLockRef.current = null;
    } catch (_) {}
  };

  // Upload state
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  // Text state
  const [transcriptText, setTranscriptText] = useState('');

  const create = useCreateBriefing();

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mr.mimeType || 'audio/webm' });
        setRecordedBlob(blob);
        stream.getTracks().forEach(t => t.stop());
      };
      mediaRecorderRef.current = mr;
      mr.start();
      setIsRecording(true);
    } catch (e: any) {
      toast.error('לא ניתן לגשת למיקרופון: ' + (e.message ?? ''));
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  const reset = () => {
    setRecordedBlob(null);
    setUploadFile(null);
    setTranscriptText('');
    setDate(formatDateString(new Date()));
    setTab('record');
  };

  const handleSubmit = async () => {
    try {
      if (tab === 'record' && recordedBlob) {
        await create.mutateAsync({ briefingDate: date, audioBlob: recordedBlob });
      } else if (tab === 'upload' && uploadFile) {
        await create.mutateAsync({ briefingDate: date, audioBlob: uploadFile });
      } else if (tab === 'text' && transcriptText.trim()) {
        await create.mutateAsync({ briefingDate: date, rawTranscript: transcriptText });
      } else {
        toast.error('יש להזין תוכן');
        return;
      }
      reset();
      setOpen(false);
    } catch (_) { /* handled in hook */ }
  };

  const canSubmit =
    (tab === 'record' && recordedBlob) ||
    (tab === 'upload' && uploadFile) ||
    (tab === 'text' && transcriptText.trim().length > 10);

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 ml-1" />
          תדריך חדש
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg" dir="rtl">
        <DialogHeader>
          <DialogTitle>תדריך בוקר חדש</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>תאריך</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>

          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="grid grid-cols-3 w-full">
              <TabsTrigger value="record"><Mic className="h-4 w-4 ml-1" />הקלטה</TabsTrigger>
              <TabsTrigger value="upload"><Upload className="h-4 w-4 ml-1" />העלאה</TabsTrigger>
              <TabsTrigger value="text"><FileText className="h-4 w-4 ml-1" />טקסט</TabsTrigger>
            </TabsList>

            <TabsContent value="record" className="space-y-3 pt-3">
              {!recordedBlob ? (
                <Button
                  type="button"
                  size="lg"
                  variant={isRecording ? 'destructive' : 'default'}
                  className="w-full h-20"
                  onClick={isRecording ? stopRecording : startRecording}
                >
                  {isRecording ? (
                    <><Square className="h-6 w-6 ml-2" />עצור הקלטה</>
                  ) : (
                    <><Mic className="h-6 w-6 ml-2" />התחל הקלטה</>
                  )}
                </Button>
              ) : (
                <div className="space-y-2">
                  <audio src={URL.createObjectURL(recordedBlob)} controls className="w-full" />
                  <Button variant="outline" size="sm" onClick={() => setRecordedBlob(null)}>
                    הקלט מחדש
                  </Button>
                </div>
              )}
            </TabsContent>

            <TabsContent value="upload" className="space-y-3 pt-3">
              <Input
                type="file"
                accept="audio/*"
                onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
              />
              {uploadFile && (
                <p className="text-sm text-muted-foreground">{uploadFile.name}</p>
              )}
            </TabsContent>

            <TabsContent value="text" className="pt-3">
              <Textarea
                placeholder="הדבק כאן את תוכן התדריך..."
                value={transcriptText}
                onChange={(e) => setTranscriptText(e.target.value)}
                rows={8}
              />
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)}>ביטול</Button>
            <Button onClick={handleSubmit} disabled={!canSubmit || create.isPending}>
              {create.isPending && <Loader2 className="h-4 w-4 ml-1 animate-spin" />}
              צור וסכם
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

import { useEffect, useMemo, useRef, useState } from 'react';
import NoSleep from 'nosleep.js';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Mic, Upload, FileText, Square, Loader2, Plus, ChevronRight, Check, Sparkles } from 'lucide-react';
import { type BriefingPreviewData, useCreateBriefing, usePreviewBriefing } from '@/hooks/useMorningBriefings';
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
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const wakeLockRef = useRef<any>(null);
  const noSleepRef = useRef<NoSleep | null>(null);
  const isRecordingRef = useRef(false);
  const discardRecordingRef = useRef(false);
  const [previewData, setPreviewData] = useState<BriefingPreviewData | null>(null);
  const [uploadedAudioPath, setUploadedAudioPath] = useState<string | null>(null);
  const audioPreviewUrl = useMemo(() => recordedBlob ? URL.createObjectURL(recordedBlob) : null, [recordedBlob]);

  const requestWakeLock = async () => {
    try {
      if ('wakeLock' in navigator) {
        const sentinel = await (navigator as any).wakeLock.request('screen');
        sentinel?.addEventListener?.('release', () => {
          if (isRecordingRef.current && document.visibilityState === 'visible') {
            void requestWakeLock();
          }
        });
        wakeLockRef.current = sentinel;
      }
    } catch (e) {
      console.warn('Wake Lock failed:', e);
    }
  };

  const enableNoSleep = async () => {
    try {
      if (!noSleepRef.current) noSleepRef.current = new NoSleep();
      await noSleepRef.current.enable();
    } catch (e) {
      console.warn('NoSleep failed:', e);
    }
  };

  const releaseWakeLock = async () => {
    try {
      await wakeLockRef.current?.release?.();
      wakeLockRef.current = null;
    } catch (_) {}
    try {
      noSleepRef.current?.disable();
    } catch (_) {}
  };

  // Upload state
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  // Text state
  const [transcriptText, setTranscriptText] = useState('');

  const create = useCreateBriefing();
  const preview = usePreviewBriefing();

  useEffect(() => {
    isRecordingRef.current = isRecording;
  }, [isRecording]);

  useEffect(() => {
    return () => {
      if (audioPreviewUrl) URL.revokeObjectURL(audioPreviewUrl);
    };
  }, [audioPreviewUrl]);

  useEffect(() => {
    const reenableSleepProtection = () => {
      if (!isRecording || document.visibilityState !== 'visible') return;
      void requestWakeLock();
      void enableNoSleep();
    };

    document.addEventListener('visibilitychange', reenableSleepProtection);
    window.addEventListener('focus', reenableSleepProtection);
    return () => {
      document.removeEventListener('visibilitychange', reenableSleepProtection);
      window.removeEventListener('focus', reenableSleepProtection);
    };
  }, [isRecording]);

  const stopMediaTracks = () => {
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;
  };

  const cleanupRecorder = async () => {
    mediaRecorderRef.current = null;
    stopMediaTracks();
    setIsRecording(false);
    await releaseWakeLock();
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = async () => {
        if (!discardRecordingRef.current) {
          const blob = new Blob(chunksRef.current, { type: mr.mimeType || 'audio/webm' });
          setRecordedBlob(blob);
          setPreviewData(null);
          setUploadedAudioPath(null);
        }
        discardRecordingRef.current = false;
        await cleanupRecorder();
      };
      mediaRecorderRef.current = mr;
      await requestWakeLock();
      await enableNoSleep();
      mr.start();
      setIsRecording(true);
    } catch (e: any) {
      stopMediaTracks();
      await releaseWakeLock();
      toast.error('לא ניתן לגשת למיקרופון: ' + (e.message ?? ''));
    }
  };

  const stopRecording = () => {
    discardRecordingRef.current = false;
    mediaRecorderRef.current?.stop();
  };

  const reset = async () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      discardRecordingRef.current = true;
      mediaRecorderRef.current.ondataavailable = null;
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.stop();
      await cleanupRecorder();
    } else {
      await cleanupRecorder();
    }

    setRecordedBlob(null);
    setUploadFile(null);
    setTranscriptText('');
    setPreviewData(null);
    setUploadedAudioPath(null);
    setDate(formatDateString(new Date()));
    setTab('record');
  };

  const handlePreparePreview = async () => {
    try {
      let payload;
      if (tab === 'record' && recordedBlob) {
        payload = { briefingDate: date, audioBlob: recordedBlob, audioPath: uploadedAudioPath };
      } else if (tab === 'upload' && uploadFile) {
        payload = { briefingDate: date, audioBlob: uploadFile, audioPath: uploadedAudioPath };
      } else if (tab === 'text' && transcriptText.trim()) {
        payload = { briefingDate: date, rawTranscript: transcriptText };
      } else {
        toast.error('יש להזין תוכן');
        return;
      }

      const data = await preview.mutateAsync(payload);
      setPreviewData(data);
      setUploadedAudioPath(data.audioPath);
    } catch (_) {
      // handled in hook
    }
  };

  const handleSubmit = async () => {
    try {
      if (!previewData) {
        toast.error('יש להזין תוכן');
        return;
      }

      await create.mutateAsync({
        briefingDate: date,
        rawTranscript: tab === 'text' ? transcriptText : undefined,
        audioPath: previewData.audioPath,
        previewData,
      });
      await reset();
      setOpen(false);
    } catch (_) { /* handled in hook */ }
  };

  const canSubmit =
    (tab === 'record' && recordedBlob) ||
    (tab === 'upload' && uploadFile) ||
    (tab === 'text' && transcriptText.trim().length > 10);

  return (
    <Dialog open={open} onOpenChange={(o) => {
      setOpen(o);
      if (!o) void reset();
    }}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 ml-1" />
          תדריך חדש
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl" dir="rtl">
        <DialogHeader>
          <DialogTitle>תדריך בוקר חדש</DialogTitle>
          <DialogDescription>
            {previewData ? 'בדוק את הסיכום לפני שמירה ושליחה.' : 'הקלט, העלה או הדבק טקסט ואז צור תצוגה מקדימה.'}
          </DialogDescription>
        </DialogHeader>

        {previewData ? (
          <div className="space-y-4">
            <Alert>
              <Sparkles className="h-4 w-4" />
              <AlertDescription>
                זה הסיכום שיישמר ויישלח. אפשר לחזור אחורה כדי לתקן לפני האישור.
              </AlertDescription>
            </Alert>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-md border p-3">
                <p className="text-sm text-muted-foreground">חופש</p>
                <p className="mt-1 text-sm">{previewData.attendance.vacation.length ? previewData.attendance.vacation.join(', ') : 'אין'}</p>
              </div>
              <div className="rounded-md border p-3">
                <p className="text-sm text-muted-foreground">עבודה מהבית</p>
                <p className="mt-1 text-sm">{previewData.attendance.wfh.length ? previewData.attendance.wfh.join(', ') : 'אין'}</p>
              </div>
            </div>

            <ScrollArea className="max-h-[55vh] rounded-md border">
              <div className="space-y-4 p-4">
                <div>
                  <p className="text-sm text-muted-foreground">כותרת</p>
                  <h3 className="text-lg font-semibold">{previewData.title}</h3>
                </div>

                <div className="space-y-3">
                  {previewData.sections.map((section) => (
                    <section key={section.title} className="space-y-2">
                      <h4 className="font-medium">{section.title}</h4>
                      <ul className="list-disc space-y-1 pr-5 text-sm">
                        {section.bullets.map((bullet, index) => (
                          <li key={`${section.title}-${index}`}>{bullet}</li>
                        ))}
                      </ul>
                    </section>
                  ))}
                </div>

                <div>
                  <p className="text-sm text-muted-foreground">תמלול</p>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6">{previewData.transcript}</p>
                </div>
              </div>
            </ScrollArea>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setPreviewData(null)}>
                <ChevronRight className="h-4 w-4 ml-1" />
                חזור לעריכה
              </Button>
              <Button onClick={handleSubmit} disabled={create.isPending}>
                {create.isPending ? <Loader2 className="h-4 w-4 ml-1 animate-spin" /> : <Check className="h-4 w-4 ml-1" />}
                שמור ושלח
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <Label>תאריך</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>

            <Tabs value={tab} onValueChange={(value) => {
              setTab(value);
              setPreviewData(null);
              setUploadedAudioPath(null);
            }}>
              <TabsList className="grid grid-cols-3 w-full">
                <TabsTrigger value="record"><Mic className="h-4 w-4 ml-1" />הקלטה</TabsTrigger>
                <TabsTrigger value="upload"><Upload className="h-4 w-4 ml-1" />העלאה</TabsTrigger>
                <TabsTrigger value="text"><FileText className="h-4 w-4 ml-1" />טקסט</TabsTrigger>
              </TabsList>

              <TabsContent value="record" className="space-y-3 pt-3">
                {isRecording && (
                  <Alert>
                    <Mic className="h-4 w-4" />
                    <AlertDescription>
                      בזמן ההקלטה המסך אמור להישאר דלוק גם בלי מגע.
                    </AlertDescription>
                  </Alert>
                )}

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
                    {audioPreviewUrl && <audio src={audioPreviewUrl} controls className="w-full" />}
                    <Button variant="outline" size="sm" onClick={() => {
                      setRecordedBlob(null);
                      setPreviewData(null);
                      setUploadedAudioPath(null);
                    }}>
                      הקלט מחדש
                    </Button>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="upload" className="space-y-3 pt-3">
                <Input
                  type="file"
                  accept="audio/*"
                  onChange={(e) => {
                    setUploadFile(e.target.files?.[0] ?? null);
                    setPreviewData(null);
                    setUploadedAudioPath(null);
                  }}
                />
                {uploadFile && (
                  <p className="text-sm text-muted-foreground">{uploadFile.name}</p>
                )}
              </TabsContent>

              <TabsContent value="text" className="pt-3">
                <Textarea
                  placeholder="הדבק כאן את תוכן התדריך..."
                  value={transcriptText}
                  onChange={(e) => {
                    setTranscriptText(e.target.value);
                    setPreviewData(null);
                  }}
                  rows={8}
                />
              </TabsContent>
            </Tabs>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setOpen(false)}>ביטול</Button>
              <Button onClick={handlePreparePreview} disabled={!canSubmit || preview.isPending}>
                {preview.isPending && <Loader2 className="h-4 w-4 ml-1 animate-spin" />}
                סכם לתצוגה מקדימה
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

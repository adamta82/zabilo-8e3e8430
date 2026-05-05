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
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0" dir="rtl">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle>תדריך בוקר חדש</DialogTitle>
          <DialogDescription>
            {previewData ? 'ערוך את הסיכום לפני שמירה ושליחה.' : 'הקלט, העלה או הדבק טקסט ואז צור תצוגה מקדימה.'}
          </DialogDescription>
        </DialogHeader>

        {previewData ? (
          <div className="flex flex-col flex-1 min-h-0">
            <div className="flex-1 overflow-y-auto px-6 space-y-4">
              <Alert>
                <Sparkles className="h-4 w-4" />
                <AlertDescription>
                  ניתן לערוך כל שדה. הסיכום יישמר ויישלח לאחר האישור.
                </AlertDescription>
              </Alert>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-md border p-3 space-y-1">
                  <Label className="text-xs text-muted-foreground">חופש (מופרד בפסיקים)</Label>
                  <Input
                    value={previewData.attendance.vacation.join(', ')}
                    onChange={(e) => setPreviewData({
                      ...previewData,
                      attendance: { ...previewData.attendance, vacation: e.target.value.split(',').map(s => s.trim()).filter(Boolean) },
                    })}
                  />
                </div>
                <div className="rounded-md border p-3 space-y-1">
                  <Label className="text-xs text-muted-foreground">עבודה מהבית (מופרד בפסיקים)</Label>
                  <Input
                    value={previewData.attendance.wfh.join(', ')}
                    onChange={(e) => setPreviewData({
                      ...previewData,
                      attendance: { ...previewData.attendance, wfh: e.target.value.split(',').map(s => s.trim()).filter(Boolean) },
                    })}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">כותרת</Label>
                <Input
                  value={previewData.title}
                  onChange={(e) => setPreviewData({ ...previewData, title: e.target.value })}
                  className="text-lg font-semibold"
                />
              </div>

              <div className="space-y-3">
                {previewData.sections.map((section, sIdx) => (
                  <div key={sIdx} className="space-y-2 rounded-md border p-3">
                    <Input
                      value={section.title}
                      onChange={(e) => {
                        const sections = [...previewData.sections];
                        sections[sIdx] = { ...section, title: e.target.value };
                        setPreviewData({ ...previewData, sections });
                      }}
                      className="font-medium"
                    />
                    <Textarea
                      value={section.bullets.join('\n')}
                      onChange={(e) => {
                        const sections = [...previewData.sections];
                        sections[sIdx] = { ...section, bullets: e.target.value.split('\n').map(s => s.trim()).filter(Boolean) };
                        setPreviewData({ ...previewData, sections });
                      }}
                      rows={Math.max(3, section.bullets.length)}
                      placeholder="כל שורה = פריט נפרד"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setPreviewData({
                        ...previewData,
                        sections: previewData.sections.filter((_, i) => i !== sIdx),
                      })}
                    >
                      מחק סעיף
                    </Button>
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPreviewData({
                    ...previewData,
                    sections: [...previewData.sections, { title: 'סעיף חדש', bullets: [] }],
                  })}
                >
                  <Plus className="h-4 w-4 ml-1" />
                  הוסף סעיף
                </Button>
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">תמלול</Label>
                <Textarea
                  value={previewData.transcript}
                  onChange={(e) => setPreviewData({ ...previewData, transcript: e.target.value })}
                  rows={6}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 px-6 py-4 border-t bg-background">
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
          <div className="space-y-4 px-6 pb-6 overflow-y-auto">
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

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArticleType, KnowledgeArticle, useSaveArticle } from '@/hooks/useKnowledge';
import { useDepartments } from '@/hooks/useDepartments';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  article?: KnowledgeArticle | null;
}

export function ArticleDialog({ open, onOpenChange, article }: Props) {
  const { data: departments } = useDepartments();
  const save = useSaveArticle();

  const [title, setTitle] = useState('');
  const [articleType, setArticleType] = useState<ArticleType>('article');
  const [departmentId, setDepartmentId] = useState<string>('none');
  const [topic, setTopic] = useState('');
  const [summary, setSummary] = useState('');
  const [content, setContent] = useState('');
  const [isPinned, setIsPinned] = useState(false);
  const [isPublished, setIsPublished] = useState(true);

  useEffect(() => {
    if (open) {
      setTitle(article?.title || '');
      setArticleType((article?.article_type as ArticleType) || 'article');
      setDepartmentId(article?.department_id || 'none');
      setTopic(article?.topic || '');
      setSummary(article?.summary || '');
      setContent(article?.content || '');
      setIsPinned(article?.is_pinned || false);
      setIsPublished(article?.is_published ?? true);
    }
  }, [open, article]);

  const handleSave = async () => {
    if (!title.trim() || !topic.trim() || !content.trim()) return;
    await save.mutateAsync({
      id: article?.id,
      title: title.trim(),
      article_type: articleType,
      department_id: departmentId === 'none' ? null : departmentId,
      topic: topic.trim(),
      summary: summary.trim() || null,
      content,
      is_pinned: isPinned,
      is_published: isPublished,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle>{article ? 'עריכת מאמר' : 'מאמר חדש'}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label>כותרת *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>סוג *</Label>
              <Select value={articleType} onValueChange={(v) => setArticleType(v as ArticleType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="article">מאמר</SelectItem>
                  <SelectItem value="update">עדכון</SelectItem>
                  <SelectItem value="announcement">הודעה</SelectItem>
                  <SelectItem value="procedure">נוהל</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>מחלקה</Label>
              <Select value={departmentId} onValueChange={setDepartmentId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">כללי</SelectItem>
                  {departments?.map((d) => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-2">
            <Label>נושא * (לדוגמה: שכר, לוגיסטיקה)</Label>
            <Input value={topic} onChange={(e) => setTopic(e.target.value)} maxLength={100} />
          </div>

          <div className="grid gap-2">
            <Label>תקציר (עד 200 תווים)</Label>
            <Textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              maxLength={200}
              rows={2}
            />
          </div>

          <div className="grid gap-2">
            <Label>תוכן *</Label>
            <div dir="rtl" className="bg-background">
              <ReactQuill
                theme="snow"
                value={content}
                onChange={setContent}
                modules={{
                  toolbar: [
                    [{ header: [1, 2, 3, false] }],
                    ['bold', 'italic', 'underline', 'strike'],
                    [{ list: 'ordered' }, { list: 'bullet' }],
                    ['link', 'blockquote'],
                    [{ color: [] }, { background: [] }],
                    ['clean'],
                  ],
                }}
                style={{ minHeight: 200 }}
              />
            </div>
          </div>

          <div className="flex gap-6">
            <div className="flex items-center gap-2">
              <Switch checked={isPinned} onCheckedChange={setIsPinned} id="pinned" />
              <Label htmlFor="pinned">מוצמד לראש הדף</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={isPublished} onCheckedChange={setIsPublished} id="pub" />
              <Label htmlFor="pub">פורסם</Label>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>ביטול</Button>
          <Button onClick={handleSave} disabled={save.isPending}>
            {article ? 'שמור שינויים' : 'פרסם מאמר'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

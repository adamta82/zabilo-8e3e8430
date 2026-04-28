import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { KnowledgeFolder, useSaveFolder, useDeleteFolder } from '@/hooks/useKnowledgeFolders';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Trash2 } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  folder?: KnowledgeFolder | null;
  departmentId: string;
}

export function FolderDialog({ open, onOpenChange, folder, departmentId }: Props) {
  const save = useSaveFolder();
  const del = useDeleteFolder();
  const [name, setName] = useState('');

  useEffect(() => {
    if (open) setName(folder?.name || '');
  }, [open, folder]);

  const handleSave = async () => {
    if (!name.trim()) return;
    await save.mutateAsync({
      id: folder?.id,
      name: name.trim(),
      department_id: departmentId,
      icon: 'folder',
    });
    onOpenChange(false);
  };

  const handleDelete = async () => {
    if (!folder?.id) return;
    await del.mutateAsync(folder.id);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="max-w-md">
        <DialogHeader>
          <DialogTitle>{folder ? 'עריכת תיקייה' : 'תיקייה חדשה'}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-2 py-2">
          <Label>שם התיקייה *</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={100} autoFocus />
        </div>
        <DialogFooter className="flex-row justify-between sm:justify-between gap-2">
          <div>
            {folder && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm">
                    <Trash2 className="ml-2 h-4 w-4" /> מחק
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent dir="rtl">
                  <AlertDialogHeader>
                    <AlertDialogTitle>למחוק את התיקייה?</AlertDialogTitle>
                    <AlertDialogDescription>
                      התיקייה "{folder.name}" תימחק. המאמרים שבתוכה יישארו במחלקה ללא תיקייה.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>ביטול</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      מחק
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>ביטול</Button>
            <Button onClick={handleSave} disabled={save.isPending || !name.trim()}>
              {folder ? 'שמור' : 'צור תיקייה'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

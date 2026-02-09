import { useState } from 'react';
import { Plus, Edit, Trash2, Building2, Code, Megaphone, TrendingUp, Headphones, Users, Crown, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { LucideIcon } from 'lucide-react';
import { useDepartments, useCreateDepartment, useUpdateDepartment, useDeleteDepartment, type DepartmentWithCount } from '@/hooks/useDepartments';

// Icon mapping
const iconMap: Record<string, LucideIcon> = {
  'building': Building2,
  'code': Code,
  'megaphone': Megaphone,
  'trending-up': TrendingUp,
  'headphones': Headphones,
  'users': Users,
  'crown': Crown,
};

const iconOptions = [
  { value: 'building', label: 'בניין', Icon: Building2 },
  { value: 'code', label: 'קוד', Icon: Code },
  { value: 'megaphone', label: 'שיווק', Icon: Megaphone },
  { value: 'trending-up', label: 'מכירות', Icon: TrendingUp },
  { value: 'headphones', label: 'תמיכה', Icon: Headphones },
  { value: 'users', label: 'צוות', Icon: Users },
  { value: 'crown', label: 'הנהלה', Icon: Crown },
];

export default function Departments() {
  const { data: departments, isLoading } = useDepartments();
  const createDepartment = useCreateDepartment();
  const updateDepartment = useUpdateDepartment();
  const deleteDepartment = useDeleteDepartment();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<DepartmentWithCount | null>(null);
  const [deletingDepartment, setDeletingDepartment] = useState<DepartmentWithCount | null>(null);
  
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('building');

  const resetForm = () => {
    setName('');
    setIcon('building');
  };

  const handleCreate = async () => {
    await createDepartment.mutateAsync({ name, icon });
    setIsCreateDialogOpen(false);
    resetForm();
  };

  const handleUpdate = async () => {
    if (!editingDepartment) return;
    await updateDepartment.mutateAsync({
      id: editingDepartment.id,
      updates: { name, icon },
    });
    setEditingDepartment(null);
    resetForm();
  };

  const handleDelete = async () => {
    if (!deletingDepartment) return;
    await deleteDepartment.mutateAsync(deletingDepartment.id);
    setDeletingDepartment(null);
  };

  const openEditDialog = (dept: DepartmentWithCount) => {
    setName(dept.name);
    setIcon(dept.icon || 'building');
    setEditingDepartment(dept);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">ניהול מחלקות</h1>
          <p className="text-muted-foreground">צפה ונהל את המחלקות בארגון</p>
        </div>
        <Button className="gap-2" onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="h-4 w-4" />
          מחלקה חדשה
        </Button>
      </div>

      {/* Departments Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {departments?.map((department) => {
            const IconComponent = iconMap[department.icon || 'building'] || Building2;
            
            return (
              <Card key={department.id} className="group hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <IconComponent className="h-5 w-5" />
                      </div>
                      <CardTitle className="text-lg">{department.name}</CardTitle>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8"
                        onClick={() => openEditDialog(department)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-destructive"
                        onClick={() => setDeletingDepartment(department)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span>{department.employee_count} עובדים</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {departments?.length === 0 && !isLoading && (
        <div className="text-center py-12">
          <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">אין מחלקות</h3>
          <p className="text-muted-foreground mb-4">צור את המחלקה הראשונה שלך</p>
          <Button className="gap-2" onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="h-4 w-4" />
            מחלקה חדשה
          </Button>
        </div>
      )}

      {/* Stats */}
      {departments && departments.length > 0 && (
        <div className="text-sm text-muted-foreground">
          סה״כ {departments.length} מחלקות
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={(open) => {
        setIsCreateDialogOpen(open);
        if (!open) resetForm();
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>הוספת מחלקה חדשה</DialogTitle>
            <DialogDescription>
              הזן את פרטי המחלקה החדשה
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">שם המחלקה</Label>
              <Input 
                id="name" 
                placeholder="לדוגמה: פיתוח" 
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>אייקון</Label>
              <Select value={icon} onValueChange={setIcon}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {iconOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      <div className="flex items-center gap-2">
                        <opt.Icon className="h-4 w-4" />
                        {opt.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              ביטול
            </Button>
            <Button 
              onClick={handleCreate}
              disabled={!name || createDepartment.isPending}
            >
              {createDepartment.isPending ? 'שומר...' : 'שמירה'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingDepartment} onOpenChange={(open) => {
        if (!open) {
          setEditingDepartment(null);
          resetForm();
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>עריכת מחלקה</DialogTitle>
            <DialogDescription>
              עדכן את פרטי המחלקה
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">שם המחלקה</Label>
              <Input 
                id="edit-name" 
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>אייקון</Label>
              <Select value={icon} onValueChange={setIcon}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {iconOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      <div className="flex items-center gap-2">
                        <opt.Icon className="h-4 w-4" />
                        {opt.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingDepartment(null)}>
              ביטול
            </Button>
            <Button 
              onClick={handleUpdate}
              disabled={!name || updateDepartment.isPending}
            >
              {updateDepartment.isPending ? 'שומר...' : 'שמירה'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingDepartment} onOpenChange={(open) => !open && setDeletingDepartment(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>האם למחוק את המחלקה?</AlertDialogTitle>
            <AlertDialogDescription>
              פעולה זו תמחק את מחלקת {deletingDepartment?.name}. 
              {deletingDepartment?.employee_count ? (
                <span className="text-warning"> שים לב: יש {deletingDepartment.employee_count} עובדים במחלקה זו.</span>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ביטול</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteDepartment.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'מחיקה'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

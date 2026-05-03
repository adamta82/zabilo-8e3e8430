import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useUpdateEmployee, useEmployees, type EmployeeWithRole } from '@/hooks/useEmployees';
import { useDepartments } from '@/hooks/useDepartments';
import type { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

interface EditEmployeeDialogProps {
  employee: EmployeeWithRole | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditEmployeeDialog({ employee, open, onOpenChange }: EditEmployeeDialogProps) {
  const updateEmployee = useUpdateEmployee();
  const { data: departments } = useDepartments();
  const { data: employees } = useEmployees();
  
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [departmentId, setDepartmentId] = useState<string>('');
  const [approverId, setApproverId] = useState<string>('');
  const [role, setRole] = useState<AppRole>('employee');
  const [showInShifts, setShowInShifts] = useState(true);
  const [isPartner, setIsPartner] = useState(false);
  const [jobTitle, setJobTitle] = useState('');
  const [canManageShifts, setCanManageShifts] = useState(false);
  const [birthDay, setBirthDay] = useState<string>('');
  const [birthMonth, setBirthMonth] = useState<string>('');

  useEffect(() => {
    if (employee) {
      setFullName(employee.full_name);
      setPhone(employee.phone || '');
      setDepartmentId(employee.department_id || 'none');
      setApproverId(employee.approver_id || '');
      setRole(employee.user_roles?.[0]?.role || 'employee');
      setShowInShifts((employee as any).show_in_shifts !== false);
      setIsPartner((employee as any).is_partner || false);
      setJobTitle((employee as any).job_title || '');
      setCanManageShifts((employee as any).can_manage_shifts === true);
      const bd = (employee as any).birth_date as string | null;
      if (bd) {
        const [, m, d] = bd.split('-');
        setBirthDay(String(parseInt(d, 10)));
        setBirthMonth(String(parseInt(m, 10)));
      } else {
        setBirthDay('');
        setBirthMonth('');
      }
    }
  }, [employee]);

  const handleSubmit = async () => {
    if (!employee) return;

    let birth_date: string | null = null;
    if (birthDay && birthMonth) {
      const m = String(birthMonth).padStart(2, '0');
      const d = String(birthDay).padStart(2, '0');
      birth_date = `2000-${m}-${d}`;
    }

    await updateEmployee.mutateAsync({
      id: employee.id,
      updates: {
        full_name: fullName,
        phone: phone || null,
        department_id: departmentId === 'none' ? null : departmentId || null,
        approver_id: approverId || null,
        show_in_shifts: showInShifts,
        is_partner: isPartner,
        job_title: jobTitle || null,
        can_manage_shifts: canManageShifts,
        birth_date,
      } as any,
      newRole: role,
    });

    onOpenChange(false);
  };

  if (!employee) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle>עריכת עובד</DialogTitle>
          <DialogDescription>עדכן את פרטי העובד</DialogDescription>
        </DialogHeader>

        <div className="px-6 py-2 overflow-y-auto flex-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>שם מלא</Label>
            <Input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>אימייל</Label>
            <Input
              value={employee.email}
              disabled
              className="bg-muted"
              dir="ltr"
            />
          </div>

          <div className="space-y-2">
            <Label>טלפון</Label>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              dir="ltr"
              placeholder="054-1234567"
            />
          </div>

          <div className="space-y-2">
            <Label>כותרת תפקיד</Label>
            <Input
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              placeholder="לדוגמה: מנכ״ל, סמנכ״ל, ראש צוות..."
            />
          </div>

          <div className="space-y-2">
            <Label>תאריך לידה (יום וחודש)</Label>
            <div className="grid grid-cols-2 gap-2">
              <Select value={birthDay} onValueChange={setBirthDay}>
                <SelectTrigger>
                  <SelectValue placeholder="יום" />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                    <SelectItem key={d} value={String(d)}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={birthMonth} onValueChange={setBirthMonth}>
                <SelectTrigger>
                  <SelectValue placeholder="חודש" />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  {['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר'].map((name, i) => (
                    <SelectItem key={i+1} value={String(i+1)}>{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {(birthDay || birthMonth) && (
              <button
                type="button"
                className="text-xs text-muted-foreground hover:text-destructive"
                onClick={() => { setBirthDay(''); setBirthMonth(''); }}
              >
                נקה תאריך לידה
              </button>
            )}
          </div>

          <div className="space-y-2">
            <Label>מחלקה</Label>
            <Select value={departmentId} onValueChange={setDepartmentId}>
              <SelectTrigger>
                <SelectValue placeholder="בחר מחלקה" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">ללא מחלקה</SelectItem>
                {departments?.map((dept) => (
                  <SelectItem key={dept.id} value={dept.id}>
                    {dept.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>גורם מאשר</Label>
            <Select value={approverId || 'none'} onValueChange={(v) => setApproverId(v === 'none' ? '' : v)}>
              <SelectTrigger>
                <SelectValue placeholder="בחר גורם מאשר" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">ללא גורם מאשר</SelectItem>
                {employees?.filter(e => e.id !== employee?.id).map((emp) => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>תפקיד</Label>
            <Select value={role} onValueChange={(v) => setRole(v as AppRole)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="employee">עובד</SelectItem>
                <SelectItem value="admin">מנהל</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between py-2 sm:col-span-2">
            <Label htmlFor="show-in-shifts">הצג בניהול משמרות</Label>
            <Switch
              id="show-in-shifts"
              checked={showInShifts}
              onCheckedChange={setShowInShifts}
            />
          </div>

          <div className="flex items-center justify-between py-2 sm:col-span-2">
            <Label htmlFor="is-partner">שותף/ה בחברה</Label>
            <Switch
              id="is-partner"
              checked={isPartner}
              onCheckedChange={setIsPartner}
            />
          </div>

          <div className="flex items-center justify-between py-2 sm:col-span-2">
            <div className="space-y-0.5">
              <Label htmlFor="can-manage-shifts">הרשאה לשיבוץ משמרות</Label>
              <p className="text-xs text-muted-foreground">
                יאפשר לעובד גישה לעמוד שיבוץ המשמרות וניהולן
              </p>
            </div>
            <Switch
              id="can-manage-shifts"
              checked={canManageShifts}
              onCheckedChange={setCanManageShifts}
            />
          </div>
          </div>
        </div>

        <DialogFooter className="px-6 py-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            ביטול
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!fullName || updateEmployee.isPending}
          >
            {updateEmployee.isPending ? 'שומר...' : 'שמירה'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

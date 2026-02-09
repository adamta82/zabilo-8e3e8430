import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { useUpdateEmployee, type EmployeeWithRole } from '@/hooks/useEmployees';
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
  
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [departmentId, setDepartmentId] = useState<string>('');
  const [approverId, setApproverId] = useState<string>('');
  const [role, setRole] = useState<AppRole>('employee');

  useEffect(() => {
    if (employee) {
      setFullName(employee.full_name);
      setPhone(employee.phone || '');
      setDepartmentId(employee.department_id || '');
      setApproverId(employee.approver_id || '');
      setRole(employee.user_roles?.[0]?.role || 'employee');
    }
  }, [employee]);

  const handleSubmit = async () => {
    if (!employee) return;

    await updateEmployee.mutateAsync({
      id: employee.id,
      updates: {
        full_name: fullName,
        phone: phone || null,
        department_id: departmentId || null,
        approver_id: approverId || null,
      },
      newRole: role,
    });

    onOpenChange(false);
  };

  if (!employee) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>עריכת עובד</DialogTitle>
          <DialogDescription>
            עדכן את פרטי העובד
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
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
            <Label>מחלקה</Label>
            <Select value={departmentId} onValueChange={setDepartmentId}>
              <SelectTrigger>
                <SelectValue placeholder="בחר מחלקה" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">ללא מחלקה</SelectItem>
                {departments?.map((dept) => (
                  <SelectItem key={dept.id} value={dept.id}>
                    {dept.name}
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
        </div>

        <DialogFooter>
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

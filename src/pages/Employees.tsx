import { useState } from 'react';
import { Plus, Search, MoreHorizontal, Edit, Trash2, Shield, User, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { useEmployees, useDeleteEmployee, type EmployeeWithRole } from '@/hooks/useEmployees';
import { EditEmployeeDialog } from '@/components/employees/EditEmployeeDialog';

const getInitials = (name: string) => {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

export default function Employees() {
  const { data: employees, isLoading } = useEmployees();
  const deleteEmployee = useDeleteEmployee();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [editingEmployee, setEditingEmployee] = useState<EmployeeWithRole | null>(null);
  const [deletingEmployee, setDeletingEmployee] = useState<EmployeeWithRole | null>(null);

  const filteredEmployees = employees?.filter(employee =>
    employee.full_name.includes(searchQuery) ||
    employee.email.includes(searchQuery) ||
    employee.departments?.name?.includes(searchQuery)
  ) || [];

  const handleDelete = async () => {
    if (deletingEmployee) {
      await deleteEmployee.mutateAsync(deletingEmployee.id);
      setDeletingEmployee(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">ניהול עובדים</h1>
          <p className="text-muted-foreground">צפה ונהל את כל העובדים בארגון</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="חיפוש לפי שם, אימייל או מחלקה..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pr-9"
        />
      </div>

      {/* Employees Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">עובד</TableHead>
                  <TableHead className="text-right">אימייל</TableHead>
                  <TableHead className="text-right">טלפון</TableHead>
                  <TableHead className="text-right">מחלקה</TableHead>
                  <TableHead className="text-right">תפקיד</TableHead>
                  <TableHead className="text-right">פעולות</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEmployees.map((employee) => {
                  const role = employee.user_roles?.[0]?.role || 'employee';
                  
                  return (
                    <TableRow key={employee.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarFallback className="bg-primary/10 text-primary text-sm">
                              {getInitials(employee.full_name)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{employee.full_name}</span>
                        </div>
                      </TableCell>
                      <TableCell dir="ltr" className="text-left">
                        {employee.email}
                      </TableCell>
                      <TableCell dir="ltr" className="text-left">
                        {employee.phone || '-'}
                      </TableCell>
                      <TableCell>{employee.departments?.name || '-'}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            role === 'admin'
                              ? 'bg-primary/10 text-primary border-primary/30'
                              : 'bg-muted'
                          }
                        >
                          {role === 'admin' ? (
                            <>
                              <Shield className="h-3 w-3 ml-1" />
                              מנהל
                            </>
                          ) : (
                            <>
                              <User className="h-3 w-3 ml-1" />
                              עובד
                            </>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setEditingEmployee(employee)}>
                              <Edit className="h-4 w-4 ml-2" />
                              עריכה
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="text-destructive"
                              onClick={() => setDeletingEmployee(employee)}
                            >
                              <Trash2 className="h-4 w-4 ml-2" />
                              מחיקה
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {filteredEmployees.length === 0 && !isLoading && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">לא נמצאו עובדים</p>
        </div>
      )}

      {/* Stats */}
      <div className="text-sm text-muted-foreground">
        מציג {filteredEmployees.length} מתוך {employees?.length || 0} עובדים
      </div>

      {/* Edit Dialog */}
      <EditEmployeeDialog
        employee={editingEmployee}
        open={!!editingEmployee}
        onOpenChange={(open) => !open && setEditingEmployee(null)}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingEmployee} onOpenChange={(open) => !open && setDeletingEmployee(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>האם למחוק את העובד?</AlertDialogTitle>
            <AlertDialogDescription>
              פעולה זו תמחק את {deletingEmployee?.full_name} מהמערכת. לא ניתן לבטל פעולה זו.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ביטול</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteEmployee.isPending ? (
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

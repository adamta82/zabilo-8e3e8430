import { useState } from 'react';
import { Plus, Search, MoreHorizontal, Edit, Trash2, Shield, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// Mock data
const mockEmployees = [
  { id: '1', fullName: 'יוסי כהן', email: 'yossi@zabilo.com', phone: '054-1234567', department: 'פיתוח', role: 'admin' },
  { id: '2', fullName: 'שרה לוי', email: 'sara@zabilo.com', phone: '054-2345678', department: 'שיווק', role: 'employee' },
  { id: '3', fullName: 'דני אברהם', email: 'dani@zabilo.com', phone: '054-3456789', department: 'פיתוח', role: 'employee' },
  { id: '4', fullName: 'רחל גולד', email: 'rachel@zabilo.com', phone: '054-4567890', department: 'משאבי אנוש', role: 'admin' },
  { id: '5', fullName: 'משה ישראלי', email: 'moshe@zabilo.com', phone: '054-5678901', department: 'מכירות', role: 'employee' },
];

const getInitials = (name: string) => {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

export default function Employees() {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredEmployees = mockEmployees.filter(employee =>
    employee.fullName.includes(searchQuery) ||
    employee.email.includes(searchQuery) ||
    employee.department.includes(searchQuery)
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">ניהול עובדים</h1>
          <p className="text-muted-foreground">צפה ונהל את כל העובדים בארגון</p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          עובד חדש
        </Button>
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
              {filteredEmployees.map((employee) => (
                <TableRow key={employee.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarFallback className="bg-primary/10 text-primary text-sm">
                          {getInitials(employee.fullName)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{employee.fullName}</span>
                    </div>
                  </TableCell>
                  <TableCell dir="ltr" className="text-left">
                    {employee.email}
                  </TableCell>
                  <TableCell dir="ltr" className="text-left">
                    {employee.phone}
                  </TableCell>
                  <TableCell>{employee.department}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        employee.role === 'admin'
                          ? 'bg-primary/10 text-primary border-primary/30'
                          : 'bg-muted'
                      }
                    >
                      {employee.role === 'admin' ? (
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
                        <DropdownMenuItem>
                          <Edit className="h-4 w-4 ml-2" />
                          עריכה
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive">
                          <Trash2 className="h-4 w-4 ml-2" />
                          מחיקה
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {filteredEmployees.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">לא נמצאו עובדים</p>
        </div>
      )}

      {/* Stats */}
      <div className="text-sm text-muted-foreground">
        מציג {filteredEmployees.length} מתוך {mockEmployees.length} עובדים
      </div>
    </div>
  );
}

import { useState } from 'react';
import { Plus, Edit, Trash2, Building2, Code, Megaphone, TrendingUp, Headphones, Users, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LucideIcon } from 'lucide-react';

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

// Mock data
const mockDepartments = [
  { id: '1', name: 'הנהלה', icon: 'crown', employeeCount: 3 },
  { id: '2', name: 'פיתוח', icon: 'code', employeeCount: 12 },
  { id: '3', name: 'שיווק', icon: 'megaphone', employeeCount: 5 },
  { id: '4', name: 'מכירות', icon: 'trending-up', employeeCount: 8 },
  { id: '5', name: 'תמיכה', icon: 'headphones', employeeCount: 6 },
  { id: '6', name: 'משאבי אנוש', icon: 'users', employeeCount: 4 },
];

export default function Departments() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">ניהול מחלקות</h1>
          <p className="text-muted-foreground">צפה ונהל את המחלקות בארגון</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              מחלקה חדשה
            </Button>
          </DialogTrigger>
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
                <Input id="name" placeholder="לדוגמה: פיתוח" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                ביטול
              </Button>
              <Button onClick={() => setIsDialogOpen(false)}>
                שמירה
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Departments Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {mockDepartments.map((department) => {
          const IconComponent = iconMap[department.icon] || Building2;
          
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
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Users className="h-4 w-4" />
                  <span>{department.employeeCount} עובדים</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Stats */}
      <div className="text-sm text-muted-foreground">
        סה״כ {mockDepartments.length} מחלקות
      </div>
    </div>
  );
}

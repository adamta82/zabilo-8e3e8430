import { useState } from 'react';
import { Plus, Zap, Webhook, Mail, MoreHorizontal, Edit, Trash2, Power } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

// Mock data
const mockAutomations = [
  {
    id: '1',
    name: 'שליחת התראה לאחראי',
    trigger: 'request_created',
    actionType: 'webhook',
    requestTypes: ['wfh', 'vacation'],
    isActive: true,
  },
  {
    id: '2',
    name: 'מייל על אישור בקשה',
    trigger: 'request_approved',
    actionType: 'email',
    requestTypes: null,
    isActive: true,
  },
  {
    id: '3',
    name: 'התראת דחייה',
    trigger: 'request_rejected',
    actionType: 'webhook',
    requestTypes: ['vacation'],
    isActive: false,
  },
];

const triggerLabels: Record<string, string> = {
  request_created: 'יצירת בקשה',
  request_approved: 'אישור בקשה',
  request_rejected: 'דחיית בקשה',
};

const actionLabels: Record<string, { label: string; icon: typeof Webhook }> = {
  webhook: { label: 'Webhook', icon: Webhook },
  email: { label: 'מייל', icon: Mail },
};

const requestTypeLabels: Record<string, string> = {
  wfh: 'WFH',
  vacation: 'חופשה',
  equipment: 'ציוד',
  groceries: 'מצרכים',
};

export default function Automations() {
  const [automations, setAutomations] = useState(mockAutomations);

  const toggleAutomation = (id: string) => {
    setAutomations(prev =>
      prev.map(a =>
        a.id === id ? { ...a, isActive: !a.isActive } : a
      )
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">אוטומציות</h1>
          <p className="text-muted-foreground">הגדר פעולות אוטומטיות שיופעלו על פי אירועים</p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          אוטומציה חדשה
        </Button>
      </div>

      {/* Automations List */}
      <div className="space-y-4">
        {automations.map((automation) => {
          const ActionIcon = actionLabels[automation.actionType].icon;

          return (
            <Card
              key={automation.id}
              className={cn(
                'transition-opacity',
                !automation.isActive && 'opacity-60'
              )}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        'flex h-10 w-10 items-center justify-center rounded-lg',
                        automation.isActive
                          ? 'bg-primary/10 text-primary'
                          : 'bg-muted text-muted-foreground'
                      )}
                    >
                      <Zap className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{automation.name}</CardTitle>
                      <CardDescription className="flex items-center gap-2 mt-1">
                        <span>טריגר: {triggerLabels[automation.trigger]}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <ActionIcon className="h-3 w-3" />
                          {actionLabels[automation.actionType].label}
                        </span>
                      </CardDescription>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Switch
                      checked={automation.isActive}
                      onCheckedChange={() => toggleAutomation(automation.id)}
                    />
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
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">מסננים:</span>
                  {automation.requestTypes ? (
                    automation.requestTypes.map((type) => (
                      <Badge key={type} variant="outline" className="text-xs">
                        {requestTypeLabels[type]}
                      </Badge>
                    ))
                  ) : (
                    <Badge variant="outline" className="text-xs">
                      כל הבקשות
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {automations.length === 0 && (
        <Card className="py-12">
          <CardContent className="text-center">
            <Zap className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">אין אוטומציות</h3>
            <p className="text-muted-foreground mb-4">
              צור את האוטומציה הראשונה שלך כדי להתחיל
            </p>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              אוטומציה חדשה
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="flex gap-4 text-sm text-muted-foreground">
        <span>סה״כ: {automations.length}</span>
        <span>פעילות: {automations.filter(a => a.isActive).length}</span>
      </div>
    </div>
  );
}

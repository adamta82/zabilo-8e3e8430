import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { Home, Palmtree, Monitor, ShoppingCart, Clock, User, Calendar, FileText, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
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
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useUpdateRequestStatus, type RequestWithProfile } from '@/hooks/useRequests';
import type { Database } from '@/integrations/supabase/types';

type RequestStatus = Database['public']['Enums']['request_status'];

const TYPE_ICONS = {
  wfh: Home,
  vacation: Palmtree,
  equipment: Monitor,
  groceries: ShoppingCart,
};

const TYPE_LABELS = {
  wfh: 'עבודה מהבית',
  vacation: 'חופשה',
  equipment: 'ציוד משרדי',
  groceries: 'מצרכים',
};

const STATUS_LABELS: Record<RequestStatus, string> = {
  pending: 'ממתין לאישור',
  approved: 'מאושר',
  rejected: 'נדחה',
  ordered: 'הוזמן',
  supplied: 'סופק',
};

interface RequestDetailsDialogProps {
  request: RequestWithProfile | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RequestDetailsDialog({ request, open, onOpenChange }: RequestDetailsDialogProps) {
  const { isAdmin, profile } = useAuth();
  const updateStatus = useUpdateRequestStatus();

  if (!request) return null;

  // Check if current user is the approver for this request's submitter
  const isApprover = !!(profile && request.profiles?.approver_id === profile.id);
  const canChangeStatus = isAdmin || isApprover;

  if (!request) return null;

  const TypeIcon = TYPE_ICONS[request.type];

  const handleStatusChange = async (status: RequestStatus) => {
    await updateStatus.mutateAsync({ requestId: request.id, status });
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return format(new Date(dateStr), 'dd/MM/yyyy', { locale: he });
  };

  const getVacationDays = () => {
    if (!request.vacation_start_date || !request.vacation_end_date) return 0;
    const start = new Date(request.vacation_start_date);
    const end = new Date(request.vacation_end_date);
    const diff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return diff;
  };

  const getTotalHours = () => {
    if (!request.wfh_tasks) return 0;
    const tasks = request.wfh_tasks as Array<{ estimatedHours: number }>;
    return tasks.reduce((sum, task) => sum + (task.estimatedHours || 0), 0);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <TypeIcon className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle>{TYPE_LABELS[request.type]}</DialogTitle>
              <p className="text-sm text-muted-foreground">
                נוצר ב-{format(new Date(request.created_at), 'dd/MM/yyyy HH:mm', { locale: he })}
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Status */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">סטטוס</span>
            {canChangeStatus ? (
              <Select
                value={request.status}
                onValueChange={(v) => handleStatusChange(v as RequestStatus)}
                disabled={updateStatus.isPending}
              >
                <SelectTrigger className="w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">ממתין לאישור</SelectItem>
                  <SelectItem value="approved">מאושר</SelectItem>
                  <SelectItem value="rejected">נדחה</SelectItem>
                  <SelectItem value="ordered">הוזמן</SelectItem>
                  <SelectItem value="supplied">סופק</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <Badge
                variant="outline"
                className={cn(
                  request.status === 'pending' && 'bg-warning/10 text-warning border-warning/30',
                  request.status === 'approved' && 'bg-success/10 text-success border-success/30',
                  request.status === 'rejected' && 'bg-destructive/10 text-destructive border-destructive/30',
                  request.status === 'ordered' && 'bg-info/10 text-info border-info/30',
                  request.status === 'supplied' && 'bg-success/10 text-success border-success/30'
                )}
              >
                {STATUS_LABELS[request.status]}
              </Badge>
            )}
          </div>

          {/* User Info */}
          {request.profiles && (
            <div className="flex items-center gap-2 text-sm">
              <User className="h-4 w-4 text-muted-foreground" />
              <span>{request.profiles.full_name}</span>
              <span className="text-muted-foreground">({request.profiles.email})</span>
            </div>
          )}

          <Separator />

          {/* WFH Details */}
          {request.type === 'wfh' && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>תאריך: {formatDate(request.wfh_date)}</span>
              </div>

              {request.wfh_tasks && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">משימות מתוכננות</span>
                    <span className="text-muted-foreground">סה״כ {getTotalHours()} שעות</span>
                  </div>
                  <div className="space-y-1">
                    {(request.wfh_tasks as Array<{ description: string; estimatedHours: number; reference?: string }>).map((task, i) => (
                      <div key={i} className="flex items-center justify-between text-sm bg-muted/50 rounded px-3 py-2">
                        <div className="flex items-center gap-2">
                          <span>{task.description}</span>
                          {task.reference && (
                            <span className="text-muted-foreground text-xs">| רפרנט: {task.reference}</span>
                          )}
                        </div>
                        <span className="text-muted-foreground">{task.estimatedHours}ש׳</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {request.wfh_checklist && (
                <div className="space-y-1">
                  <span className="text-sm font-medium">אישורים</span>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(request.wfh_checklist as Record<string, boolean>).map(([key, checked]) => (
                      checked && (
                        <Badge key={key} variant="outline" className="gap-1 bg-success/10 text-success border-success/30">
                          <Check className="h-3 w-3" />
                          {key === 'equipment' && 'ציוד'}
                          {key === 'internet' && 'אינטרנט'}
                          {key === 'available' && 'זמינות'}
                          {key === 'tasks' && 'משימות'}
                        </Badge>
                      )
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Vacation Details */}
          {request.type === 'vacation' && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>
                  {formatDate(request.vacation_start_date)} - {formatDate(request.vacation_end_date)}
                </span>
                <Badge variant="outline">{getVacationDays()} ימים</Badge>
              </div>

              {request.vacation_reason && (
                <div className="flex items-start gap-2 text-sm">
                  <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <span>{request.vacation_reason}</span>
                </div>
              )}
            </div>
          )}

          {/* Equipment/Groceries Details */}
          {(request.type === 'equipment' || request.type === 'groceries') && request.items && (
            <div className="space-y-2">
              <span className="text-sm font-medium">
                {request.type === 'equipment' ? 'פריטי ציוד' : 'רשימת מצרכים'}
              </span>
              <div className="space-y-1">
                {(request.items as Array<{ name: string; quantity: number }>).map((item, i) => (
                  <div key={i} className="flex items-center justify-between text-sm bg-muted/50 rounded px-3 py-2">
                    <span>{item.name}</span>
                    <Badge variant="secondary">x{item.quantity}</Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {request.notes && (
            <>
              <Separator />
              <div className="space-y-1">
                <span className="text-sm font-medium">הערות</span>
                <p className="text-sm text-muted-foreground">{request.notes}</p>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            סגור
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

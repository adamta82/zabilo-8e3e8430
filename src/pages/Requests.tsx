import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Search, Filter, Clock, Check, X, Home, Palmtree, Monitor, ShoppingCart, Eye, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
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
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useRequests, useDeleteRequest, type RequestWithProfile } from '@/hooks/useRequests';
import { CreateRequestDialog } from '@/components/requests/CreateRequestDialog';
import { RequestDetailsDialog } from '@/components/requests/RequestDetailsDialog';
import type { Database } from '@/integrations/supabase/types';

type RequestType = Database['public']['Enums']['request_type'];
type RequestStatus = Database['public']['Enums']['request_status'];

const TYPE_LABELS: Record<RequestType, string> = {
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

const getTypeIcon = (type: RequestType) => {
  switch (type) {
    case 'wfh': return <Home className="h-4 w-4" />;
    case 'vacation': return <Palmtree className="h-4 w-4" />;
    case 'equipment': return <Monitor className="h-4 w-4" />;
    case 'groceries': return <ShoppingCart className="h-4 w-4" />;
  }
};

const getStatusIcon = (status: RequestStatus) => {
  switch (status) {
    case 'pending': return <Clock className="h-3 w-3" />;
    case 'approved':
    case 'supplied': return <Check className="h-3 w-3" />;
    case 'rejected': return <X className="h-3 w-3" />;
    case 'ordered': return <ShoppingCart className="h-3 w-3" />;
  }
};

export default function Requests() {
  const { data: requests, isLoading } = useRequests();
  const { user, isAdmin } = useAuth();
  const deleteRequest = useDeleteRequest();
  const [searchParams] = useSearchParams();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>(searchParams.get('type') || 'all');
  const [statusFilter, setStatusFilter] = useState<string>(searchParams.get('status') || 'all');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<RequestWithProfile | null>(null);
  const [deletingRequest, setDeletingRequest] = useState<RequestWithProfile | null>(null);

  const filteredRequests = requests?.filter(request => {
    if (typeFilter !== 'all' && request.type !== typeFilter) return false;
    if (statusFilter !== 'all' && request.status !== statusFilter) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const userName = request.profiles?.full_name?.toLowerCase() || '';
      return userName.includes(query);
    }
    return true;
  }) || [];

  const getRequestDateDisplay = (request: RequestWithProfile) => {
    if (request.type === 'wfh' && request.wfh_date) {
      return format(new Date(request.wfh_date + 'T00:00:00'), 'dd/MM/yyyy');
    }
    if (request.type === 'vacation' && request.vacation_start_date) {
      if (request.vacation_single_day || request.vacation_start_date === request.vacation_end_date) {
        return format(new Date(request.vacation_start_date + 'T00:00:00'), 'dd/MM/yyyy');
      }
      if (request.vacation_end_date) {
        return `${format(new Date(request.vacation_start_date + 'T00:00:00'), 'dd/MM')} - ${format(new Date(request.vacation_end_date + 'T00:00:00'), 'dd/MM/yyyy')}`;
      }
    }
    return '-';
  };

  const stats = {
    pending: requests?.filter(r => r.status === 'pending').length || 0,
    approved: requests?.filter(r => r.status === 'approved').length || 0,
    rejected: requests?.filter(r => r.status === 'rejected').length || 0,
    total: requests?.length || 0,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">בקשות</h1>
          <p className="text-muted-foreground">צפה ונהל בקשות</p>
        </div>
        <Button className="gap-2" onClick={() => setCreateDialogOpen(true)}>
          <Plus className="h-4 w-4" />
          בקשה חדשה
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">ממתינות</p>
                <p className="text-2xl font-bold text-warning">{stats.pending}</p>
              </div>
              <Clock className="h-8 w-8 text-warning/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">מאושרות</p>
                <p className="text-2xl font-bold text-success">{stats.approved}</p>
              </div>
              <Check className="h-8 w-8 text-success/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">נדחו</p>
                <p className="text-2xl font-bold text-destructive">{stats.rejected}</p>
              </div>
              <X className="h-8 w-8 text-destructive/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">סה״כ</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Filter className="h-8 w-8 text-muted-foreground/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="חיפוש לפי שם..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pr-9"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="סוג בקשה" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">כל הסוגים</SelectItem>
            <SelectItem value="wfh">עבודה מהבית</SelectItem>
            <SelectItem value="vacation">חופשה</SelectItem>
            <SelectItem value="equipment">ציוד משרדי</SelectItem>
            <SelectItem value="groceries">מצרכים</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="סטטוס" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">כל הסטטוסים</SelectItem>
            <SelectItem value="pending">ממתין לאישור</SelectItem>
            <SelectItem value="approved">מאושר</SelectItem>
            <SelectItem value="rejected">נדחה</SelectItem>
            <SelectItem value="ordered">הוזמן</SelectItem>
            <SelectItem value="supplied">סופק</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Requests Table */}
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
                  <TableHead className="text-right">סוג</TableHead>
                  <TableHead className="text-right">עובד</TableHead>
                  <TableHead className="text-right">תאריך</TableHead>
                  <TableHead className="text-right">סטטוס</TableHead>
                  <TableHead className="text-right">נוצר</TableHead>
                  <TableHead className="text-right">פעולות</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRequests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getTypeIcon(request.type)}
                        <span>{TYPE_LABELS[request.type]}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {request.profiles?.full_name || '-'}
                    </TableCell>
                    <TableCell>{getRequestDateDisplay(request)}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn(
                          'gap-1',
                          request.status === 'pending' && 'bg-warning/10 text-warning border-warning/30',
                          request.status === 'approved' && 'bg-success/10 text-success border-success/30',
                          request.status === 'rejected' && 'bg-destructive/10 text-destructive border-destructive/30',
                          request.status === 'ordered' && 'bg-info/10 text-info border-info/30',
                          request.status === 'supplied' && 'bg-success/10 text-success border-success/30'
                        )}
                      >
                        {getStatusIcon(request.status)}
                        {STATUS_LABELS[request.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(request.created_at), 'dd/MM/yyyy', { locale: he })}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="gap-2"
                          onClick={() => setSelectedRequest(request)}
                        >
                          <Eye className="h-4 w-4" />
                          צפה
                        </Button>
                        {(isAdmin || request.user_id === user?.id) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => setDeletingRequest(request)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {filteredRequests.length === 0 && !isLoading && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">לא נמצאו בקשות</p>
        </div>
      )}

      {/* Dialogs */}
      <CreateRequestDialog 
        open={createDialogOpen} 
        onOpenChange={setCreateDialogOpen} 
      />
      <RequestDetailsDialog
        request={selectedRequest}
        open={!!selectedRequest}
        onOpenChange={(open) => !open && setSelectedRequest(null)}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingRequest} onOpenChange={(open) => !open && setDeletingRequest(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>האם למחוק את הבקשה?</AlertDialogTitle>
            <AlertDialogDescription>
              פעולה זו תמחק את הבקשה לצמיתות. לא ניתן לבטל פעולה זו.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ביטול</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (deletingRequest) {
                  await deleteRequest.mutateAsync(deletingRequest.id);
                  setDeletingRequest(null);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              מחיקה
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

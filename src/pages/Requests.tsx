import { useState } from 'react';
import { Plus, Search, Filter, Clock, Check, X, Home, Palmtree, Monitor, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { 
  REQUEST_TYPE_LABELS, 
  REQUEST_STATUS_LABELS, 
  REQUEST_STATUS_COLORS,
  type RequestType,
  type RequestStatus 
} from '@/types/database';

// Mock data
const mockRequests = [
  { id: '1', type: 'wfh' as RequestType, status: 'pending' as RequestStatus, date: '2026-02-08', createdAt: '2026-02-07' },
  { id: '2', type: 'vacation' as RequestType, status: 'approved' as RequestStatus, date: '2026-02-10 - 2026-02-12', createdAt: '2026-02-05' },
  { id: '3', type: 'equipment' as RequestType, status: 'ordered' as RequestStatus, date: '-', createdAt: '2026-02-03' },
  { id: '4', type: 'wfh' as RequestType, status: 'rejected' as RequestStatus, date: '2026-02-06', createdAt: '2026-02-04' },
  { id: '5', type: 'groceries' as RequestType, status: 'supplied' as RequestStatus, date: '-', createdAt: '2026-02-01' },
];

const getTypeIcon = (type: RequestType) => {
  switch (type) {
    case 'wfh':
      return <Home className="h-4 w-4" />;
    case 'vacation':
      return <Palmtree className="h-4 w-4" />;
    case 'equipment':
      return <Monitor className="h-4 w-4" />;
    case 'groceries':
      return <ShoppingCart className="h-4 w-4" />;
  }
};

const getStatusIcon = (status: RequestStatus) => {
  switch (status) {
    case 'pending':
      return <Clock className="h-3 w-3" />;
    case 'approved':
    case 'supplied':
      return <Check className="h-3 w-3" />;
    case 'rejected':
      return <X className="h-3 w-3" />;
    case 'ordered':
      return <ShoppingCart className="h-3 w-3" />;
  }
};

export default function Requests() {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredRequests = mockRequests.filter(request => {
    if (typeFilter !== 'all' && request.type !== typeFilter) return false;
    if (statusFilter !== 'all' && request.status !== statusFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">הבקשות שלי</h1>
          <p className="text-muted-foreground">צפה ונהל את כל הבקשות שלך</p>
        </div>
        <Button className="gap-2">
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
                <p className="text-2xl font-bold text-warning">1</p>
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
                <p className="text-2xl font-bold text-success">2</p>
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
                <p className="text-2xl font-bold text-destructive">1</p>
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
                <p className="text-2xl font-bold">5</p>
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
            placeholder="חיפוש..."
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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">סוג</TableHead>
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
                      <span>{REQUEST_TYPE_LABELS[request.type]}</span>
                    </div>
                  </TableCell>
                  <TableCell>{request.date}</TableCell>
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
                      {REQUEST_STATUS_LABELS[request.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {request.createdAt}
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm">
                      צפה
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {filteredRequests.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">לא נמצאו בקשות</p>
        </div>
      )}
    </div>
  );
}

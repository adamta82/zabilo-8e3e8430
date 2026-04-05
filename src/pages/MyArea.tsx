import { useState } from 'react';
import {
  User, FileText, Receipt, Briefcase, Calendar, Phone, Mail,
  MapPin, Clock, Download, Trash2, Upload, Shield, Heart,
  TrendingUp, Award, Loader2, Eye
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useRequests, type RequestWithProfile } from '@/hooks/useRequests';
import { useEmployeeDocuments, useDownloadDocument, useDeleteDocument, DOCUMENT_TYPE_LABELS, type DocumentType } from '@/hooks/useEmployeeDocuments';
import { useShifts } from '@/hooks/useShifts';
import { REQUEST_TYPE_LABELS, REQUEST_STATUS_LABELS } from '@/types/database';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

const getInitials = (name: string) =>
  name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

const statusColor = (status: string) => {
  switch (status) {
    case 'approved': return 'bg-success/10 text-success border-success/30';
    case 'rejected': return 'bg-destructive/10 text-destructive border-destructive/30';
    case 'pending': return 'bg-warning/10 text-warning border-warning/30';
    case 'ordered': return 'bg-info/10 text-info border-info/30';
    case 'supplied': return 'bg-success/10 text-success border-success/30';
    default: return 'bg-muted';
  }
};

const docTypeIcon: Record<DocumentType, typeof FileText> = {
  form_101: FileText,
  pay_slip: Receipt,
  contract: Briefcase,
  certificate: User,
  other: FileText,
};

export default function MyArea() {
  const { user, profile, isAdmin, refreshProfile } = useAuth();
  const { data: allRequests, isLoading: requestsLoading } = useRequests();
  const { data: documents, isLoading: docsLoading } = useEmployeeDocuments(profile?.id);
  const { data: shifts } = useShifts();
  const downloadDocument = useDownloadDocument();
  const deleteDocument = useDeleteDocument();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [editingPersonal, setEditingPersonal] = useState(false);
  const [personalForm, setPersonalForm] = useState({
    phone: '',
    address: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
  });

  // Filter only current user's requests
  const myRequests = allRequests?.filter(r => r.user_id === user?.id) || [];

  // Upcoming shifts for this user
  const today = new Date().toISOString().split('T')[0];
  const myShifts = shifts?.filter(s =>
    s.employee_id === profile?.id && s.date >= today
  ).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 5) || [];

  // Stats
  const pendingCount = myRequests.filter(r => r.status === 'pending').length;
  const approvedCount = myRequests.filter(r => r.status === 'approved').length;
  const totalRequests = myRequests.length;

  const startEditPersonal = () => {
    setPersonalForm({
      phone: (profile as any)?.phone || '',
      address: (profile as any)?.address || '',
      emergency_contact_name: (profile as any)?.emergency_contact_name || '',
      emergency_contact_phone: (profile as any)?.emergency_contact_phone || '',
    });
    setEditingPersonal(true);
  };

  const savePersonal = async () => {
    if (!profile) return;
    const { error } = await supabase
      .from('profiles')
      .update({
        phone: personalForm.phone || null,
        address: personalForm.address || null,
        emergency_contact_name: personalForm.emergency_contact_name || null,
        emergency_contact_phone: personalForm.emergency_contact_phone || null,
      } as any)
      .eq('id', profile.id);

    if (error) {
      toast({ title: 'שגיאה בעדכון הפרטים', variant: 'destructive' });
    } else {
      toast({ title: 'הפרטים עודכנו בהצלחה' });
      setEditingPersonal(false);
      await refreshProfile();
    }
  };

  const hireDate = (profile as any)?.hire_date;
  const tenure = hireDate
    ? Math.floor((Date.now() - new Date(hireDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    : null;

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <Card className="overflow-hidden">
        <div className="h-24 bg-gradient-to-l from-primary/80 to-primary" />
        <CardContent className="relative pb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4 -mt-12">
            <Avatar className="h-20 w-20 border-4 border-card shadow-lg">
              <AvatarImage src={profile?.avatar_url || undefined} />
              <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                {profile?.full_name ? getInitials(profile.full_name) : 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h1 className="text-2xl font-bold">{profile?.full_name || 'משתמש'}</h1>
              <div className="flex flex-wrap gap-2 mt-1">
                {(profile as any)?.job_title && (
                  <Badge variant="outline" className="bg-violet-500/10 text-violet-600 border-violet-500/30">
                    {(profile as any).job_title}
                  </Badge>
                )}
                <Badge variant="outline" className={isAdmin ? 'bg-primary/10 text-primary border-primary/30' : 'bg-muted'}>
                  <Shield className="h-3 w-3 ml-1" />
                  {isAdmin ? 'מנהל' : 'עובד'}
                </Badge>
                {tenure !== null && (
                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                    <TrendingUp className="h-3 w-3 ml-1" />
                    {tenure > 0 ? `${tenure} שנות ותק` : 'פחות משנה'}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-primary">{totalRequests}</p>
            <p className="text-sm text-muted-foreground">סך הבקשות</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-warning">{pendingCount}</p>
            <p className="text-sm text-muted-foreground">ממתינות</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-success">{approvedCount}</p>
            <p className="text-sm text-muted-foreground">מאושרות</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-info">{myShifts.length}</p>
            <p className="text-sm text-muted-foreground">משמרות קרובות</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="overview" dir="rtl">
        <TabsList className="w-full justify-start flex-wrap h-auto gap-1">
          <TabsTrigger value="overview">סקירה כללית</TabsTrigger>
          <TabsTrigger value="requests">היסטוריית בקשות</TabsTrigger>
          <TabsTrigger value="documents">מסמכים</TabsTrigger>
          <TabsTrigger value="personal">פרטים אישיים</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4 mt-4">
          <div className="grid md:grid-cols-2 gap-4">
            {/* Recent Requests */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  בקשות אחרונות
                </CardTitle>
              </CardHeader>
              <CardContent>
                {requestsLoading ? (
                  <div className="space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div>
                ) : myRequests.length === 0 ? (
                  <p className="text-muted-foreground text-sm text-center py-4">אין בקשות</p>
                ) : (
                  <div className="space-y-2">
                    {myRequests.slice(0, 5).map(req => (
                      <div key={req.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                        <div>
                          <span className="text-sm font-medium">{REQUEST_TYPE_LABELS[req.type]}</span>
                          <p className="text-xs text-muted-foreground">
                            {new Date(req.created_at).toLocaleDateString('he-IL')}
                          </p>
                        </div>
                        <Badge variant="outline" className={statusColor(req.status)}>
                          {REQUEST_STATUS_LABELS[req.status]}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Upcoming Shifts */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  משמרות קרובות
                </CardTitle>
              </CardHeader>
              <CardContent>
                {myShifts.length === 0 ? (
                  <p className="text-muted-foreground text-sm text-center py-4">אין משמרות קרובות</p>
                ) : (
                  <div className="space-y-2">
                    {myShifts.map(shift => (
                      <div key={shift.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                        <span className="text-sm font-medium">
                          {new Date(shift.date).toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' })}
                        </span>
                        <Badge variant="outline" className="bg-info/10 text-info border-info/30">
                          {shift.start_time} - {shift.end_time}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Contact Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                פרטי קשר
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">אימייל</p>
                    <p className="text-sm" dir="ltr">{profile?.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">טלפון</p>
                    <p className="text-sm" dir="ltr">{profile?.phone || 'לא הוגדר'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">כתובת</p>
                    <p className="text-sm">{(profile as any)?.address || 'לא הוגדרה'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">תאריך תחילת עבודה</p>
                    <p className="text-sm">
                      {hireDate ? new Date(hireDate).toLocaleDateString('he-IL') : 'לא הוגדר'}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Requests History Tab */}
        <TabsContent value="requests" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">היסטוריית בקשות</CardTitle>
            </CardHeader>
            <CardContent>
              {requestsLoading ? (
                <div className="space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
              ) : myRequests.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">לא הוגשו בקשות עדיין</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-right">סוג</TableHead>
                        <TableHead className="text-right">תאריך הגשה</TableHead>
                        <TableHead className="text-right">פרטים</TableHead>
                        <TableHead className="text-right">סטטוס</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {myRequests.map(req => (
                        <TableRow key={req.id}>
                          <TableCell className="font-medium">{REQUEST_TYPE_LABELS[req.type]}</TableCell>
                          <TableCell>{new Date(req.created_at).toLocaleDateString('he-IL')}</TableCell>
                          <TableCell className="text-muted-foreground text-sm max-w-[200px] truncate">
                            {req.type === 'vacation' && req.vacation_start_date
                              ? `${new Date(req.vacation_start_date).toLocaleDateString('he-IL')}${req.vacation_end_date ? ` - ${new Date(req.vacation_end_date).toLocaleDateString('he-IL')}` : ''}`
                              : req.type === 'wfh' && req.wfh_date
                                ? new Date(req.wfh_date).toLocaleDateString('he-IL')
                                : req.notes || '-'}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={statusColor(req.status)}>
                              {REQUEST_STATUS_LABELS[req.status]}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5" />
                המסמכים שלי
              </CardTitle>
            </CardHeader>
            <CardContent>
              {docsLoading ? (
                <div className="space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
              ) : !documents || documents.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                  <p className="text-muted-foreground">אין מסמכים עדיין</p>
                  <p className="text-xs text-muted-foreground mt-1">מסמכים יועלו על ידי ההנהלה</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Group by type */}
                  {(['form_101', 'pay_slip', 'contract', 'certificate', 'other'] as DocumentType[]).map(type => {
                    const typeDocs = documents.filter(d => d.document_type === type);
                    if (typeDocs.length === 0) return null;
                    const Icon = docTypeIcon[type];
                    return (
                      <div key={type}>
                        <h3 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-2">
                          <Icon className="h-4 w-4" />
                          {DOCUMENT_TYPE_LABELS[type]}
                        </h3>
                        <div className="space-y-1">
                          {typeDocs.map(doc => (
                            <div key={doc.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                              <div>
                                <p className="text-sm font-medium">{doc.file_name}</p>
                                <div className="flex gap-3 text-xs text-muted-foreground">
                                  {doc.document_date && (
                                    <span>{new Date(doc.document_date).toLocaleDateString('he-IL')}</span>
                                  )}
                                  {doc.description && <span>{doc.description}</span>}
                                </div>
                              </div>
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  title="צפייה"
                                  onClick={() => downloadDocument(doc)}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  title="הורדה"
                                  onClick={async () => {
                                    const { data, error } = await supabase.storage
                                      .from('employee-documents')
                                      .createSignedUrl(doc.file_path, 60, { download: true });
                                    if (!error && data) window.open(data.signedUrl, '_blank');
                                  }}
                                >
                                  <Download className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Personal Details Tab */}
        <TabsContent value="personal" className="mt-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <User className="h-5 w-5 text-primary" />
                    פרטים אישיים
                  </CardTitle>
                  {!editingPersonal ? (
                    <Button variant="outline" size="sm" onClick={startEditPersonal}>
                      עריכה
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => setEditingPersonal(false)}>ביטול</Button>
                      <Button size="sm" onClick={savePersonal}>שמירה</Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {editingPersonal ? (
                  <>
                    <div className="space-y-2">
                      <Label>טלפון</Label>
                      <Input dir="ltr" value={personalForm.phone} onChange={e => setPersonalForm(f => ({ ...f, phone: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label>כתובת</Label>
                      <Input value={personalForm.address} onChange={e => setPersonalForm(f => ({ ...f, address: e.target.value }))} />
                    </div>
                  </>
                ) : (
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">שם מלא</span>
                      <span className="text-sm font-medium">{profile?.full_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">אימייל</span>
                      <span className="text-sm font-medium" dir="ltr">{profile?.email}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">טלפון</span>
                      <span className="text-sm font-medium" dir="ltr">{profile?.phone || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">כתובת</span>
                      <span className="text-sm font-medium">{(profile as any)?.address || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">תאריך תחילת עבודה</span>
                      <span className="text-sm font-medium">
                        {hireDate ? new Date(hireDate).toLocaleDateString('he-IL') : '-'}
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Heart className="h-5 w-5 text-destructive" />
                    איש קשר לחירום
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                {editingPersonal ? (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>שם איש קשר</Label>
                      <Input value={personalForm.emergency_contact_name} onChange={e => setPersonalForm(f => ({ ...f, emergency_contact_name: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label>טלפון איש קשר</Label>
                      <Input dir="ltr" value={personalForm.emergency_contact_phone} onChange={e => setPersonalForm(f => ({ ...f, emergency_contact_phone: e.target.value }))} />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">שם</span>
                      <span className="text-sm font-medium">{(profile as any)?.emergency_contact_name || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">טלפון</span>
                      <span className="text-sm font-medium" dir="ltr">{(profile as any)?.emergency_contact_phone || '-'}</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

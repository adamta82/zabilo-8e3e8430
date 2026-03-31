import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Crown, Star, Building2, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface OrgEmployee {
  id: string;
  full_name: string;
  job_title: string | null;
  is_partner: boolean;
  department_id: string | null;
  approver_id: string | null;
  role: string;
}

interface OrgDepartment {
  id: string;
  name: string;
  icon: string | null;
  manager_id: string | null;
}

const getInitials = (name: string) =>
  name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

function PersonCard({ person, isManager = false, isCEO = false }: { person: OrgEmployee; isManager?: boolean; isCEO?: boolean }) {
  return (
    <Card className={cn(
      'flex items-center gap-3 px-4 py-3 transition-shadow hover:shadow-md border',
      isCEO && 'border-primary/40 bg-primary/5 shadow-sm',
      isManager && !isCEO && 'border-accent/40 bg-accent/5',
    )}>
      <Avatar className={cn('h-10 w-10', isCEO && 'ring-2 ring-primary/30')}>
        <AvatarFallback className={cn(
          'text-sm font-medium',
          isCEO ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
        )}>
          {getInitials(person.full_name)}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={cn('font-medium text-sm', isCEO && 'font-bold')}>{person.full_name}</span>
          {person.is_partner && (
            <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30 text-[10px] py-0">
              <Star className="h-2.5 w-2.5 ml-0.5" />
              שותף
            </Badge>
          )}
        </div>
        {person.job_title && (
          <p className="text-xs text-muted-foreground">{person.job_title}</p>
        )}
      </div>
    </Card>
  );
}

function DepartmentSection({ department, employees, allEmployees }: { 
  department: OrgDepartment; 
  employees: OrgEmployee[];
  allEmployees: OrgEmployee[];
}) {
  const [isOpen, setIsOpen] = useState(true);
  const manager = department.manager_id 
    ? allEmployees.find(e => e.id === department.manager_id) 
    : null;
  const nonManagerEmployees = employees.filter(e => e.id !== department.manager_id);

  return (
    <div className="space-y-2">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 w-full text-right group"
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Building2 className="h-4 w-4" />
        </div>
        <h3 className="font-semibold text-base flex-1">{department.name}</h3>
        <Badge variant="secondary" className="text-xs">{employees.length}</Badge>
        <ChevronDown className={cn(
          'h-4 w-4 text-muted-foreground transition-transform',
          !isOpen && '-rotate-90'
        )} />
      </button>

      {isOpen && (
        <div className="pr-5 border-r-2 border-primary/20 mr-4 space-y-2">
          {manager && (
            <div>
              <p className="text-[11px] text-muted-foreground font-medium mb-1 pr-2">מנהל/ת מחלקה</p>
              <PersonCard person={manager} isManager />
            </div>
          )}
          
          {nonManagerEmployees.length > 0 && (
            <div className="space-y-1.5">
              {manager && <p className="text-[11px] text-muted-foreground font-medium pr-2 mt-2">עובדים</p>}
              {nonManagerEmployees.map(emp => (
                <PersonCard key={emp.id} person={emp} />
              ))}
            </div>
          )}

          {employees.length === 0 && (
            <p className="text-sm text-muted-foreground pr-2 py-2">אין עובדים במחלקה</p>
          )}
        </div>
      )}
    </div>
  );
}

export default function OrgChart() {
  const { data, isLoading } = useQuery({
    queryKey: ['org-chart'],
    queryFn: async () => {
      const [profilesRes, deptsRes, rolesRes] = await Promise.all([
        supabase.from('profiles').select('id, full_name, job_title, is_partner, department_id, approver_id').order('full_name'),
        supabase.from('departments').select('id, name, icon, manager_id').order('name'),
        supabase.from('user_roles').select('user_id, role'),
      ]);

      if (profilesRes.error) throw profilesRes.error;
      if (deptsRes.error) throw deptsRes.error;

      const roleMap = new Map((rolesRes.data || []).map(r => [r.user_id, r.role]));

      // Need user_id mapping - fetch it
      const profilesWithUserId = await supabase.from('profiles').select('id, user_id');
      const userIdMap = new Map((profilesWithUserId.data || []).map(p => [p.id, p.user_id]));

      const employees: OrgEmployee[] = (profilesRes.data as any[]).map(p => ({
        ...p,
        role: roleMap.get(userIdMap.get(p.id) || '') || 'employee',
      }));

      return {
        employees,
        departments: deptsRes.data as OrgDepartment[],
      };
    },
  });

  const ceo = data?.employees.find(e => e.job_title?.includes('מנכ'));
  const departments = data?.departments || [];
  const employees = data?.employees || [];

  // Group employees by department
  const employeesByDept = new Map<string, OrgEmployee[]>();
  const unassigned: OrgEmployee[] = [];
  
  for (const emp of employees) {
    if (emp.id === ceo?.id) continue; // CEO shown separately at top
    if (emp.department_id) {
      const list = employeesByDept.get(emp.department_id) || [];
      list.push(emp);
      employeesByDept.set(emp.department_id, list);
    } else {
      unassigned.push(emp);
    }
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">מבנה ארגוני</h1>
        <p className="text-muted-foreground">עץ ההיררכיה של הארגון</p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* CEO at top */}
          {ceo && (
            <div className="flex flex-col items-center">
              <p className="text-[11px] text-muted-foreground font-medium mb-1">
                <Crown className="h-3.5 w-3.5 inline ml-1 text-primary" />
                מנכ״ל
              </p>
              <div className="w-full max-w-sm">
                <PersonCard person={ceo} isCEO />
              </div>
              {/* Connector line */}
              <div className="w-0.5 h-6 bg-primary/20" />
            </div>
          )}

          {/* Departments */}
          <div className="space-y-4">
            {departments.map(dept => (
              <DepartmentSection
                key={dept.id}
                department={dept}
                employees={employeesByDept.get(dept.id) || []}
                allEmployees={employees}
              />
            ))}
          </div>

          {/* Unassigned */}
          {unassigned.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-semibold text-base text-muted-foreground">ללא מחלקה</h3>
              <div className="space-y-1.5 pr-5 mr-4">
                {unassigned.map(emp => (
                  <PersonCard key={emp.id} person={emp} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
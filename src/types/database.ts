// Database types for Zabilo Book

export type AppRole = 'admin' | 'employee';
export type RequestType = 'wfh' | 'vacation' | 'equipment' | 'groceries';
export type RequestStatus = 'pending' | 'approved' | 'rejected' | 'ordered' | 'supplied';
export type AutomationTrigger = 'request_created' | 'request_approved' | 'request_rejected';
export type AutomationAction = 'webhook' | 'email';

export interface Department {
  id: string;
  name: string;
  icon: string;
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
}

export interface Profile {
  id: string;
  user_id: string;
  username: string;
  full_name: string;
  email: string;
  phone: string | null;
  department_id: string | null;
  approver_id: string | null;
  calendar_emails: string[];
  avatar_url: string | null;
  address: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  hire_date: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  department?: Department;
  approver?: Profile;
}

export interface WfhTask {
  task: string;
  hours: number;
}

export interface WfhChecklist {
  has_internet: boolean;
  has_quiet_space: boolean;
  has_equipment: boolean;
  available_on_phone: boolean;
}

export interface RequestItem {
  name: string;
  quantity: number;
}

export interface Request {
  id: string;
  user_id: string;
  type: RequestType;
  status: RequestStatus;
  
  // WFH specific
  wfh_date: string | null;
  wfh_tasks: WfhTask[] | null;
  wfh_checklist: WfhChecklist | null;
  
  // Vacation specific
  vacation_start_date: string | null;
  vacation_end_date: string | null;
  vacation_reason: string | null;
  
  // Equipment/Groceries specific
  items: RequestItem[] | null;
  
  notes: string | null;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
  
  // Joined fields
  user?: Profile;
  approver?: Profile;
}

export interface GlobalSetting {
  id: string;
  key: string;
  value: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Automation {
  id: string;
  name: string;
  trigger: AutomationTrigger;
  request_type_filter: RequestType[] | null;
  action_type: AutomationAction;
  webhook_url: string | null;
  webhook_headers: Record<string, string>;
  email_to_approver: boolean;
  payload_template: Record<string, unknown> | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Request type labels in Hebrew
export const REQUEST_TYPE_LABELS: Record<RequestType, string> = {
  wfh: 'עבודה מהבית',
  vacation: 'חופשה',
  equipment: 'ציוד משרדי',
  groceries: 'מצרכים',
};

// Request status labels in Hebrew
export const REQUEST_STATUS_LABELS: Record<RequestStatus, string> = {
  pending: 'ממתין לאישור',
  approved: 'מאושר',
  rejected: 'נדחה',
  ordered: 'הוזמן',
  supplied: 'סופק',
};

// Request status colors
export const REQUEST_STATUS_COLORS: Record<RequestStatus, string> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'destructive',
  ordered: 'info',
  supplied: 'success',
};

// WFH checklist labels in Hebrew
export const WFH_CHECKLIST_LABELS: Record<keyof WfhChecklist, string> = {
  has_internet: 'יש לי חיבור אינטרנט יציב',
  has_quiet_space: 'יש לי מקום שקט לעבודה',
  has_equipment: 'יש לי את כל הציוד הנדרש',
  available_on_phone: 'אהיה זמין/ה בטלפון לאורך כל היום',
};

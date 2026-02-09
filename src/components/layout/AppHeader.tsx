import { SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage } from '@/components/ui/breadcrumb';
import { useLocation } from 'react-router-dom';
const pageTitles: Record<string, string> = {
  '/': 'לוח ארגוני',
  '/requests': 'הבקשות שלי',
  '/employees': 'ניהול עובדים',
  '/departments': 'ניהול מחלקות',
  '/settings': 'הגדרות',
  '/automations': 'אוטומציות'
};
export function AppHeader() {
  const location = useLocation();
  const pageTitle = pageTitles[location.pathname] || 'Zabilo Book';
  return;
}
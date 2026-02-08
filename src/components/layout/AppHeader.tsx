import { SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from '@/components/ui/breadcrumb';
import { useLocation } from 'react-router-dom';

const pageTitles: Record<string, string> = {
  '/': 'לוח ארגוני',
  '/requests': 'הבקשות שלי',
  '/employees': 'ניהול עובדים',
  '/departments': 'ניהול מחלקות',
  '/settings': 'הגדרות',
  '/automations': 'אוטומציות',
};

export function AppHeader() {
  const location = useLocation();
  const pageTitle = pageTitles[location.pathname] || 'Zabilo Book';

  return (
    <header className="flex h-16 shrink-0 items-center gap-2 border-b bg-background px-4">
      <SidebarTrigger className="-mr-1" />
      <Separator orientation="vertical" className="ml-2 h-4" />
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbPage className="text-lg font-semibold">
              {pageTitle}
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    </header>
  );
}

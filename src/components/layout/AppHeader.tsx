import { SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage } from '@/components/ui/breadcrumb';
import { useLocation } from 'react-router-dom';

const pageTitles: Record<string, string> = {
  '/': 'מרכז הידע',
  '/dashboard': 'לוח שנה',
  '/knowledge/tracking': 'מעקב קריאה',
  '/requests': 'הבקשות שלי',
  '/employees': 'ניהול עובדים',
  '/departments': 'ניהול מחלקות',
  '/settings': 'הגדרות',
  '/automations': 'אוטומציות',
  '/shifts': 'שיבוץ משמרות',
  '/org-chart': 'מבנה ארגוני',
  '/my-area': 'האזור שלי',
};

export function AppHeader() {
  const location = useLocation();
  let pageTitle = pageTitles[location.pathname];
  if (!pageTitle) {
    if (location.pathname.startsWith('/knowledge/')) pageTitle = 'מאמר';
    else pageTitle = 'Zabilo Book';
  }
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 sm:gap-4 border-b bg-background/95 backdrop-blur px-3 sm:px-6">
      <SidebarTrigger />
      <Separator orientation="vertical" className="h-6" />
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbPage className="text-sm sm:text-base font-semibold truncate max-w-[180px] sm:max-w-none">
              {pageTitle}
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    </header>
  );
}

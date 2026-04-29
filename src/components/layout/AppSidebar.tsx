import { Link, useLocation } from 'react-router-dom';
import {
  CalendarDays,
  FileText,
  Users,
  Building2,
  Settings,
  LogOut,
  ClipboardList,
  Network,
  UserCircle,
  BookOpen,
  BarChart2,
  Sunrise,
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useUnreadCount } from '@/hooks/useKnowledge';

const mainMenuItems = [
  { title: 'מרכז הידע', url: '/', icon: BookOpen, showBadge: true },
  { title: 'לוח שנה', url: '/dashboard', icon: CalendarDays },
  { title: 'הבקשות שלי', url: '/requests', icon: FileText },
  { title: 'מבנה ארגוני', url: '/org-chart', icon: Network },
  { title: 'האזור שלי', url: '/my-area', icon: UserCircle },
];

const adminMenuItems = [
  { title: 'שיבוץ משמרות', url: '/shifts', icon: ClipboardList },
  { title: 'ניהול עובדים', url: '/employees', icon: Users },
  { title: 'ניהול מחלקות', url: '/departments', icon: Building2 },
  { title: 'מעקב קריאה', url: '/knowledge/tracking', icon: BarChart2 },
  { title: 'הגדרות Webhook', url: '/settings', icon: Settings },
];

const shiftManagerMenuItem = { title: 'שיבוץ משמרות', url: '/shifts', icon: ClipboardList };

export function AppSidebar() {
  const location = useLocation();
  const { profile, isAdmin, canManageShifts, signOut } = useAuth();
  const { data: unreadCount = 0 } = useUnreadCount();
  const { isMobile, setOpenMobile } = useSidebar();

  const handleNavClick = () => {
    if (isMobile) setOpenMobile(false);
  };

  const getInitials = (name: string) =>
    name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <Sidebar side="right" className="border-l-0">
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground font-bold text-lg">
            Z
          </div>
          <div>
            <h1 className="text-lg font-bold text-sidebar-foreground">Zabilo Book</h1>
            <p className="text-xs text-sidebar-foreground/60">מערכת ניהול פנים-ארגונית</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="scrollbar-thin">
        <SidebarGroup>
          <SidebarGroupLabel>תפריט ראשי</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainMenuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={location.pathname === item.url}>
                    <Link to={item.url} onClick={handleNavClick}>
                      <item.icon className="h-4 w-4" />
                      <span className="flex-1">{item.title}</span>
                      {item.showBadge && unreadCount > 0 && (
                        <Badge className="h-5 min-w-5 px-1.5 bg-red-500 hover:bg-red-500 text-white text-[10px]">
                          {unreadCount}
                        </Badge>
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>ניהול</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminMenuItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={location.pathname === item.url}>
                      <Link to={item.url} onClick={handleNavClick}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {!isAdmin && canManageShifts && (
          <SidebarGroup>
            <SidebarGroupLabel>ניהול</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={location.pathname === shiftManagerMenuItem.url}>
                    <Link to={shiftManagerMenuItem.url} onClick={handleNavClick}>
                      <shiftManagerMenuItem.icon className="h-4 w-4" />
                      <span>{shiftManagerMenuItem.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9">
            <AvatarImage src={profile?.avatar_url || undefined} />
            <AvatarFallback className="bg-sidebar-accent text-sidebar-accent-foreground text-sm">
              {profile?.full_name ? getInitials(profile.full_name) : 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sidebar-foreground truncate">
              {profile?.full_name || 'משתמש'}
            </p>
            <p className="text-xs text-sidebar-foreground/60 truncate">
              {isAdmin ? 'מנהל' : 'עובד'}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={signOut}
            className="h-8 w-8 text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}

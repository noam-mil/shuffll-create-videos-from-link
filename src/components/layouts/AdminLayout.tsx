import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard,
  Building2,
  Users,
  Settings,
  LogOut,
  Shield,
  Film,
  Clapperboard,
  ShoppingBag,
} from 'lucide-react';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import brandLogo from '@/assets/brand-logo.svg';

interface AdminLayoutProps {
  children: ReactNode;
}

export const AdminLayout = ({ children }: AdminLayoutProps) => {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === 'he';
  const { user, profile, signOut } = useAuth();
  const location = useLocation();

  const navItems = [
    { path: '/admin', label: t('admin.overview'), icon: LayoutDashboard },
    { path: '/admin/meta-orgs', label: isRtl ? 'Meta Organizations' : 'Meta Orgs', icon: Building2 },
    { path: '/admin/users', label: t('admin.users'), icon: Users },
    { path: '/admin/settings', label: t('admin.systemSettings'), icon: Settings },
    { path: '/admin/templates', label: t('admin.templates.title'), icon: Film },
    { path: '/admin/productions', label: t('admin.productions.title', 'Productions'), icon: Clapperboard },
    { path: '/admin/orders', label: 'Order Management', icon: ShoppingBag },
  ];

  const isActive = (path: string) => {
    if (path === '/admin') {
      return location.pathname === '/admin';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-background" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Sidebar */}
      <aside className={`fixed ${isRtl ? 'right-0' : 'left-0'} top-0 h-full w-64 bg-card border-${isRtl ? 'l' : 'r'} border-border z-50`}>
        <div className="p-6">
          <Link to="/admin" className="flex items-center gap-3 mb-8">
            <img src={brandLogo} alt="Admin" className="h-8 w-auto" />
            <div>
              <span className="font-bold text-foreground block">{t('nav.adminPanel')}</span>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Shield className="w-3 h-3" />
                System Admin
              </span>
            </div>
          </Link>

          <nav className="space-y-1">
            {navItems.map((item) => (
              <Link key={item.path} to={item.path}>
                <Button
                  variant={isActive(item.path) ? 'secondary' : 'ghost'}
                  className={`w-full justify-start gap-3 ${
                    isActive(item.path) ? 'bg-primary/10 text-primary' : ''
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </Button>
              </Link>
            ))}
          </nav>
        </div>

        <div className={`absolute bottom-0 ${isRtl ? 'right-0 left-0' : 'left-0 right-0'} p-6 border-t border-border`}>
          <div className="flex items-center justify-between mb-4">
            <LanguageSwitcher />
          </div>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-primary font-semibold">
                {profile?.full_name?.charAt(0) || user?.email?.charAt(0) || 'A'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-foreground truncate text-sm">
                {profile?.full_name || 'Admin'}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {user?.email}
              </p>
            </div>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full gap-2"
            onClick={signOut}
          >
            <LogOut className="w-4 h-4" />
            {t('auth.logout')}
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className={`${isRtl ? 'mr-64' : 'ml-64'} min-h-screen`}>
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  );
};

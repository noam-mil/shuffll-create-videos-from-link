import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuPortal,
} from '@/components/ui/dropdown-menu';
import { Video, LogOut, Settings, Globe, ChevronDown, Megaphone, MessageSquare } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { OrgSwitcher } from '@/components/OrgSwitcher';
import { setLanguage, type SupportedLanguage } from '@/i18n';
import brandLogo from '@/assets/brand-logo.svg';

const LANGUAGES: { code: SupportedLanguage; nativeName: string }[] = [
  { code: 'en', nativeName: 'English' },
  { code: 'he', nativeName: 'עברית' },
  { code: 'es', nativeName: 'Español' },
  { code: 'ar', nativeName: 'العربية' },
  { code: 'de', nativeName: 'Deutsch' },
];

interface OrgLayoutProps {
  children: ReactNode;
}

export const OrgLayout = ({ children }: OrgLayoutProps) => {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === 'he' || i18n.language === 'ar';
  const { metaOrganization, currentOrg, isLoading, error } = useOrganization();
  const { user, profile, signOut, getMetaOrgRole } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background" dir={isRtl ? 'rtl' : 'ltr'}>
        <header className="border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-50">
          <div className="container mx-auto px-6 py-3 flex items-center justify-between">
            <Skeleton className="h-10 w-40" />
            <Skeleton className="h-10 w-32" />
          </div>
        </header>
        <main className="container mx-auto px-6 py-12">
          <Skeleton className="h-64 w-full" />
        </main>
      </div>
    );
  }

  if (error || !metaOrganization) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center" dir={isRtl ? 'rtl' : 'ltr'}>
        <div className="text-center">
          <h1 className="text-4xl font-bold text-foreground mb-4">404</h1>
          <p className="text-xl text-muted-foreground mb-6">{error || (isRtl ? 'הארגון לא נמצא' : 'Organization not found')}</p>
          <Link to="/">
            <Button>{t('nav.home')}</Button>
          </Link>
        </div>
      </div>
    );
  }

  const userRole = metaOrganization ? getMetaOrgRole(metaOrganization.id) : null;

  // Get branding from current sub-org if selected, otherwise use meta org logo if available
  const branding = currentOrg ? {
    primaryColor: currentOrg.primary_color || '#00DBDB',
    secondaryColor: currentOrg.secondary_color || '#CEE95C',
    accentColor: currentOrg.accent_color || '#FF6D66',
    fontFamily: currentOrg.font_family || 'system-ui',
    logoUrl: currentOrg.logo_url,
  } : {
    primaryColor: '#00DBDB',
    secondaryColor: '#CEE95C',
    accentColor: '#FF6D66',
    fontFamily: 'system-ui',
    logoUrl: metaOrganization?.logo_url || null,
  };

  return (
    <div 
      className="min-h-screen bg-background" 
      dir={isRtl ? 'rtl' : 'ltr'}
      style={{
        '--org-primary': branding.primaryColor,
        '--org-secondary': branding.secondaryColor,
        '--org-accent': branding.accentColor,
        fontFamily: branding.fontFamily,
      } as React.CSSProperties}
    >
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-6 py-3 flex items-center justify-between">
          <Link 
            to={`/${metaOrganization.slug}`}
            className="group flex items-center gap-2 bg-gradient-to-r from-primary/5 via-[#00DBDB]/5 to-[#CEE95C]/5 px-5 py-2 rounded-full border border-primary/10 cursor-pointer transition-all duration-300 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/10 hover:scale-[1.02]"
          >
            {branding.logoUrl ? (
              <img 
                src={branding.logoUrl} 
                alt={currentOrg?.name || metaOrganization.name} 
                className="h-8 w-auto transition-transform duration-300 group-hover:scale-110" 
              />
            ) : (
              <img 
                src={brandLogo} 
                alt={metaOrganization.name} 
                className="h-8 w-auto transition-transform duration-300 group-hover:scale-110" 
              />
            )}
            <span className="text-muted-foreground/40 text-lg font-light transition-colors duration-300 group-hover:text-primary/40">|</span>
            <div className="flex items-center gap-1.5">
              <Video className="w-5 h-5 text-primary transition-transform duration-300 group-hover:rotate-12" />
              <span className="text-lg font-semibold bg-gradient-to-r from-primary via-[#00DBDB] to-[#CEE95C] bg-clip-text text-transparent transition-all duration-300 group-hover:tracking-wide">
                AI Creator
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            {user ? (
              <>
                {/* Campaigns Link - prominent in header */}
                <Link to={`/${metaOrganization.slug}/campaigns`}>
                  <Button variant="ghost" className="gap-2 text-muted-foreground hover:text-foreground">
                    <Megaphone className="h-4 w-4" />
                    <span className="hidden sm:inline">{t('campaigns.title')}</span>
                  </Button>
                </Link>
                
                {/* Organization Switcher - stays visible */}
                <OrgSwitcher />
                
                {/* Profile Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="flex items-center gap-2 px-2 py-1 h-auto hover:bg-muted/50">
                      <Avatar className="h-9 w-9 border-2 border-primary/20 transition-all hover:border-primary/50">
                        <AvatarFallback className="bg-gradient-to-br from-primary to-[#00DBDB] text-primary-foreground font-semibold">
                          {(profile?.full_name || user.email || '?').charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="hidden sm:flex flex-col items-start">
                        <span className="text-sm font-medium text-foreground">
                          {profile?.full_name || user.email?.split('@')[0]}
                        </span>
                      </div>
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium">{profile?.full_name || t('auth.user')}</p>
                        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    
                    {/* Language Submenu */}
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger className="cursor-pointer">
                        <Globe className="h-4 w-4 me-2" />
                        {LANGUAGES.find(l => l.code === i18n.language)?.nativeName || 'Language'}
                      </DropdownMenuSubTrigger>
                      <DropdownMenuPortal>
                        <DropdownMenuSubContent>
                          {LANGUAGES.map((lang) => (
                            <DropdownMenuItem
                              key={lang.code}
                              onClick={() => setLanguage(lang.code)}
                              className={i18n.language === lang.code ? 'bg-accent' : 'cursor-pointer'}
                            >
                              {lang.nativeName}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuSubContent>
                      </DropdownMenuPortal>
                    </DropdownMenuSub>
                    <DropdownMenuSeparator />
                    
                    
                    {/* Admin Link */}
                    {(userRole === 'system_admin' || userRole === 'meta_org_admin' || userRole === 'org_admin') && (
                      <>
                        <DropdownMenuItem asChild>
                          <Link to={`/${metaOrganization.slug}/messaging-hub`} className="flex items-center gap-2 cursor-pointer">
                            <MessageSquare className="h-4 w-4" />
                            {t('messagingHub.title')}
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link to={`/${metaOrganization.slug}/admin`} className="flex items-center gap-2 cursor-pointer">
                            <Settings className="h-4 w-4" />
                            {t('nav.management')}
                          </Link>
                        </DropdownMenuItem>
                      </>
                    )}
                    <DropdownMenuSeparator />
                    
                    {/* Logout */}
                    <DropdownMenuItem onClick={signOut} className="text-destructive focus:text-destructive cursor-pointer">
                      <LogOut className="h-4 w-4 me-2" />
                      {t('auth.logout')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <Link to={`/${metaOrganization.slug}/login`}>
                <Button variant="outline" size="sm">{t('auth.login')}</Button>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main>{children}</main>

      {/* Footer */}
      <footer className="mt-20 pt-12 border-t border-border">
        <div className="container mx-auto px-6 pb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            {branding.logoUrl ? (
              <img src={branding.logoUrl} alt={currentOrg?.name || metaOrganization.name} className="h-8 w-auto opacity-80" />
            ) : (
              <img src={brandLogo} alt={metaOrganization.name} className="h-8 w-auto opacity-80" />
            )}
          </div>
          <p className="text-center text-sm text-muted-foreground">
            {currentOrg?.name || metaOrganization.name} • {t('landing.copyright')} © {new Date().getFullYear()}
          </p>
        </div>
      </footer>
    </div>
  );
};

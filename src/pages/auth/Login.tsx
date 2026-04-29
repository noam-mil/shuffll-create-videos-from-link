import { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { useOptionalOrganization } from '@/contexts/OrganizationContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Mail, Lock } from 'lucide-react';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import brandLogo from '@/assets/brand-logo.svg';

const Login = () => {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === 'he' || i18n.language === 'ar';
  const { metaOrgSlug } = useParams<{ metaOrgSlug: string }>();
  const { metaOrganization } = useOptionalOrganization();
  const { signIn } = useAuth();
  const navigate = useNavigate();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const { error: signInError } = await signIn(email, password);
      if (signInError) {
        setError(t('auth.loginSubtitle'));
      } else {
        // Redirect will be handled by useEffect after auth state updates
      }
    } catch (err) {
      setError(t('auth.loginSubtitle'));
    } finally {
      setIsLoading(false);
    }
  };

  // Smart redirect based on role after login
  const { user, isSystemAdmin, isLoading: authLoading, getMetaOrgRole } = useAuth();

  useEffect(() => {
    if (!authLoading && user) {
      if (isSystemAdmin) {
        navigate('/admin');
      } else if (metaOrgSlug) {
        // Org/meta-org admins go straight to their admin panel
        const metaOrgId = metaOrganization?.id;
        if (metaOrgId) {
          const role = getMetaOrgRole(metaOrgId);
          if (role === 'meta_org_admin' || role === 'org_admin') {
            navigate(`/${metaOrgSlug}/admin`);
            return;
          }
        }
        navigate(`/${metaOrgSlug}`);
      } else {
        navigate('/');
      }
    }
  }, [user, isSystemAdmin, authLoading, metaOrgSlug, navigate, metaOrganization, getMetaOrgRole]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="absolute top-4 right-4">
        <LanguageSwitcher />
      </div>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          {metaOrganization?.logo_url ? (
            <img src={metaOrganization.logo_url} alt={metaOrganization.name} className="h-12 mx-auto mb-4" />
          ) : (
            <img src={brandLogo} alt="Logo" className="h-12 mx-auto mb-4" />
          )}
          <h1 className="text-2xl font-bold text-foreground">
            {metaOrganization ? `${t('auth.welcomeBack')} - ${metaOrganization.name}` : t('auth.welcomeBack')}
          </h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t('auth.login')}</CardTitle>
            <CardDescription>
              {t('auth.loginSubtitle')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">{t('auth.email')}</Label>
                <div className="relative">
                  <Mail className={`absolute ${isRtl ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground`} />
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={isRtl ? 'pr-10' : 'pl-10'}
                    dir="ltr"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">{t('auth.password')}</Label>
                <div className="relative">
                  <Lock className={`absolute ${isRtl ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground`} />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={isRtl ? 'pr-10' : 'pl-10'}
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Link
                  to={metaOrgSlug ? `/${metaOrgSlug}/forgot-password` : '/forgot-password'}
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  {t('auth.forgotPassword')}
                </Link>
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className={`w-4 h-4 ${isRtl ? 'ml-2' : 'mr-2'} animate-spin`} />
                    {t('auth.loggingIn')}
                  </>
                ) : (
                  t('auth.login')
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Login;

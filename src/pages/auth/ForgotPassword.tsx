import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import brandLogo from '@/assets/brand-logo.svg';

const ForgotPassword = () => {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === 'he' || i18n.language === 'ar';
  const { metaOrgSlug } = useParams<{ metaOrgSlug: string }>();

  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const loginPath = metaOrgSlug ? `/${metaOrgSlug}/login` : '/login';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const redirectTo = `${window.location.origin}/reset-password`;
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });

      if (resetError) {
        setError(resetError.message);
      } else {
        setSent(true);
      }
    } catch {
      setError(t('auth.resetLinkError', 'Something went wrong. Please try again.'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="absolute top-4 right-4">
        <LanguageSwitcher />
      </div>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img src={brandLogo} alt="Logo" className="h-12 mx-auto mb-4" />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t('auth.forgotPasswordTitle', 'Forgot Password')}</CardTitle>
            <CardDescription>
              {t('auth.forgotPasswordSubtitle', 'Enter your email and we\'ll send you a reset link')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {sent ? (
              <div className="text-center space-y-4">
                <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto" />
                <p className="font-medium">{t('auth.resetLinkSent', 'Reset link sent!')}</p>
                <p className="text-sm text-muted-foreground">
                  {t('auth.resetLinkSentDesc', 'Check your email for a link to reset your password.')}
                </p>
                <Link to={loginPath}>
                  <Button variant="outline" className="mt-4">
                    <ArrowLeft className={`w-4 h-4 ${isRtl ? 'ml-2' : 'mr-2'}`} />
                    {t('auth.backToLogin', 'Back to Login')}
                  </Button>
                </Link>
              </div>
            ) : (
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

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className={`w-4 h-4 ${isRtl ? 'ml-2' : 'mr-2'} animate-spin`} />
                      {t('auth.sendingResetLink', 'Sending...')}
                    </>
                  ) : (
                    t('auth.sendResetLink', 'Send Reset Link')
                  )}
                </Button>

                <div className="text-center">
                  <Link to={loginPath} className="text-sm text-muted-foreground hover:text-foreground">
                    <ArrowLeft className={`w-3 h-3 inline ${isRtl ? 'ml-1' : 'mr-1'}`} />
                    {t('auth.backToLogin', 'Back to Login')}
                  </Link>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ForgotPassword;

import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Mail, Lock, User } from 'lucide-react';
import brandLogo from '@/assets/brand-logo.svg';

const Signup = () => {
  const { metaOrgSlug } = useParams<{ metaOrgSlug: string }>();
  const { metaOrganization } = useOrganization();
  const { signUp } = useAuth();
  const navigate = useNavigate();
  
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('הסיסמאות אינן תואמות');
      return;
    }

    if (password.length < 6) {
      setError('הסיסמה חייבת להכיל לפחות 6 תווים');
      return;
    }

    setIsLoading(true);

    try {
      const { error: signUpError } = await signUp(email, password, fullName);
      if (signUpError) {
        setError(signUpError.message || 'שגיאה בהרשמה');
      } else {
        setSuccess(true);
      }
    } catch (err) {
      setError('שגיאה בהרשמה');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4" dir="rtl">
        <div className="w-full max-w-md">
          <Card>
            <CardHeader>
              <CardTitle className="text-green-500">נרשמת בהצלחה! 🎉</CardTitle>
              <CardDescription>
                שלחנו אליך אימייל לאימות החשבון. אנא בדוק את תיבת הדואר שלך ולחץ על הקישור לאישור.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link to={metaOrgSlug ? `/${metaOrgSlug}/login` : '/login'}>
                <Button className="w-full">חזרה לדף ההתחברות</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          {metaOrganization?.logo_url ? (
            <img src={metaOrganization.logo_url} alt={metaOrganization.name} className="h-12 mx-auto mb-4" />
          ) : (
            <img src={brandLogo} alt="Logo" className="h-12 mx-auto mb-4" />
          )}
          <h1 className="text-2xl font-bold text-foreground">
            {metaOrganization ? `הצטרפות ל${metaOrganization.name}` : 'יצירת חשבון חדש'}
          </h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>הרשמה</CardTitle>
            <CardDescription>
              צור חשבון חדש להתחלת השימוש
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
                <Label htmlFor="fullName">שם מלא</Label>
                <div className="relative">
                  <User className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="fullName"
                    type="text"
                    placeholder="ישראל ישראלי"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="pr-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">אימייל</Label>
                <div className="relative">
                  <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pr-10"
                    dir="ltr"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">סיסמה</Label>
                <div className="relative">
                  <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pr-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">אימות סיסמה</Label>
                <div className="relative">
                  <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pr-10"
                    required
                  />
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                    נרשם...
                  </>
                ) : (
                  'הירשם'
                )}
              </Button>

              <p className="text-center text-sm text-muted-foreground">
                כבר יש לך חשבון?{' '}
                <Link to={metaOrgSlug ? `/${metaOrgSlug}/login` : '/login'} className="text-primary hover:underline">
                  התחבר
                </Link>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Signup;

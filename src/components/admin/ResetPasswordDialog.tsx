import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ResetPasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: {
    user_id: string;
    full_name: string | null;
    email: string;
  } | null;
}

export const ResetPasswordDialog = ({ open, onOpenChange, user }: ResetPasswordDialogProps) => {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === 'he' || i18n.language === 'ar';

  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const resetMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('No user selected');
      const response = await supabase.functions.invoke('reset-user-password', {
        body: {
          target_user_id: user.user_id,
          new_password: newPassword,
        },
      });
      if (response.error) throw response.error;
      if (response.data?.error) throw new Error(response.data.error);
      return response.data;
    },
    onSuccess: () => {
      toast.success(t('admin.usersPage.passwordReset', 'Password reset successfully'));
      setNewPassword('');
      setShowPassword(false);
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error(error.message || t('common.error'));
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast.error(t('admin.usersPage.passwordTooShort', 'Password must be at least 6 characters'));
      return;
    }
    resetMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { setNewPassword(''); setShowPassword(false); } onOpenChange(v); }}>
      <DialogContent className="sm:max-w-md" dir={isRtl ? 'rtl' : 'ltr'}>
        <DialogHeader>
          <DialogTitle>{t('admin.usersPage.resetPassword', 'Reset Password')}</DialogTitle>
          <DialogDescription>
            {t('admin.usersPage.resetPasswordDesc', 'Set a new password for {{name}}', { name: user?.full_name || user?.email || '' })}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="newPassword">{t('admin.usersPage.newPassword', 'New Password')}</Label>
            <div className="relative">
              <Input
                id="newPassword"
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className={isRtl ? 'pl-10' : 'pr-10'}
                required
                minLength={6}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className={`absolute ${isRtl ? 'left-1' : 'right-1'} top-1/2 -translate-y-1/2 h-7 w-7`}
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={resetMutation.isPending}>
              {resetMutation.isPending ? (
                <>
                  <Loader2 className={`w-4 h-4 ${isRtl ? 'ml-2' : 'mr-2'} animate-spin`} />
                  {t('common.loading')}
                </>
              ) : (
                t('admin.usersPage.resetPassword', 'Reset Password')
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Building2, Upload, Trash2, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { MetaOrganization } from '@/types/organization';

interface MetaOrgLogoUploadProps {
  metaOrganization: MetaOrganization;
  onLogoUpdated?: () => void;
}

export const MetaOrgLogoUpload = ({ metaOrganization, onLogoUpdated }: MetaOrgLogoUploadProps) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const updateLogoMutation = useMutation({
    mutationFn: async (logoUrl: string | null) => {
      const { error } = await supabase
        .from('meta_organizations')
        .update({ logo_url: logoUrl })
        .eq('id', metaOrganization.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meta-organization'] });
      onLogoUpdated?.();
      toast({ title: t('org.admin.logoUpdated') });
    },
    onError: (error: Error) => {
      toast({ 
        title: t('org.admin.logoUpdateError'), 
        description: error.message, 
        variant: 'destructive' 
      });
    },
  });

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({ 
        title: t('org.admin.invalidFileType'), 
        variant: 'destructive' 
      });
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({ 
        title: t('org.admin.fileTooLarge'), 
        variant: 'destructive' 
      });
      return;
    }

    setIsUploading(true);

    try {
      // Create file path: meta_org_id/logo.ext
      const fileExt = file.name.split('.').pop();
      const filePath = `${metaOrganization.id}/logo.${fileExt}`;

      // Delete existing logo if any
      if (metaOrganization.logo_url) {
        const existingPath = metaOrganization.logo_url.split('/meta-org-logos/')[1];
        if (existingPath) {
          await supabase.storage.from('meta-org-logos').remove([existingPath]);
        }
      }

      // Upload new logo
      const { error: uploadError } = await supabase.storage
        .from('meta-org-logos')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('meta-org-logos')
        .getPublicUrl(filePath);

      // Update meta organization with new logo URL
      await updateLogoMutation.mutateAsync(publicUrl);
    } catch (error: any) {
      toast({ 
        title: t('org.admin.uploadError'), 
        description: error.message, 
        variant: 'destructive' 
      });
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveLogo = async () => {
    if (!metaOrganization.logo_url) return;

    setIsUploading(true);

    try {
      // Delete from storage
      const existingPath = metaOrganization.logo_url.split('/meta-org-logos/')[1];
      if (existingPath) {
        await supabase.storage.from('meta-org-logos').remove([existingPath]);
      }

      // Update database
      await updateLogoMutation.mutateAsync(null);
    } catch (error: any) {
      toast({ 
        title: t('org.admin.removeError'), 
        description: error.message, 
        variant: 'destructive' 
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-3">
      <Label>{t('org.admin.metaOrgLogo')}</Label>
      <div className="border-2 border-dashed border-border rounded-lg p-6 text-center relative">
        {isUploading && (
          <div className="absolute inset-0 bg-background/80 flex items-center justify-center rounded-lg z-10">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        )}
        
        {metaOrganization.logo_url ? (
          <div className="space-y-4">
            <img 
              src={metaOrganization.logo_url} 
              alt={metaOrganization.name} 
              className="h-16 mx-auto object-contain"
            />
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
              >
                <Upload className="w-4 h-4 mr-2" />
                {t('org.admin.changeLogo')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRemoveLogo}
                disabled={isUploading}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                {t('org.admin.removeLogo')}
              </Button>
            </div>
          </div>
        ) : (
          <div 
            className="cursor-pointer py-4"
            onClick={() => fileInputRef.current?.click()}
          >
            <Building2 className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground mb-2">{t('org.admin.dragDropImage')}</p>
            <Button variant="outline" size="sm" disabled={isUploading}>
              <Upload className="w-4 h-4 mr-2" />
              {t('org.admin.uploadLogo')}
            </Button>
          </div>
        )}
        
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>
      <p className="text-xs text-muted-foreground">{t('org.admin.logoHint')}</p>
    </div>
  );
};

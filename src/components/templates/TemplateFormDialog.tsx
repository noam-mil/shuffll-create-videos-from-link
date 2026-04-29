import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, Sparkles, Globe, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  TEMPLATE_CATEGORIES,
  CATEGORY_LABELS,
  REALISM_OPTIONS,
  LANG_OPTIONS,
} from '@/types/template';
import type { DbTemplate } from '@/types/template';

interface TemplateFormData {
  name: string;
  category: string;
  event_type: string;
  realism: string;
  lang: string;
  poster_url: string;
  video_id: string;
  voice_id: string;
  is_active: boolean;
  meta_organization_id: string | null;
}

interface TemplateFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template?: DbTemplate | null;
  metaOrgId?: string | null;
  onSubmit: (data: TemplateFormData) => void;
  isPending?: boolean;
}

const DEFAULT_FORM: TemplateFormData = {
  name: '',
  category: 'birthday',
  event_type: '',
  realism: '',
  lang: 'en',
  poster_url: '',
  video_id: '',
  voice_id: '',
  is_active: true,
  meta_organization_id: null,
};

export function TemplateFormDialog({
  open,
  onOpenChange,
  template,
  metaOrgId,
  onSubmit,
  isPending,
}: TemplateFormDialogProps) {
  const { t } = useTranslation();
  const [form, setForm] = useState<TemplateFormData>(DEFAULT_FORM);
  const isEdit = !!template;

  useEffect(() => {
    if (template) {
      setForm({
        name: template.name,
        category: template.category,
        event_type: template.event_type || '',
        realism: template.realism || '',
        lang: template.lang,
        poster_url: template.poster_url || '',
        video_id: template.video_id || '',
        voice_id: template.voice_id || '',
        is_active: template.is_active,
        meta_organization_id: template.meta_organization_id,
      });
    } else {
      setForm({ ...DEFAULT_FORM, meta_organization_id: metaOrgId ?? null });
    }
  }, [template, metaOrgId]);

  const handleSubmit = () => {
    if (!form.name.trim()) return;
    onSubmit({
      ...form,
      voice_id: form.voice_id.trim() || '',
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            {isEdit ? t('admin.templates.form.editTitle') : t('admin.templates.form.createTitle')}
          </DialogTitle>
          <DialogDescription>
            {isEdit ? t('admin.templates.form.editDesc') : t('admin.templates.form.createDesc')}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="tmpl-name" className="text-xs font-medium">{t('admin.templates.form.name')} *</Label>
            <Input
              id="tmpl-name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder={t('admin.templates.form.namePlaceholder')}
              className="h-10 rounded-lg"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">{t('admin.templates.form.category')} *</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger className="h-10 rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TEMPLATE_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {CATEGORY_LABELS[cat] || cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">{t('admin.templates.form.eventType')}</Label>
              <Input
                value={form.event_type}
                onChange={(e) => setForm({ ...form, event_type: e.target.value })}
                placeholder={t('admin.templates.form.eventTypePlaceholder')}
                className="h-10 rounded-lg"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">{t('admin.templates.form.styleLabel')}</Label>
              <Select
                value={form.realism || '_any'}
                onValueChange={(v) => setForm({ ...form, realism: v === '_any' ? '' : v })}
              >
                <SelectTrigger className="h-10 rounded-lg">
                  <SelectValue placeholder={t('admin.templates.form.styleAny')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_any">{t('admin.templates.form.styleAny')}</SelectItem>
                  {REALISM_OPTIONS.map((r) => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">{t('admin.templates.form.language')}</Label>
              <Select value={form.lang} onValueChange={(v) => setForm({ ...form, lang: v })}>
                <SelectTrigger className="h-10 rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LANG_OPTIONS.map((l) => (
                    <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">{t('admin.templates.form.videoId')}</Label>
              <Input
                value={form.video_id}
                onChange={(e) => setForm({ ...form, video_id: e.target.value })}
                placeholder={t('admin.templates.form.videoIdPlaceholder')}
                className="h-10 rounded-lg font-mono text-xs"
                dir="ltr"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">{t('admin.templates.form.posterUrl')}</Label>
            <Input
              value={form.poster_url}
              onChange={(e) => setForm({ ...form, poster_url: e.target.value })}
              placeholder={t('admin.templates.form.posterUrlPlaceholder')}
              className="h-10 rounded-lg font-mono text-xs"
              dir="ltr"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">ElevenLabs Voice ID</Label>
            <Input
              value={form.voice_id}
              onChange={(e) => setForm({ ...form, voice_id: e.target.value })}
              placeholder="e.g. EXAVITQu4vr4xnSDxMaL"
              className="h-10 rounded-lg font-mono text-xs"
              dir="ltr"
            />
          </div>

          <div className="flex items-center justify-between rounded-xl bg-muted/30 p-3 border border-border/40">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">{t('admin.templates.form.activeLabel')}</Label>
              <p className="text-[11px] text-muted-foreground">{t('admin.templates.form.activeDesc')}</p>
            </div>
            <Switch
              checked={form.is_active}
              onCheckedChange={(checked) => setForm({ ...form, is_active: checked })}
            />
          </div>

          {!metaOrgId && (
            <div className="flex items-start gap-2.5 rounded-xl bg-primary/5 p-3 border border-primary/10">
              {form.meta_organization_id ? (
                <Building2 className="h-4 w-4 text-primary/60 mt-0.5 flex-shrink-0" />
              ) : (
                <Globe className="h-4 w-4 text-primary/60 mt-0.5 flex-shrink-0" />
              )}
              <p className="text-xs text-muted-foreground leading-relaxed">
                {form.meta_organization_id
                  ? t('admin.templates.form.scopeOrg')
                  : t('admin.templates.form.scopeSystem')}
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-full">
            {t('admin.templates.form.cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={isPending || !form.name.trim()} className="rounded-full gap-2 shadow-sm">
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {isEdit ? t('admin.templates.form.saveChanges') : t('admin.templates.form.create')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

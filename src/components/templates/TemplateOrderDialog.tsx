import { useState } from 'react';
import { Loader2, Upload, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import type { DbTemplate } from '@/types/template';
import { useCreateOrder } from '@/hooks/useTemplateOrders';
import { useToast } from '@/hooks/use-toast';
import { fileToBase64 } from '@/hooks/useImageGeneration';

interface TemplateOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: DbTemplate | null;
  metaOrgId?: string | null;
  orgId?: string | null;
}

export function TemplateOrderDialog({
  open,
  onOpenChange,
  template,
  metaOrgId,
  orgId,
}: TemplateOrderDialogProps) {
  const { toast } = useToast();
  const createOrder = useCreateOrder();
  const [step, setStep] = useState<1 | 2>(1);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    company_name: '',
    contact_name: '',
    phone: '',
    event_type: template?.event_type || '',
    message_text: '',
  });
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const b64 = await fileToBase64(file);
    setLogoPreview(`data:${b64.mime};base64,${b64.data}`);
  };

  const handleSubmit = async () => {
    if (!template) return;

    try {
      await createOrder.mutateAsync({
        template_id: template.id,
        meta_organization_id: metaOrgId || null,
        organization_id: orgId || null,
        company_name: form.company_name,
        contact_name: form.contact_name,
        phone: form.phone,
        event_type: form.event_type || null,
        logo_url: logoPreview,
        message_text: form.message_text || null,
        status: 'pending',
      });
      setSubmitted(true);
    } catch (err) {
      toast({
        title: 'Order failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  const handleClose = () => {
    setStep(1);
    setSubmitted(false);
    setForm({ company_name: '', contact_name: '', phone: '', event_type: '', message_text: '' });
    setLogoPreview(null);
    onOpenChange(false);
  };

  if (!template) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {submitted ? 'Order Placed!' : step === 1 ? 'Order Template' : 'Message Details'}
          </DialogTitle>
        </DialogHeader>

        {submitted ? (
          <div className="flex flex-col items-center gap-4 py-8">
            <CheckCircle2 className="h-12 w-12 text-green-500" />
            <p className="text-center text-muted-foreground">
              Your order for <strong>{template.name}</strong> has been submitted.
            </p>
            <Button onClick={handleClose}>Done</Button>
          </div>
        ) : step === 1 ? (
          <>
            <div className="grid gap-4 py-4">
              <div className="space-y-1.5">
                <Label>Company Name *</Label>
                <Input
                  value={form.company_name}
                  onChange={(e) => setForm({ ...form, company_name: e.target.value })}
                  placeholder="Your company name"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Your Name *</Label>
                <Input
                  value={form.contact_name}
                  onChange={(e) => setForm({ ...form, contact_name: e.target.value })}
                  placeholder="Full name"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Phone *</Label>
                <Input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="+972..."
                  dir="ltr"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Event Type</Label>
                <Input
                  value={form.event_type}
                  onChange={(e) => setForm({ ...form, event_type: e.target.value })}
                  placeholder="e.g., Birthday, Holiday..."
                />
              </div>
              <div className="space-y-1.5">
                <Label>Logo (optional)</Label>
                <div className="flex items-center gap-3">
                  {logoPreview && (
                    <img src={logoPreview} alt="Logo" className="h-10 w-10 rounded border object-contain" />
                  )}
                  <label className="cursor-pointer">
                    <Button variant="outline" size="sm" className="gap-1" asChild>
                      <span><Upload className="h-3 w-3" /> Upload Logo</span>
                    </Button>
                    <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                  </label>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>Cancel</Button>
              <Button
                onClick={() => setStep(2)}
                disabled={!form.company_name || !form.contact_name || !form.phone}
              >
                Next
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <div className="grid gap-4 py-4">
              <div className="space-y-1.5">
                <Label>Custom Message (optional)</Label>
                <Textarea
                  value={form.message_text}
                  onChange={(e) => setForm({ ...form, message_text: e.target.value })}
                  placeholder="Add a personalized message..."
                  className="min-h-[100px]"
                />
              </div>

              <div className="rounded-lg border border-border p-4 bg-muted/30">
                <h4 className="text-sm font-medium mb-2">Order Summary</h4>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                  <dt className="text-muted-foreground">Template:</dt>
                  <dd>{template.name}</dd>
                  <dt className="text-muted-foreground">Company:</dt>
                  <dd>{form.company_name}</dd>
                  <dt className="text-muted-foreground">Contact:</dt>
                  <dd>{form.contact_name}</dd>
                  <dt className="text-muted-foreground">Phone:</dt>
                  <dd dir="ltr">{form.phone}</dd>
                </dl>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
              <Button onClick={handleSubmit} disabled={createOrder.isPending}>
                {createOrder.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Place Order
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

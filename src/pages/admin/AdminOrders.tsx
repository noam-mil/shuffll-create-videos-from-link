import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AdminLayout } from '@/components/layouts/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ShoppingBag, Search, Loader2, MoreHorizontal, Trash2 } from 'lucide-react';
import { useOrders, useDeleteOrder } from '@/hooks/useOrders';
import { useToast } from '@/hooks/use-toast';

const AdminOrders = () => {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === 'he' || i18n.language === 'ar';
  const { toast } = useToast();

  const [search, setSearch] = useState('');

  const { data: orders = [], isLoading } = useOrders();
  const deleteMutation = useDeleteOrder();

  const filtered = orders.filter(o => {
    const q = search.toLowerCase();
    return (
      o.company_name.toLowerCase().includes(q) ||
      o.full_name.toLowerCase().includes(q) ||
      o.phone.includes(q) ||
      (o.template_name || '').toLowerCase().includes(q)
    );
  });

  const handleDelete = async (id: string, companyName: string) => {
    if (!confirm(`Delete order from "${companyName}"?`)) return;
    try {
      await deleteMutation.mutateAsync(id);
      toast({ title: 'Order deleted' });
    } catch (err) {
      toast({ title: 'Delete failed', description: (err as Error).message, variant: 'destructive' });
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6" dir={isRtl ? 'rtl' : 'ltr'}>
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Order Management</h1>
            <p className="text-muted-foreground mt-1">All orders submitted through the order page</p>
          </div>
          {orders.length > 0 && (
            <Badge variant="secondary" className="text-xs tabular-nums">
              {filtered.length} / {orders.length}
            </Badge>
          )}
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className={`absolute ${isRtl ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground`} />
          <Input
            placeholder="Search by company, name, phone…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className={`${isRtl ? 'pr-10' : 'pl-10'} rounded-full bg-muted/30 border-border/50 focus-visible:bg-background`}
          />
        </div>

        {/* Table */}
        <Card className="border-border/50 shadow-sm overflow-hidden">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Loading orders…</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <div className="rounded-full bg-primary/10 p-4">
                  <ShoppingBag className="w-8 h-8 text-primary" />
                </div>
                <div className="text-center">
                  <p className="font-medium">No orders yet</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {search ? 'No orders match your search.' : 'Orders placed via the order page will appear here.'}
                  </p>
                </div>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">Logo</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Full Name</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Template</TableHead>
                    <TableHead>Event</TableHead>
                    <TableHead className="max-w-xs">Full Message</TableHead>
                    <TableHead>Org</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(order => (
                    <TableRow key={order.id}>
                      <TableCell>
                        {order.logo_url ? (
                          <img
                            src={order.logo_url}
                            alt="logo"
                            className="w-9 h-9 rounded-md object-contain bg-muted border border-border p-0.5"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-md bg-muted border border-border flex items-center justify-center text-[10px] text-muted-foreground">
                            —
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="font-medium">{order.company_name}</TableCell>
                      <TableCell>{order.full_name}</TableCell>
                      <TableCell className="text-muted-foreground font-mono text-xs">{order.phone}</TableCell>
                      <TableCell>
                        {order.template_name && (
                          <Badge variant="secondary" className="text-xs max-w-[160px] truncate block">
                            {order.template_name}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">{order.event_type || '—'}</TableCell>
                      <TableCell className="max-w-xs">
                        {order.full_message ? (
                          <p
                            className="text-xs text-muted-foreground whitespace-pre-line line-clamp-3 text-right leading-relaxed"
                            dir="rtl"
                            title={order.full_message}
                          >
                            {order.full_message}
                          </p>
                        ) : '—'}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">{order.meta_org_slug || '—'}</TableCell>
                      <TableCell className="text-muted-foreground text-xs tabular-nums whitespace-nowrap">
                        {new Date(order.created_at).toLocaleDateString(i18n.language, {
                          year: 'numeric', month: 'short', day: 'numeric',
                        })}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="w-7 h-7">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive cursor-pointer gap-2"
                              onClick={() => handleDelete(order.id, order.company_name)}
                            >
                              <Trash2 className="w-4 h-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminOrders;

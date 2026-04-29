import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { AdminLayout } from '@/components/layouts/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useQueryClient } from '@tanstack/react-query';
import { Clapperboard, Search, Loader2, MoreHorizontal, ExternalLink, Trash2, Pencil } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  useAllProductions,
  useDeleteProduction,
  useUpdateProduction,
  type ProductionWithRelations,
} from '@/hooks/useTemplateProductions';
import { useTemplates } from '@/hooks/useTemplates';
import type { TemplateProduction } from '@/types/template';

const STATUS_VALUES: TemplateProduction['status'][] = ['draft', 'generating', 'ready', 'exported'];

const STATUS_BADGE_CLASSES: Record<TemplateProduction['status'], string> = {
  draft: '',
  generating: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20 dark:text-yellow-400',
  ready: 'bg-green-500/10 text-green-600 border-green-500/20 dark:text-green-400',
  exported: 'bg-blue-500/10 text-blue-600 border-blue-500/20 dark:text-blue-400',
};

function getStatusBadge(status: TemplateProduction['status']) {
  if (status === 'draft') {
    return <Badge variant="secondary" className="capitalize">{status}</Badge>;
  }
  return (
    <Badge variant="outline" className={`capitalize ${STATUS_BADGE_CLASSES[status]}`}>
      {status}
    </Badge>
  );
}

const AdminProductions = () => {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === 'he' || i18n.language === 'ar';
  const navigate = useNavigate();
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [templateFilter, setTemplateFilter] = useState('all');

  // Inline name editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const queryClient = useQueryClient();
  const { data: productions = [], isLoading } = useAllProductions();
  const { data: templates = [] } = useTemplates();
  const deleteMutation = useDeleteProduction();
  const updateMutation = useUpdateProduction();

  const handleStatusChange = async (prod: ProductionWithRelations, status: TemplateProduction['status']) => {
    if (prod.status === status) return;
    try {
      await updateMutation.mutateAsync({ id: prod.id, status });
      queryClient.invalidateQueries({ queryKey: ['all-productions'] });
    } catch (err) {
      toast({
        title: t('admin.productions.updateFailed', 'Update failed'),
        description: (err as Error).message,
        variant: 'destructive',
      });
    }
  };

  const filteredProductions = productions.filter((prod) => {
    const matchesSearch = prod.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || prod.status === statusFilter;
    const matchesTemplate = templateFilter === 'all' || prod.template_id === templateFilter;
    return matchesSearch && matchesStatus && matchesTemplate;
  });

  const handleOpenInStudio = (prod: ProductionWithRelations) => {
    navigate(`/admin/templates/${prod.template_id}/productions/${prod.id}`);
  };

  const handleDelete = async (prod: ProductionWithRelations) => {
    if (!confirm(t('admin.productions.deleteConfirm', { name: prod.name, defaultValue: `Delete "${prod.name}"? This cannot be undone.` }))) return;
    try {
      await deleteMutation.mutateAsync({ id: prod.id, templateId: prod.template_id });
      toast({ title: t('admin.productions.deleted', 'Production deleted') });
    } catch (err) {
      toast({
        title: t('admin.productions.deleteFailed', 'Delete failed'),
        description: (err as Error).message,
        variant: 'destructive',
      });
    }
  };

  const startEditing = (prod: ProductionWithRelations) => {
    setEditingId(prod.id);
    setEditingName(prod.name);
  };

  const commitEdit = async (prod: ProductionWithRelations) => {
    const trimmed = editingName.trim();
    if (!trimmed || trimmed === prod.name) {
      setEditingId(null);
      return;
    }
    try {
      await updateMutation.mutateAsync({ id: prod.id, name: trimmed });
      toast({ title: t('admin.productions.renamed', 'Production renamed') });
    } catch (err) {
      toast({
        title: t('admin.productions.renameFailed', 'Rename failed'),
        description: (err as Error).message,
        variant: 'destructive',
      });
    } finally {
      setEditingId(null);
    }
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString(i18n.language, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

  const isFiltered = searchQuery || statusFilter !== 'all' || templateFilter !== 'all';

  return (
    <AdminLayout>
      <div className="space-y-6" dir={isRtl ? 'rtl' : 'ltr'}>
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              {t('admin.productions.title', 'Productions')}
            </h1>
            <p className="text-muted-foreground mt-1">
              {t('admin.productions.subtitle', 'Manage all productions across templates')}
            </p>
          </div>
          {productions.length > 0 && (
            <Badge variant="secondary" className="text-xs tabular-nums mt-2">
              {filteredProductions.length} / {productions.length}
            </Badge>
          )}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 max-w-sm">
            <Search
              className={`absolute ${isRtl ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground`}
            />
            <Input
              placeholder={t('admin.productions.searchPlaceholder', 'Search productions...')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`${isRtl ? 'pr-10' : 'pl-10'} rounded-full bg-muted/30 border-border/50 focus-visible:bg-background`}
            />
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-44 rounded-full bg-muted/30 border-border/50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('admin.productions.allStatuses', 'All Statuses')}</SelectItem>
              {STATUS_VALUES.map((s) => (
                <SelectItem key={s} value={s} className="capitalize">
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={templateFilter} onValueChange={setTemplateFilter}>
            <SelectTrigger className="w-48 rounded-full bg-muted/30 border-border/50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('admin.productions.allTemplates', 'All Templates')}</SelectItem>
              {templates.map((tmpl) => (
                <SelectItem key={tmpl.id} value={tmpl.id}>
                  {tmpl.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Content */}
        <Card className="border-border/50 shadow-sm overflow-hidden">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">
                  {t('admin.productions.loading', 'Loading productions...')}
                </p>
              </div>
            ) : filteredProductions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <div className="rounded-full bg-primary/10 p-4">
                  <Clapperboard className="w-8 h-8 text-primary" />
                </div>
                <div className="text-center">
                  <p className="font-medium">
                    {t('admin.productions.noProductions', 'No productions found')}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {isFiltered
                      ? t('admin.productions.noProductionsHintFiltered', 'Try adjusting your filters')
                      : t('admin.productions.noProductionsHintEmpty', 'Productions will appear here once created from a template')}
                  </p>
                </div>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('admin.productions.colName', 'Name')}</TableHead>
                    <TableHead>{t('admin.productions.colTemplate', 'Template')}</TableHead>
                    <TableHead>{t('admin.productions.colStatus', 'Status')}</TableHead>
                    <TableHead>{t('admin.productions.colOrganization', 'Organization')}</TableHead>
                    <TableHead>{t('admin.productions.colCreated', 'Created')}</TableHead>
                    <TableHead className="w-24" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProductions.map((prod) => (
                    <TableRow key={prod.id} className="group">

                      {/* Name — click pencil or double-click to edit inline */}
                      <TableCell>
                        {editingId === prod.id ? (
                          <Input
                            autoFocus
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            onBlur={() => commitEdit(prod)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') commitEdit(prod);
                              if (e.key === 'Escape') setEditingId(null);
                            }}
                            className="h-7 text-sm px-2 w-52"
                          />
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium">{prod.name}</span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5 opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity"
                              onClick={() => startEditing(prod)}
                            >
                              <Pencil className="w-3 h-3" />
                            </Button>
                          </div>
                        )}
                      </TableCell>

                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {prod.template?.name ?? '—'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="cursor-pointer rounded focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                              {getStatusBadge(prod.status)}
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start" className="w-36">
                            {STATUS_VALUES.map((s) => (
                              <DropdownMenuItem
                                key={s}
                                className={`capitalize ${prod.status === s ? 'bg-accent' : ''}`}
                                onClick={() => handleStatusChange(prod, s)}
                              >
                                {getStatusBadge(s)}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {prod.meta_org?.name ?? '—'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {formatDate(prod.created_at)}
                        </span>
                      </TableCell>

                      {/* Actions */}
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          {/* Direct open button — always visible on hover */}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                            title={t('admin.productions.openInStudio', 'Open in Studio')}
                            onClick={() => handleOpenInStudio(prod)}
                          >
                            <ExternalLink className="w-4 h-4" />
                          </Button>

                          {/* More actions dropdown */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => startEditing(prod)}>
                                <Pencil className={`w-4 h-4 ${isRtl ? 'ml-2' : 'mr-2'}`} />
                                {t('admin.productions.rename', 'Rename')}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => handleDelete(prod)}
                              >
                                <Trash2 className={`w-4 h-4 ${isRtl ? 'ml-2' : 'mr-2'}`} />
                                {t('common.delete', 'Delete')}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
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

export default AdminProductions;

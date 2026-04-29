import { useTranslation } from 'react-i18next';
import { Edit, Trash2, ExternalLink, Film, Play, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { DbTemplate } from '@/types/template';
import { CATEGORY_LABELS } from '@/types/template';

interface TemplateListTableProps {
  templates: DbTemplate[];
  showOrgColumn?: boolean;
  metaOrgNames?: Record<string, string>;
  onEdit: (template: DbTemplate) => void;
  onEditScenes: (template: DbTemplate) => void;
  onStartProduction?: (template: DbTemplate) => void;
  onToggleActive: (template: DbTemplate) => void;
  onDelete: (template: DbTemplate) => void;
}

export function TemplateListTable({
  templates,
  showOrgColumn = false,
  metaOrgNames = {},
  onEdit,
  onEditScenes,
  onStartProduction,
  onToggleActive,
  onDelete,
}: TemplateListTableProps) {
  const { t } = useTranslation();

  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className="w-[280px]">{t('admin.templates.table.template')}</TableHead>
          <TableHead>{t('admin.templates.table.category')}</TableHead>
          {showOrgColumn && <TableHead>{t('admin.templates.table.scope')}</TableHead>}
          <TableHead>{t('admin.templates.table.style')}</TableHead>
          <TableHead>{t('admin.templates.table.lang')}</TableHead>
          <TableHead>{t('admin.templates.table.status')}</TableHead>
          <TableHead className="text-right">{t('admin.templates.table.actions')}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {templates.map((tmpl) => (
          <TableRow
            key={tmpl.id}
            className="group cursor-pointer transition-colors"
            onClick={() => onEditScenes(tmpl)}
          >
            <TableCell>
              <div className="flex items-center gap-3">
                {tmpl.poster_url ? (
                  <img
                    src={tmpl.poster_url}
                    alt={tmpl.name}
                    className="h-10 w-10 rounded-lg object-cover border border-border/50 shadow-sm"
                  />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/5 border border-primary/10">
                    <Film className="h-4 w-4 text-primary/40" />
                  </div>
                )}
                <span className="font-medium text-sm group-hover:text-primary transition-colors">{tmpl.name}</span>
              </div>
            </TableCell>
            <TableCell>
              <Badge variant="outline" className="text-[11px] font-normal rounded-full">
                {CATEGORY_LABELS[tmpl.category] || tmpl.category}
              </Badge>
            </TableCell>
            {showOrgColumn && (
              <TableCell>
                {tmpl.meta_organization_id ? (
                  <Badge variant="secondary" className="text-[11px] font-normal rounded-full">
                    {metaOrgNames[tmpl.meta_organization_id] || 'Org'}
                  </Badge>
                ) : (
                  <Badge className="text-[11px] font-normal rounded-full bg-primary/10 text-primary border-0 hover:bg-primary/20">
                    {t('admin.templates.table.system')}
                  </Badge>
                )}
              </TableCell>
            )}
            <TableCell>
              <span className="text-sm text-muted-foreground">{tmpl.realism || '—'}</span>
            </TableCell>
            <TableCell>
              <span className="text-sm text-muted-foreground font-mono uppercase">{tmpl.lang}</span>
            </TableCell>
            <TableCell onClick={(e) => e.stopPropagation()}>
              <Switch
                checked={tmpl.is_active}
                onCheckedChange={() => onToggleActive(tmpl)}
              />
            </TableCell>
            <TableCell onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-1.5 justify-end">
                {onStartProduction && (
                  <Button
                    size="sm"
                    className="h-8 gap-1.5 rounded-lg text-xs px-3"
                    onClick={() => onStartProduction(tmpl)}
                  >
                    <Play className="h-3 w-3 fill-current" />
                    {t('admin.templates.table.startProduction')}
                  </Button>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44">
                    <DropdownMenuItem onClick={() => onEdit(tmpl)}>
                      <Edit className="mr-2 h-3.5 w-3.5" />
                      {t('admin.templates.table.editMeta')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onEditScenes(tmpl)}>
                      <ExternalLink className="mr-2 h-3.5 w-3.5" />
                      {t('admin.templates.table.editScenes')}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => onDelete(tmpl)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="mr-2 h-3.5 w-3.5" />
                      {t('common.delete')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

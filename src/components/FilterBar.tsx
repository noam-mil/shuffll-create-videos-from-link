import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";

interface FilterBarProps {
  selectedFilters: string[];
  onFilterToggle: (filter: string) => void;
  onClearAll: () => void;
  selectedRealism: string[];
  onRealismToggle: (realism: string) => void;
}

export const FilterBar = ({ selectedFilters, onFilterToggle, onClearAll, selectedRealism, onRealismToggle }: FilterBarProps) => {
  const { t } = useTranslation();

  const filterOptions = [
    { id: "birthday", label: t('filters.birthdays') },
    { id: "holidays", label: t('filters.holidays') },
    { id: "births", label: t('filters.births') },
    { id: "achievements", label: t('filters.achievements') },
  ];

  const realismOptions = [
    { id: "Cartoon", label: t('filters.cartoon') },
    { id: "Realistic", label: t('filters.realistic') },
  ];

  const hasAnyFilter = selectedFilters.length > 0 || selectedRealism.length > 0;

  return (
    <div className="flex flex-wrap gap-3 items-center mb-8 animate-fade-in">
      <span className="text-sm font-medium text-muted-foreground">{t('common.filterBy')}</span>
      {filterOptions.map((filter) => (
        <Badge
          key={filter.id}
          variant={selectedFilters.includes(filter.id) ? "default" : "outline"}
          className={`cursor-pointer transition-all hover:scale-105 ${
            selectedFilters.includes(filter.id)
              ? "bg-primary text-primary-foreground"
              : "hover:bg-primary/10 hover:border-primary"
          }`}
          onClick={() => onFilterToggle(filter.id)}
        >
          {filter.label}
          {selectedFilters.includes(filter.id) && (
            <X className="w-3 h-3 ms-1" />
          )}
        </Badge>
      ))}

      <span className="w-px h-5 bg-border" />

      {realismOptions.map((filter) => (
        <Badge
          key={filter.id}
          variant={selectedRealism.includes(filter.id) ? "default" : "outline"}
          className={`cursor-pointer transition-all hover:scale-105 ${
            selectedRealism.includes(filter.id)
              ? "bg-accent text-accent-foreground"
              : "hover:bg-accent/10 hover:border-accent"
          }`}
          onClick={() => onRealismToggle(filter.id)}
        >
          {filter.label}
          {selectedRealism.includes(filter.id) && (
            <X className="w-3 h-3 ms-1" />
          )}
        </Badge>
      ))}

      {hasAnyFilter && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearAll}
          className="text-muted-foreground hover:text-foreground"
        >
          {t('common.clearAll')}
        </Button>
      )}
    </div>
  );
};

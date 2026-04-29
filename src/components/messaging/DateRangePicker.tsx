import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { format, subDays } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface DateRangePickerProps {
  dateRange: { from: Date; to: Date };
  onDateRangeChange: (range: { from: Date; to: Date }) => void;
}

export const DateRangePicker = ({ dateRange, onDateRangeChange }: DateRangePickerProps) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  const presets = [
    { label: t('messagingHub.dateRange.last3Days'), days: 3 },
    { label: t('messagingHub.dateRange.last7Days'), days: 7 },
    { label: t('messagingHub.dateRange.last30Days'), days: 30 },
  ];

  const handlePresetClick = (days: number) => {
    const to = new Date();
    const from = subDays(to, days);
    onDateRangeChange({ from, to });
  };

  const handleCalendarSelect = (range: DateRange | undefined) => {
    if (range?.from && range?.to) {
      onDateRangeChange({ from: range.from, to: range.to });
    }
  };

  return (
    <div className="flex items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            {t('messagingHub.dateRange.label')}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {presets.map((preset) => (
            <DropdownMenuItem
              key={preset.days}
              onClick={() => handlePresetClick(preset.days)}
            >
              {preset.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              'justify-start text-left font-normal min-w-[240px]',
              !dateRange && 'text-muted-foreground'
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {format(dateRange.from, 'MMM d, yyyy')} - {format(dateRange.to, 'MMM d, yyyy')}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <Calendar
            mode="range"
            defaultMonth={dateRange.from}
            selected={{ from: dateRange.from, to: dateRange.to }}
            onSelect={handleCalendarSelect}
            numberOfMonths={2}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
};

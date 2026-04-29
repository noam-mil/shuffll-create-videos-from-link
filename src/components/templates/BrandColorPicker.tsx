import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import type { BrandColors } from '@/types/template';

interface BrandColorPickerProps {
  colors: BrandColors;
  onChange: (colors: BrandColors) => void;
}

const COLOR_FIELDS: { key: keyof BrandColors; label: string }[] = [
  { key: 'primary', label: 'Primary' },
  { key: 'secondary', label: 'Secondary' },
  { key: 'accent', label: 'Accent' },
];

export function BrandColorPicker({ colors, onChange }: BrandColorPickerProps) {
  return (
    <div className="flex items-end gap-4">
      {COLOR_FIELDS.map(({ key, label }) => (
        <div key={key} className="flex flex-col gap-1.5">
          <Label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            {label}
          </Label>
          <div className="flex items-center gap-1.5">
            <div className="relative">
              <input
                type="color"
                value={colors[key] || '#888888'}
                onChange={(e) => onChange({ ...colors, [key]: e.target.value })}
                className="sr-only peer"
                id={`color-${key}`}
              />
              <label
                htmlFor={`color-${key}`}
                className="block h-8 w-8 cursor-pointer rounded-lg border-2 border-border shadow-sm transition-all hover:scale-110 hover:shadow-md peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2"
                style={{ backgroundColor: colors[key] || '#888888' }}
              />
            </div>
            <Input
              value={colors[key] || ''}
              onChange={(e) => onChange({ ...colors, [key]: e.target.value })}
              placeholder="#000000"
              className="h-8 w-[76px] font-mono text-xs rounded-lg"
              dir="ltr"
            />
          </div>
        </div>
      ))}
    </div>
  );
}

import { Card } from "@/components/ui/card";
import { Play, Clock } from "lucide-react";
import correctWatermark from "@/assets/correct-watermark.svg";
import { Badge } from "@/components/ui/badge";

interface PortraitVideoCardProps {
  title: string;
  thumbnail: string;
  duration?: string;
  category?: string;
  realism?: string;
  lang?: string;
  onClick?: () => void;
}

const langLabels: Record<string, string> = {
  he: "עב",
  en: "EN",
  es: "ES",
  ar: "عر",
  de: "DE",
};

export const PortraitVideoCard = ({ title, thumbnail, duration, category, realism, lang, onClick }: PortraitVideoCardProps) => {
  return (
    <Card 
      onClick={onClick}
      className="group relative overflow-hidden rounded-2xl border-border bg-card shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] transition-all duration-300 cursor-pointer animate-scale-in"
    >
      <div className="aspect-[9/16] relative overflow-hidden">
        <img 
          src={thumbnail} 
          alt={title}
          className="absolute inset-0 w-full h-full object-cover object-center group-hover:scale-110 transition-transform duration-500"
        />
        {/* Correct Logo Watermark */}
        <img 
          src={correctWatermark}
          alt="Correct"
          className="absolute bottom-12 left-3 h-5 w-auto opacity-80 group-hover:opacity-100 transition-opacity duration-300"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-foreground/90 via-foreground/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
          <div className="bg-primary/90 backdrop-blur-sm rounded-full p-5 transform scale-0 group-hover:scale-100 transition-transform duration-300 shadow-lg">
            <Play className="w-10 h-10 text-primary-foreground fill-current" />
          </div>
        </div>
        {/* Tags row: realism + category */}
        <div className="absolute top-3 right-3 flex flex-col gap-1.5 items-end">
          {realism && (
            <Badge variant="secondary" className="text-[10px] px-2 py-0.5 bg-background/80 backdrop-blur-sm">
              {realism}
            </Badge>
          )}
          {category && (
            <div className="bg-celebration/90 backdrop-blur-sm text-celebration-foreground px-3 py-1 rounded-full text-xs font-semibold">
              {category}
            </div>
          )}
        </div>
        {duration && (
          <div className="absolute bottom-3 right-3 bg-foreground/90 backdrop-blur-sm text-background px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {duration}
          </div>
        )}
      </div>
      <div className="p-4 flex items-center gap-2" dir="rtl">
        <h3 className="font-semibold text-card-foreground group-hover:text-primary transition-colors duration-200 line-clamp-2 text-right text-sm leading-relaxed flex-1">
          {title}
        </h3>
        {lang && (
          <span className="text-[10px] text-muted-foreground font-medium shrink-0 bg-muted/50 px-1.5 py-0.5 rounded">
            {langLabels[lang] || lang.toUpperCase()}
          </span>
        )}
      </div>
    </Card>
  );
};

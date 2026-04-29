import { Card } from "@/components/ui/card";
import { Play } from "lucide-react";
import correctWatermark from "@/assets/correct-watermark.svg";

interface TemplateCardProps {
  title: string;
  thumbnail: string;
  duration?: string;
}

export const TemplateCard = ({ title, thumbnail, duration = "0:30" }: TemplateCardProps) => {
  return (
    <Card className="group relative overflow-hidden rounded-xl border-border bg-card shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-2 hover:border-primary/50 transition-all duration-300 cursor-pointer animate-scale-in">
      <div className="aspect-video relative overflow-hidden">
        <img 
          src={thumbnail} 
          alt={title}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
        />
        {/* Correct Logo Watermark */}
        <img 
          src={correctWatermark}
          alt="Correct"
          className="absolute bottom-3 left-3 h-6 w-auto opacity-80 group-hover:opacity-100 transition-opacity duration-300"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 via-foreground/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
          <div className="bg-primary/90 backdrop-blur-sm rounded-full p-4 transform scale-0 group-hover:scale-100 transition-transform duration-300 delay-100 shadow-lg shadow-primary/30">
            <Play className="w-8 h-8 text-primary-foreground fill-current" />
          </div>
        </div>
        {/* Animated gradient border on hover */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-r from-[#00DBDB]/30 via-[#CEE95C]/30 to-[#FF6D66]/30 animate-gradient-shift" style={{ backgroundSize: "200% 200%" }} />
        </div>
        {duration && (
          <div className="absolute bottom-2 right-2 bg-foreground/80 backdrop-blur-sm text-background px-2 py-1 rounded text-xs font-medium group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300">
            {duration}
          </div>
        )}
      </div>
      <div className="p-4 relative" dir="rtl">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        <h3 className="font-semibold text-card-foreground group-hover:text-primary transition-colors duration-200 line-clamp-2 text-right relative z-10">
          {title}
        </h3>
      </div>
    </Card>
  );
};

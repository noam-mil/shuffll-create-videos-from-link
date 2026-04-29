import { useState, useRef } from "react";
import { PortraitVideoCard } from "./PortraitVideoCard";
import { TemplateDialog } from "./TemplateDialog";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Template } from "@/lib/templates";

interface TemplateCarouselProps {
  title: string;
  templates: Template[];
  categoryId?: string;
}

export const TemplateCarousel = ({ title, templates, categoryId }: TemplateCarouselProps) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);

  const scroll = (direction: "left" | "right") => {
    if (scrollContainerRef.current) {
      const scrollAmount = direction === "left" ? -320 : 320;
      scrollContainerRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  return (
    <div className="mb-12 animate-fade-in" dir="rtl">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-foreground">{title}</h2>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => scroll("left")}
            className="hover:bg-primary/10 hover:border-primary"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => scroll("right")}
            className="hover:bg-primary/10 hover:border-primary"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div
        ref={scrollContainerRef}
        className="flex gap-4 overflow-x-auto scrollbar-hide scroll-smooth pb-2"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {templates.map((template, index) => (
          <div key={template.id} className="flex-none w-64" style={{ animationDelay: `${index * 0.1}s` }}>
            <PortraitVideoCard
              title={template.name}
              thumbnail={template.poster}
              realism={template.realism}
              lang={template.lang}
              category={categoryId}
              onClick={() => setSelectedTemplate(template)}
            />
          </div>
        ))}
      </div>

      <TemplateDialog
        open={!!selectedTemplate}
        onOpenChange={(open) => !open && setSelectedTemplate(null)}
        title={selectedTemplate?.name || ""}
        thumbnail={selectedTemplate?.poster || ""}
        category={categoryId || ""}
        videoId={selectedTemplate?.videoId}
      />
    </div>
  );
};

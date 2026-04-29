import { useState } from "react";
import { useTranslation } from "react-i18next";
import { PortraitVideoCard } from "./PortraitVideoCard";
import { TemplateDialog } from "./TemplateDialog";
import { Lightbulb } from "lucide-react";

interface SuggestionVideo {
  id: string;
  title: string;
  thumbnail: string;
  duration?: string;
  category: string;
}

interface SuggestionsSectionProps {
  suggestions: SuggestionVideo[];
}

export const SuggestionsSection = ({ suggestions }: SuggestionsSectionProps) => {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === 'he' || i18n.language === 'ar';
  const [selectedVideo, setSelectedVideo] = useState<SuggestionVideo | null>(null);

  return (
    <>
    <section className="mb-16 animate-fade-in" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="bg-gradient-to-br from-celebration/5 via-accent/5 to-celebration-muted/10 rounded-3xl p-8 border border-celebration/10">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-celebration/10 p-3 rounded-xl">
            <Lightbulb className="w-6 h-6 text-celebration" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-foreground">{t('orgHome.suggestionsSection.title')}</h2>
            <p className="text-muted-foreground">{t('orgHome.suggestionsSection.subtitle')}</p>
          </div>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {suggestions.map((video, index) => (
            <div key={video.id} style={{ animationDelay: `${index * 0.1}s` }}>
              <PortraitVideoCard
                title={video.title}
                thumbnail={video.thumbnail}
                duration={video.duration}
                category={video.category}
                onClick={() => setSelectedVideo(video)}
              />
            </div>
          ))}
        </div>
      </div>
    </section>

    <TemplateDialog
      open={!!selectedVideo}
      onOpenChange={(open) => !open && setSelectedVideo(null)}
      title={selectedVideo?.title || ""}
      thumbnail={selectedVideo?.thumbnail || ""}
      category={selectedVideo?.category || ""}
      duration={selectedVideo?.duration}
    />
    </>
  );
};

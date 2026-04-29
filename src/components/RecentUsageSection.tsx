import { useState } from "react";
import { useTranslation } from "react-i18next";
import { PortraitVideoCard } from "./PortraitVideoCard";
import { TemplateDialog } from "./TemplateDialog";
import { Clock } from "lucide-react";

interface RecentVideo {
  id: string;
  title: string;
  thumbnail: string;
  duration?: string;
  category: string;
  lastEdited: string;
}

interface RecentUsageSectionProps {
  recentVideos: RecentVideo[];
}

export const RecentUsageSection = ({ recentVideos }: RecentUsageSectionProps) => {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === 'he' || i18n.language === 'ar';
  const [selectedVideo, setSelectedVideo] = useState<RecentVideo | null>(null);

  if (recentVideos.length === 0) return null;

  return (
    <>
    <section className="mb-16 animate-fade-in" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="flex items-center gap-3 mb-6">
        <div className="bg-primary/10 p-3 rounded-xl">
          <Clock className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-foreground">{t('orgHome.recentUsage.title')}</h2>
          <p className="text-muted-foreground">{t('orgHome.recentUsage.subtitle')}</p>
        </div>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {recentVideos.map((video, index) => (
          <div key={video.id} style={{ animationDelay: `${index * 0.1}s` }}>
            <PortraitVideoCard
              title={video.title}
              thumbnail={video.thumbnail}
              duration={video.duration}
              category={video.category}
              onClick={() => setSelectedVideo(video)}
            />
            <p className="text-xs text-muted-foreground mt-2 text-center">
              {video.lastEdited}
            </p>
          </div>
        ))}
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

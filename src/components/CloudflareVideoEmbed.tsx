import { getCloudflareEmbedUrl } from "@/lib/templates";

interface CloudflareVideoEmbedProps {
  videoId: string;
  className?: string;
}

export const CloudflareVideoEmbed = ({ videoId, className = "" }: CloudflareVideoEmbedProps) => {
  return (
    <div className={`relative ${className}`} style={{ paddingTop: "177.77777777777777%" }}>
      <iframe
        src={getCloudflareEmbedUrl(videoId)}
        loading="lazy"
        style={{ border: "none", position: "absolute", top: 0, left: 0, height: "100%", width: "100%" }}
        allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
        allowFullScreen
      />
    </div>
  );
};

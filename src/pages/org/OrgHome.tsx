import { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { OrgLayout } from "@/components/layouts/OrgLayout";
import { useOrganization } from "@/contexts/OrganizationContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { TemplateCarousel } from "@/components/TemplateCarousel";
import { FilterBar } from "@/components/FilterBar";
import { CsvPreviewDialog } from "@/components/CsvPreviewDialog";
import { Sparkles, Upload } from "lucide-react";
import { TEMPLATES, getCategories, getCategoryLabel, getCategoryEmoji } from "@/lib/templates";
import { useTemplates } from "@/hooks/useTemplates";
import type { Template } from "@/lib/templates";

// Map DB templates to the carousel-compatible Template shape
function dbToCarouselTemplate(db: { id: string; name: string; poster_url: string | null; video_id: string | null; realism: string | null; category: string; lang: string }): Template {
  return {
    id: db.id,
    name: db.name,
    poster: db.poster_url || '',
    videoId: db.video_id || '',
    realism: (db.realism === 'Realistic' ? 'Realistic' : 'Cartoon') as Template['realism'],
    category: db.category,
    lang: db.lang,
  };
}

const OrgHome = () => {
  const { t } = useTranslation();
  const { metaOrganization } = useOrganization();
  const [prompt, setPrompt] = useState("");
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);
  const [selectedRealism, setSelectedRealism] = useState<string[]>([]);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvDialogOpen, setCsvDialogOpen] = useState(false);
  const csvInputRef = useRef<HTMLInputElement>(null);

  // Fetch DB templates for this meta org (includes system-wide + org-specific)
  const { data: dbTemplates = [] } = useTemplates(metaOrganization?.id);

  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCsvFile(file);
      setCsvDialogOpen(true);
      if (csvInputRef.current) csvInputRef.current.value = "";
    }
  };

  const showDummy = metaOrganization?.show_dummy_templates ?? false;

  // Merge DB templates with hardcoded fallback (hardcoded shown only if showDummy is on)
  const dbCarouselTemplates = dbTemplates.filter(t => t.is_active).map(dbToCarouselTemplate);
  const hardcodedTemplates = showDummy ? TEMPLATES : [];
  const allTemplates = [...dbCarouselTemplates, ...hardcodedTemplates];

  // Apply realism filter
  const filteredByRealism = selectedRealism.length > 0
    ? allTemplates.filter(t => selectedRealism.includes(t.realism))
    : allTemplates;

  // Collect all unique categories from visible templates
  const allCats = Array.from(new Set(allTemplates.map(t => t.category)));
  const categories = allCats.length > 0 ? allCats : getCategories();
  const filteredCategories = selectedFilters.length > 0
    ? categories.filter(c => selectedFilters.includes(c))
    : categories;

  const occasions = filteredCategories.map(cat => ({
    id: cat,
    title: `${getCategoryLabel(cat, t)} ${getCategoryEmoji(cat)}`,
    templates: filteredByRealism.filter(tpl => tpl.category === cat),
  })).filter(o => o.templates.length > 0);

  const handleFilterToggle = (filter: string) => {
    setSelectedFilters(prev =>
      prev.includes(filter) ? prev.filter(f => f !== filter) : [...prev, filter]
    );
  };

  const handleRealismToggle = (realism: string) => {
    setSelectedRealism(prev =>
      prev.includes(realism) ? prev.filter(r => r !== realism) : [...prev, realism]
    );
  };

  const handleClearFilters = () => {
    setSelectedFilters([]);
    setSelectedRealism([]);
  };

  return (
    <OrgLayout>
      <div className="container mx-auto px-6 py-12">
        {/* Hero Section */}
        <section className="mb-16 animate-fade-in relative">
          <div className="absolute inset-0 -z-10 overflow-hidden rounded-3xl">
            <div 
              className="absolute inset-0 bg-gradient-to-r from-[#00DBDB]/20 via-[#CEE95C]/15 to-[#FF6D66]/20 animate-gradient-shift blur-3xl"
              style={{ backgroundSize: "200% 200%" }}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/50 to-background" />
          </div>
          
          <div className="absolute top-4 right-10 w-20 h-20 bg-[#00DBDB]/10 rounded-full blur-2xl animate-float" />
          <div className="absolute bottom-10 left-10 w-32 h-32 bg-[#CEE95C]/10 rounded-full blur-2xl animate-float" style={{ animationDelay: "2s" }} />
          <div className="absolute top-1/2 left-1/4 w-16 h-16 bg-[#FF6D66]/10 rounded-full blur-2xl animate-float" style={{ animationDelay: "4s" }} />
          
          <div className="max-w-4xl mx-auto relative py-8">
            <div className="mb-8 text-center">
              <h2 className="text-3xl font-bold text-foreground mb-3">
                {t('orgHome.hero.title')}
              </h2>
              <p className="text-muted-foreground">
                {t('orgHome.hero.subtitle')}
              </p>
            </div>

            <div className="mb-4">
              <Textarea
                placeholder={t('orgHome.hero.placeholder')}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="min-h-[100px] text-base resize-none bg-card border-border focus:border-primary rounded-xl"
              />
            </div>

            <div className="flex flex-wrap gap-3 justify-center">
              <Button 
                variant="celebration" 
                size="lg" 
                disabled={!prompt.trim()}
              >
                <Sparkles className="w-4 h-4 ml-2" />
                {t('orgHome.hero.createVideo')}
              </Button>
              <input
                type="file"
                ref={csvInputRef}
                accept=".csv"
                onChange={handleCsvUpload}
                className="hidden"
              />
              <Button variant="outline" size="lg" onClick={() => csvInputRef.current?.click()}>
                <Upload className="w-4 h-4 ml-2" />
                {t('orgHome.hero.loadCsv')}
              </Button>
            </div>
          </div>
        </section>

        {/* Filter Bar */}
        <FilterBar
          selectedFilters={selectedFilters}
          onFilterToggle={handleFilterToggle}
          onClearAll={handleClearFilters}
          selectedRealism={selectedRealism}
          onRealismToggle={handleRealismToggle}
        />

        {/* Template Categories */}
        <section>
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-foreground mb-2">{t('orgHome.browse.title')}</h2>
            <p className="text-muted-foreground">
              {t('orgHome.browse.subtitle')}
            </p>
          </div>
          {occasions.length > 0 ? (
            occasions.map((occasion, index) => (
              <div key={occasion.id} style={{ animationDelay: `${index * 0.2}s` }}>
                <TemplateCarousel 
                  title={occasion.title} 
                  templates={occasion.templates}
                  categoryId={occasion.id}
                />
              </div>
            ))
          ) : (
            <div className="text-center py-16 animate-fade-in">
              <p className="text-xl text-muted-foreground mb-4">{t('orgHome.browse.noTemplates')}</p>
              <Button variant="outline" onClick={handleClearFilters}>
                {t('orgHome.browse.clearFilter')}
              </Button>
            </div>
          )}
        </section>

        {/* CSV Preview Dialog */}
        <CsvPreviewDialog 
          open={csvDialogOpen} 
          onOpenChange={setCsvDialogOpen} 
          file={csvFile} 
        />
      </div>
    </OrgLayout>
  );
};

export default OrgHome;

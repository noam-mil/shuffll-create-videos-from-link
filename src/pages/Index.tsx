import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Video, Building2, Users, Sparkles, ArrowLeft, ArrowRight, Shield, Palette, Zap } from "lucide-react";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import brandLogo from "@/assets/brand-logo.svg";
import birthdayPortrait from "@/assets/birthday-portrait.jpg";
import holidayPortrait from "@/assets/holiday-portrait.jpg";
import achievementPortrait from "@/assets/achievement-portrait.jpg";

const Index = () => {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === 'he' || i18n.language === 'ar';
  const ArrowIcon = isRtl ? ArrowLeft : ArrowRight;

  return (
    <div className="min-h-screen bg-background" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-6 py-3 flex items-center justify-between">
          <div className="group flex items-center gap-2 bg-gradient-to-r from-primary/5 via-[#00DBDB]/5 to-[#CEE95C]/5 px-5 py-2 rounded-full border border-primary/10">
            <img src={brandLogo} alt="Correct" className="h-8 w-auto" />
            <span className="text-muted-foreground/40 text-lg font-light">|</span>
            <div className="flex items-center gap-1.5">
              <Video className="w-5 h-5 text-primary" />
              <span className="text-lg font-semibold bg-gradient-to-r from-primary via-[#00DBDB] to-[#CEE95C] bg-clip-text text-transparent">
                AI Creator
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <Link to="/admin">
              <Button variant="outline" size="sm" className="gap-2">
                <Shield className="w-4 h-4" />
                {t('nav.adminPanel')}
              </Button>
            </Link>
            <Link to="/login">
              <Button size="sm">{t('auth.login')}</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 lg:py-32">
        <div className="absolute inset-0 -z-10">
          <div 
            className="absolute inset-0 bg-gradient-to-r from-[#00DBDB]/20 via-[#CEE95C]/15 to-[#FF6D66]/20 animate-gradient-shift blur-3xl"
            style={{ backgroundSize: "200% 200%" }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/50 to-background" />
        </div>
        
        <div className="absolute top-20 right-20 w-32 h-32 bg-[#00DBDB]/10 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-20 left-20 w-40 h-40 bg-[#CEE95C]/10 rounded-full blur-3xl animate-float" style={{ animationDelay: "2s" }} />
        <div className="absolute top-1/2 left-1/3 w-24 h-24 bg-[#FF6D66]/10 rounded-full blur-3xl animate-float" style={{ animationDelay: "4s" }} />

        <div className="container mx-auto px-6 text-center relative">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-6">
            <Sparkles className="w-4 h-4" />
            {t('landing.tagline')}
          </div>
          
          <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6 max-w-4xl mx-auto leading-tight">
            {t('landing.heroTitle')}
            <span className="bg-gradient-to-r from-primary via-[#00DBDB] to-[#CEE95C] bg-clip-text text-transparent"> {t('landing.heroTitleHighlight')}</span>
          </h1>
          
          <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
            {t('landing.heroSubtitle')}
          </p>

          <div className="flex flex-wrap gap-4 justify-center">
            <Link to="/admin/organizations">
              <Button size="lg" className="gap-2">
                <Building2 className="w-5 h-5" />
                {t('landing.createOrg')}
                <ArrowIcon className="w-4 h-4" />
              </Button>
            </Link>
            <Link to="/login">
              <Button variant="outline" size="lg">
                {t('landing.enterSystem')}
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-card/50">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-foreground mb-4">{t('landing.whyChooseUs')}</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              {t('landing.whyChooseUsSubtitle')}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="p-8 hover:shadow-xl transition-shadow border-primary/10">
              <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mb-6">
                <Palette className="w-7 h-7 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-3">{t('landing.customBranding')}</h3>
              <p className="text-muted-foreground">
                {t('landing.customBrandingDesc')}
              </p>
            </Card>

            <Card className="p-8 hover:shadow-xl transition-shadow border-[#00DBDB]/10">
              <div className="w-14 h-14 bg-[#00DBDB]/10 rounded-2xl flex items-center justify-center mb-6">
                <Users className="w-7 h-7 text-[#00DBDB]" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-3">{t('landing.userManagement')}</h3>
              <p className="text-muted-foreground">
                {t('landing.userManagementDesc')}
              </p>
            </Card>

            <Card className="p-8 hover:shadow-xl transition-shadow border-[#CEE95C]/10">
              <div className="w-14 h-14 bg-[#CEE95C]/10 rounded-2xl flex items-center justify-center mb-6">
                <Zap className="w-7 h-7 text-[#CEE95C]" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-3">{t('landing.fastCreation')}</h3>
              <p className="text-muted-foreground">
                {t('landing.fastCreationDesc')}
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Demo Templates Section */}
      <section className="py-20">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-foreground mb-4">{t('landing.sampleTemplates')}</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              {t('landing.sampleTemplatesSubtitle')}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {[
              { title: t('landing.birthdays'), image: birthdayPortrait },
              { title: t('landing.holidays'), image: holidayPortrait },
              { title: t('landing.achievements'), image: achievementPortrait },
            ].map((template, i) => (
              <Card key={i} className="overflow-hidden group cursor-pointer">
                <div className="aspect-[9/16] relative overflow-hidden">
                  <img 
                    src={template.image} 
                    alt={template.title}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                  <div className={`absolute bottom-4 ${isRtl ? 'right-4 left-4' : 'left-4 right-4'}`}>
                    <p className="text-white font-semibold">{template.title}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-primary/10 via-[#00DBDB]/10 to-[#CEE95C]/10">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold text-foreground mb-4">
            {t('landing.readyToStart')}
          </h2>
          <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
            {t('landing.readyToStartSubtitle')}
          </p>
          <Link to="/admin">
            <Button size="lg" className="gap-2">
              <Building2 className="w-5 h-5" />
              {t('landing.startNow')}
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-border">
        <div className="container mx-auto px-6">
          <div className="flex items-center justify-center gap-3 mb-4">
            <img src={brandLogo} alt="Correct" className="h-8 w-auto opacity-80" />
          </div>
          <p className="text-center text-sm text-muted-foreground">
            Correct AI Creator • {t('landing.copyright')} © {new Date().getFullYear()}
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;

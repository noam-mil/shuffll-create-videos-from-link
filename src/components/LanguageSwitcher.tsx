import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Globe } from 'lucide-react';
import { setLanguage, type SupportedLanguage } from '@/i18n';

const LANGUAGES: { code: SupportedLanguage; flag: string; labelKey: string; nativeName: string }[] = [
  { code: 'en', flag: '🇺🇸', labelKey: 'settings.english', nativeName: 'English' },
  { code: 'he', flag: '🇮🇱', labelKey: 'settings.hebrew', nativeName: 'עברית' },
  { code: 'es', flag: '🇪🇸', labelKey: 'settings.spanish', nativeName: 'Español' },
  { code: 'ar', flag: '🇸🇦', labelKey: 'settings.arabic', nativeName: 'العربية' },
  { code: 'de', flag: '🇩🇪', labelKey: 'settings.german', nativeName: 'Deutsch' },
];

export const LanguageSwitcher = () => {
  const { i18n, t } = useTranslation();
  const currentLang = i18n.language;

  const handleLanguageChange = (lang: SupportedLanguage) => {
    setLanguage(lang);
  };

  const currentLanguage = LANGUAGES.find(l => l.code === currentLang) || LANGUAGES[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <Globe className="w-4 h-4" />
          <span className="hidden sm:inline">
            {currentLanguage.nativeName}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {LANGUAGES.map((lang) => (
          <DropdownMenuItem 
            key={lang.code}
            onClick={() => handleLanguageChange(lang.code)}
            className={currentLang === lang.code ? 'bg-accent' : ''}
          >
            {lang.flag} {t(lang.labelKey)}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

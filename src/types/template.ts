export interface DbTemplate {
  id: string;
  name: string;
  category: string;
  event_type: string | null;
  realism: string | null;
  lang: string;
  poster_url: string | null;
  video_id: string | null;
  meta_organization_id: string | null;
  is_active: boolean;
  bg_music_url: string | null;
  voice_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface TemplateScene {
  id: string;
  template_id: string;
  name: string;
  scene_order: number;
  reference_url: string | null;
  prompt: string;
  description: string | null;
  video_prompt: string | null;
  voice_script: string | null;
  scene_type: 'single' | 'first_frame' | 'last_frame';
  auto_select: boolean;
  created_at: string;
  updated_at: string;
}

export interface TemplateOrder {
  id: string;
  template_id: string;
  meta_organization_id: string | null;
  organization_id: string | null;
  company_name: string;
  contact_name: string;
  phone: string;
  event_type: string | null;
  logo_url: string | null;
  message_text: string | null;
  status: 'pending' | 'processing' | 'completed';
  created_by: string;
  created_at: string;
}

export interface SceneGenerationSlot {
  status: 'idle' | 'loading' | 'done' | 'error';
  src: string | null;
  error: string | null;
}

export interface BrandColors {
  primary: string;
  secondary: string;
  accent: string;
}

export const TEMPLATE_CATEGORIES = [
  'birthday', 'holiday', 'corporate', 'bar_bat_mitzvah', 'birth', 'achievement',
] as const;

export type TemplateCategory = (typeof TEMPLATE_CATEGORIES)[number];

export const CATEGORY_LABELS: Record<string, string> = {
  birthday: 'Birthday',
  holiday: 'Holiday',
  corporate: 'Corporate',
  bar_bat_mitzvah: 'Bar/Bat Mitzvah',
  birth: 'Birth',
  achievement: 'Achievement',
};

export const REALISM_OPTIONS = ['Cartoon', 'Realistic'] as const;

export const LANG_OPTIONS = [
  { value: 'en', label: 'English' },
  { value: 'he', label: 'Hebrew' },
  { value: 'es', label: 'Spanish' },
  { value: 'ar', label: 'Arabic' },
  { value: 'de', label: 'German' },
] as const;

export interface TemplateProduction {
  id: string;
  template_id: string;
  meta_organization_id: string | null;
  organization_id: string | null;
  name: string;
  first_name: string | null;
  logo_url: string | null;
  brand_primary: string | null;
  brand_secondary: string | null;
  brand_accent: string | null;
  status: 'draft' | 'generating' | 'ready' | 'exported';
  order_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ProductionSceneResult {
  id: string;
  production_id: string;
  template_scene_id: string;
  prompt_override: string | null;
  description_override: string | null;
  generated_images: string[];
  selected_image_url: string | null;
  video_url: string | null;
  video_status: 'pending' | 'generating' | 'done' | 'error';
  custom_reference_url: string | null;
  voice_script: string | null;
  voice_audio_url: string | null;
  scene_order: number;
  created_at: string;
  updated_at: string;
}

export interface ProductionSceneWithBase {
  baseScene: TemplateScene;
  result: ProductionSceneResult;
  effectivePrompt: string;
  effectiveDescription: string | null;
  effectiveReferenceUrl: string | null;
}

export function resolveColorPlaceholders(
  text: string,
  brandColors: BrandColors
): string {
  return text
    .replace(/#XXXXXX/gi, brandColors.primary || '#888888')
    .replace(/#YYYYYY/gi, brandColors.secondary || '#444444')
    .replace(/#ZZZZZZ/gi, brandColors.accent || '#222222');
}

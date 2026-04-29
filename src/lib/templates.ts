// Centralized template data for reuse across components

export interface Template {
  id: string;
  name: string;
  poster: string;
  videoId: string;
  realism: "Cartoon" | "Realistic";
  category: string;
  lang: string;
  isDummy?: boolean;
}

export const TEMPLATES: Template[] = [
  // Birthday templates
  { id: "b2", name: "Birthday DJ - Cartoon", poster: "https://imagedelivery.net/y9xVFT-F6NamVdfDrKOTkw/942564a5-b8e9-4ebb-d48a-0fefec778200/public", videoId: "be8613b7eb233035dd3a6ad940fd9096", realism: "Cartoon", category: "birthday", lang: "he" },
  { id: "b3", name: "Cosmic Birthday - Cartoon", poster: "https://imagedelivery.net/y9xVFT-F6NamVdfDrKOTkw/3b8adc35-f305-43a1-39d0-b21822cf9700/public", videoId: "b08facb2eccf96a6624f1739caf411b8", realism: "Cartoon", category: "birthday", lang: "he" },
  { id: "b4", name: "Cosmic Birthday - Realistic", poster: "https://imagedelivery.net/y9xVFT-F6NamVdfDrKOTkw/105edb08-506d-4859-119b-c08ec7c7b500/public", videoId: "2db98135621c030cb3bb34fb05e3b01a", realism: "Realistic", category: "birthday", lang: "he" },
  { id: "b5", name: "Car Radio - Cartoon", poster: "https://imagedelivery.net/y9xVFT-F6NamVdfDrKOTkw/679c5a01-1e38-4d0a-54dd-77fc50452000/public", videoId: "dc2d0b1609743d30db8d1c21d96d8e3d", realism: "Cartoon", category: "birthday", lang: "he" },
  { id: "b6", name: "Confetti Forcast - Realistic", poster: "https://imagedelivery.net/y9xVFT-F6NamVdfDrKOTkw/801c6ef4-0a91-4318-2c05-e15eaabdf000/public", videoId: "b754fb542d433bfe04ebbe2aefb80794", realism: "Realistic", category: "birthday", lang: "he" },
  { id: "b7", name: "Confetti Forcast - Cartoon", poster: "https://imagedelivery.net/y9xVFT-F6NamVdfDrKOTkw/8c7a2dc5-366d-4039-6edd-bf67bdf7f200/public", videoId: "e8d59c2287c6480f17127632d3b63f7a", realism: "Cartoon", category: "birthday", lang: "he" },
  { id: "b8", name: "Birthday DJ - Realistic", poster: "https://imagedelivery.net/y9xVFT-F6NamVdfDrKOTkw/79620a46-ccae-4486-6f32-231d1a40ca00/public", videoId: "19f6ebe6ef1d61a8e0ccdb9ed56e28ec", realism: "Realistic", category: "birthday", lang: "he" },
  { id: "b1", name: "Birthday DJ - Cartoon (en)", poster: "https://imagedelivery.net/y9xVFT-F6NamVdfDrKOTkw/942564a5-b8e9-4ebb-d48a-0fefec778200/public", videoId: "2a839242436c7ae35e9c0383a325c0ea", realism: "Cartoon", category: "birthday", lang: "en" },
];

export function getTemplateById(id: string | null | undefined): Template | undefined {
  if (!id) return undefined;
  return TEMPLATES.find(t => t.id === id);
}

export function getTemplatesByCategory(category: string): Template[] {
  return TEMPLATES.filter(t => !t.isDummy && t.category === category);
}

export function getCategories(): string[] {
  const cats = new Set(TEMPLATES.filter(t => !t.isDummy).map(t => t.category));
  return Array.from(cats);
}

export function getCategoryLabel(category: string, t: (key: string) => string): string {
  const categoryMap: Record<string, string> = {
    birthday: 'filters.birthdays',
    birthdays: 'filters.birthdays',
    holidays: 'filters.holidays',
    births: 'filters.births',
    achievements: 'filters.achievements',
  };
  return t(categoryMap[category] || category);
}

export function getCategoryEmoji(category: string): string {
  const emojiMap: Record<string, string> = {
    birthday: '🎂',
    birthdays: '🎂',
    holidays: '🎉',
    births: '👶',
    achievements: '🏆',
  };
  return emojiMap[category] || '';
}

export function getCloudflareEmbedUrl(videoId: string): string {
  const posterUrl = encodeURIComponent(`https://customer-pi79d1jim1s9bdzv.cloudflarestream.com/${videoId}/thumbnails/thumbnail.jpg?time=&height=600`);
  return `https://customer-pi79d1jim1s9bdzv.cloudflarestream.com/${videoId}/iframe?poster=${posterUrl}`;
}

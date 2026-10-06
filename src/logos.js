export const logoTitles = {
  ru: 'Ритм с Дино',
  en: 'Rhythm with Dino',
  fr: 'En rythme avec Dino',
  ar: 'الإيقاع مع دينو',
  hi: 'डिनो के साथ रिदम',
};
export const supportedLanguages = Object.keys(logoTitles);
export function localizedLogo(language, style) {
  const lang = Object.hasOwn(logoTitles, language) ? language : 'en';
  return `<img class="art" data-art="logo" src="public/assets/logos/logo-${lang}.png" alt="${logoTitles[lang]}" style="${style}" draggable="false">`;
}

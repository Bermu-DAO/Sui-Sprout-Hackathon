import { createContext, useContext, useState, type ReactNode } from 'react';
import { en, type TranslationKey } from './en';
import { zhTW } from './zh-TW';

type Lang = 'en' | 'zh-TW';

const translations: Record<Lang, Record<TranslationKey, string>> = {
  'en': en,
  'zh-TW': zhTW,
};

interface I18nContext {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: TranslationKey) => string;
}

const I18nCtx = createContext<I18nContext>({
  lang: 'en',
  setLang: () => {},
  t: (key) => key,
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    const saved = localStorage.getItem('coc-lang');
    return (saved === 'zh-TW' ? 'zh-TW' : 'en') as Lang;
  });

  const setLang = (newLang: Lang) => {
    setLangState(newLang);
    localStorage.setItem('coc-lang', newLang);
  };

  const t = (key: TranslationKey): string => {
    return translations[lang][key] || translations['en'][key] || key;
  };

  return (
    <I18nCtx.Provider value={{ lang, setLang, t }}>
      {children}
    </I18nCtx.Provider>
  );
}

export function useI18n() {
  return useContext(I18nCtx);
}

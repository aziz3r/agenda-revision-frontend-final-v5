import { useTranslation } from 'react-i18next';

export default function LangSwitch() {
  const { i18n } = useTranslation();

  const toggle = () => {
    const next = i18n.language?.startsWith('fr') ? 'en' : 'fr';
    i18n.changeLanguage(next);
    document.documentElement.lang = next; // accessibilité / SEO
  };

  return (
    <div role="group" aria-label="Language switch">
      <button onClick={() => i18n.changeLanguage('fr')} aria-pressed={i18n.language.startsWith('fr')}>🇫🇷 FR</button>
      <button onClick={() => i18n.changeLanguage('en')} aria-pressed={i18n.language.startsWith('en')}>🇬🇧 EN</button>
      {/* ou un seul bouton toggle: <button onClick={toggle}>FR/EN</button> */}
    </div>
  );
}

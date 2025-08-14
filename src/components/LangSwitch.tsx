import { useTranslation } from 'react-i18next';

export default function LangSwitch() {
  const { i18n } = useTranslation();
  const cur = (i18n.resolvedLanguage || i18n.language || 'fr').split('-')[0] as 'fr' | 'en';

  const Item = ({ code, label, flag }:{
    code: 'fr' | 'en'; label: string; flag: string
  }) => (
    <button
      type="button"
      onClick={() => i18n.changeLanguage(code)}
      className={'seg-item' + (cur === code ? ' active' : '')}
      style={{ display:'flex', alignItems:'center', gap:6 }}
      aria-pressed={cur === code}
      aria-label={label}
    >
      <span className="icon" aria-hidden>{flag}</span>
      <span className="label">{label}</span>
    </button>
  );

  return (
    <>
      <Item code="fr" label="FR" flag="🇫🇷" />
      <Item code="en" label="EN" flag="🇬🇧" />
    </>
  );
}

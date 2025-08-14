
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { getAuth, logout } from '../auth'

const IconUser = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
    <path d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5Zm0 2c-4.418 0-8 2.239-8 5v1h16v-1c0-2.761-3.582-5-8-5Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

export default function SwitchUser() {
  const nav = useNavigate()
  const { t } = useTranslation()
  const email = getAuth()?.user?.email

  function handleClick() {
    const ok = confirm(t('account.switchConfirm'))
    if (!ok) return
    logout()                    // supprime le JWT du localStorage
    nav('/login', { replace: true }) // renvoie vers la page de connexion
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="seg-item"
      title={email ? `${t('account.switch')} • ${email}` : t('account.switch')}
      aria-label={t('account.switch')}
    >
      <span className="icon"><IconUser/></span>
      <span className="label">{t('account.short')}</span>
    </button>
  )
}

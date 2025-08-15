import { NavLink, Outlet } from 'react-router-dom'
import './MainLayout.css'
import { useTranslation } from 'react-i18next'
import LangSwitch from '../components/LangSwitch'
import SwitchUser from '../components/SwitchUser'   // 🆕 bouton compte (changer d'utilisateur)

const IconHome = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <path d="M3 10.5 12 3l9 7.5v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-9Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
  </svg>
)
const IconList = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
  </svg>
)
const IconPlus = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
  </svg>
)

export default function MainLayout() {
  const { t } = useTranslation()

  return (
    <div className="app">
      <header className="nav dark-pill">
        <div className="nav-inner">
          <h1 className="brand">{t('app.title')}</h1>

          <nav className="segmented">
            <NavLink to="/" end className={({isActive}) => 'seg-item' + (isActive ? ' active' : '')}>
              <span className="icon"><IconHome/></span>
              <span className="label">{t('nav.dashboard')}</span>
            </NavLink>

            <NavLink to="/examens" className={({isActive}) => 'seg-item' + (isActive ? ' active' : '')}>
              <span className="icon"><IconList/></span>
              <span className="label">{t('nav.exams')}</span>
            </NavLink>

            <NavLink to="/examens/add" className={({isActive}) => 'seg-item' + (isActive ? ' active' : '')}>
              <span className="icon"><IconPlus/></span>
              <span className="label">{t('nav.add')}</span>
            </NavLink>

            {/* Sélecteur de langue */}
            <LangSwitch />

            { /* Icône compte : déconnexion + redirection /login pour changer d'utilisateur */}
            <SwitchUser />
          </nav>
        </div>
      </header>

      <main className="container">
        <Outlet />
      </main>
    </div>
  )
}

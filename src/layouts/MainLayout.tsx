import { Link, Outlet } from 'react-router-dom'
import '../assets/styles/index.css'

export default function MainLayout() {
  return (
    <div className="app">
      <header className="header">
        <h1>Agenda de Révision</h1>
        <nav>
          <Link to="/dashboard">Dashboard</Link>
          <Link to="/examens">Examens</Link>
          <Link to="/examens/add">Ajouter</Link>
        </nav>
      </header>
      <div className="container">
        <Outlet />
      </div>
    </div>
  )
}

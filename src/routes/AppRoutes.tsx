// src/routes/AppRoutes.tsx
import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom'
import MainLayout from '../layouts/MainLayout'
import Dashboard from '../pages/Dashboard'
import Examens from '../pages/Examens'
import AddExamen from '../pages/AddExamen'
import EditExamen from '../pages/EditExamen'
import Login from '../pages/Login'
import Register from '../pages/Register'
import { getAuth } from '../auth' // <- récupère { jwt, user } depuis le localStorage

// Garde d'authentification (protège les routes enfants)
function PrivateRoute() {
  return getAuth() ? <Outlet /> : <Navigate to="/login" replace />
}

// Bloque l'accès à /login et /register si déjà connecté
function PublicOnlyRoute() {
  return getAuth() ? <Navigate to="/" replace /> : <Outlet />
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <MainLayout />,
    children: [
      // Routes publiques (login / register)
      {
        element: <PublicOnlyRoute />,
        children: [
          { path: 'login', element: <Login /> },
          { path: 'register', element: <Register /> }
        ]
      },

      // Routes privées (protégées)
      {
        element: <PrivateRoute />,
        children: [
          { index: true, element: <Dashboard /> },
          { path: 'dashboard', element: <Dashboard /> },
          { path: 'examens', element: <Examens /> },
          { path: 'examens/add', element: <AddExamen /> },
          { path: 'examens/:id/edit', element: <EditExamen /> }
        ]
      },

      // (Optionnel) fallback 404 -> redirige vers la racine
      { path: '*', element: <Navigate to="/" replace /> }
    ]
  }
])

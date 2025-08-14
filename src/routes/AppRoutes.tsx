// src/routes/AppRoutes.tsx (ou où tu déclares le router)
import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom'
import MainLayout from '../layouts/MainLayout'
import Dashboard from '../pages/Dashboard'
import Examens from '../pages/Examens'
import AddExamen from '../pages/AddExamen'
import EditExamen from '../pages/EditExamen'
import Login from '../pages/Login'
import { getAuth } from '../auth' // <- récupère { jwt, user } depuis le localStorage

// Garde d'authentification (protège les routes enfants)
function PrivateRoute() {
  return getAuth() ? <Outlet /> : <Navigate to="/login" replace />
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <MainLayout />,
    children: [
      // publique
      { path: 'login', element: <Login /> },

      // privées
      {
        element: <PrivateRoute />,
        children: [
          { index: true, element: <Dashboard /> },
          { path: 'dashboard', element: <Dashboard /> },
          { path: 'examens', element: <Examens /> },
          { path: 'examens/add', element: <AddExamen /> },
          { path: 'examens/:id/edit', element: <EditExamen /> }
        ]
      }
    ]
  }
])

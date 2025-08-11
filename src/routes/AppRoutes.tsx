import { createBrowserRouter } from 'react-router-dom'
import MainLayout from '../layouts/MainLayout'
import Dashboard from '../pages/Dashboard'
import Examens from '../pages/Examens'
import AddExamen from '../pages/AddExamen'
import EditExamen from '../pages/EditExamen'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <MainLayout />,
    children: [
      { index: true, element: <Dashboard /> },
      { path: 'dashboard', element: <Dashboard /> },
      { path: 'examens', element: <Examens /> },
      { path: 'examens/add', element: <AddExamen /> },
      { path: 'examens/:id/edit', element: <EditExamen /> }
    ]
  }
])

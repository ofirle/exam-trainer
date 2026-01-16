import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppLayout } from './App';
import { Training } from './pages/Training';
import { Exam } from './pages/Exam';
import { Stats } from './pages/Stats';
import { QuestionManager } from './pages/QuestionManager';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      {
        index: true,
        element: <Navigate to="/training" replace />,
      },
      {
        path: 'training',
        element: <Training />,
      },
      {
        path: 'exam',
        element: <Exam />,
      },
      {
        path: 'stats',
        element: <Stats />,
      },
      {
        path: 'manage',
        element: <QuestionManager />,
      },
    ],
  },
]);

import { createBrowserRouter } from 'react-router';
import { Root } from './Root';
import { Home } from './pages/Home';
import { History } from './pages/History';
import { Templates } from './pages/Templates';
import { Settings } from './pages/Settings';
import { Guide } from './pages/Guide';

export const router = createBrowserRouter([
  {
    path: '/',
    Component: Root,
    children: [
      { index: true, Component: Home },
      { path: 'history', Component: History },
      { path: 'templates', Component: Templates },
      { path: 'settings', Component: Settings },
      { path: 'guide', Component: Guide },
    ],
  },
]);

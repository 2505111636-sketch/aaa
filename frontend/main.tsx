import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/app.css';
const pathname = window.location.pathname;
const initialRole = pathname.startsWith('/admin')
  ? 'admin'
  : pathname.startsWith('/staff')
    ? 'staff'
    : pathname.startsWith('/passenger')
      ? 'passenger'
      : undefined;
createRoot(document.getElementById('root')!).render(<App initialRole={initialRole} />);

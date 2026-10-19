import React from 'react';
import {createRoot} from 'react-dom/client';
import App from '../app/rescue-app';
import '../app/globals.css';
const p=window.location.pathname;
const role=p.startsWith('/admin')?'admin':p.startsWith('/staff')?'staff':p.startsWith('/passenger')?'passenger':undefined;
createRoot(document.getElementById('root')!).render(<App initialRole={role}/>);

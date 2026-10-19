import { useEffect, useState } from 'react';
export function useNavigation() {
  const [screen, setScreenRaw] = useState('home');
  const [selected, setSelected] = useState('');
  const screens = [
    'home',
    'journey',
    'newJourney',
    'help',
    'mine',
    'plans',
    'location',
    'history',
    'record',
    'profile',
    'preferences',
    'saved',
    'about',
    'manage',
    'overview',
    'analytics',
  ];
  function setScreen(next: string) {
    if (!screens.includes(next)) next = 'home';
    setScreenRaw(next);
    if (
      ['home', 'journey', 'help', 'mine', 'manage', 'overview', 'analytics', 'history'].includes(
        next,
      )
    )
      setSelected('');
    if (window.location.hash !== '#' + next) window.history.pushState(null, '', '#' + next);
  }
  function openRecord(id: string) {
    setSelected(id);
    setScreenRaw('record');
    window.history.pushState(null, '', '#record?task=' + encodeURIComponent(id));
  }
  useEffect(() => {
    const read = () => {
      const [next, query] = window.location.hash.slice(1).split('?');
      if (next === 'main-content') return;
      setScreenRaw(screens.includes(next) ? next : 'home');
      const id = new URLSearchParams(query).get('task') || '';
      setSelected(/^[a-f0-9-]{36}$/i.test(id) ? id : '');
    };
    read();
    window.addEventListener('popstate', read);
    window.addEventListener('hashchange', read);
    return () => {
      window.removeEventListener('popstate', read);
      window.removeEventListener('hashchange', read);
    };
  }, []);
  return { screen, setScreen, openRecord, selected, setSelected };
}

import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import { needOptions, type Account } from '../../shared/model';
import { defaultPreferences, type Preferences } from '../features/account/preferences';
export function usePreferences(
  user: Account | null,
  setNeeds: Dispatch<SetStateAction<string[]>>,
  setMessage: Dispatch<SetStateAction<string>>,
) {
  const [preferences, setPreferences] = useState<Preferences>(defaultPreferences);
  useEffect(() => {
    let next = defaultPreferences;
    if (user)
      try {
        const saved = JSON.parse(localStorage.getItem('rr.preferences.' + user.id) || 'null');
        if (saved && Array.isArray(saved.needs))
          next = {
            largeText: saved.largeText === true,
            contrast: saved.contrast === true,
            saved: saved.saved !== false,
            needs: saved.needs.filter(
              (n: unknown) => typeof n === 'string' && needOptions.includes(n),
            ),
          };
      } catch {}
    setPreferences(next);
    setNeeds(next.needs);
  }, [user?.id]);
  function updatePreferences(next: Preferences) {
    setPreferences(next);
    setNeeds(next.needs);
    try {
      if (user) localStorage.setItem('rr.preferences.' + user.id, JSON.stringify(next));
      setMessage('偏好已保存到此设备');
    } catch {
      setMessage('已应用到当前页面；浏览器未允许保存设置');
    }
  }
  return { preferences, setPreferences, updatePreferences };
}

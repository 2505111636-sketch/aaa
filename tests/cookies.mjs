export function mergeCookies(current = '', setCookies = []) {
  const jar = new Map(
    current
      .split(';')
      .map((x) => x.trim())
      .filter(Boolean)
      .map((x) => {
        const i = x.indexOf('=');
        return [x.slice(0, i), x.slice(i + 1)];
      }),
  );
  for (const line of setCookies) {
    const pair = line.split(';')[0],
      i = pair.indexOf('=');
    if (i < 1) continue;
    const key = pair.slice(0, i),
      value = pair.slice(i + 1);
    if (!value || /max-age=0(?:;|$)/i.test(line)) jar.delete(key);
    else jar.set(key, value);
  }
  return [...jar].map(([k, v]) => k + '=' + v).join('; ');
}

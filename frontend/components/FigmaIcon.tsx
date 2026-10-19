import maps from '../assets/assets.json';
import geometry from '../assets/geometry.json';
export const assets = maps as Record<string, Record<string, string>>;
const sizes = geometry as Record<string, { width: number; height: number }>;
export function Icon({
  node = '1:149',
  name = 'imgIcon5',
  size = 24,
}: {
  node?: string;
  name?: string;
  size?: number;
}) {
  const src = assets[node]?.[name];
  if (!src) return null;
  const g = sizes[src] || { width: 24, height: 24 };
  return (
    <span className="icon" style={{ width: size, height: size }} aria-hidden="true">
      <img src={src} alt="" style={{ transform: `scale(${size / Math.max(g.width, g.height)})` }} />
    </span>
  );
}

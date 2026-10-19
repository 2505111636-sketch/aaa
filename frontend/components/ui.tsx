import { ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { Icon } from './FigmaIcon';
export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={'card ' + className}>{children}</section>;
}
export function Badge({ children, tone = '' }: { children: ReactNode; tone?: string }) {
  return <span className={'badge ' + tone}>{children}</span>;
}
export function Button({
  children,
  onClick,
  secondary = false,
  disabled = false,
  type = 'button',
}: {
  children: ReactNode;
  onClick?: () => void;
  secondary?: boolean;
  disabled?: boolean;
  type?: 'button' | 'submit';
}) {
  return (
    <button
      type={type}
      className={'button ' + (secondary ? 'secondary' : 'primary')}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}
export function Menu({
  icon,
  label,
  detail,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  detail?: string;
  onClick: () => void;
}) {
  return (
    <button className="menu-row" onClick={onClick}>
      <span className="menu-icon">{icon}</span>
      <span>
        <strong>{label}</strong>
        {detail && <small>{detail}</small>}
      </span>
      <ChevronRight size={17} />
    </button>
  );
}
export function Empty({
  title,
  text,
  onRefresh,
}: {
  title: string;
  text: string;
  onRefresh?: () => void;
}) {
  return (
    <Card className="empty">
      <span className="icon-disc">
        <Icon node="1:149" name="imgIcon7" size={32} />
      </span>
      <h2>{title}</h2>
      <p>{text}</p>
      <button className="text-button" onClick={onRefresh}>
        刷新数据 ↻
      </button>
    </Card>
  );
}

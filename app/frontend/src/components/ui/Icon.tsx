export type IconName =
  | 'dashboard'
  | 'sparkles'
  | 'send'
  | 'market'
  | 'shield'
  | 'settings'
  | 'bell'
  | 'arrowRight'
  | 'flame'
  | 'trendUp'
  | 'check'
  | 'repeat'
  | 'gift';

interface IconProps {
  name: IconName;
  label?: string;
  size?: number;
  className?: string;
}

const icons: Record<IconName, string> = {
  dashboard:
    'M5 3h6v8H3V5a2 2 0 0 1 2-2zm8 0h6a2 2 0 0 1 2 2v4h-8V3zm0 8h8v6a2 2 0 0 1-2 2h-6v-8zm-2 0v8H5a2 2 0 0 1-2-2v-6h8z',
  sparkles:
    'M12 2l1.9 4.6L19 8l-4.3 2.7L12 16l-2.7-5.3L5 8l5.1-1.4L12 2zm-6.5 9l.9 2.1L9 14l-1.6 1-1 2.2-1-2.2L4 14l2.2-.9zm13 0l.9 2.1L22 14l-1.6 1-1 2.2-1-2.2L16 14l2.2-.9z',
  send: 'M3 11.5L21 3l-8.5 18-1.8-6.7L3 11.5z',
  market:
    'M4 17h16v2H4v-2zm2-9h2v7H6V8zm5-4h2v11h-2V4zm5 6h2v5h-2v-5z',
  shield:
    'M12 2l8 4v6c0 5-3.4 9.7-8 11-4.6-1.3-8-6-8-11V6l8-4z',
  settings:
    'M12 8a4 4 0 1 1 0 8 4 4 0 0 1 0-8zm8.9 2.6l-1.5-.9.1-1.8-1.6-2.7-1.8.4-1.2-1.3L12 3l-1.9 1.1-1.2 1.3-1.8-.4-1.6 2.7.1 1.8-1.5.9v3l1.5.9-.1 1.8 1.6 2.7 1.8-.4 1.2 1.3L12 21l1.9-1.1 1.2-1.3 1.8.4 1.6-2.7-.1-1.8 1.5-.9v-3z',
  bell: 'M18 16v-5a6 6 0 1 0-12 0v5l-2 2v1h16v-1l-2-2zm-6 5a2 2 0 0 0 2-2h-4a2 2 0 0 0 2 2z',
  arrowRight: 'M5 12h10l-4.5 4.5L12 18l7-6-7-6-1.5 1.5L15 11H5v2z',
  flame: 'M12 2s6 4.4 6 9.5S15.5 22 12 22 6 17.1 6 11.5 12 2 12 2zm0 7c-1.1 1.3-2 3-2 4.5a2 2 0 0 0 4 0c0-1.5-.9-3.2-2-4.5z',
  trendUp: 'M4 14l4-4 3 3 5-5 4 4v4h-4v-2.7l-2-.2-3 3-4-4-3 3z',
  check: 'M20 6l-11 11-5-5 1.4-1.4L9 14.2 18.6 4.6 20 6z',
  repeat: 'M7 7h9V4l4 4-4 4V9H7v6h4l-5 5-5-5h4V7z',
  gift: 'M20 8h-2.2a3 3 0 0 0-5.8-1 3 3 0 0 0-5.8 1H4v14h16V8zm-8-3a1 1 0 0 1 1 1H11a1 1 0 0 1 1-1zM9 8H6a1 1 0 0 1 0-2h3v2zm6 0V6h3a1 1 0 0 1 0 2h-3zm-3 4h-2v8H8v-8H6v-2h3V8h2v2h3v2h-2v8h-2v-8z'
};

export const Icon = ({ name, label, size = 20, className }: IconProps) => {
  const path = icons[name] ?? icons.dashboard;

  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : 'true'}
      width={size}
      height={size}
      className={className}
    >
      <path d={path} />
    </svg>
  );
};

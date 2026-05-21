import { cn } from '../../lib/utils';

interface LogoMarkProps {
  className?: string;
  showSubtitle?: boolean;
  theme?: 'light' | 'dark';
}

export function LogoMark({ className, showSubtitle = true, theme = 'light' }: LogoMarkProps) {
  const isDark = theme === 'dark';

  return (
    <div className={cn('inline-flex items-center', className)}>
      <img
        src="/Email_Automation.webp"
        alt="Email Automation Platform"
        className={cn(
          'w-auto object-contain',
          showSubtitle ? 'h-10' : 'h-9',
          isDark ? 'drop-shadow-[0_2px_8px_rgba(15,23,42,0.45)]' : 'drop-shadow-[0_1px_3px_rgba(15,23,42,0.2)]',
        )}
      />
    </div>
  );
}

'use client';

import { useTheme } from 'next-themes';
import { ReactNode } from 'react';
import { themes, ThemeEnum } from '@/lib/themes';
import dynamic from 'next/dynamic';
import { Loader2Icon } from 'lucide-react';

export default dynamic(() => Promise.resolve(ThemeSwitcher), {
  ssr: false,
  loading: () => <ThemeSwitcherLoader />,
});

function ThemeSwitcherLoader() {
  return (
    <div className="bg-muted text-muted-foreground inline-flex h-9 w-fit items-center justify-center rounded-lg p-[3px]">
      <div className="cursor-pointer data-[state=active]:cursor-default data-[state=active]:bg-background dark:data-[state=active]:text-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:outline-ring dark:data-[state=active]:border-input dark:data-[state=active]:bg-input/30 text-foreground dark:text-muted-foreground inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 rounded-md border border-transparent px-2 py-1 text-sm font-medium whitespace-nowrap transition-[color,box-shadow] focus-visible:ring-[3px] focus-visible:outline-1 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:shadow-sm [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4">
        <Loader2Icon className="animate-spin" />
        Loading Themes ...
      </div>
    </div>
  );
}

function ThemeSwitcher() {
  const { setTheme, theme } = useTheme();

  const handleThemeChange = (newTheme: string) => {
    if (theme !== newTheme) {
      setTheme(newTheme);
    }
  };

  return (
    <div
      className="bg-muted text-muted-foreground inline-flex h-9 w-fit items-center justify-center rounded-lg p-[3px]"
      suppressHydrationWarning
    >
      {themes.map(({ name, icon, value }) => (
        <ThemeButton
          key={value}
          theme={value || null}
          currentTheme={theme as ThemeEnum}
          onClick={() => handleThemeChange(value)}
        >
          {icon}
          <span className="hidden sm:inline">{name}</span>
        </ThemeButton>
      ))}
    </div>
  );
}

type ThemeButtonProps = {
  theme: ThemeEnum | null;
  currentTheme: ThemeEnum;
  onClick: () => void;
  children: ReactNode;
};

function ThemeButton({
  theme,
  onClick,
  currentTheme,
  children,
}: ThemeButtonProps) {
  if (!theme) return null;

  const isActive = theme === currentTheme;

  return (
    <button
      suppressHydrationWarning
      className="cursor-pointer data-[state=active]:cursor-default data-[state=active]:bg-background dark:data-[state=active]:text-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:outline-ring dark:data-[state=active]:border-input dark:data-[state=active]:bg-input/30 text-foreground dark:text-muted-foreground inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 rounded-md border border-transparent px-2 py-1 text-sm font-medium whitespace-nowrap transition-[color,box-shadow] focus-visible:ring-[3px] focus-visible:outline-1 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:shadow-sm [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
      onClick={onClick}
      data-state={isActive ? 'active' : undefined}
      tabIndex={isActive ? -1 : 0}
    >
      {children}
    </button>
  );
}

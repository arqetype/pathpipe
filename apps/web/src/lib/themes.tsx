import { ComputerIcon, MoonIcon, SunIcon } from 'lucide-react';
import type { ReactNode } from 'react';

export enum ThemeEnum {
  Light = 'light',
  Dark = 'dark',
  System = 'system',
}

export type Theme = {
  name: string;
  icon: ReactNode;
  value: ThemeEnum;
};

export const themes: Theme[] = [
  {
    name: 'Light',
    icon: <SunIcon />,
    value: ThemeEnum.Light,
  },
  {
    name: 'Dark',
    icon: <MoonIcon />,
    value: ThemeEnum.Dark,
  },
  {
    name: 'System',
    icon: <ComputerIcon />,
    value: ThemeEnum.System,
  },
];

import { RiComputerLine, RiMoonLine, RiSunLine } from '@remixicon/react';
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
    icon: <RiSunLine />,
    value: ThemeEnum.Light,
  },
  {
    name: 'Dark',
    icon: <RiMoonLine />,
    value: ThemeEnum.Dark,
  },
  {
    name: 'System',
    icon: <RiComputerLine />,
    value: ThemeEnum.System,
  },
];

'use client';

import { useTheme } from 'next-themes';
import { themes } from '@/lib/themes';
import dynamic from 'next/dynamic';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@repo/ui/components/select';

export default dynamic(() => Promise.resolve(ThemeSwitcher), { ssr: false });

function ThemeSwitcher() {
  const { setTheme, theme } = useTheme();

  return (
    <Select value={theme} onValueChange={(value) => value && setTheme(value)}>
      <SelectTrigger className="w-32">
        <SelectValue>{themes.find((t) => t.value === theme)?.name}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {themes.map(({ name, value }) => (
            <SelectItem key={value} value={value}>
              {name}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}

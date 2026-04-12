'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

type TabNavigationProps = {
  tabs: {
    label: string;
    href: string;
  }[];
};

export function TabNavigation({ tabs }: TabNavigationProps) {
  const currentPath = usePathname();

  return (
    <nav className="w-full">
      <ul className="bg-muted text-muted-foreground inline-flex w-fit items-center justify-start rounded-lg p-1.5 gap-1.5 w-full">
        {tabs.map((tab) => (
          <li key={tab.href}>
            <Link
              href={tab.href}
              data-state={currentPath === tab.href ? 'active' : 'inactive'}
              className="cursor-pointer data-[state=active]:cursor-default data-[state=active]:bg-background dark:data-[state=active]:text-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:outline-ring dark:data-[state=active]:border-input dark:data-[state=active]:bg-input/30 text-foreground dark:text-muted-foreground inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 rounded-md border border-transparent px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-[color,box-shadow] focus-visible:ring-[3px] focus-visible:outline-1 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:shadow-sm [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
            >
              {tab.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

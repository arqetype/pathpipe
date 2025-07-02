import React from 'react';

import {
  Interactive,
  Interaction,
} from '@repo/ui/components/color-picker/interaction';
import { Pointer } from '@repo/ui/components/color-picker/pointer';

import { hsvaToHslString } from '@repo/ui/lib/convert';
import { clamp, cn, round } from '@repo/ui/lib/utils';

interface Props {
  className?: string;
  hue: number;
  onChange: (newHue: { h: number }) => void;
}

const HueBase = ({ className, hue, onChange }: Props) => {
  const handleMove = (interaction: Interaction) => {
    onChange({ h: 360 * interaction.left });
  };

  const handleKey = (offset: Interaction) => {
    onChange({
      h: clamp(hue + offset.left * 360, 0, 360),
    });
  };

  const style = {
    backgroundImage:
      'linear-gradient(90deg,red 0,#ff0 17%,#0f0 33%,#0ff 50%,#00f 67%,#f0f 83%,red)',
  };

  return (
    <div className={cn('h-2 rounded-sm', className)} style={style}>
      <Interactive
        onMove={handleMove}
        onKey={handleKey}
        aria-label="Hue"
        aria-valuenow={round(hue)}
        aria-valuemax="360"
        aria-valuemin="0"
        className="relative"
      >
        <Pointer
          left={hue / 360}
          top={0}
          color={hsvaToHslString({ h: hue, s: 100, v: 100, a: 1 })}
          className="-translate-x-1/2 -translate-y-1/4"
        />
      </Interactive>
    </div>
  );
};

export const Hue = React.memo(HueBase);

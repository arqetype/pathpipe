'use client';
import React from 'react';
import {
  Interactive,
  Interaction,
} from '@repo/ui/components/color-picker/interaction';
import { Pointer } from '@repo/ui/components/color-picker/pointer';
import { HsvaColor } from '../../types/color.js';
import { hsvaToHslString } from '@repo/ui/lib/convert';
import { clamp, round } from '@repo/ui/lib/utils';

interface Props {
  hsva: HsvaColor;
  onChange: (newColor: { s: number; v: number }) => void;
}

const SaturationBase = ({ hsva, onChange }: Props) => {
  const handleMove = (interaction: Interaction) => {
    onChange({
      s: interaction.left * 100,
      v: 100 - interaction.top * 100,
    });
  };

  const handleKey = (offset: Interaction) => {
    // Saturation and brightness always fit into [0, 100] range
    onChange({
      s: clamp(hsva.s + offset.left * 100, 0, 100),
      v: clamp(hsva.v - offset.top * 100, 0, 100),
    });
  };

  const containerStyle = {
    backgroundColor: hsvaToHslString({ h: hsva.h, s: 100, v: 100, a: 1 }),
    backgroundImage: `linear-gradient(0deg, #000, transparent), linear-gradient(90deg, #fff, hsla(0, 0%, 100%, 0))`,
  };

  return (
    <div
      style={containerStyle}
      className="grow rounded relative"
      suppressHydrationWarning
    >
      <Interactive
        onMove={handleMove}
        onKey={handleKey}
        aria-label="Color"
        aria-valuetext={`Saturation ${round(hsva.s)}%, Brightness ${round(hsva.v)}%`}
        className="absolute inset-0 outline-none touch-none"
      >
        <Pointer
          top={1 - hsva.v / 100}
          left={hsva.s / 100}
          color={hsvaToHslString(hsva)}
        />
      </Interactive>
    </div>
  );
};

export const Saturation = React.memo(SaturationBase);

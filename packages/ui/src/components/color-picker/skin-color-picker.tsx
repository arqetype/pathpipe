'use client';

import { type JSX } from 'react';
import { cn } from '@repo/ui/lib/utils';

import { ColorModel, ColorPickerBaseProps } from '../../types/color.js';

import { hexToHsva, hsvaToHex } from '@repo/ui/lib/convert';
import { equalHex } from '@repo/ui/lib/compare';
import { SelectedColor } from '@repo/ui/components/color-picker/selected-color';

// Realistic skin tone palette covering diverse ethnicities
const SKIN_TONES = [
  // Very light tones
  '#FFDCB2',
  '#FFE4C4',
  '#F5DEB3',
  '#FAEBD7',
  // Light tones
  '#F7C6A0',
  '#E8B887',
  '#D2B48C',
  '#DEB887',
  // Light-medium tones
  '#D2A679',
  '#C19A6B',
  '#B5936B',
  '#A0826D',
  // Medium tones
  '#8B7355',
  '#936B3E',
  '#8B5A2B',
  '#804A3D',
  // Medium-dark tones
  '#6B453D',
  '#5D4037',
  '#4A2C2A',
  '#3C2415',
  // Dark toness
  '#2F1B13',
  '#251610',
  '#1F1008',
  '#160B06',
] as const;

interface SkinColorPickerProps
  extends Omit<ColorPickerBaseProps<string>, 'color'> {
  /** Current selected skin color */
  color?: string;
  /** Custom class name */
  className?: string;
  /** Size of color swatches */
  swatchSize?: 'sm' | 'md' | 'lg';
}

const colorModel: ColorModel<string> = {
  defaultColor: SKIN_TONES[8], // Default to a medium tone
  toHsva: hexToHsva,
  fromHsva: ({ h, s, v }) => hsvaToHex({ h, s, v, a: 1 }),
  equal: equalHex,
};

export const SkinColorPicker = ({
  color = colorModel.defaultColor,
  onChange,
  className,
  swatchSize = 'md',
  ...rest
}: SkinColorPickerProps): JSX.Element => {
  const handleSwatchClick = (swatchColor: string) => {
    onChange(swatchColor);
  };

  const swatchSizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-10 h-10',
  };

  const isSelectedSwatch = (swatchColor: string) => {
    return colorModel.equal(color, swatchColor);
  };

  return (
    <div className={className} {...rest}>
      <div className="w-full aspect-[4/3] flex flex-col relative gap-2">
        <div className="grid grid-cols-6 gap-2 p-2 bg-muted/30 rounded-lg h-full w-full">
          {SKIN_TONES.map((swatchColor, index) => (
            <button
              key={swatchColor}
              onClick={(e) => {
                e.preventDefault();
                handleSwatchClick(swatchColor);
              }}
              className={cn(
                swatchSizeClasses[swatchSize],
                'rounded-full border-2 transition-all duration-200 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
                isSelectedSwatch(swatchColor)
                  ? 'border-foreground shadow-lg scale-110'
                  : 'border-muted-foreground/20 hover:border-muted-foreground/40',
              )}
              style={{ backgroundColor: swatchColor }}
              aria-label={`Skin tone ${index + 1}`}
              title={swatchColor}
            />
          ))}
        </div>

        <SelectedColor color={color} />
      </div>
    </div>
  );
};

export const getClosestSkinTone = (targetColor: string): string => {
  const targetHsva = hexToHsva(targetColor);

  let closestColor: string = SKIN_TONES[0];
  let minDistance = Infinity;

  for (const tone of SKIN_TONES) {
    const toneHsva = hexToHsva(tone);

    const distance = Math.sqrt(
      Math.pow(targetHsva.h - toneHsva.h, 2) +
        Math.pow(targetHsva.s - toneHsva.s, 2) +
        Math.pow(targetHsva.v - toneHsva.v, 2),
    );

    if (distance < minDistance) {
      minDistance = distance;
      closestColor = tone;
    }
  }

  return closestColor;
};

export { SKIN_TONES };

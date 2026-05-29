'use client';

import { type JSX, useRef } from 'react';

import { Hue } from '@repo/ui/components/color-picker/hue';
import { Saturation } from '@repo/ui/components/color-picker/saturation';

import {
  ColorModel,
  ColorPickerBaseProps,
  AnyColor,
} from '../../types/color.js';

import { useColorManipulation } from '@repo/ui/hooks/use-color-manipulation';
import { hexToHsva, hsvaToHex } from '@repo/ui/lib/convert';
import { equalHex } from '@repo/ui/lib/compare';
import { SelectedColor } from '@repo/ui/components/color-picker/selected-color';

interface Props<T extends AnyColor> extends ColorPickerBaseProps<T> {
  colorModel: ColorModel<T>;
}

export const ColorPicker = <T extends AnyColor>({
  colorModel,
  color = colorModel.defaultColor,
  onChange,
  ...rest
}: Props<T>): JSX.Element => {
  const nodeRef = useRef<HTMLDivElement>(null);

  const [hsva, updateHsva] = useColorManipulation<T>(
    colorModel,
    color,
    onChange,
  );

  return (
    <div className="rounded-lg w-full flex flex-col gap-2">
      <div
        {...rest}
        ref={nodeRef}
        className={'w-full flex flex-col relative aspect-[4/3] gap-2'}
      >
        <Saturation hsva={hsva} onChange={updateHsva} />
        <Hue hue={hsva.h} onChange={updateHsva} />
      </div>
      <SelectedColor color={color.toString()} />
    </div>
  );
};

const colorModel: ColorModel<string> = {
  defaultColor: '000',
  toHsva: hexToHsva,
  fromHsva: ({ h, s, v }) => hsvaToHex({ h, s, v, a: 1 }),
  equal: equalHex,
};

export const HexColorPicker = (
  props: ColorPickerBaseProps<string>,
): JSX.Element => <ColorPicker {...props} colorModel={colorModel} />;

export {
  SkinColorPicker,
  getClosestSkinTone,
  SKIN_TONES,
} from '@repo/ui/components/color-picker/skin-color-picker';

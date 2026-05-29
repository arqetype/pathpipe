import {
  useState,
  useCallback,
  useRef,
  useLayoutEffect,
  useEffect,
} from 'react';
import { ColorModel, AnyColor, HsvaColor } from '../types/color.js';
import { equalColorObjects } from '@repo/ui/lib/compare';
import { useEventCallback } from '@repo/ui/hooks/use-event-callback';

export function useColorManipulation<T extends AnyColor>(
  colorModel: ColorModel<T>,
  color: T,
  onChange: (color: T) => void,
): [HsvaColor, (color: Partial<HsvaColor>) => void] {
  const onChangeCallback = useEventCallback<T>(onChange);

  const [hsva, setHsva] = useState<HsvaColor>(() => colorModel.toHsva(color));

  const cacheRef = useRef({ color, hsva });

  useLayoutEffect(() => {
    if (!colorModel.equal(color, cacheRef.current.color)) {
      const newHsva = colorModel.toHsva(color);
      cacheRef.current = { hsva: newHsva, color };
      setHsva(newHsva);
    }
  }, [color, colorModel]);

  useEffect(() => {
    let newColor;
    if (
      !equalColorObjects(hsva, cacheRef.current.hsva) &&
      !colorModel.equal(
        (newColor = colorModel.fromHsva(hsva)),
        cacheRef.current.color,
      )
    ) {
      cacheRef.current = { hsva, color: newColor };
      onChangeCallback(newColor);
    }
  }, [hsva, colorModel, onChangeCallback]);

  const handleChange = useCallback((params: Partial<HsvaColor>) => {
    setHsva((current) => Object.assign({}, current, params));
  }, []);

  return [hsva, handleChange];
}

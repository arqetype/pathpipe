export const AvatarMoods = [
  { name: 'Happy', value: 'happy' },
  { name: 'Angry', value: 'angry' },
  { name: 'Neutral', value: 'neutral' },
  { name: 'Super Happy', value: 'superHappy' },
  { name: 'Sad', value: 'sad' },
  { name: 'Hopeful', value: 'hopeful' },
  { name: 'Confused', value: 'confused' },
] as const;

export const AvatarMoodKeys = AvatarMoods.map((mood) => mood.value);
export type AvatarMood = (typeof AvatarMoods)[number]['value'];

export const AvatarHairStyles = [
  { name: 'Plain', value: 'plain' },
  { name: 'Wavy', value: 'wavy' },
  { name: 'Short Curls', value: 'shortCurls' },
  { name: 'Parting', value: 'parting' },
  { name: 'Spiky', value: 'spiky' },
  { name: 'Round Bob', value: 'roundBob' },
  { name: 'Long Curls', value: 'longCurls' },
  { name: 'Buns', value: 'buns' },
  { name: 'Bangs', value: 'bangs' },
  { name: 'Fluffy', value: 'fluffy' },
  { name: 'Flat Top', value: 'flatTop' },
  { name: 'Shaggy', value: 'shaggy' },
] as const;

export const AvatarHairStyleKeys = AvatarHairStyles.map((style) => style.value);

export type AvatarHairStyle =
  | (typeof AvatarHairStyles)[number]['value']
  | undefined;

export type AvatarHairColor = string;
export type AvatarSkinColor = string;
export type AvatarBackgroundColor = string[];
export type AvatarFacialHair = boolean;

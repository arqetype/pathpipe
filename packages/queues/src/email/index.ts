export type UserData = { name: string; profilePictureUrl: string };

export type EmailJob =
  | { type: 'verification'; to: string; token: string; user: UserData }
  | { type: 'otp'; to: string; otp: string; user: UserData }
  | { type: 'reset-password'; to: string; token: string; user: UserData };

export const verification = (data: {
  to: string;
  token: string;
  user: UserData;
}): EmailJob => ({ type: 'verification', ...data });

export const otp = (data: {
  to: string;
  otp: string;
  user: UserData;
}): EmailJob => ({ type: 'otp', ...data });

export const resetPassword = (data: {
  to: string;
  token: string;
  user: UserData;
}): EmailJob => ({ type: 'reset-password', ...data });

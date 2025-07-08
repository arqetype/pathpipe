export const DEFAULT_ROLES = {
  ADMIN: 'Admin',
  OWNER: 'Owner',
  MEMBER: 'Member',
} as const;

export type DefaultOrganizationRole = keyof typeof DEFAULT_ROLES;

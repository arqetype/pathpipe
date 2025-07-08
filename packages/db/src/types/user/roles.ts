/**
 * Enum representing the different roles a user can have within the application.
 *
 * - `STANDARD`: Regular user with default permissions.
 * - `ADMIN`: User with administrative privileges.
 * - `SUPER_ADMIN`: User with the highest level of administrative privileges.
 */
export enum UserRole {
  STANDARD = 'STANDARD',
  ADMIN = 'ADMIN',
  SUPER_ADMIN = 'SUPER_ADMIN',
}

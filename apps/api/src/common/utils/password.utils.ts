import * as bcrypt from 'bcrypt';

/**
 * Utility class for secure password operations using bcrypt.
 *
 * This utility provides methods for hashing passwords with proper salt
 * and verifying passwords in a secure, time-constant manner.
 */
export class PasswordUtils {
  /**
   * The cost factor for bcrypt hashing.
   * Higher values = more secure but slower.
   * 12 rounds is recommended for most applications.
   */
  private static readonly SALT_ROUNDS = 12;

  /**
   * Securely hashes a password using bcrypt with salt.
   *
   * @param password - The plain text password to hash
   * @returns Promise resolving to the hashed password
   */
  static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.SALT_ROUNDS);
  }

  /**
   * Verifies a password against its hash in a time-constant manner.
   *
   * @param password - The plain text password to verify
   * @param hash - The stored password hash to compare against
   * @returns Promise resolving to true if password matches, false otherwise
   */
  static async verifyPassword(
    password: string,
    hash: string,
  ): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }
}

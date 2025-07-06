/**
 * Utility class for string operations.
 *
 * This utility provides methods for common string manipulations such as
 * trimming, converting to lowercase, and checking for empty strings.
 */
export class StringUtils {
  /**
   * Checks if a string is empty or only contains whitespace.
   *
   * @param str - The string to check
   * @returns True if the string is empty or whitespace, false otherwise
   */
  static isEmpty(str: string): boolean {
    return !str || str.trim().length === 0;
  }

  /**
   * Checks if a string is a valid email format.
   *
   * @param str - The string to check
   * @returns True if the string is a valid email format, false otherwise
   */
  static isEmail(str: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(str);
  }
}

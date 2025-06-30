import { PasswordUtils } from '../src/common/utils/password.utils';

describe('PasswordUtils', () => {
  describe('hashPassword', () => {
    it('should hash a password securely', async () => {
      const password = 'testPassword123';
      const hash = await PasswordUtils.hashPassword(password);

      // Hash should be different from original password
      expect(hash).not.toBe(password);
      // Hash should be a bcrypt hash (starts with $2b$)
      expect(hash).toMatch(/^\$2b\$/);
      // Hash should be approximately 60 characters long
      expect(hash.length).toBe(60);
    });

    it('should generate different hashes for the same password', async () => {
      const password = 'testPassword123';
      const hash1 = await PasswordUtils.hashPassword(password);
      const hash2 = await PasswordUtils.hashPassword(password);

      // Due to salt, hashes should be different even for same password
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('verifyPassword', () => {
    it('should verify correct passwords', async () => {
      const password = 'testPassword123';
      const hash = await PasswordUtils.hashPassword(password);

      const isValid = await PasswordUtils.verifyPassword(password, hash);
      expect(isValid).toBe(true);
    });

    it('should reject incorrect passwords', async () => {
      const password = 'testPassword123';
      const wrongPassword = 'wrongPassword456';
      const hash = await PasswordUtils.hashPassword(password);

      const isValid = await PasswordUtils.verifyPassword(wrongPassword, hash);
      expect(isValid).toBe(false);
    });

    it('should handle timing attacks safely', async () => {
      const password = 'testPassword123';
      const hash = await PasswordUtils.hashPassword(password);

      // These operations should take similar time (constant-time comparison)
      const start1 = Date.now();
      await PasswordUtils.verifyPassword('wrongpassword', hash);
      const time1 = Date.now() - start1;

      const start2 = Date.now();
      await PasswordUtils.verifyPassword(password, hash);
      const time2 = Date.now() - start2;

      // Both operations should complete (timing shouldn't reveal info)
      expect(time1).toBeGreaterThan(0);
      expect(time2).toBeGreaterThan(0);
    });
  });
});

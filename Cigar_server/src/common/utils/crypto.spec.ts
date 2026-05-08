import { encryptPhone, decryptPhone, maskPhone } from './crypto';

describe('crypto', () => {
  beforeAll(() => {
    process.env['ENCRYPTION_KEY'] = 'test_encryption_key_for_unit_tests!!';
  });

  describe('encryptPhone / decryptPhone', () => {
    it('应正确加解密手机号', () => {
      const phone = '13812345678';
      const encrypted = encryptPhone(phone);
      expect(Buffer.isBuffer(encrypted)).toBe(true);
      expect(encrypted.length).toBeGreaterThan(12);

      const decrypted = decryptPhone(encrypted);
      expect(decrypted).toBe(phone);
    });

    it('不同加密调用应产生不同密文', () => {
      const phone = '13812345678';
      const a = encryptPhone(phone);
      const b = encryptPhone(phone);
      expect(a.equals(b)).toBe(false);
    });
  });

  describe('maskPhone', () => {
    it('11 位手机号正确脱敏', () => {
      expect(maskPhone('13812345678')).toBe('138****5678');
    });

    it('非 11 位手机号使用正则脱敏', () => {
      expect(maskPhone('021-12345678')).toBe('021-123****8');
    });
  });
});

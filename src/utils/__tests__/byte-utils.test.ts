import { ByteBuffer } from '@/types/byte-buffer';
import { ByteUtils } from '../byte-utils';

describe('ByteUtils', () => {
  describe('copyOf', () => {
    it('should create a copy of byte array with specified length', () => {
      const original = new Uint8Array([1, 2, 3, 4, 5]);
      const copy = ByteUtils.copyOf(original, 3);
      expect(copy).toEqual(new Uint8Array([1, 2, 3]));
      expect(copy.length).toBe(3);
    });

    it('should pad with zeros if length is greater than original', () => {
      const original = new Uint8Array([1, 2, 3]);
      const copy = ByteUtils.copyOf(original, 5);
      expect(copy).toEqual(new Uint8Array([1, 2, 3, 0, 0]));
      expect(copy.length).toBe(5);
    });
  });

  describe('hexToBytes', () => {
    it('should convert hex string to bytes', () => {
      const hex = 'deadbeef';
      const bytes = ByteUtils.hexToBytes(hex);
      expect(bytes).toEqual(new Uint8Array([0xde, 0xad, 0xbe, 0xef]));
    });

    it('should handle 0x prefix', () => {
      const hex = '0xdeadbeef';
      const bytes = ByteUtils.hexToBytes(hex);
      expect(bytes).toEqual(new Uint8Array([0xde, 0xad, 0xbe, 0xef]));
    });

    it('should handle odd length by padding with leading zero', () => {
      const hex = 'deadb';
      const bytes = ByteUtils.hexToBytes(hex);
      expect(bytes).toEqual(new Uint8Array([0x0d, 0xea, 0xdb]));
    });
  });

  describe('bytesToHex', () => {
    it('should convert bytes to hex string', () => {
      const bytes = new Uint8Array([0xde, 0xad, 0xbe, 0xef]);
      const hex = ByteUtils.bytesToHex(bytes);
      expect(hex).toBe('deadbeef');
    });

    it('should handle offset and length parameters', () => {
      const bytes = new Uint8Array([0xde, 0xad, 0xbe, 0xef]);
      const hex = ByteUtils.bytesToHex(bytes, 1, 2);
      expect(hex).toBe('adbe');
    });
  });

  describe('compareBytes', () => {
    it('should return true for identical arrays', () => {
      const a = new Uint8Array([1, 2, 3]);
      const b = new Uint8Array([1, 2, 3]);
      expect(ByteUtils.compareBytes(a, b)).toBe(true);
    });

    it('should return false for different arrays', () => {
      const a = new Uint8Array([1, 2, 3]);
      const b = new Uint8Array([1, 2, 4]);
      expect(ByteUtils.compareBytes(a, b)).toBe(false);
    });

    it('should return false for arrays of different lengths', () => {
      const a = new Uint8Array([1, 2, 3]);
      const b = new Uint8Array([1, 2]);
      expect(ByteUtils.compareBytes(a, b)).toBe(false);
    });
  });

  describe('numberToLittleEndian', () => {
    it('should convert number to little-endian bytes', () => {
      const result = ByteUtils.numberToLittleEndian(0x12345678, 4);
      expect(result).toEqual(new Uint8Array([0x78, 0x56, 0x34, 0x12]));
    });

    it('should handle smaller lengths', () => {
      const result = ByteUtils.numberToLittleEndian(0x1234, 2);
      expect(result).toEqual(new Uint8Array([0x34, 0x12]));
    });
  });

  describe('fit', () => {
    it('should fit byte array to specified length', () => {
      const bytes = new Uint8Array([1, 2, 3, 4]);
      const result = ByteUtils.fit(bytes, 6);
      expect(result).toEqual(new Uint8Array([1, 2, 3, 4, 0, 0]));
    });

    it('should truncate if input is longer than specified length', () => {
      const bytes = new Uint8Array([1, 2, 3, 4]);
      const result = ByteUtils.fit(bytes, 2);
      expect(result).toEqual(new Uint8Array([1, 2]));
    });

    it('should handle string input', () => {
      const result = ByteUtils.fit('256', 2);
      expect(result).toEqual(new Uint8Array([0x00, 0x01]));
    });
  });

  describe('toLittleEndian', () => {
    it('should convert byte array to little-endian', () => {
      const bytes = new Uint8Array([0x12, 0x34, 0x56, 0x78]);
      const result = ByteUtils.toLittleEndian(bytes);
      expect(result).toEqual(new Uint8Array([0x78, 0x56, 0x34, 0x12]));
    });

    it('should handle offset and length parameters', () => {
      const bytes = new Uint8Array([0x12, 0x34, 0x56, 0x78]);
      const result = ByteUtils.toLittleEndian(bytes, 1, 2);
      expect(result).toEqual(new Uint8Array([0x56, 0x34]));
    });
  });

  describe('trimAddress', () => {
    it('should trim address correctly', () => {
      const address = '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
      const trimmed = ByteUtils.trimAddress(address);
      expect(trimmed).toBe('1234567890abcdef1234567890abcdef...90abcdef1234567890abcdef');
    });
  });

  describe('clear', () => {
    it('should clear byte array by filling with zeros', () => {
      const bytes = new Uint8Array([1, 2, 3, 4]);
      ByteUtils.clear(bytes);
      expect(bytes).toEqual(new Uint8Array([0, 0, 0, 0]));
    });
  });

  describe('areEqual', () => {
    it('should return true for equal arrays', () => {
      const a = new Uint8Array([1, 2, 3]);
      const b = new Uint8Array([1, 2, 3]);
      expect(ByteUtils.areEqual(a, b)).toBe(true);
    });

    it('should return false for different arrays', () => {
      const a = new Uint8Array([1, 2, 3]);
      const b = new Uint8Array([1, 2, 4]);
      expect(ByteUtils.areEqual(a, b)).toBe(false);
    });

    it('should return false for arrays of different lengths', () => {
      const a = new Uint8Array([1, 2, 3]);
      const b = new Uint8Array([1, 2]);
      expect(ByteUtils.areEqual(a, b)).toBe(false);
    });
  });

  describe('readLittleEndianUnsigned', () => {
    it('should read little-endian unsigned value from buffer', () => {
      const buffer = {
        get: jest.fn((arr: Uint8Array) => {
          arr.set([0x78, 0x56, 0x34, 0x12, 0x00, 0x00, 0x00, 0x00]);
        })
      };
      const result = ByteUtils.readLittleEndianUnsigned(buffer as unknown as ByteBuffer);
      expect(result).toBe(0x12345678n);
    });
  });
});

import { ByteBuffer, ByteOrder } from '../byte-buffer';

describe('ByteBuffer', () => {
  let buffer: ByteBuffer;

  beforeEach(() => {
    // Create a new buffer with some initial data using static factory method
    buffer = ByteBuffer.wrap(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]));
  });

  describe('creation', () => {
    it('should create empty buffer with specified capacity', () => {
      const buf = ByteBuffer.allocate(10);
      expect(buf.capacity()).toBe(10);
      expect(buf.array()).toEqual(new Uint8Array(10));
    });

    it('should create buffer wrapping existing array', () => {
      const data = new Uint8Array([1, 2, 3, 4]);
      const buf = ByteBuffer.wrap(data);
      expect(buf.array()).toEqual(data);
    });
  });

  describe('position operations', () => {
    it('should get current position', () => {
      expect(buffer.position()).toBe(0);
    });

    it('should set position', () => {
      buffer.position(3);
      expect(buffer.position()).toBe(3);
    });

    it('should throw error when setting invalid position', () => {
      expect(() => buffer.position(-1)).toThrow('Invalid position');
      expect(() => buffer.position(9)).toThrow('Invalid position');
    });

    it('should be chainable when setting position', () => {
      const result = buffer.position(3);
      expect(result).toBe(buffer);
    });
  });

  describe('byte order operations', () => {
    it('should set byte order', () => {
      const result = buffer.order(ByteOrder.LITTLE_ENDIAN);
      expect(result).toBe(buffer);
    });
  });

  describe('put operations', () => {
    it('should put single byte', () => {
      buffer.put(42);
      expect(buffer.array()[0]).toBe(42);
      expect(buffer.position()).toBe(1);
    });

    it('should put bytes from array', () => {
      const src = new Uint8Array([42, 43, 44]);
      buffer.put(src);
      expect(buffer.array().slice(0, 3)).toEqual(src);
      expect(buffer.position()).toBe(3);
    });

    it('should put bytes with offset and length', () => {
      const src = new Uint8Array([42, 43, 44, 45, 46]);
      buffer.put(src, 1, 3);
      expect(buffer.array().slice(0, 3)).toEqual(new Uint8Array([43, 44, 45]));
      expect(buffer.position()).toBe(3);
    });

    it('should throw when putting past capacity', () => {
      buffer.position(7);
      expect(() => buffer.put(new Uint8Array([1, 2]))).toThrow('Buffer overflow');
    });
  });

  describe('putInt operations', () => {
    it('should put integer in big-endian order', () => {
      buffer.order(ByteOrder.BIG_ENDIAN).putInt(0x12345678);
      expect(buffer.array().slice(0, 4)).toEqual(new Uint8Array([0x12, 0x34, 0x56, 0x78]));
      expect(buffer.position()).toBe(4);
    });

    it('should put integer in little-endian order', () => {
      buffer.order(ByteOrder.LITTLE_ENDIAN).putInt(0x12345678);
      expect(buffer.array().slice(0, 4)).toEqual(new Uint8Array([0x78, 0x56, 0x34, 0x12]));
      expect(buffer.position()).toBe(4);
    });

    it('should throw when putting int past capacity', () => {
      buffer.position(6);
      expect(() => buffer.putInt(1)).toThrow('Buffer overflow');
    });
  });

  describe('get operations', () => {
    it('should get bytes into provided array', () => {
      const dst = new Uint8Array(3);
      buffer.get(dst);
      expect(dst).toEqual(new Uint8Array([1, 2, 3]));
      expect(buffer.position()).toBe(3);
    });

    it('should throw when getting past capacity', () => {
      buffer.position(6);
      expect(() => buffer.get(new Uint8Array(3))).toThrow('Buffer underflow');
    });
  });

  describe('get_ operations', () => {
    it('should get single byte', () => {
      expect(buffer.get_()).toBe(1);
      expect(buffer.position()).toBe(1);
    });

    it('should throw when getting past capacity', () => {
      buffer.position(8);
      expect(() => buffer.get_()).toThrow('Buffer underflow');
    });
  });

  describe('array', () => {
    it('should return copy of buffer contents', () => {
      const arr = buffer.array();
      expect(arr).toEqual(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]));
      // Verify it's a copy
      arr[0] = 42;
      expect(buffer.array()[0]).toBe(1);
    });
  });

  describe('rewind', () => {
    it('should reset position to zero', () => {
      buffer.position(4);
      const result = buffer.rewind();
      expect(buffer.position()).toBe(0);
      expect(result).toBe(buffer);
    });
  });
});

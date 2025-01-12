import { MochimoHasher } from '../mochimo-hasher';
import { createHash } from 'crypto';

function getNodeHash(data: Uint8Array): Uint8Array {
    const hash = createHash('sha256');
    hash.update(Buffer.from(data));
    return new Uint8Array(hash.digest());
}

describe('MochimoHasher', () => {
    describe('basic operations', () => {
        it('should match Node crypto for empty buffer', () => {
            const hasher = new MochimoHasher();
            const result = hasher.digest();
            const expected = getNodeHash(new Uint8Array(0));
            expect(result).toEqual(expected);
        });

        it('should match Node crypto for simple data', () => {
            const data = new Uint8Array([0x12, 0x34, 0x56, 0x78]);
            const hasher = new MochimoHasher();
            hasher.update(data);
            expect(hasher.digest()).toEqual(getNodeHash(data));
        });



        it('should handle single byte', () => {
            const data = new Uint8Array([0xFF]);
            const hasher = new MochimoHasher();
            hasher.update(data);
            expect(hasher.digest()).toEqual(getNodeHash(data));
        });

        it('should handle non-aligned data length', () => {
            const data = new Uint8Array([0x12, 0x34, 0x56]); // 3 bytes
            const hasher = new MochimoHasher();
            hasher.update(data);
            expect(hasher.digest()).toEqual(getNodeHash(data));
        });
    });

    describe('multiple updates', () => {
        it('should match Node crypto for multiple updates', () => {
            const data1 = new Uint8Array([0x12, 0x34]);
            const data2 = new Uint8Array([0x56, 0x78]);
            
            const hasher = new MochimoHasher();
            hasher.update(data1);
            hasher.update(data2);
            
            const hash = createHash('sha256');
            hash.update(Buffer.from(data1));
            hash.update(Buffer.from(data2));
            
            expect(hasher.digest()).toEqual(new Uint8Array(hash.digest()));
        });

        it('should handle mixed-size updates', () => {
            const data1 = new Uint8Array([0x12]);
            const data2 = new Uint8Array([0x34, 0x56]);
            const data3 = new Uint8Array([0x78, 0x9A, 0xBC, 0xDE]);
            
            const hasher = new MochimoHasher();
            hasher.update(data1);
            hasher.update(data2);
            hasher.update(data3);
            
            const hash = createHash('sha256');
            hash.update(Buffer.from(data1));
            hash.update(Buffer.from(data2));
            hash.update(Buffer.from(data3));
            
            expect(hasher.digest()).toEqual(new Uint8Array(hash.digest()));
        });


        it('should handle zero-length updates', () => {
            const data1 = new Uint8Array([0x12, 0x34]);
            const data2 = new Uint8Array(0);
            const data3 = new Uint8Array([0x56, 0x78]);
            
            const hasher = new MochimoHasher();
            hasher.update(data1);
            hasher.update(data2);
            hasher.update(data3);
            
            const hash = createHash('sha256');
            hash.update(Buffer.from(data1));
            hash.update(Buffer.from(data2));
            hash.update(Buffer.from(data3));
            
            expect(hasher.digest()).toEqual(new Uint8Array(hash.digest()));
        });
    });

    describe('error cases', () => {

        it('should handle multiple digests', () => {
            const data = new Uint8Array([0x12, 0x34]);
            const hasher = new MochimoHasher();
            hasher.update(data);
            const result1 = hasher.digest();
            const result2 = hasher.digest(); // Should be empty hash
            expect(result2).toEqual(getNodeHash(new Uint8Array(0)));
        });
    });

    describe('edge cases', () => {
        it('should handle data with undefined bytes in word boundary', () => {
            // Create data that will have undefined bytes when creating words
            const data = new Uint8Array(5); // 5 bytes will cause partial word at end
            data[0] = 0x12;
            data[1] = 0x34;
            data[2] = 0x56;
            data[3] = 0x78;
            data[4] = 0x9A; // This will be in a partial word

            const hasher = new MochimoHasher();
            hasher.update(data);
            expect(hasher.digest()).toEqual(getNodeHash(data));
        });

        it('should handle data with exactly one word', () => {
            const data = new Uint8Array([0x12, 0x34, 0x56, 0x78]);
            const hasher = new MochimoHasher();
            hasher.update(data);
            expect(hasher.digest()).toEqual(getNodeHash(data));
        });

        it('should handle data with partial words', () => {
            const data = new Uint8Array([0x12, 0x34, 0x56]); // 3 bytes
            const hasher = new MochimoHasher();
            hasher.update(data);
            expect(hasher.digest()).toEqual(getNodeHash(data));
        });

        it('should handle data spanning multiple words with partial end', () => {
            const data = new Uint8Array([
                0x12, 0x34, 0x56, 0x78, // first word
                0x9A, 0xBC, 0xDE, 0xF0, // second word
                0x11, 0x22, 0x33        // partial third word
            ]);
            const hasher = new MochimoHasher();
            hasher.update(data);
            expect(hasher.digest()).toEqual(getNodeHash(data));
        });
    });
}); 
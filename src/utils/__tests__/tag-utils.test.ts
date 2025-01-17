import { addrTagToBase58, base58ToAddrTag, validateBase58Tag } from '../tag-utils';
import bs58 from 'bs58';

describe('Tag Utils', () => {
    // Known test vectors
    const testVectors = [
        {
            tag: '3f1fba7025c7d37470e7260117a72b7de9f5ca59',
            expectedBase58: 'J8gqYehTJhJWrfcUd766sUQ8THktNs'
        },
        {
            tag: '0000000000000000000000000000000000000000',
            expectedBase58: '1111111111111111111111'
        }
    ];

    describe('addrTagToBase58', () => {
        it('should encode test vectors correctly', () => {
            for (const vector of testVectors) {
                const tagBytes = Buffer.from(vector.tag, 'hex');
                const base58Tag = addrTagToBase58(tagBytes);
                expect(base58Tag).toBe(vector.expectedBase58);
            }
        });

        it('should return null for null input', () => {
            expect(addrTagToBase58(null as any)).toBeNull();
        });

        it('should throw for invalid length', () => {
            const invalidTag = new Uint8Array(10);
            expect(() => addrTagToBase58(invalidTag))
                .toThrow('Invalid address tag length');
        });

        it('should be consistent for same input', () => {
            const tagBytes = Buffer.from(testVectors[0].tag, 'hex');
            const tag1 = addrTagToBase58(tagBytes);
            const tag2 = addrTagToBase58(tagBytes);
            expect(tag1).toBe(tag2);
        });

        it('should produce valid checksum', () => {
            const tagBytes = Buffer.from(testVectors[0].tag, 'hex');
            const base58Tag = addrTagToBase58(tagBytes);
            const decoded = bs58.decode(base58Tag!);
            
            // Verify length (20 bytes tag + 2 bytes checksum)
            expect(decoded.length).toBe(22);
            
            // Verify original tag bytes
            expect(Buffer.from(decoded.slice(0, 20)).toString('hex'))
                .toBe(testVectors[0].tag);
        });
    });

    describe('validateBase58Tag', () => {
        it('should validate correct tags', () => {
            for (const vector of testVectors) {
                const tagBytes = Buffer.from(vector.tag, 'hex');
                const base58Tag = addrTagToBase58(tagBytes);
                expect(validateBase58Tag(base58Tag!)).toBe(true);
            }
        });

        it('should reject invalid length', () => {
            const invalidTag = bs58.encode(Buffer.from('deadbeef', 'hex'));
            expect(validateBase58Tag(invalidTag)).toBe(false);
        });

        it('should reject modified checksum', () => {
            const tagBytes = Buffer.from(testVectors[0].tag, 'hex');
            const base58Tag = addrTagToBase58(tagBytes);
            
            // Modify last character to corrupt checksum
            const corruptTag = base58Tag!.slice(0, -1) + 'X';
            expect(validateBase58Tag(corruptTag)).toBe(false);
        });

        it('should reject invalid base58 characters', () => {
            expect(validateBase58Tag('not-base58!')).toBe(false);
            expect(validateBase58Tag('0O1Il')).toBe(false);
        });

        it('should handle empty string', () => {
            expect(validateBase58Tag('')).toBe(false);
        });

        it('should handle undefined/null', () => {
            expect(validateBase58Tag(undefined as any)).toBe(false);
            expect(validateBase58Tag(null as any)).toBe(false);
        });
    });

    describe('base58ToAddrTag', () => {
        it('should decode test vectors correctly', () => {
            for (const vector of testVectors) {
                const tagBytes = Buffer.from(vector.tag, 'hex');
                const base58Tag = addrTagToBase58(tagBytes);
                const decoded = base58ToAddrTag(base58Tag!);
                
                expect(Buffer.from(decoded!).toString('hex'))
                    .toBe(vector.tag);
            }
        });

        it('should throw for invalid length', () => {
            const invalidTag = bs58.encode(Buffer.from('deadbeef', 'hex'));
            expect(() => base58ToAddrTag(invalidTag))
                .toThrow('Invalid base58 tag length');
        });

        it('should throw for invalid base58', () => {
            expect(() => base58ToAddrTag('not-base58!'))
                .toThrow();
        });

        it('should be reversible', () => {
            const tagBytes = Buffer.from(testVectors[0].tag, 'hex');
            const base58Tag = addrTagToBase58(tagBytes);
            const decoded = base58ToAddrTag(base58Tag!);
            const reEncoded = addrTagToBase58(decoded!);
            
            expect(reEncoded).toBe(base58Tag);
        });

        it('should handle empty string', () => {
            expect(() => base58ToAddrTag(''))
                .toThrow();
        });

        it('should handle undefined/null', () => {
            expect(() => base58ToAddrTag(undefined as any))
                .toThrow();
            expect(() => base58ToAddrTag(null as any))
                .toThrow();
        });
    });
}); 
import { Tag } from '../tag';
import { ByteUtils } from '@/utils';
const Utils = ByteUtils;
describe('Tag', () => {
    describe('validation', () => {
        it('should validate tag length', () => {
            const shortTag = new Uint8Array(11);
            const longTag = new Uint8Array(13);
            const validTag = new Uint8Array(12).fill(0x41);

            expect(Tag.isValid(shortTag)).toBe(false);
            expect(Tag.isValid(longTag)).toBe(false);
            expect(Tag.isValid(validTag)).toBe(true);
        });

        it('should validate null tag', () => {
            const nullTag = null as any;
            const undefinedTag = undefined as any;
            
            expect(Tag.isValid(nullTag)).toBe(false);
            expect(Tag.isValid(undefinedTag)).toBe(false);
        });

        it('should reject tags starting with B or null', () => {
            const bTag = new Uint8Array(12).fill(0x41);
            bTag[0] = 0x42;
            expect(Tag.isValid(bTag)).toBe(false);

            const nullStartTag = new Uint8Array(12).fill(0x41);
            nullStartTag[0] = 0x00;
            expect(Tag.isValid(nullStartTag)).toBe(false);
        });

        it('should handle zero tag', () => {
            const zeroTag = new Uint8Array(12);
            expect(Tag.isZero(zeroTag)).toBe(true);
            
            zeroTag[0] = 1;
            expect(Tag.isZero(zeroTag)).toBe(false);
        });
    });

    describe('extraction', () => {
        it('should extract tag from address', () => {
            const address = new Uint8Array(2208);
            const expectedTag = new Uint8Array(12).fill(0x41);
            address.set(expectedTag, address.length - Tag.TAG_LENGTH);

            const extractedTag = Tag.getTag(address);
            expect(Utils.compareBytes(extractedTag, expectedTag)).toBe(true);
        });

        it('should throw on invalid address length', () => {
            const invalidAddress = new Uint8Array(100);
            expect(() => Tag.getTag(invalidAddress)).toThrow('Invalid address length');
        });
    });

    describe('tagging', () => {
        it('should create new instance', () => {
            const address = new Uint8Array(2208);
            const tag = new Uint8Array(12).fill(0x41);
            
            const tagged = Tag.tag(address, tag);
            expect(tagged).not.toBe(address);
            expect(tagged.length).toBe(address.length);
            
            const extractedTag = Tag.getTag(tagged);
            expect(Utils.compareBytes(extractedTag, tag)).toBe(true);
        });

        it('should handle address with existing tag', () => {
            const address = new Uint8Array(2208);
            const oldTag = new Uint8Array(12).fill(0x41);
            const newTag = new Uint8Array(12).fill(0x43);
            
            const tagged1 = Tag.tag(address, oldTag);
            expect(Utils.compareBytes(Tag.getTag(tagged1), oldTag)).toBe(true);
            
            const tagged2 = Tag.tag(tagged1, newTag);
            expect(Utils.compareBytes(Tag.getTag(tagged2), newTag)).toBe(true);
        });
    });
}); 
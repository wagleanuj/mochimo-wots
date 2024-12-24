import { ByteArray } from "@/types/byte-buffer";

/**
 * Tag implementation for Mochimo addresses
 */
export class Tag {
    static readonly TAG_LENGTH = 12;

    /**
     * Gets the tag from an address
     */
    static getTag(address: ByteArray): ByteArray {
        if (address.length !== 2208) {
            throw new Error('Invalid address length');
        }
        // Return a copy of the tag, not a view
        const tag = new Uint8Array(Tag.TAG_LENGTH);
        tag.set(address.subarray(address.length - Tag.TAG_LENGTH));
        return tag;
    }

    /**
     * Checks if a tag is all zeros
     */
    static isZero(tag: ByteArray): boolean {
        if (!tag || tag.length !== Tag.TAG_LENGTH) {
            return false;
        }
        return tag.every(b => b === 0);
    }

    /**
     * Validates a tag
     */
    static isValid(tag: ByteArray): boolean {
        if (!tag || tag.length !== Tag.TAG_LENGTH) {
            return false;
        }

        return (tag[0] !== 66 && tag[0] !== 0);
    }

    /**
     * Tags an address with the specified tag
     */
    static tag(address: ByteArray, tag: ByteArray): ByteArray {
        if (!this.isValid(tag)) {
            throw new Error('Invalid tag');
        }
        if (address.length !== 2208) {
            throw new Error('Invalid address length');
        }
        if (tag.length !== 12) {
            throw new Error('Invalid tag length');
        }

        const tagged = new Uint8Array(address);
        tagged.set(tag, tagged.length - tag.length);
        return tagged;
    }


} 
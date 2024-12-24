import { ByteArray, HexString, ByteBuffer } from '@/types/byte-buffer';

const HEX_CHARS = '0123456789abcdef';

/**
 * Create a copy of a byte array
 */
export function copyOf(original: ByteArray, length: number): ByteArray {
    const copy = new Uint8Array(length);
    copy.set(original.slice(0, length));
    return copy;
}

export function toASCII(bytes: ByteArray): string {
    return String.fromCharCode(...bytes);
}

/**
 * Utility functions for byte operations
 */
export class Utils {

    /**
     * Convert a hexadecimal string to a byte array
     * @param hex The hexadecimal string to convert
     */
    static hexToBytes(hex: HexString): ByteArray {
        // Remove '0x' prefix if present
        let cleanHex = hex.toLowerCase();
        if (cleanHex.startsWith('0x')) {
            cleanHex = cleanHex.slice(2);
        }

        // Ensure even length
        if (cleanHex.length % 2 !== 0) {
            cleanHex = '0' + cleanHex;
        }

        const bytes = new Uint8Array(cleanHex.length / 2);

        for (let i = 0; i < cleanHex.length; i += 2) {
            bytes[i / 2] = parseInt(cleanHex.slice(i, i + 2), 16);
        }

        return bytes;
    }

    /**
     * Compares two byte arrays
     */
    static compareBytes(a: Uint8Array, b: Uint8Array): boolean {
        if (a.length !== b.length) {
            return false;
        }
        for (let i = 0; i < a.length; i++) {
            if (a[i] !== b[i]) {
                return false;
            }
        }
        return true;
    }

    /**
     * Reads little-endian unsigned values from a buffer
     */
    static readLittleEndianUnsigned(buffer: ByteBuffer, bytes: number = 8): bigint {
        const temp = new Uint8Array(bytes);
        buffer.get(temp);

        let value = 0n;
        for (let i = bytes - 1; i >= 0; i--) {
            value = (value << 8n) | BigInt(temp[i]);
        }
        return value;
    }

    /**
     * Trims address for display
     */
    static trimAddress(addressHex: string): string {
        return `${addressHex.substring(0, 32)}...${addressHex.substring(addressHex.length - 24)}`;
    }

    /**
     * Converts number to little-endian bytes
     */
    static numberToLittleEndian(value: number, length: number): ByteArray {
        const bytes = new Uint8Array(length);
        let remaining = value;
        for (let i = 0; i < length; i++) {
            bytes[i] = remaining & 0xFF;
            remaining = remaining >>> 8;
        }
        return bytes;
    }

    /**
     * Converts byte array to little-endian
     */
    static bytesToLittleEndian(bytes: ByteArray): ByteArray {
        const result = new Uint8Array(bytes.length);
        for (let i = 0; i < bytes.length; i++) {
            result[i] = bytes[bytes.length - 1 - i];
        }
        return result;
    }

    /**
     * Fits byte array or string to specified length
     */
    static fit(bytes: ByteArray | string, length: number): ByteArray {
        if (typeof bytes === 'string') {
            // Convert string to bytes (for bigint strings)
            const value = BigInt(bytes);
            const result = new Uint8Array(length);
            let remaining = value;
            for (let i = 0; i < length; i++) {
                result[i] = Number(remaining & 0xFFn);
                remaining >>= 8n;
            }
            return result;
        }

        const result = new Uint8Array(length);
        const copyLength = Math.min(bytes.length, length);
        result.set(bytes.subarray(0, copyLength));
        return result;
    }

    /**
     * Convert a byte array to its hexadecimal string representation
     * @param bytes The byte array to convert
     * @param offset Optional starting offset in the byte array
     * @param length Optional number of bytes to convert
     */
    static bytesToHex(
        bytes: ByteArray,
        offset: number = 0,
        length: number = bytes.length
    ): HexString {
        const hexChars = new Array(length * 2);

        for (let j = 0; j < length; j++) {
            const v = bytes[j + offset] & 0xFF;
            hexChars[j * 2] = HEX_CHARS[v >>> 4];
            hexChars[j * 2 + 1] = HEX_CHARS[v & 0x0F];
        }

        return hexChars.join('');
    }

    /**
     * Convert a number to a byte array of specified length
     * @param value The number to convert
     * @param length The desired length of the resulting byte array
     */
    static toBytes(value: number | bigint, length: number): ByteArray {
        const hex = value.toString(16).padStart(length * 2, '0');
        return Utils.hexToBytes(hex);
    }

    /**
     * Convert a byte array to little-endian format
     * @param value The byte array to convert
     * @param offset Optional starting offset
     * @param length Optional number of bytes to convert
     */
    static toLittleEndian(
        value: ByteArray,
        offset: number = 0,
        length: number = value.length
    ): ByteArray {
        const copy = new Uint8Array(length);
        copy.set(value.slice(offset, offset + length));

        for (let i = 0; i < copy.length >> 1; i++) {
            const temp = copy[i];
            copy[i] = copy[copy.length - i - 1];
            copy[copy.length - i - 1] = temp;
        }

        return copy;
    }


    /**
     * Clear a byte array by filling it with zeros
     */
    static clear(data: ByteArray): void {
        data.fill(0);
    }

    /**
         * Compare two byte arrays for equality
         */
    static areEqual(a: ByteArray, b: ByteArray): boolean {
        if (a.length !== b.length) return false;
        for (let i = 0; i < a.length; i++) {
            if (a[i] !== b[i]) return false;
        }
        return true;
    }

}
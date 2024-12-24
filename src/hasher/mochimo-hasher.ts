import { lib, algo } from 'crypto-js';
import { ByteArray } from '@/types/byte-buffer';

interface Hasher {
    blockSize: number;
    reset(): void;
    update(messageUpdate: lib.WordArray | string): this;
    finalize(messageUpdate?: lib.WordArray | string): lib.WordArray;
}

/**
 * TypeScript implementation of MochimoHasher
 * Uses crypto-js for cross-platform SHA-256 implementation
 */
export class MochimoHasher {
    private hasher: Hasher;

    constructor() {
        this.hasher = algo.SHA256.create();
    }

    /**
     * Updates the hash with the given data
     */
    update(buffer: ByteArray, offset: number = 0, length: number = buffer.length): void {
        if (offset < 0 || offset > buffer.length) {
            throw new Error('Invalid offset');
        }
        if (length < 0 || offset + length > buffer.length) {
            throw new Error('Invalid length');
        }

        const data = buffer.subarray(offset, offset + length);
        
        // Create a WordArray directly from bytes
        const words: number[] = new Array(Math.ceil(data.length / 4));
        for (let i = 0; i < data.length; i += 4) {
            words[i >> 2] = ((data[i] || 0) << 24) |
                           ((data[i + 1] || 0) << 16) |
                           ((data[i + 2] || 0) << 8) |
                           (data[i + 3] || 0);
        }

        this.hasher.update(lib.WordArray.create(words, data.length));
    }

    /**
     * Returns the final hash value
     */
    digest(): ByteArray {
        const hash = this.hasher.finalize();
        const result = new Uint8Array(32);

        // Convert WordArray to bytes in big-endian order
        const words = hash.words;
        for (let i = 0; i < 8; i++) {
            const word = words[i];
            const j = i * 4;
            result[j] = word >>> 24;
            result[j + 1] = (word >>> 16) & 0xff;
            result[j + 2] = (word >>> 8) & 0xff;
            result[j + 3] = word & 0xff;
        }

        // Reset for next use
        this.hasher = algo.SHA256.create();

        return result;
    }
}

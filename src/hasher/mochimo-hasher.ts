import crypto from 'crypto';
import { ByteArray } from '@/types/byte-buffer';

interface Hasher {
    update(data: Buffer): void;
    digest(): Buffer;
    copy(): Hasher;
}

/**
 * TypeScript implementation of MochimoHasher
 * Uses node's crypto module for SHA-256/SHA-512/RIPEMD160 implementation
 */
export class MochimoHasher {
    private hasher: Hasher;
    private algorithm: string;

    constructor(algorithm: string = 'sha256') {
        this.hasher = crypto.createHash(algorithm);
        this.algorithm = algorithm;
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
        this.hasher.update(Buffer.from(data));
    }

    /**
     * Returns the final hash value
     */
    digest(): ByteArray {
        const hash = this.hasher.digest();
        // Create new hasher for next use
        this.hasher = crypto.createHash(this.algorithm);
        return new Uint8Array(hash);
    }

    /**
     * Creates a copy of the current hasher state
     */
    copy(): MochimoHasher {
        const newHasher = new MochimoHasher();
        newHasher.hasher = (this.hasher as any).copy();
        return newHasher;
    }

    /**
     * Performs Mochimo's hash
     */
    static hash(data: ByteArray): ByteArray;
    static hash(data: ByteArray, offset: number, length: number): ByteArray;
    static hash(data: ByteArray, offset?: number, length?: number): ByteArray {
        const hasher = new MochimoHasher();

        if (offset !== undefined && length !== undefined) {
            hasher.update(data.subarray(offset, offset + length));
        } else {
            hasher.update(data);
        }

        return hasher.digest();
    }

    static hashWith(algorithm: string, data: ByteArray): ByteArray {
        const hasher = new MochimoHasher(algorithm);
        hasher.update(data);
        return hasher.digest();
    }
}

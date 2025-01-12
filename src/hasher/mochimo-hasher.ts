import { sha256 } from '@noble/hashes/sha256';
import { sha3_512 } from '@noble/hashes/sha3';
import { ripemd160 } from '@noble/hashes/ripemd160';
import { Hash } from '@noble/hashes/utils';
import { ByteArray } from '@/types/byte-buffer';

/**
 * TypeScript implementation of MochimoHasher
 * Uses @noble/hashes for cross-platform hash implementations
 */
export class MochimoHasher {
    private hasher: Hash<Hash<any>>;
    private algorithm: string;

    constructor(algorithm: string = 'sha256') {
        this.algorithm = algorithm;
        this.hasher = this.createHasher(algorithm);
    }

    private createHasher(algorithm: string): Hash<Hash<any>> {
        switch (algorithm.toLowerCase()) {
            case 'sha256':
                return sha256.create();
            case 'sha3-512':
                return sha3_512.create();
            case 'ripemd160':
                return ripemd160.create();
            default:
                throw new Error(`Unsupported hash algorithm: ${algorithm}`);
        }
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
        this.hasher.update(data);
    }

    /**
     * Returns the final hash value
     */
    digest(): ByteArray {
        const result = this.hasher.digest();
        // Create new hasher for next use
        this.hasher = this.createHasher(this.algorithm);
        return result;
    }

    /**
     * Performs hash operation
     */
    static hash(data: ByteArray): ByteArray;
    static hash(data: ByteArray, offset: number, length: number): ByteArray;
    static hash(data: ByteArray, offset?: number, length?: number): ByteArray {
        const hasher = new MochimoHasher();

        if (offset !== undefined && length !== undefined) {
            hasher.update(new Uint8Array(data.subarray(offset, offset + length)));
        } else {
            hasher.update(new Uint8Array(data));
        }

        return hasher.digest();
    }

    static hashWith(algorithm: string, data: ByteArray): ByteArray {
        const hasher = new MochimoHasher(algorithm);
        hasher.update(data);
        return hasher.digest();
    }
}



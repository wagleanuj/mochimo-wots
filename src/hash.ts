import { ByteBuffer } from '@/types/byte-buffer';
import { MochimoHasher } from '@/hasher/mochimo-hasher';
import { ByteArray } from '@/types/byte-buffer';

/**
 * WOTS Hash Chain Implementation
 */
export class WOTSHash {
    // XMSS hash padding constants
    static readonly XMSS_HASH_PADDING_F = 0;
    static readonly XMSS_HASH_PADDING_PRF = 3;

    /**
     * Set chain address in the address buffer
     */
    static setChainAddr(addr: ByteBuffer, chain: number): void {
        addr.position(20);
        addr.putInt(chain);
    }

    /**
     * Set hash address in the address buffer
     */
    static setHashAddr(addr: ByteBuffer, hash: number): void {
        addr.position(24);
        addr.putInt(hash);
    }

    /**
     * Set key and mask in the address buffer
     */
    static setKeyAndMask(addr: ByteBuffer, keyAndMask: number): void {
        addr.position(28);
        addr.putInt(keyAndMask);
    }

    /**
     * Convert address buffer to bytes in little-endian format
     */
    static addrToBytes(addr: ByteBuffer): ByteArray {
        addr.position(0);
        const littleEndians = new Uint8Array(addr.capacity());

        for (let i = 0; i < littleEndians.length; i += 4) {
            const b0 = addr.get_();
            const b1 = addr.get_();
            const b2 = addr.get_();
            const b3 = addr.get_();
            littleEndians[i] = b3;
            littleEndians[i + 1] = b2;
            littleEndians[i + 2] = b1;
            littleEndians[i + 3] = b0;
        }

        return littleEndians;
    }

    /**
     * PRF function
     */
    static prf(out: ByteArray, offset: number, input: ByteArray, key: ByteArray): ByteArray {
        const buff = new Uint8Array(96);
        
        // Add padding
        const padding = new Uint8Array(32);
        padding[31] = this.XMSS_HASH_PADDING_PRF;
        buff.set(padding, 0);
        
        // Add key and input
        buff.set(key, 32);
        buff.set(input, 64);

        // Hash and copy to output
        const hasher = new MochimoHasher();
        hasher.update(buff);
        const hash = hasher.digest();
        out.set(hash, offset);

        return out;
    }

    /**
     * F hash function
     */
    static thashF(
        out: ByteArray,
        outOffset: number,
        input: ByteArray,
        inOffset: number,
        pubSeed: ByteArray,
        addr: ByteBuffer
    ): void {
        const buf = new Uint8Array(96);
        
        // Add padding
        const padding = new Uint8Array(32);
        padding[31] = this.XMSS_HASH_PADDING_F;
        buf.set(padding, 0);

        // Get key
        this.setKeyAndMask(addr, 0);
        let addrAsBytes = this.addrToBytes(addr);
        this.prf(buf, 32, addrAsBytes, pubSeed);

        // Get mask
        this.setKeyAndMask(addr, 1);
        addrAsBytes = this.addrToBytes(addr);
        const bitmask = new Uint8Array(32);
        this.prf(bitmask, 0, addrAsBytes, pubSeed);

        // XOR input with bitmask
        for (let i = 0; i < 32; i++) {
            buf[64 + i] = input[i + inOffset] ^ bitmask[i];
        }

        // Hash and copy to output
        const hasher = new MochimoHasher();
        hasher.update(buf);
        const hash = hasher.digest();
        out.set(hash, outOffset);
    }
}

import { ByteArray, ByteBuffer, ByteOrder } from '@/types/byte-buffer';
import { ByteUtils } from '@/utils/byte-utils';
import { WOTSHash } from './hash';
import { Tag } from './tag';



/**
 * WOTS Protocol Implementation
 */
export class WOTS {
    // WOTS parameters
    static readonly WOTSW = 16;
    static readonly WOTSLOGW = 4;
    static readonly PARAMSN = 32;
    static readonly WOTSLEN1 = 64;
    static readonly WOTSLEN2 = 3;
    static readonly WOTSLEN = 67;
    static readonly WOTSSIGBYTES = 2144;
    static readonly TXSIGLEN = 2144;

    /**
     * Generates chains for WOTS
     */
    private static gen_chain(
        out: ByteArray,
        outOffset: number,
        input: ByteArray,
        inOffset: number,
        start: number,
        steps: number,
        pub_seed: ByteArray,
        addr: ByteBuffer
    ): void {
        // Copy input to output
        out.set(input.subarray(inOffset, inOffset + WOTS.PARAMSN), outOffset);

        // Generate chain
        for (let i = start; i < start + steps && i < 16; i++) {
            WOTSHash.setHashAddr(addr, i);
            WOTSHash.thashF(out, outOffset, out, outOffset, pub_seed, addr);
        }
    }

    /**
     * Expands seed into WOTS private key
     */
    private static expand_seed(outseeds: ByteArray, inseed: ByteArray): void {
        for (let i = 0; i < WOTS.WOTSLEN; i++) {
            const ctr = ByteUtils.toBytes(i, 32);
            WOTSHash.prf(outseeds, i * 32, ctr, inseed);
        }
    }
    /**
     * Converts message to base w (convenience overload)
     */
    static base_w(msg: ByteArray, destination: number[]): number[] {
        return this.base_w_(msg, destination, 0, destination.length);
    }

    /**
     * Converts message to base w
     */
    private static base_w_(
        msg: ByteArray,
        destination: number[],
        offset: number = 0,
        length: number = destination.length
    ): number[] {
        let inIdx = 0;
        let outIdx = 0;
        let total = 0;
        let bits = 0;

        for (let consumed = 0; consumed < length; consumed++) {
            if (bits === 0) {
                total = msg[inIdx++];
                bits += 8;
            }
            bits -= 4;
            destination[outIdx++ + offset] = (total >> bits) & 0xF;
        }

        return destination;
    }

    /**
     * Computes WOTS checksum
     */
    private static wotsChecksum(msgBaseW: number[], sumOffset: number): number[] {
        let csum = 0;

        // Compute checksum
        for (let i = 0; i < 64; i++) {
            csum += 15 - msgBaseW[i];
        }

        // Shift left by 4
        csum <<= 4;

        // Convert to bytes and base w
        const csumBytes = new Uint8Array(2);
        csumBytes[0] = (csum >> 8) & 0xFF;
        csumBytes[1] = csum & 0xFF;

        return this.base_w_(csumBytes, msgBaseW, sumOffset, msgBaseW.length - sumOffset);
    }

    /**
     * Computes chain lengths
     */
    private static chain_lengths(msg: ByteArray, destination: number[]): number[] {
        const lengths = this.base_w_(msg, destination, 0, 64);
        return this.wotsChecksum(lengths, 64);
    }

    /**
     * Generates WOTS public key
     */
    static wots_pkgen(
        pk: ByteArray,
        seed: ByteArray,
        pub_seed: ByteArray,
        offset: number,
        addr: ByteArray
    ): void {
        // Expand seed
        this.expand_seed(pk, seed);

        // Create address buffer
        const bbaddr = ByteBuffer.wrap(addr);
        bbaddr.order(ByteOrder.LITTLE_ENDIAN);

        // Generate chains
        for (let i = 0; i < WOTS.WOTSLEN; i++) {
            WOTSHash.setChainAddr(bbaddr, i);
            this.gen_chain(pk, i * 32, pk, i * 32, 0, 15, pub_seed.subarray(offset), bbaddr);
        }
    }

    /**
     * Signs a message using WOTS
     */
    static wots_sign(
        sig: ByteArray,
        msg: ByteArray,
        seed: ByteArray,
        pub_seed: ByteArray,
        offset: number,
        addr: ByteArray
    ): void {
        const lengths = new Array<number>(WOTS.WOTSLEN);

        // Compute lengths
        this.chain_lengths(msg, lengths);

        // Expand seed
        this.expand_seed(sig, seed);

        // Create address buffer
        const bbaddr = ByteBuffer.wrap(addr);
        bbaddr.order(ByteOrder.LITTLE_ENDIAN);

        // Generate signature
        for (let i = 0; i < WOTS.WOTSLEN; i++) {
            WOTSHash.setChainAddr(bbaddr, i);
            this.gen_chain(sig, i * 32, sig, i * 32, 0, lengths[i], pub_seed.subarray(offset), bbaddr);
        }
    }



    /**
     * Verifies a WOTS signature
     */
    static wots_pk_from_sig(
        signature: ByteArray,
        msg: ByteArray,
        pub_seed: ByteArray,
        addr: ByteArray
    ): ByteArray {
        const pk = new Uint8Array(WOTS.WOTSSIGBYTES);
        const lengths = new Array<number>(WOTS.WOTSLEN);

        // Copy and wrap address
        const caddr = new Uint8Array(addr);
        const bbaddr = ByteBuffer.wrap(caddr);
        bbaddr.order(ByteOrder.LITTLE_ENDIAN);

        // Compute lengths
        this.chain_lengths(msg, lengths);

        // Verify signature
        for (let i = 0; i < WOTS.WOTSLEN; i++) {
            WOTSHash.setChainAddr(bbaddr, i);
            this.gen_chain(pk, i * 32, signature, i * 32, lengths[i], 15 - lengths[i], pub_seed, bbaddr);
        }

        return pk;
    }

    /**
     * Generates a WOTS address using the componentsGenerator. 
     * Note:: use you own componentsGenerator that fills in deterministic bytes if you want to generate a specific address
     */
    static generateAddress(tag: ByteArray | null, secret: ByteArray, componentsGenerator: (wotsSeed: ByteArray) => { private_seed: ByteArray, public_seed: ByteArray, addr_seed: ByteArray } ): ByteArray {
        if(!componentsGenerator){
            throw new Error('Invalid componentsGenerator');
        }   
        if (secret.length !== 32) {
            throw new Error('Invalid secret length');
        }
        if (tag !== null && tag.length !== 12) {
            throw new Error('Invalid tag');
        }
        const sourcePK = new Uint8Array(2144);
        const components = componentsGenerator(secret);

        WOTS.wots_pkgen(sourcePK, components.private_seed, components.public_seed, 0, components.addr_seed);

        const sourceAddress = new Uint8Array(2208);
        sourceAddress.set(sourcePK, 0);
        sourceAddress.set(components.public_seed, 2144);
        sourceAddress.set(components.addr_seed, 2176);


        // Apply tag if provided using Tag.tag
        const readyAddress = tag ? Tag.tag(sourceAddress, tag) : sourceAddress;

        // Validate address
        for (let i = 0; i < 10; i++) {
            if (!this.isValid(components.private_seed, readyAddress, randomGenerator)) {
                throw new Error('Invalid WOTS');
            }
        }

        return readyAddress;
    }



    /**
     * Validates WOTS components
     */
    private static isValidWithComponents(
        secret: ByteArray,
        pk: ByteArray,
        pubSeed: ByteArray,
        rnd2: ByteArray,
        randomGenerator: (bytes: ByteArray) => void
    ): boolean {
        if (secret.length !== 32) {
            throw new Error('Invalid secret length');
        }
        if (pk.length !== 2144) {
            throw new Error('Invalid pk length');
        }
        if (pubSeed.length !== 32) {
            throw new Error('Invalid pubSeed length');
        }
        if (rnd2.length !== 32) {
            throw new Error('Invalid rnd2 length');
        }

        // Generate random message
        const msg = new Uint8Array(32);
        randomGenerator(msg);

        // Sign message
        const sig = new Uint8Array(2144);
        this.wots_sign(sig, msg, secret, pubSeed, 0, rnd2);

        // Verify signature
        const computedPk = this.wots_pk_from_sig(sig, msg, pubSeed, rnd2);
        // Compare public keys
        return ByteUtils.compareBytes(computedPk, pk);
    }

    /**
     * Splits a WOTS address into its components
     */
    static splitAddress(
        address: ByteArray,
        pk: ByteArray,
        pubSeed: ByteArray,
        rnd2: ByteArray,
        tag: ByteArray | null
    ): void {

        if (address.length !== 2208) {
            throw new Error('Invalid address length');
        }
        if (pk.length !== 2144) {
            throw new Error('Invalid pk length');
        }
        if (pubSeed.length !== 32) {
            throw new Error('Invalid pubSeed length');
        }
        if (rnd2.length !== 32) {
            throw new Error('Invalid rnd2 length');
        }
        if (tag !== null && tag.length !== 12) {
            throw new Error('Invalid tag length');
        }

        // Copy components
        pk.set(address.subarray(0, 2144));
        pubSeed.set(address.subarray(2144, 2176));
        rnd2.set(address.subarray(2176, 2208));

        // Copy tag if provided
        if (tag !== null) {
            tag.set(rnd2.subarray(20, 32));
        }
    }

    /**
     * Validates a WOTS address using a Random generator
     */
    static isValid(secret: ByteArray, address: ByteArray, random = randomGenerator): boolean {
        const pk = new Uint8Array(2144);
        const pubSeed = new Uint8Array(32);
        const rnd2 = new Uint8Array(32);

        this.splitAddress(address, pk, pubSeed, rnd2, null);
        return this.isValidWithComponents(secret, pk, pubSeed, rnd2, randomGenerator);
    }

    /**
     * Generates a WOTS address using SecureRandom
     */
    static generateRandomAddress(tag: ByteArray | null, secret: ByteArray): ByteArray {
        return this.generateRandomAddress_(tag, secret, randomGenerator);
    }

    /**
     * Generates a random WOTS address using the randomGenerator
     * Note:: use you own randomGenerator that fills in deterministic bytes if you want to generate a specific address
     */
    static generateRandomAddress_(
        tag: ByteArray | null,
        secret: ByteArray,
        randomGenerator: (bytes: ByteArray) => void
    ): ByteArray {
        if (secret.length !== 32) {
            throw new Error('Invalid secret length');
        }
        if (tag !== null && tag.length !== 12) {
            throw new Error('Invalid tag');
        }

        const address = new Uint8Array(2208);
        const rnd2 = new Uint8Array(32);

        // Generate random bytes for address
        randomGenerator(address);

        // Copy random bytes to rnd2
        rnd2.set(address.subarray(2176, 2208));

        // Generate public key
        this.wots_pkgen(address, secret, address, 2144, rnd2);

        // Copy rnd2 back to address
        address.set(rnd2, 2176);

        // Apply tag if provided using Tag.tag
        const readyAddress = tag ? Tag.tag(address, tag) : address;

        // Validate address
        for (let i = 0; i < 10; i++) {
            if (!this.isValid(secret, readyAddress, randomGenerator)) {
                throw new Error('Invalid WOTS');
            }
        }

        return readyAddress;
    }



}

function randomGenerator(bytes: ByteArray): void {
    for (let i = 0; i < bytes.length; i++) {
        bytes[i] = Math.floor(Math.random() * 256);
    }
}

import { ByteArray } from '@/types/byte-buffer';
import { ByteUtils } from '@/utils/byte-utils';
import { WOTS } from './wots';
import { MochimoHasher } from '@/hasher/mochimo-hasher';    


interface WOTSWalletParams {
    name?: string | null;
    address?: ByteArray | null;
    tag?: ByteArray | null;
    secret?: ByteArray | null;
}

interface WOTSWalletJSON {
    name?: string | null;
    address?: ByteArray | null;
    tag?: ByteArray | null;
    secret?: ByteArray | null;
    tagHex?: string | null;
    addressHex?: string | null;
}

/**
 * WOTS Wallet Implementation
 */
export class WOTSWallet implements WOTSWalletJSON {
    public readonly name: string | null;
    public readonly address: ByteArray | null;
    public addressHex: string | null;
    public readonly tag: ByteArray | null;
    public tagHex: string | null;
    public readonly secret: ByteArray | null;
    /**
     * Creates a new WOTS wallet
     */
    constructor(params: WOTSWalletParams) {
        this.name = params.name || null;
        this.address = params.address ? new Uint8Array(params.address) : null;
        this.tag = params.tag ? new Uint8Array(params.tag) : null;
        this.secret = params.secret ? new Uint8Array(params.secret) : null;

        // Initialize hex strings
        this.addressHex = this.address ? ByteUtils.bytesToHex(this.address) : null;
        this.tagHex = this.tag ? ByteUtils.bytesToHex(this.tag) : null;
    }
    getName() {
        return this.name;
    }

    getAddress(): ByteArray | null {
        return this.address ? new Uint8Array(this.address) : null;
    }

    getAddressHex(): string | null {
        return this.addressHex;
    }

    getTag(): ByteArray | null {
        return this.tag ? new Uint8Array(this.tag) : null;
    }

    getTagHex(): string | null {
        return this.tagHex;
    }

    getSecret(): ByteArray | null {
        return this.secret ? new Uint8Array(this.secret) : null;
    }

    hasSecret(): boolean {
        return this.secret !== null;
    }

    /**
     * Sign data using the secret key
     * @param data 
     * @returns 
     */
    sign(data: ByteArray): ByteArray {
        if (!this.secret) throw new Error("Secret is not set");
        return WOTS.wotsSign(ByteUtils.bytesToHex(this.secret), data);
    }

    /**
     * Address components generator used for generating address components for pk generation
     * @param wotsSeed 
     * @returns 
     */

    static componentsGenerator(wotsSeed: ByteArray): { private_seed: ByteArray, public_seed: ByteArray, addr_seed: ByteArray } {
        const seed_ascii = Buffer.from(wotsSeed).toString('ascii');
        const private_seed = MochimoHasher.hash(Buffer.from(seed_ascii + "seed", 'ascii'));
        const public_seed = MochimoHasher.hash(Buffer.from(seed_ascii + "publ", 'ascii'));
        const addr_seed = MochimoHasher.hash(Buffer.from(seed_ascii + "addr", 'ascii'));
        return {
            private_seed: (private_seed),
            public_seed: (public_seed),
            addr_seed: (addr_seed)
        }
    }

    clear(): void {
        // Clear copies

        if (this.secret) ByteUtils.clear(this.secret);
        if (this.address) ByteUtils.clear(this.address);
        if (this.tag) ByteUtils.clear(this.tag);
        if (this.tagHex) this.tagHex = null;
        if (this.addressHex) this.addressHex = null;
    }

    toString(): string {
        let str = 'Empty address';
        if (this.addressHex) {
            str = `${this.addressHex.substring(0, 32)}...${this.addressHex.substring(this.addressHex.length - 24)}`;
        } else if (this.tagHex) {
            str = `tag-${this.tagHex}`;
        }
        return str;
    }
    toJSON(): WOTSWalletJSON {
        return {
            name: this.name,
            address: this.address,
            tag: this.tag,
            secret: this.secret,
            tagHex: this.tagHex,
            addressHex: this.addressHex
        }
    }

    static create(name: string, secret: ByteArray, tag: ByteArray) {

        if (secret.length !== 32) {
            throw new Error('Invalid secret length');
        }
        if (tag !== null && tag.length !== 12) {
            throw new Error('Invalid tag');
        }
        const sourcePK = WOTS.generateAddress(tag, secret, this.componentsGenerator);
        const ww = new WOTSWallet({ name, address: sourcePK, tag, secret });
        return ww;
    }

}



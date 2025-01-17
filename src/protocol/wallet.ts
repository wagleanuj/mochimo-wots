import { ByteArray } from '@/types/byte-buffer';
import { ByteUtils } from '@/utils/byte-utils';
import { WOTS } from './wots';
import { MochimoHasher } from '@/hasher/mochimo-hasher';
import { WotsAddress } from './wots-addr';
import { addrTagToBase58 } from '@/utils/tag-utils';


interface WOTSWalletParams {
    name?: string | null;
    wots?: ByteArray | null; //wots address 2208 bytes
    addrTag?: ByteArray | null; //address tag 20 bytes
    secret?: ByteArray | null; //secret key 32 bytes
}

interface WOTSWalletJSON {
    name?: string | null;
    wots?: ByteArray | null;
    addrTag?: ByteArray | null;
    secret?: ByteArray | null;
    addrTagHex?: string | null;
    wotsAddrHex?: string | null;
}

/**
 * WOTS Wallet Implementation in V3
 */
export class WOTSWallet implements WOTSWalletJSON {
    public readonly name: string | null;
    public readonly wots: ByteArray | null;
    public wotsAddrHex: string | null;
    public readonly addrTag: ByteArray | null;
    public addrTagHex: string | null;
    public readonly secret: ByteArray | null;
    public mochimoAddr: WotsAddress | null;

    /**
     * Creates a new WOTS wallet
     */
    private constructor({
        name = null,
        wots = null,
        addrTag = null,
        secret = null
    }: WOTSWalletParams) {
        if (secret && secret.length !== 32) {
            throw new Error('Invalid secret length');
        }
        if (addrTag && addrTag.length !== 20) {
            throw new Error('Invalid address tag');
        }
        this.name = name;
        this.wots = wots;
        this.addrTag = addrTag;
        this.secret = secret;


        // Initialize hex strings
        this.wotsAddrHex = this.wots ? ByteUtils.bytesToHex(this.wots) : null;
        this.addrTagHex = this.addrTag ? ByteUtils.bytesToHex(this.addrTag) : null;
        // Mochimo address
        this.mochimoAddr = this.wots ? WotsAddress.wotsAddressFromBytes(this.wots.slice(0, 2144)) : null;
        this.mochimoAddr?.setTag(this.addrTag!);
    }

    getName() {
        return this.name;
    }



    /**
     * Get the full wots address (2208 bytes)
     * @returns 
     */
    getWots(): ByteArray | null {
        return this.wots ? new Uint8Array(this.wots) : null;
    }

    /**
    * Get the hex string of the full wots address
    */
    getWotsHex(): string | null {
        return this.wotsAddrHex;
    }

    /**
     * Get the wots public key (2144 bytes)
     */
    getWotsPk(): ByteArray | null {
        return this.wots ? new Uint8Array(this.wots.slice(0, WOTS.WOTSSIGBYTES)) : null;
    }
    /**
    * Get the public seed used when generating the wots address
    */
    getWotsPubSeed(): ByteArray | null {
        return this.wots ? this.wots.subarray(WOTS.WOTSSIGBYTES, WOTS.WOTSSIGBYTES + 32) : null;
    }

    /**
    * Get the wots+ address scheme used when generating the address
    */
    getWotsAdrs(): ByteArray | null {
        return this.wots ? this.wots.subarray(WOTS.WOTSSIGBYTES + 32, WOTS.WOTSSIGBYTES + 64) : null;
    }

    /**
     * Get the wots+ tag used when generating the address
     */
    getWotsTag(): ByteArray | null {
        return this.wots ? this.wots.subarray(WOTS.WOTSSIGBYTES + 64 - 12, WOTS.WOTSSIGBYTES + 64) : null;
    }

    /**
     * Get the 40 byte mochimo address [20 bytes tag + 20 bytes address]
     */
    getAddress(): ByteArray | null {
        return this.mochimoAddr ? this.mochimoAddr.bytes().slice(0, 40) : null;
    }

    /**
     * Get the address tag (20 bytes)
     */
    getAddrTag(): ByteArray | null {
        return this.addrTag ? new Uint8Array(this.addrTag) : null;
    }

    getAddrTagHex(): string | null {
        return this.addrTagHex;
    }

    getAddrTagBase64(): string | null {
        return addrTagToBase58(this.getAddrTag()!);
    }

    /**
     * Get the address hash of mochimo address (20 bytes)
     */
    getAddrHash(): ByteArray | null {
        return this.mochimoAddr ? this.mochimoAddr.getAddrHash() : null;
    }



    getSecret(): ByteArray | null {
        return this.secret ? new Uint8Array(this.secret) : null;
    }

    hasSecret(): boolean {
        return this.secret !== null;
    }

    /**
     * Sign data using the secret key
     */
    sign(data: ByteArray): ByteArray {
        const sourceSeed = this.secret;
        const sourceWots = this.wots;
        if (!sourceSeed || !sourceWots) {
            throw new Error('Cannot sign without secret key or address');
        }
        if (sourceSeed.length !== 32) {
            throw new Error('Invalid sourceSeed length, expected 32, got ' + sourceSeed.length);
        }
        if (sourceWots.length !== 2208) {
            throw new Error('Invalid sourceWots length, expected 2208, got ' + sourceWots.length);
        }
        const pk = sourceWots.subarray(0, WOTS.WOTSSIGBYTES);
        const pubSeed = sourceWots.subarray(WOTS.WOTSSIGBYTES, WOTS.WOTSSIGBYTES + 32);
        const rnd2 = sourceWots.subarray(WOTS.WOTSSIGBYTES + 32, WOTS.WOTSSIGBYTES + 64);
        const sig = new Uint8Array(WOTS.WOTSSIGBYTES);
        WOTS.wots_sign(sig, data, sourceSeed, pubSeed, 0, rnd2);
        return sig;
    }

    /**
     * Verifies whether a signature is valid for a given message
     */

    verify(message: ByteArray, signature: ByteArray): boolean {
        if (!this.wots) {
            throw new Error('Cannot verify without public key (address)');
        }
        const srcAddr = this.wots;
        const pk = srcAddr.subarray(0, WOTS.WOTSSIGBYTES);
        const pubSeed = srcAddr.subarray(WOTS.WOTSSIGBYTES, WOTS.WOTSSIGBYTES + 32);
        const rnd2 = srcAddr.subarray(WOTS.WOTSSIGBYTES + 32, WOTS.WOTSSIGBYTES + 64);

        const computedPublicKey = WOTS.wots_pk_from_sig(signature, message, pubSeed, rnd2);
        return ByteUtils.areEqual(computedPublicKey, pk);
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
        if (this.wots) ByteUtils.clear(this.wots);
        if (this.addrTag) ByteUtils.clear(this.addrTag);
        if (this.addrTagHex) this.addrTagHex = null;
        if (this.wotsAddrHex) this.wotsAddrHex = null;
        if (this.mochimoAddr) this.mochimoAddr = null;
    }

    toString(): string {
        let str = 'Empty address';
        if (this.wotsAddrHex) {
            str = `${this.wotsAddrHex.substring(0, 32)}...${this.wotsAddrHex.substring(this.wotsAddrHex.length - 24)}`;
        } else if (this.addrTagHex) {
            str = `tag-${this.addrTagHex}`;
        }
        return str;
    }

    /**
     * Creates a wallet instance

     */
    static create(name: string, secret: ByteArray, v3tag?: ByteArray, randomGenerator?: (bytes: ByteArray) => void) {
        if (secret.length !== 32) {
            throw new Error('Invalid secret length');
        }

        let private_seed = secret;
        let sourcePK: ByteArray | null = null;
        const defaultTag = Buffer.from('420000000e00000001000000', 'hex');
        if (randomGenerator) {
            sourcePK = WOTS.generateRandomAddress(defaultTag, secret, randomGenerator);
        } else {
            ({ private_seed } = this.componentsGenerator(secret));
            sourcePK = WOTS.generateAddress(defaultTag, secret, this.componentsGenerator);
        }
        if(sourcePK.length !== 2208) {
            throw new Error('Invalid sourcePK length');
        }
        let addrTag = v3tag;
        if (!addrTag) {
            //generate a v3 tag for this address
            addrTag = WotsAddress.wotsAddressFromBytes(sourcePK.slice(0, 2144)).getTag(); 
        }
        if (addrTag.length !== 20) {
            throw new Error('Invalid tag');
        }
        const ww = new WOTSWallet({ name, wots: sourcePK, addrTag: addrTag, secret: private_seed });
        return ww;
    }

    toJSON(): WOTSWalletJSON {
        return {
            name: this.name,
            wots: this.wots,
            addrTag: this.addrTag,
            secret: this.secret,
            addrTagHex: this.addrTagHex,
            wotsAddrHex: this.wotsAddrHex
        }
    }
    

}



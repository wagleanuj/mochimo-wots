import SHA3 from 'crypto-js/sha3';
import RIPEMD160 from 'crypto-js/ripemd160';
import { enc, lib } from 'crypto-js';

// Constants
const TXADDRLEN = 20;      // Total address length
const ADDR_TAG_LEN = 20;    // Tag length should be 12 bytes, not 20
const WOTS_PK_LEN = 2144;
const TXAMOUNT = 8;
const SHA3LEN512 = 64;

// Helper function to convert CryptoJS WordArray to Uint8Array
function wordArrayToUint8Array(wordArray: lib.WordArray): Uint8Array {
    const words = wordArray.words;
    const sigBytes = wordArray.sigBytes;
    const u8 = new Uint8Array(sigBytes);
    for (let i = 0; i < sigBytes; i++) {
        const byte = (words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff;
        u8[i] = byte;
    }
    return u8;
}

// Helper function to convert Uint8Array to CryptoJS WordArray
function uint8ArrayToWordArray(u8arr: Uint8Array): lib.WordArray {
    const len = u8arr.length;
    const words: number[] = [];
    for (let i = 0; i < len; i += 4) {
        words.push(
            (u8arr[i] << 24) |
            (u8arr[i + 1] << 16) |
            (u8arr[i + 2] << 8) |
            (u8arr[i + 3])
        );
    }
    return lib.WordArray.create(words, len);
}

export class WotsAddress {
    private address: Uint8Array;
    private amount: bigint;

    constructor() {
        this.address = new Uint8Array(TXADDRLEN);
        this.amount = BigInt(0);
    }

    public bytes(): Uint8Array {
        const buffer = new Uint8Array(TXADDRLEN + TXAMOUNT);
        buffer.set(this.address);
        buffer.set(this.getAmountBytes(), TXADDRLEN);
        return buffer;
    }

    public getTag(): Uint8Array {
        return this.address.slice(0, ADDR_TAG_LEN);
    }

    public setTag(tag: Uint8Array): void {
        this.address.set(tag.slice(0, ADDR_TAG_LEN), 0);
    }

    public getAddress(): Uint8Array {
        return this.address.slice(ADDR_TAG_LEN);
    }

    public setAddress(address: Uint8Array): void {
        this.address.set(address.slice(0, TXADDRLEN - ADDR_TAG_LEN), ADDR_TAG_LEN);
    }

    public setAmountBytes(amount: Uint8Array): void {
        this.amount = BigInt(
            new DataView(amount.buffer).getBigUint64(0, true)
        );
    }

    public getAmount(): bigint {
        return this.amount;
    }

    public getAmountBytes(): Uint8Array {
        const buffer = new ArrayBuffer(TXAMOUNT);
        const view = new DataView(buffer);
        view.setBigUint64(0, this.amount, true);
        return new Uint8Array(buffer);
    }


    static wotsAddressFromBytes(bytes: Uint8Array): WotsAddress {
        const wots = new WotsAddress();

        if (bytes.length === WOTS_PK_LEN) {
            const addr = this.addrFromWots(bytes);
            if (addr) {
                // Set the full address
                wots.setTag(addr.slice(0, ADDR_TAG_LEN));
                wots.setAddress(addr.slice(ADDR_TAG_LEN));
            }
        } else if (bytes.length === TXADDRLEN) {
            // Set the full address
            wots.setTag(bytes.slice(0, ADDR_TAG_LEN));
            wots.setAddress(bytes.slice(ADDR_TAG_LEN));
        } else if (bytes.length === TXADDRLEN + TXAMOUNT) {
            // Set address and amount separately
            wots.setTag(bytes.slice(0, ADDR_TAG_LEN));
            wots.setAddress(bytes.slice(ADDR_TAG_LEN, TXADDRLEN));
            wots.setAmountBytes(bytes.slice(TXADDRLEN));
        }

        return wots;
    }

    static wotsAddressFromHex(wotsHex: string): WotsAddress {
        const bytes = Buffer.from(wotsHex, 'hex');
        if (bytes.length !== TXADDRLEN) {
            return new WotsAddress();
        }
        return this.wotsAddressFromBytes(bytes);
    }

    static addrFromImplicit(tag: Uint8Array): Uint8Array {
        const addr = new Uint8Array(TXADDRLEN);
        addr.set(tag.slice(0, ADDR_TAG_LEN), 0);
        addr.set(tag.slice(0, TXADDRLEN - ADDR_TAG_LEN), ADDR_TAG_LEN);
        return addr;
    }

    static addrHashGenerate(input: Uint8Array): Uint8Array {
        const inputWordArray = uint8ArrayToWordArray(input);
        const sha3Hash = SHA3(inputWordArray, { outputLength: 512 });
        const ripemdHash = RIPEMD160(sha3Hash);
        return wordArrayToUint8Array(ripemdHash);
    }

    static addrFromWots(wots: Uint8Array): Uint8Array | null {
        if (wots.length !== WOTS_PK_LEN) {
            return null;
        }
        const hash = this.addrHashGenerate(wots.slice(0, WOTS_PK_LEN));
        return this.addrFromImplicit(hash);
    }
}
import { WOTSWallet } from '@/protocol';
import { ByteUtils } from '@/utils';
const Utils = ByteUtils;
const bytesToHex = Utils.bytesToHex;
describe('WOTS', () => {
    describe('construction', () => {
        it('should create wallet with basic parameters', () => {
            const address = new Uint8Array(2208).fill(0x12);
            const tag = new Uint8Array(12).fill(0x34);
            const secret = new Uint8Array(32).fill(0x56);

            const wallet = new WOTSWallet({ address, tag, secret });
            
            expect(wallet.getName()).toBeNull();
            expect(wallet.getAddress()).toEqual(address);
            expect(wallet.getTag()).toEqual(tag);
            expect(wallet.getSecret()).toEqual(secret);
        });

        it('should create wallet with name', () => {
            const name = 'Test Wallet';
            const address = new Uint8Array(2208).fill(0x12);
            const tag = new Uint8Array(12).fill(0x34);
            const secret = new Uint8Array(32).fill(0x56);

            const wallet = new WOTSWallet({ name, address, tag, secret });
            
            expect(wallet.getName()).toBe(name);
            expect(wallet.getAddress()).toEqual(address);
            expect(wallet.getTag()).toEqual(tag);
            expect(wallet.getSecret()).toEqual(secret);
        });

        it('should handle empty parameters', () => {
            const wallet = new WOTSWallet({});
            
            expect(wallet.getName()).toBeNull();
            expect(wallet.getAddress()).toBeNull();
            expect(wallet.getTag()).toBeNull();
            expect(wallet.getSecret()).toBeNull();
            expect(wallet.toString()).toBe('Empty address');
        });
    });

    describe('hex representations', () => {
        it('should provide hex strings for address and tag', () => {
            const address = new Uint8Array(2208).fill(0x12);
            const tag = new Uint8Array(12).fill(0x34);
            const wallet = new WOTSWallet({ address, tag, secret: null });

            expect(wallet.getAddressHex()).toBe(bytesToHex(address));
            expect(wallet.getTagHex()).toBe(bytesToHex(tag));
        });

        it('should handle null values for hex strings', () => {
            const wallet = new WOTSWallet({});
            
            expect(wallet.getAddressHex()).toBeNull();
            expect(wallet.getTagHex()).toBeNull();
        });
    });

    describe('string representation', () => {
        it('should format address correctly', () => {
            const address = new Uint8Array(2208).fill(0x12);
            const wallet = new WOTSWallet({ address, tag: null, secret: null });
            
            const hex = bytesToHex(address);
            expect(wallet.toString()).toBe(`${hex.substring(0, 32)}...${hex.substring(hex.length - 24)}`);
        });

        it('should format tag correctly when no address', () => {
            const tag = new Uint8Array(12).fill(0x34);
            const wallet = new WOTSWallet({ name: null, address: null, tag, secret: null });
            
            expect(wallet.toString()).toBe(`tag-${bytesToHex(tag)}`);
        });

        it('should handle empty wallet', () => {
            const wallet = new WOTSWallet({});
            expect(wallet.toString()).toBe('Empty address');
        });
    });

    describe('secret operations', () => {
        it('should indicate presence of secret', () => {
            const secret = new Uint8Array(32).fill(0x12);
            const wallet = new WOTSWallet({ secret });
            expect(wallet.hasSecret()).toBe(true);
        });

        it('should indicate absence of secret', () => {
            const wallet = new WOTSWallet({});
            expect(wallet.hasSecret()).toBe(false);
        });
    });

    describe('clearing', () => {
        it('should clear all sensitive data', () => {
            const address = new Uint8Array(2208).fill(0x12);
            const tag = new Uint8Array(12).fill(0x34);
            const secret = new Uint8Array(32).fill(0x56);
            const wallet = new WOTSWallet({ address, tag, secret });
            wallet.clear();
            expect(wallet.getAddress()?.every(b => b === 0)).toBe(true);
            expect(wallet.getTag()?.every(b => b === 0)).toBe(true);
            expect(wallet.getSecret()?.every(b => b === 0)).toBe(true);
            
        });
    });
}); 
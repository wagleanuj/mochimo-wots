import { WOTSWallet } from "../wallet-v2";
import { ByteUtils } from '@/utils';

describe('WOTSWallet', () => {
    describe('signature operations', () => {
        let wallet: WOTSWallet;
        const message = new Uint8Array([1, 2, 3, 4, 5]);

        beforeEach(() => {
            const secret = new Uint8Array(32).fill(0x56);
            const tag = new Uint8Array(12).fill(0x34);
            wallet = WOTSWallet.create("Test Wallet", secret, tag);
        });

        it('should sign and verify a message', () => {
            const signature = wallet.sign(message);
            const isValid = wallet.verify(message, signature);
            expect(isValid).toBe(true);
        });

        it('should reject modified signature', () => {
            const signature = wallet.sign(message);
            signature[0] = signature[0] ^ 0xFF;  // Modify first byte
            const isValid = wallet.verify(message, signature);
            expect(isValid).toBe(false);
        });

        it('should reject modified message', () => {
            const signature = wallet.sign(message);
            const modifiedMessage = new Uint8Array(message);
            modifiedMessage[0] = modifiedMessage[0] ^ 0xFF;
            const isValid = wallet.verify(modifiedMessage, signature);
            expect(isValid).toBe(false);
        });
    });

    describe('wallet creation', () => {
        it('should create wallet with valid parameters', () => {
            const secret = new Uint8Array(32).fill(0x56);
            const tag = new Uint8Array(12).fill(0x34);
            const wallet = WOTSWallet.create("Test Wallet", secret, tag);

            expect(wallet.getName()).toBe("Test Wallet");
            expect(wallet.getTag()).toEqual(tag);
            // TODO: this is kind of a bummer; since this wallet generates a new secret based on this secret by hashing (secret+'seed')
            expect(wallet.getSecret()).not.toEqual(secret); 
            expect(wallet.getAddress()).toBeDefined();
            expect(wallet.getAddress()?.length).toBe(2208);
        });

        it('should throw on invalid secret length', () => {
            const invalidSecret = new Uint8Array(16).fill(0x56);
            const tag = new Uint8Array(12).fill(0x34);
            expect(() => WOTSWallet.create("Test", invalidSecret, tag))
                .toThrow('Invalid secret length');
        });

        it('should throw on invalid tag length', () => {
            const secret = new Uint8Array(32).fill(0x56);
            const invalidTag = new Uint8Array(8).fill(0x34);
            expect(() => WOTSWallet.create("Test", secret, invalidTag))
                .toThrow('Invalid tag');
        });
    });

    describe('wallet operations', () => {
        let wallet: WOTSWallet;

        beforeEach(() => {
            const secret = new Uint8Array(32).fill(0x56);
            const tag = new Uint8Array(12).fill(0x34);
            wallet = WOTSWallet.create("Test Wallet", secret, tag);
        });

        it('should provide hex representations', () => {
            expect(wallet.getAddressHex()).toBeDefined();
            expect(wallet.getTagHex()).toBeDefined();
            expect(typeof wallet.getAddressHex()).toBe('string');
            expect(typeof wallet.getTagHex()).toBe('string');
        });

        it('should clear sensitive data', () => {
            wallet.clear();
            expect(wallet.getAddress()?.every(b => b === 0)).toBe(true);
            expect(wallet.getTag()?.every(b => b === 0)).toBe(true);
            expect(wallet.getSecret()?.every(b => b === 0)).toBe(true);
        });

        it('should provide string representation', () => {
            const str = wallet.toString();
            expect(str).toContain('...');
            expect(str.length).toBe(59); // 32 + 3 + 24 = 59
        });
    });
});
import { WOTSWallet } from '../wallet';
import { ByteUtils } from '@/utils';
import { WOTS } from '../wots';

describe('WOTSWallet', () => {
    const testName = 'Test Wallet';
    const testSecret = new Uint8Array(32).fill(0x12);
    const testAddrTag = new Uint8Array(20).fill(0x34);
    let wallet: WOTSWallet;

    beforeEach(() => {
        wallet = WOTSWallet.create(testName, testSecret, testAddrTag);
    });

    describe('basic properties', () => {
        it('should initialize with correct values', () => {
            expect(wallet.getName()).toBe(testName);
            expect(wallet.getSecret()).toBeDefined();
            expect(wallet.getAddrTag()).toBeDefined();
            expect(wallet.getWots()).toBeDefined();
        });

        it('should have correct lengths', () => {
            expect(wallet.getSecret()?.length).toBe(32);
            expect(wallet.getAddrTag()?.length).toBe(20);
            expect(wallet.getWots()?.length).toBe(2208);
        });
    });

    describe('WOTS+ components', () => {
        it('should have valid WOTS public key', () => {
            const wotsPk = wallet.getWotsPk();
            expect(wotsPk).toBeDefined();
            expect(wotsPk?.length).toBe(WOTS.WOTSSIGBYTES);
        });

        it('should have valid WOTS public seed', () => {
            const wotsPubSeed = wallet.getWotsPubSeed();
            expect(wotsPubSeed).toBeDefined();
            expect(wotsPubSeed?.length).toBe(32);
        });

        it('should have valid WOTS address scheme', () => {
            const wotsAdrs = wallet.getWotsAdrs();
            expect(wotsAdrs).toBeDefined();
            expect(wotsAdrs?.length).toBe(32);
        });

        it('should have valid WOTS tag', () => {
            const wotsTag = wallet.getWotsTag();
            expect(wotsTag).toBeDefined();
            expect(wotsTag?.length).toBe(12);
        });
    });

    describe('Mochimo address components', () => {
        it('should have valid address', () => {
            const addr = wallet.getAddress();
            expect(addr).toBeDefined();
            expect(addr?.length).toBe(20);
        });

        it('should have valid address tag', () => {
            const addrTag = wallet.getAddrTag();
            expect(addrTag).toBeDefined();
            expect(addrTag?.length).toBe(20);
            expect(ByteUtils.areEqual(addrTag!, testAddrTag)).toBe(true);
        });

        it('should have valid address hash', () => {
            const addrHash = wallet.getAddrHash();
            expect(addrHash).toBeDefined();
            expect(addrHash?.length).toBe(20);
        });
    });

    describe('signing operations', () => {
        it('should sign and verify message', () => {
            const message = new Uint8Array(32).fill(0x56);
            const signature = wallet.sign(message);
            
            expect(signature).toBeDefined();
            expect(signature.length).toBe(WOTS.WOTSSIGBYTES);
            
            const isValid = wallet.verify(message, signature);
            expect(isValid).toBe(true);
        });

        it('should fail verification with wrong message', () => {
            const message = new Uint8Array(32).fill(0x56);
            const wrongMessage = new Uint8Array(32).fill(0x78);
            const signature = wallet.sign(message);
            
            const isValid = wallet.verify(wrongMessage, signature);
            expect(isValid).toBe(false);
        });
    });

    describe('serialization', () => {
        it('should serialize to JSON', () => {
            const json = wallet.toJSON();
            expect(json.name).toBe(testName);
            expect(json.wots).toBeDefined();
            expect(json.addrTag).toBeDefined();
            expect(json.secret).toBeDefined();
        });

        it('should have hex string representations', () => {
            expect(wallet.getWotsHex()).toBeDefined();
            expect(wallet.getAddrTagHex()).toBeDefined();
        });
    });

    describe('cleanup', () => {
        it('should clear sensitive data', () => {
            wallet.clear();
            expect(wallet.getSecret()?.every(b => b === 0)).toBe(true);
            expect(wallet.getWots()?.every(b => b === 0)).toBe(true);
            expect(wallet.getWotsHex()).toBeNull();
            expect(wallet.getAddrTagHex()).toBeNull();

            expect(wallet.getAddrTag()?.every(b => b === 0)).toBe(true);
            expect(wallet.getWotsAdrs()?.every(b => b === 0)).toBe(true);
            expect(wallet.getWotsPk()?.every(b => b === 0)).toBe(true);
            expect(wallet.getWotsPubSeed()?.every(b => b === 0)).toBe(true);

            expect(wallet.getAddress()).toBeNull();
            expect(wallet.getAddrHash()).toBeNull();
   
            
        });
    });
}); 
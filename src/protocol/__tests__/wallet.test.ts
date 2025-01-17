import { WOTSWallet } from '../wallet';
import { ByteUtils, crc } from '@/utils';
import { WOTS } from '../wots';
import { base58ToAddrTag } from '@/utils/tag-utils';

describe('WOTSWallet', () => {
    const testName = 'Test Wallet';
    const testSecret = new Uint8Array(32).fill(0x12);
    const testAddrTag = Buffer.from('3f1fba7025c7d37470e7260117a72b7de9f5ca59', 'hex');
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
            expect(addr?.length).toBe(40);
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

    describe('wallet creation', () => {
        it('should create wallet with valid parameters', () => {
            const wallet = WOTSWallet.create(testName, testSecret, testAddrTag);
            expect(wallet).toBeDefined();
            expect(wallet.getName()).toBe(testName);
            expect(wallet.getWots()?.length).toBe(2208);
            expect(wallet.getAddrTag()?.length).toBe(20);
        });

        it('should create wallet with auto-generated tag', () => {
            const wallet = WOTSWallet.create(testName, testSecret);
            expect(wallet).toBeDefined();
            expect(wallet.getAddrTag()?.length).toBe(20);
        });

        it('should create deterministic addresses with same secret', () => {
            const wallet1 = WOTSWallet.create(testName, testSecret);
            const wallet2 = WOTSWallet.create(testName, testSecret);
            
            expect(ByteUtils.areEqual(wallet1.getWots()!, wallet2.getWots()!)).toBe(true);
            expect(ByteUtils.areEqual(wallet1.getAddrTag()!, wallet2.getAddrTag()!)).toBe(true);
            expect(ByteUtils.areEqual(wallet1.getAddress()!, wallet2.getAddress()!)).toBe(true);
        });

        it('should create different addresses with different secrets', () => {
            const differentSecret = new Uint8Array(32).fill(0x34);
            const wallet1 = WOTSWallet.create(testName, testSecret);
            const wallet2 = WOTSWallet.create(testName, differentSecret);
            
            expect(ByteUtils.areEqual(wallet1.getWots()!, wallet2.getWots()!)).toBe(false);
            expect(ByteUtils.areEqual(wallet1.getAddress()!, wallet2.getAddress()!)).toBe(false);
        });

        it('should throw on invalid secret length', () => {
            const invalidSecret = new Uint8Array(16).fill(0x12);
            expect(() => {
                WOTSWallet.create(testName, invalidSecret, testAddrTag);
            }).toThrow('Invalid secret length');
        });

        it('should throw on invalid tag length', () => {
            const invalidTag = new Uint8Array(12).fill(0x34);
            expect(() => {
                WOTSWallet.create(testName, testSecret, invalidTag);
            }).toThrow('Invalid tag');
        });
    });

    describe('address components', () => {
        it('should have correct WOTS+ component lengths', () => {
            const wallet = WOTSWallet.create(testName, testSecret, testAddrTag);
            
            // Check all components
            expect(wallet.getWotsPk()?.length).toBe(2144); // WOTSSIGBYTES
            expect(wallet.getWotsPubSeed()?.length).toBe(32);
            expect(wallet.getWotsAdrs()?.length).toBe(32);
            expect(wallet.getWotsTag()?.length).toBe(12);
            expect(wallet.getAddress()?.length).toBe(40);
            expect(wallet.getAddrHash()?.length).toBe(20);
        });

        it('should generate consistent address components', () => {
            const wallet = WOTSWallet.create(testName, testSecret, testAddrTag);
            
            // Get components multiple times to check consistency
            const pk1 = wallet.getWotsPk();
            const pk2 = wallet.getWotsPk();
            expect(ByteUtils.areEqual(pk1!, pk2!)).toBe(true);

            const addr1 = wallet.getAddress();
            const addr2 = wallet.getAddress();
            expect(ByteUtils.areEqual(addr1!, addr2!)).toBe(true);
        });

    });

    describe('random generator support', () => {
        it('should create wallet with custom random generator', () => {
            const randomGen = (bytes: Uint8Array) => {
                bytes.fill(0x42);
            };
            
            const wallet = WOTSWallet.create(testName, testSecret, testAddrTag, randomGen);
            expect(wallet).toBeDefined();
            expect(wallet.getWots()?.length).toBe(2208);
        });

        it('should create different addresses with same secret but different random values', () => {
            const randomGen1 = (bytes: Uint8Array) => bytes.fill(0x42);
            const randomGen2 = (bytes: Uint8Array) => bytes.fill(0x24);
            
            const wallet1 = WOTSWallet.create(testName, testSecret, testAddrTag, randomGen1);
            const wallet2 = WOTSWallet.create(testName, testSecret, testAddrTag, randomGen2);
            
            expect(ByteUtils.areEqual(wallet1.getWots()!, wallet2.getWots()!)).toBe(false);
        });
    });

    describe('address tag base58', () => {
        it('should generate valid base58 tag with checksum', () => {
            const wallet = WOTSWallet.create(testName, testSecret, new Uint8Array(testAddrTag));
            const b58Tag = wallet.getAddrTagBase58();
            expect(wallet.getAddrTagHex()).toBe(Buffer.from(testAddrTag).toString('hex'));
            console.log(Buffer.from(wallet.getAddrTag()!).toString('hex'));
            expect(b58Tag).toBeDefined();
            expect(ByteUtils.areEqual(
                wallet.getAddrTag()!,
                testAddrTag
            )).toBe(true);

            expect(b58Tag!).toBe("J8gqYehTJhJWrfcUd766sUQ8THktNs"); // 20 bytes tag + 2 bytes CRC
            
            // Check that first 20 bytes match the original tag
            expect(ByteUtils.areEqual(
                base58ToAddrTag(b58Tag!)!,
                testAddrTag
            )).toBe(true);
                
            // Verify CRC
            const actualCrc = crc(base58ToAddrTag(b58Tag!)!, 0, 20);
            const expectedCrc = crc(testAddrTag, 0, 20);
            expect(actualCrc).toBe(expectedCrc);
        });

        it('should return null for missing tag', () => {
            const wallet = WOTSWallet.create(testName, testSecret);
            wallet.clear(); // Clear the auto-generated tag
            //when bytes are cleared, it fills tag uint8array with 0
            expect(wallet.getAddrTagBase58()).toBe("1111111111111111111111");
        });

        it('should throw for invalid tag length', () => {
            const wallet = WOTSWallet.create(testName, testSecret);
            // Force invalid tag length
            (wallet as any).addrTag = new Uint8Array(10);
            
            expect(() => {
                wallet.getAddrTagBase58();
            }).toThrow('Invalid address tag length');
        });

        it('should generate consistent base58 for same tag', () => {
            const wallet1 = WOTSWallet.create(testName, testSecret, testAddrTag);
            const wallet2 = WOTSWallet.create(testName, testSecret, testAddrTag);
            
            const base58Tag1 = wallet1.getAddrTagBase58();
            const base58Tag2 = wallet2.getAddrTagBase58();
            
            expect(base58Tag1).toBe(base58Tag2);
        });
    });

}); 
import { WotsAddress, } from '../wots-addr';
import { ByteUtils } from '@/utils';



describe('WotsAddress', () => {
    describe('basic operations', () => {
        let wotsAddr: WotsAddress;

        beforeEach(() => {
            wotsAddr = new WotsAddress();
        });

        it('should initialize with zero amount', () => {
            expect(wotsAddr.getAmount()).toBe(BigInt(0));
            expect(wotsAddr.bytes().length).toBe(48); // TXADDRLEN + TXAMOUNT
        });

        it('should handle tag operations correctly', () => {
            const tag = new Uint8Array(20).fill(0x12);
            wotsAddr.setTag(tag);

            const retrievedTag = wotsAddr.getTag();
            expect(retrievedTag.length).toBe(20);
            expect(ByteUtils.areEqual(retrievedTag, tag)).toBe(true);
        });

        it('should handle address operations correctly', () => {
            const address = new Uint8Array(20).fill(0x34);
            wotsAddr.setAddress(address);

            const retrievedAddr = wotsAddr.getAddress();
            // Should only get the non-tag portion
            expect(retrievedAddr.length).toBe(20); // TXADDRLEN - ADDR_TAG_LEN = 20
        });

        it('should handle amount operations correctly', () => {
            const testAmount = BigInt("123456789");
            const amountBytes = new Uint8Array(8);
            new DataView(amountBytes.buffer).setBigUint64(0, testAmount, true);

            wotsAddr.setAmountBytes(amountBytes);
            expect(wotsAddr.getAmount()).toBe(testAmount);

            const retrievedAmountBytes = wotsAddr.getAmountBytes();
            expect(ByteUtils.areEqual(retrievedAmountBytes, amountBytes)).toBe(true);
        });

        it('should serialize to bytes correctly', () => {
            const tag = new Uint8Array(20).fill(0x12);
            const amount = BigInt("123456789");
            const amountBytes = new Uint8Array(8);
            new DataView(amountBytes.buffer).setBigUint64(0, amount, true);

            wotsAddr.setTag(tag);
            wotsAddr.setAmountBytes(amountBytes);

            const bytes = wotsAddr.bytes();
            expect(bytes.length).toBe(48); // TXADDRLEN + TXAMOUNT
            expect(ByteUtils.areEqual(bytes.slice(0, 20), tag)).toBe(true);
            expect(ByteUtils.areEqual(bytes.slice(40, 48), amountBytes)).toBe(true);
        });
    });

    describe('wotsAddressFromBytes', () => {
        it('should create from WOTS public key', () => {
            const wotsPK = new Uint8Array(2144).fill(0x56);
            const result = WotsAddress.wotsAddressFromBytes(wotsPK);
            expect(result).toBeInstanceOf(WotsAddress);
            expect(result.bytes().length).toBe(48);
        });

        it('should create from address bytes', () => {
            const addrBytes = new Uint8Array(20).fill(0x78);
            const result = WotsAddress.wotsAddressFromBytes(addrBytes);
            expect(result).toBeInstanceOf(WotsAddress);
            expect(result.bytes().length).toBe(48);
        });

        it('should create from address with amount', () => {
            const addr = new Uint8Array(20).fill(0x78);
            const amount = BigInt("123456789");
            const amountBytes = new Uint8Array(8);
            new DataView(amountBytes.buffer).setBigUint64(0, amount, true);

            const fullBytes = new Uint8Array(48);
            fullBytes.set(addr, 0);
            fullBytes.set(amountBytes, 40);

            const result = WotsAddress.wotsAddressFromBytes(fullBytes);

            // Add detailed checks
            expect(result).toBeInstanceOf(WotsAddress);
            expect(result.getAmount()).toBe(amount);

            const resultBytes = result.bytes();


            // Check address part
            expect(ByteUtils.areEqual(
                resultBytes.slice(0, 20),
                fullBytes.slice(0, 20)
            )).toBe(true);

            // Check amount part
            expect(ByteUtils.areEqual(
                resultBytes.slice(20),
                fullBytes.slice(20)
            )).toBe(true);

            // Finally check full bytes
            expect(ByteUtils.areEqual(resultBytes, fullBytes)).toBe(true);
        });
    });

    describe('address generation', () => {
        it('should generate implicit address correctly', () => {
            const tag = new Uint8Array(20).fill(0x12);
            const addr = WotsAddress.addrFromImplicit(tag);

            expect(addr.length).toBe(40);
            expect(ByteUtils.areEqual(addr.slice(0, 20), tag)).toBe(true);
        });

        it('should generate hash correctly', () => {
            const input = new Uint8Array(32).fill(0x34);
            const hash = WotsAddress.addrHashGenerate(input);

            expect(hash.length).toBe(20); // RIPEMD160 output

            // Test deterministic output
            const hash2 = WotsAddress.addrHashGenerate(input);
            expect(ByteUtils.areEqual(hash, hash2)).toBe(true);
        });

        it('should handle WOTS address conversion', () => {
            const wotsPK = new Uint8Array(2144).fill(0x56);
            const addr = WotsAddress.addrFromWots(wotsPK);

            expect(addr).not.toBeNull();
            expect(addr!.length).toBe(40);

            // Test invalid input
            const invalidWots = new Uint8Array(100);
            expect(WotsAddress.addrFromWots(invalidWots)).toBeNull();
        });
    });

    describe('hex conversion', () => {
        it('should create from valid hex string', () => {
            const validHex = '1234567890'.repeat(4); // 20 bytes
            const result = WotsAddress.wotsAddressFromHex(validHex);
            expect(result).toBeInstanceOf(WotsAddress);
            expect(result.bytes().length).toBe(48);
        });

        it('should handle invalid hex string', () => {
            const invalidHex = '1234'; // Too short
            const result = WotsAddress.wotsAddressFromHex(invalidHex);
            expect(result).toBeInstanceOf(WotsAddress);
            expect(result.getAmount()).toBe(BigInt(0));
        });
    });


    describe('addrFromWots', () => {
        it('should generate address correctly', () => {
            const wotsPK = new Uint8Array(2144).fill(0x42);
            // Compare final addresses
            const addr1 = WotsAddress.addrFromWots(wotsPK)!;
            const finalAddr = Buffer.from(addr1).toString('hex');   
            console.log('Final addr1:', finalAddr);
            expect(finalAddr).toEqual("7fe0655e22061d36f253085bfe4e3ffe8079176d7fe0655e22061d36f253085bfe4e3ffe8079176d");
        });
    });
}); 

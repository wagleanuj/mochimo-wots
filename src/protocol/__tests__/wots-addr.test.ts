import { WotsAddress, wotsAddressFromBytes, wotsAddressFromHex, addrFromImplicit, addrHashGenerate, addrFromWots } from '../wots-addr';
import { ByteUtils } from '@/utils';

describe('WotsAddress', () => {
    describe('basic operations', () => {
        let wotsAddr: WotsAddress;

        beforeEach(() => {
            wotsAddr = new WotsAddress();
        });

        it('should initialize with zero amount', () => {
            expect(wotsAddr.getAmount()).toBe(BigInt(0));
            expect(wotsAddr.bytes().length).toBe(28); // TXADDRLEN + TXAMOUNT
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
            expect(retrievedAddr.length).toBe(0); // TXADDRLEN - ADDR_TAG_LEN = 0
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
            expect(bytes.length).toBe(28); // TXADDRLEN + TXAMOUNT
            expect(ByteUtils.areEqual(bytes.slice(0, 20), tag)).toBe(true);
            expect(ByteUtils.areEqual(bytes.slice(20), amountBytes)).toBe(true);
        });
    });

    describe('wotsAddressFromBytes', () => {
        it('should create from WOTS public key', () => {
            const wotsPK = new Uint8Array(2048).fill(0x56);
            const result = wotsAddressFromBytes(wotsPK);
            expect(result).toBeInstanceOf(WotsAddress);
            expect(result.bytes().length).toBe(28);
        });

        it('should create from address bytes', () => {
            const addrBytes = new Uint8Array(20).fill(0x78);
            const result = wotsAddressFromBytes(addrBytes);
            expect(result).toBeInstanceOf(WotsAddress);
            expect(result.bytes().length).toBe(28);
        });

        it('should create from address with amount', () => {
            const addr = new Uint8Array(20).fill(0x78);
            const amount = BigInt("123456789");
            const amountBytes = new Uint8Array(8);
            new DataView(amountBytes.buffer).setBigUint64(0, amount, true);
            
            const fullBytes = new Uint8Array(28);
            fullBytes.set(addr, 0);
            fullBytes.set(amountBytes, 20);

            const result = wotsAddressFromBytes(fullBytes);
            
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
            const addr = addrFromImplicit(tag);
            
            expect(addr.length).toBe(20);
            expect(ByteUtils.areEqual(addr.slice(0, 20), tag)).toBe(true);
        });

        it('should generate hash correctly', () => {
            const input = new Uint8Array(32).fill(0x34);
            const hash = addrHashGenerate(input);
            
            expect(hash.length).toBe(20); // RIPEMD160 output
            
            // Test deterministic output
            const hash2 = addrHashGenerate(input);
            expect(ByteUtils.areEqual(hash, hash2)).toBe(true);
        });

        it('should handle WOTS address conversion', () => {
            const wotsPK = new Uint8Array(2048).fill(0x56);
            const addr = addrFromWots(wotsPK);
            
            expect(addr).not.toBeNull();
            expect(addr!.length).toBe(20);
            
            // Test invalid input
            const invalidWots = new Uint8Array(100);
            expect(addrFromWots(invalidWots)).toBeNull();
        });
    });

    describe('hex conversion', () => {
        it('should create from valid hex string', () => {
            const validHex = '1234567890'.repeat(4); // 20 bytes
            const result = wotsAddressFromHex(validHex);
            expect(result).toBeInstanceOf(WotsAddress);
            expect(result.bytes().length).toBe(28);
        });

        it('should handle invalid hex string', () => {
            const invalidHex = '1234'; // Too short
            const result = wotsAddressFromHex(invalidHex);
            expect(result).toBeInstanceOf(WotsAddress);
            expect(result.getAmount()).toBe(BigInt(0));
        });
    });
}); 
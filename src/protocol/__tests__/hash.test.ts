import { ByteBuffer } from '@/types/byte-buffer';
import { WOTSHash } from '../hash';

describe('WOTSHash', () => {
    describe('constants', () => {
        it('should have correct padding values', () => {
            expect(WOTSHash.XMSS_HASH_PADDING_F).toBe(0);
            expect(WOTSHash.XMSS_HASH_PADDING_PRF).toBe(3);
        });
    });

    describe('address manipulation', () => {
        let addr: ByteBuffer;

        beforeEach(() => {
            addr = ByteBuffer.allocate(32);
        });

        it('should set chain address correctly', () => {
            WOTSHash.setChainAddr(addr, 0x12345678);
            addr.position(20);
            expect(addr.get_()).toBe(0x12);
            expect(addr.get_()).toBe(0x34);
            expect(addr.get_()).toBe(0x56);
            expect(addr.get_()).toBe(0x78);
        });

        it('should set hash address correctly', () => {
            WOTSHash.setHashAddr(addr, 0x12345678);
            addr.position(24);
            expect(addr.get_()).toBe(0x12);
            expect(addr.get_()).toBe(0x34);
            expect(addr.get_()).toBe(0x56);
            expect(addr.get_()).toBe(0x78);
        });

        it('should set key and mask correctly', () => {
            WOTSHash.setKeyAndMask(addr, 0x12345678);
            addr.position(28);
            expect(addr.get_()).toBe(0x12);
            expect(addr.get_()).toBe(0x34);
            expect(addr.get_()).toBe(0x56);
            expect(addr.get_()).toBe(0x78);
        });
    });

    describe('addrToBytes', () => {
        it('should convert address to little-endian bytes', () => {
            const addr = ByteBuffer.allocate(32);
            addr.putInt(0x12345678);
            addr.position(0);

            const bytes = WOTSHash.addrToBytes(addr);
            
            expect(bytes[0]).toBe(0x78);
            expect(bytes[1]).toBe(0x56);
            expect(bytes[2]).toBe(0x34);
            expect(bytes[3]).toBe(0x12);
        });
    });

    describe('prf', () => {
        it('should generate deterministic output', () => {
            const out1 = new Uint8Array(32);
            const out2 = new Uint8Array(32);
            const input = new Uint8Array(32).fill(0x12);
            const key = new Uint8Array(32).fill(0x34);

            WOTSHash.prf(out1, 0, input, key);
            WOTSHash.prf(out2, 0, input, key);

            expect(out1).toEqual(out2);
            expect(out1.some(b => b !== 0)).toBe(true); // Should not be all zeros
        });

        it('should respect output offset', () => {
            const out = new Uint8Array(64).fill(0xFF);
            const input = new Uint8Array(32).fill(0x12);
            const key = new Uint8Array(32).fill(0x34);

            WOTSHash.prf(out, 16, input, key);

            // First 16 bytes should be unchanged
            for (let i = 0; i < 16; i++) {
                expect(out[i]).toBe(0xFF);
            }
            // Next 32 bytes should be hash output
            expect(out.slice(16, 48).some(b => b !== 0xFF)).toBe(true);
            // Last 16 bytes should be unchanged
            for (let i = 48; i < 64; i++) {
                expect(out[i]).toBe(0xFF);
            }
        });
    });

    describe('thashF', () => {
        it('should generate deterministic output', () => {
            const out1 = new Uint8Array(32);
            const out2 = new Uint8Array(32);
            const input = new Uint8Array(32).fill(0x12);
            const pubSeed = new Uint8Array(32).fill(0x34);
            const addr = ByteBuffer.allocate(32);

            WOTSHash.thashF(out1, 0, input, 0, pubSeed, addr);
            WOTSHash.thashF(out2, 0, input, 0, pubSeed, addr);

            expect(out1).toEqual(out2);
            expect(out1.some(b => b !== 0)).toBe(true); // Should not be all zeros
        });

        it('should produce different outputs for different addresses', () => {
            const out1 = new Uint8Array(32);
            const out2 = new Uint8Array(32);
            const input = new Uint8Array(32).fill(0x12);
            const pubSeed = new Uint8Array(32).fill(0x34);
            const addr1 = ByteBuffer.allocate(32);
            const addr2 = ByteBuffer.allocate(32);
            addr2.putInt(1); // Make addr2 different from addr1

            WOTSHash.thashF(out1, 0, input, 0, pubSeed, addr1);
            WOTSHash.thashF(out2, 0, input, 0, pubSeed, addr2);

            expect(out1).not.toEqual(out2);
        });

        it('should respect input and output offsets', () => {
            const out = new Uint8Array(64).fill(0xFF);
            const input = new Uint8Array(64).fill(0x12);
            const pubSeed = new Uint8Array(32).fill(0x34);
            const addr = ByteBuffer.allocate(32);

            WOTSHash.thashF(out, 16, input, 8, pubSeed, addr);

            // First 16 bytes should be unchanged
            for (let i = 0; i < 16; i++) {
                expect(out[i]).toBe(0xFF);
            }
            // Next 32 bytes should be hash output
            expect(out.slice(16, 48).some(b => b !== 0xFF)).toBe(true);
            // Last 16 bytes should be unchanged
            for (let i = 48; i < 64; i++) {
                expect(out[i]).toBe(0xFF);
            }
        });
    });
}); 
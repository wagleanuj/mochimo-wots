import { MochimoHasher } from '@/hasher/mochimo-hasher';
import { WOTS, Tag } from '@/protocol';
import { ByteUtils } from '@/utils';
const Utils = ByteUtils;

describe('WOTS Protocol', () => {
    describe('constants', () => {
        it('should have correct WOTS parameters', () => {
            expect(WOTS.WOTSW).toBe(16);
            expect(WOTS.WOTSLOGW).toBe(4);
            expect(WOTS.PARAMSN).toBe(32);
            expect(WOTS.WOTSLEN1).toBe(64);
            expect(WOTS.WOTSLEN2).toBe(3);
            expect(WOTS.WOTSLEN).toBe(67);
            expect(WOTS.WOTSSIGBYTES).toBe(2144);
            expect(WOTS.TXSIGLEN).toBe(2144);
        });
    });

    describe('address generation and validation', () => {
        const mockRandomBytes = (bytes: Uint8Array) => {
            bytes.fill(0x42); // Deterministic "random" bytes
        };

        it('should generate valid address', () => {
            const secret = new Uint8Array(32).fill(0x12);
            const address = WOTS.generateRandomAddress(null, secret);

            expect(address.length).toBe(2208);
            expect(WOTS.isValid(secret, address, mockRandomBytes)).toBe(true);
        });

        it('should generate valid tagged address', () => {
            const secret = new Uint8Array(32).fill(0x12);
            const tag = new Uint8Array(12).fill(0x34);
            const address = WOTS.generateRandomAddress(tag, secret);

            expect(address.length).toBe(2208);
            expect(WOTS.isValid(secret, address, mockRandomBytes)).toBe(true);
        });

        it('should throw on invalid secret length', () => {
            const secret = new Uint8Array(31); // Wrong length
            expect(() => WOTS.generateRandomAddress(null, secret))
                .toThrow('Invalid secret length');
        });

        it('should throw on invalid tag length', () => {
            const secret = new Uint8Array(32);
            const tag = new Uint8Array(11); // Wrong length
            expect(() => WOTS.generateRandomAddress(tag, secret))
                .toThrow('Invalid tag');
        });
    });

    describe('address splitting', () => {
        it('should split address correctly', () => {
            const address = new Uint8Array(2208);
            // Fill with recognizable patterns
            address.fill(0x11, 0, 2144);     // pk
            address.fill(0x22, 2144, 2176);  // pubSeed
            address.fill(0x33, 2176, 2208);  // rnd2

            const pk = new Uint8Array(2144);
            const pubSeed = new Uint8Array(32);
            const rnd2 = new Uint8Array(32);
            const tag = new Uint8Array(12);

            WOTS.splitAddress(address, pk, pubSeed, rnd2, tag);

            // Verify components
            expect(pk.every(b => b === 0x11)).toBe(true);
            expect(pubSeed.every(b => b === 0x22)).toBe(true);
            expect(rnd2.every(b => b === 0x33)).toBe(true);
            expect(tag.every(b => b === 0x33)).toBe(true);
        });

        it('should handle null tag', () => {
            const address = new Uint8Array(2208);
            const pk = new Uint8Array(2144);
            const pubSeed = new Uint8Array(32);
            const rnd2 = new Uint8Array(32);

            expect(() => WOTS.splitAddress(address, pk, pubSeed, rnd2, null))
                .not.toThrow();
        });

        it('should throw on invalid component lengths', () => {
            const address = new Uint8Array(2208);
            const pk = new Uint8Array(2143);      // Wrong length
            const pubSeed = new Uint8Array(32);
            const rnd2 = new Uint8Array(32);

            expect(() => WOTS.splitAddress(address, pk, pubSeed, rnd2, null))
                .toThrow('Invalid pk length');
        });
    });

    describe('signing and verification', () => {
        it('should verify valid signature', () => {
            const secret = new Uint8Array(32).fill(0x12);
            const msg = new Uint8Array(32).fill(0x34);
            const pubSeed = new Uint8Array(32).fill(0x56);
            const addr = new Uint8Array(32).fill(0x78);

            // Generate signature
            const sig = new Uint8Array(WOTS.WOTSSIGBYTES);
            WOTS.wots_sign(sig, msg, secret, pubSeed, 0, addr);

            // Generate public key
            const pk = new Uint8Array(WOTS.WOTSSIGBYTES);
            WOTS.wots_pkgen(pk, secret, pubSeed, 0, addr);

            // Verify signature
            const computedPk = WOTS.wots_pk_from_sig(sig, msg, pubSeed, addr);
            expect(computedPk).toEqual(pk);
        });

        it('should fail on modified message', () => {
            const secret = new Uint8Array(32).fill(0x12);
            const msg = new Uint8Array(32).fill(0x34);
            const pubSeed = new Uint8Array(32).fill(0x56);
            const addr = new Uint8Array(32).fill(0x78);

            // Generate signature
            const sig = new Uint8Array(WOTS.WOTSSIGBYTES);
            WOTS.wots_sign(sig, msg, secret, pubSeed, 0, addr);

            // Generate public key
            const pk = new Uint8Array(WOTS.WOTSSIGBYTES);
            WOTS.wots_pkgen(pk, secret, pubSeed, 0, addr);

            // Modify message
            msg[0] ^= 1;

            // Verify should produce different public key
            const computedPk = WOTS.wots_pk_from_sig(sig, msg, pubSeed, addr);
            expect(computedPk).not.toEqual(pk);
        });
    });

    describe('chain operations', () => {
        it('should generate correct chain length', () => {
            const msg = new Uint8Array(32).fill(0x12);
            const lengths = new Array<number>(WOTS.WOTSLEN);

            // @ts-ignore - accessing private method for testing
            WOTS.chain_lengths(msg, lengths);

            // Verify lengths array is filled
            expect(lengths.length).toBe(WOTS.WOTSLEN);
            // First WOTSLEN1 elements should be base-16 values
            for (let i = 0; i < WOTS.WOTSLEN1; i++) {
                expect(lengths[i]).toBeLessThan(16);
                expect(lengths[i]).toBeGreaterThanOrEqual(0);
            }
            // Last WOTSLEN2 elements should be checksum values
            for (let i = WOTS.WOTSLEN1; i < WOTS.WOTSLEN; i++) {
                expect(lengths[i]).toBeLessThan(16);
                expect(lengths[i]).toBeGreaterThanOrEqual(0);
            }
        });

        it('should handle zero message', () => {
            const msg = new Uint8Array(32);
            const lengths = new Array<number>(WOTS.WOTSLEN);

            // @ts-ignore
            WOTS.chain_lengths(msg, lengths);

            // All base-16 values should be 0
            for (let i = 0; i < WOTS.WOTSLEN1; i++) {
                expect(lengths[i]).toBe(0);
            }
        });
    });

    describe('base-w operations', () => {
        it('should convert bytes to base-w representation', () => {
            const msg = new Uint8Array([0x12, 0x34]);
            const destination = new Array<number>(4);

            // @ts-ignore
            WOTS.base_w_(msg, destination, 0, 4);

            // 0x12 -> [1, 2], 0x34 -> [3, 4]
            expect(destination).toEqual([1, 2, 3, 4]);
        });

        it('should handle offset correctly', () => {
            const msg = new Uint8Array([0x12, 0x34]);
            const destination = new Array<number>(6);
            destination.fill(-1);

            // @ts-ignore
            WOTS.base_w_(msg, destination, 2, 4);

            expect(destination).toEqual([-1, -1, 1, 2, 3, 4]);
        });
    });

    describe('checksum operations', () => {
        it('should compute correct checksum', () => {
            const msgBaseW = new Array<number>(WOTS.WOTSLEN);
            msgBaseW.fill(0);
            msgBaseW[0] = 5; // Single non-zero value

            // @ts-ignore
            WOTS.wotsChecksum(msgBaseW, WOTS.WOTSLEN1);

            // Verify checksum values
            const checksumPart = msgBaseW.slice(WOTS.WOTSLEN1);
            expect(checksumPart.length).toBe(WOTS.WOTSLEN2);
            expect(checksumPart.some(v => v !== 0)).toBe(true);
        });

        it('should handle all max values', () => {
            const msgBaseW = new Array<number>(WOTS.WOTSLEN);
            for (let i = 0; i < WOTS.WOTSLEN1; i++) {
                msgBaseW[i] = 15;
            }

            // @ts-ignore
            WOTS.wotsChecksum(msgBaseW, WOTS.WOTSLEN1);

            // Checksum should be 0 for all max values
            const checksumPart = msgBaseW.slice(WOTS.WOTSLEN1);
            expect(checksumPart.every(v => v === 0)).toBe(true);
        });
    });

    describe('seed expansion', () => {
        it('should expand seed to correct length', () => {
            const seed = new Uint8Array(32).fill(0x12);
            const expanded = new Uint8Array(WOTS.WOTSSIGBYTES);

            // @ts-ignore
            WOTS.expand_seed(expanded, seed);

            // Verify expanded length
            expect(expanded.length).toBe(WOTS.WOTSSIGBYTES);
            // Should not be all zeros
            expect(expanded.some(b => b !== 0)).toBe(true);
        });

        it('should be deterministic', () => {
            const seed = new Uint8Array(32).fill(0x12);
            const expanded1 = new Uint8Array(WOTS.WOTSSIGBYTES);
            const expanded2 = new Uint8Array(WOTS.WOTSSIGBYTES);

            // @ts-ignore
            WOTS.expand_seed(expanded1, seed);
            // @ts-ignore
            WOTS.expand_seed(expanded2, seed);

            expect(expanded1).toEqual(expanded2);
        });
    });

    describe('end-to-end operations', () => {
        it('should verify signature with multiple updates', () => {
            const secret = new Uint8Array(32).fill(0x12);
            const msg = new Uint8Array(32).fill(0x34);
            const pubSeed = new Uint8Array(32).fill(0x56);
            const addr = new Uint8Array(32).fill(0x78);

            // Generate public key first
            const pk = new Uint8Array(WOTS.WOTSSIGBYTES);
            WOTS.wots_pkgen(pk, secret, pubSeed, 0, addr);

            // Generate and verify first signature
            const sig1 = new Uint8Array(WOTS.WOTSSIGBYTES);
            WOTS.wots_sign(sig1, msg, secret, pubSeed, 0, addr);
            const pk1 = WOTS.wots_pk_from_sig(sig1, msg, pubSeed, addr);

            // Modify message and generate second signature
            msg[0] ^= 1;
            const sig2 = new Uint8Array(WOTS.WOTSSIGBYTES);
            WOTS.wots_sign(sig2, msg, secret, pubSeed, 0, addr);
            const pk2 = WOTS.wots_pk_from_sig(sig2, msg, pubSeed, addr);

            // Verify:
            // 1. Signatures should be different (different messages)
            expect(sig1).not.toEqual(sig2);
            // 2. Both public keys should match original
            expect(pk1).toEqual(pk);
            expect(pk2).toEqual(pk);
        });
    });

    describe('address generation with specific seeds', () => {
        const sourceSecret = Utils.hexToBytes('c54572cb24e810fc2285aa4f310ce07ad3158a34e7fe8fc632871309351898f3');
        const sourceTag = Utils.hexToBytes('0e5989d23edfb582db3e730b');
        const changeSeed = Utils.hexToBytes('b3b8c474d47198ba3237a16397ca267a6b2324eee3d8541ff074b74fc0d2111c');
        const destSeed = Utils.hexToBytes('854ac92e19ae846c1a029a8b03c1dc1755729e27736312f957a47ceace269794');
        const destTag = Utils.hexToBytes('985dfa821c48b8b1ff6802ca');

        it('should generate deterministic addresses from seeds', () => {
            // Generate source address
            const sourcePK = new Uint8Array(2144);
            const sourcePubSeed = MochimoHasher.hash(sourceSecret);
            const sourceRnd2 = MochimoHasher.hash(sourcePubSeed);
            WOTS.wots_pkgen(sourcePK, sourceSecret, sourcePubSeed, 0, sourceRnd2);

            const sourceAddress = new Uint8Array(2208);
            sourceAddress.set(sourcePK, 0);
            sourceAddress.set(sourcePubSeed, 2144);
            sourceAddress.set(sourceRnd2, 2176);

            // Generate again and compare
            const sourcePK2 = new Uint8Array(2144);
            WOTS.wots_pkgen(sourcePK2, sourceSecret, sourcePubSeed, 0, sourceRnd2);
            expect(Utils.compareBytes(sourcePK, sourcePK2)).toBe(true);

            // Verify address components
            expect(sourceAddress.length).toBe(2208);
            expect(sourcePK.length).toBe(2144);
            expect(sourcePubSeed.length).toBe(32);
            expect(sourceRnd2.length).toBe(32);
        });

        it('should generate valid tagged addresses', () => {
            // Generate source address
            const sourcePK = new Uint8Array(2144);
            const sourcePubSeed = MochimoHasher.hash(sourceSecret);
            const sourceRnd2 = MochimoHasher.hash(sourcePubSeed);
            WOTS.wots_pkgen(sourcePK, sourceSecret, sourcePubSeed, 0, sourceRnd2);

            const sourceAddress = new Uint8Array(2208);
            sourceAddress.set(sourcePK, 0);
            sourceAddress.set(sourcePubSeed, 2144);
            sourceAddress.set(sourceRnd2, 2176);

            // Tag the address
            const taggedSourceAddr = Tag.tag(sourceAddress, sourceTag);
            expect(taggedSourceAddr.length).toBe(2208);
            expect(Utils.compareBytes(Tag.getTag(taggedSourceAddr), sourceTag)).toBe(true);

            // Verify WOTS validity is maintained after tagging
            expect(WOTS.isValid(sourceSecret, taggedSourceAddr)).toBe(true);
        });

        it('should sign and verify with tagged addresses', () => {
            // Generate source address
            const sourcePK = new Uint8Array(2144);
            const sourcePubSeed = MochimoHasher.hash(sourceSecret);
            const sourceRnd2 = MochimoHasher.hash(sourcePubSeed);
            WOTS.wots_pkgen(sourcePK, sourceSecret, sourcePubSeed, 0, sourceRnd2);

            const sourceAddress = new Uint8Array(2208);
            sourceAddress.set(sourcePK, 0);
            sourceAddress.set(sourcePubSeed, 2144);
            sourceAddress.set(sourceRnd2, 2176);

            // Tag the address
            const taggedSourceAddr = Tag.tag(sourceAddress, sourceTag);

            // Create a message and sign it
            const message = new Uint8Array(32).fill(0x42);
            const signature = new Uint8Array(WOTS.WOTSSIGBYTES);
            WOTS.wots_sign(signature, message, sourceSecret, sourcePubSeed, 0, sourceRnd2);

            // Verify the signature
            const computedPK = WOTS.wots_pk_from_sig(signature, message, sourcePubSeed, sourceRnd2);
            expect(Utils.compareBytes(computedPK, sourcePK)).toBe(true);

            // Verify the whole tagged address is still valid
            expect(WOTS.isValid(sourceSecret, taggedSourceAddr)).toBe(true);
        });

        it('should maintain tag through signing operations', () => {
            // Generate and tag source address
            const sourcePK = new Uint8Array(2144);
            const sourcePubSeed = MochimoHasher.hash(sourceSecret);
            const sourceRnd2 = MochimoHasher.hash(sourcePubSeed);
            WOTS.wots_pkgen(sourcePK, sourceSecret, sourcePubSeed, 0, sourceRnd2);

            const sourceAddress = new Uint8Array(2208);
            sourceAddress.set(sourcePK, 0);
            sourceAddress.set(sourcePubSeed, 2144);
            sourceAddress.set(sourceRnd2, 2176);

            const taggedSourceAddr = Tag.tag(sourceAddress, sourceTag);

            // Sign multiple messages and verify tag remains
            for (let i = 0; i < 5; i++) {
                const message = new Uint8Array(32).fill(i);
                const signature = new Uint8Array(WOTS.WOTSSIGBYTES);
                WOTS.wots_sign(signature, message, sourceSecret, sourcePubSeed, 0, sourceRnd2);

                // Verify tag remains unchanged
                expect(Utils.compareBytes(Tag.getTag(taggedSourceAddr), sourceTag)).toBe(true);

                // Verify signature is still valid
                const computedPK = WOTS.wots_pk_from_sig(signature, message, sourcePubSeed, sourceRnd2);
                expect(Utils.compareBytes(computedPK, sourcePK)).toBe(true);
            }
        });
    });
}); 
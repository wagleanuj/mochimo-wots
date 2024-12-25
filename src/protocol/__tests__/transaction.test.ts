import { ByteUtils as Utils } from '@/utils';
import { Transaction } from '../transaction';
import { TX_CONSTANTS } from '@/protocol/transaction';

describe('Transaction', () => {
    describe('basic transaction handling', () => {
        const sourceAddr = new Uint8Array(2208).fill(0x11);
        const destAddr = new Uint8Array(2208).fill(0x22);
        const changeAddr = new Uint8Array(2208).fill(0x33);
        const signature = new Uint8Array(2144).fill(0x44);
        const id = new Uint8Array(32).fill(0x55);

        it('should create transaction with valid parameters', () => {
            const tx = new Transaction(
                sourceAddr,
                destAddr,
                changeAddr,
                1000n,
                500n,
                10n,
                signature,
                id
            );

            expect(tx.totalSend).toBe(1000n);
            expect(tx.totalChange).toBe(500n);
            expect(tx.fee).toBe(10n);
            expect(Utils.compareBytes(tx.sourceAddress, sourceAddr)).toBe(true);
            expect(Utils.compareBytes(tx.destinationAddress, destAddr)).toBe(true);
            expect(Utils.compareBytes(tx.changeAddress, changeAddr)).toBe(true);
            expect(Utils.compareBytes(tx.signature, signature)).toBe(true);
            expect(Utils.compareBytes(tx.id, id)).toBe(true);
            expect(tx.sourceAddressHex).toBe(Utils.bytesToHex(sourceAddr));
            expect(tx.destinationAddressHex).toBe(Utils.bytesToHex(destAddr));
            expect(tx.changeAddressHex).toBe(Utils.bytesToHex(changeAddr));
            expect(tx.signatureHex).toBe(Utils.bytesToHex(signature));
            expect(tx.idHex).toBe(Utils.bytesToHex(id));
        });

        it('should validate input lengths', () => {
            expect(() => new Transaction(
                new Uint8Array(10), // Invalid source length
                destAddr,
                changeAddr,
                1000n,
                500n,
                10n,
                signature,
                id
            )).toThrow('Invalid source address length');

            expect(() => new Transaction(
                sourceAddr,
                destAddr,
                changeAddr,
                1000n,
                500n,
                10n,
                new Uint8Array(10), // Invalid signature length
                id
            )).toThrow('Invalid signature length');

            expect(() => new Transaction(
                sourceAddr,
                destAddr,
                changeAddr,
                1000n,
                500n,
                10n,
                signature,
                new Uint8Array(10) // Invalid id length
            )).toThrow('Invalid id length');
        });

        it('should serialize and deserialize correctly', () => {
            const tx = new Transaction(
                sourceAddr,
                destAddr,
                changeAddr,
                1000n,
                500n,
                10n,
                signature,
                id
            );

            const serialized = tx.serialize();
            expect(serialized.length).toBe(TX_CONSTANTS.LENGTH);

            const deserialized = Transaction.of(serialized);
            expect(deserialized.totalSend).toBe(tx.totalSend);
            expect(deserialized.totalChange).toBe(tx.totalChange);
            expect(deserialized.fee).toBe(tx.fee);
            expect(Utils.compareBytes(deserialized.sourceAddress, tx.sourceAddress)).toBe(true);
            expect(Utils.compareBytes(deserialized.signature, tx.signature)).toBe(true);
            expect(Utils.compareBytes(deserialized.id, tx.id)).toBe(true);
        });
    });



    describe('transaction validation', () => {
        it('should validate transaction amounts', () => {
            const sourceAddr = new Uint8Array(2208).fill(1);
            const id = Transaction.txId(sourceAddr); // Generate valid ID from source

            const tx = new Transaction(
                sourceAddr,
                new Uint8Array(2208).fill(2),  // Different destination
                new Uint8Array(2208).fill(3),  // Different change
                -1n, // Invalid negative amount
                500n,
                10n,
                new Uint8Array(2144),
                id
            );

            const error = Transaction.validate(tx, 10n);
            expect(error).toBe('Total send cannot be negative');
        });

        it('should validate minimum fee', () => {
            const sourceAddr = new Uint8Array(2208).fill(1);
            const id = Transaction.txId(sourceAddr);

            const tx = new Transaction(
                sourceAddr,
                new Uint8Array(2208).fill(2),
                new Uint8Array(2208).fill(3),
                1000n,
                500n,
                5n, // Fee too low
                new Uint8Array(2144),
                id
            );

            const error = Transaction.validate(tx, 10n);
            expect(error).toContain('Invalid transaction fee');
        });

        it('should validate transaction order', () => {
            // Mock txId before creating transactions
            const originalTxId = Transaction.txId;
            
            // Create IDs that will have the correct order
            const id1 = new Uint8Array(32).fill(0xFF); // Higher value
            const id2 = new Uint8Array(32).fill(0x00); // Lower value
            
            Transaction.txId = jest.fn()
                .mockImplementation((addr: Uint8Array) => {
                    // Return id1 for first source address, id2 for second
                    return addr[0] === 1 ? id1 : id2;
                });

            const tx1 = new Transaction(
                new Uint8Array(2208).fill(1), // Will get id1
                new Uint8Array(2208).fill(2),
                new Uint8Array(2208).fill(3),
                1000n,
                500n,
                10n,
                new Uint8Array(2144),
                id1
            );

            const tx2 = new Transaction(
                new Uint8Array(2208).fill(4), // Will get id2
                new Uint8Array(2208).fill(5),
                new Uint8Array(2208).fill(6),
                1000n,
                500n,
                10n,
                new Uint8Array(2144),
                id2
            );

            try {
                const error = Transaction.validate(tx2, 10n, tx1);
                expect(error).toContain('Invalid transaction order');
            } finally {
                // Always restore original function
                Transaction.txId = originalTxId;
            }
        });

        it('should validate address uniqueness', () => {
            const sameAddr = new Uint8Array(2208).fill(1);
            const id = Transaction.txId(sameAddr);

            const tx = new Transaction(
                sameAddr,
                sameAddr, // Same as source
                new Uint8Array(2208).fill(2),
                1000n,
                500n,
                10n,
                new Uint8Array(2144),
                id
            );

            const error = Transaction.validate(tx, 10n);
            expect(error).toBe('Source address is identical to destination address');
        });
    });

    describe('transaction signing', () => {
        it('should validate amounts during signing', () => {
            expect(() => Transaction.sign(
                1000n, // Balance
                2000n, // Payment too high
                10n,
                0n,
                new Uint8Array(2208),
                new Uint8Array(32),
                new Uint8Array(2208),
                new Uint8Array(2208)
            )).toThrow('Not enough fund for fee and payment');

            expect(() => Transaction.sign(
                1000n,
                500n,
                600n, // Fee too high
                0n,
                new Uint8Array(2208),
                new Uint8Array(32),
                new Uint8Array(2208),
                new Uint8Array(2208)
            )).toThrow('Not enough fund for fee');
        });

        it('should require full spend of source address', () => {
            expect(() => Transaction.sign(
                1000n,
                500n,
                10n,
                400n, // Doesn't use full balance
                new Uint8Array(2208),
                new Uint8Array(32),
                new Uint8Array(2208),
                new Uint8Array(2208)
            )).toThrow('Source address not fully spent');
        });
    });
}); 
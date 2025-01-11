//obsolete
import { ByteArray } from '@/types/byte-buffer';
import { ByteBuffer, ByteOrder } from '@/types/byte-buffer';
import { Datagram } from '@/protocol/datagram';
import { Operation } from '@/types/enums';
import { WOTS } from './wots';
import { MochimoHasher } from '@/hasher/mochimo-hasher';
import { ByteUtils as Utils } from '@/utils';
export const TX_CONSTANTS = {
    LENGTH: 8824,
    ADDRESS_LENGTH: 2208,
    SIGNATURE_LENGTH: 2144,
    ID_LENGTH: 32,
    AMOUNT_LENGTH: 8
} as const;

/**
 * @deprecated
 * This is no longer valid for Mochimo v3. Please use Mesh Api for creating transactions.
 * Transaction implementation
 */
export class Transaction {
    readonly sourceAddress: ByteArray;
    readonly sourceAddressHex: string;
    readonly destinationAddress: ByteArray;
    readonly destinationAddressHex: string;
    readonly changeAddress: ByteArray;
    readonly changeAddressHex: string;
    readonly totalSend: bigint;
    readonly totalChange: bigint;
    readonly fee: bigint;
    readonly signature: ByteArray;
    readonly signatureHex: string;
    readonly id: ByteArray;
    readonly idHex: string;
    readonly idValue: bigint;

    constructor(
        sourceAddress: ByteArray,
        destinationAddress: ByteArray,
        changeAddress: ByteArray,
        totalSend: bigint,
        totalChange: bigint,
        fee: bigint,
        signature: ByteArray,
        id: ByteArray
    ) {
        // Validate lengths
        if (sourceAddress.length !== 2208) throw new Error('Invalid source address length');
        if (destinationAddress.length !== 2208) throw new Error('Invalid destination address length');
        if (changeAddress.length !== 2208) throw new Error('Invalid change address length');
        if (signature.length !== 2144) throw new Error('Invalid signature length');
        if (id.length !== 32) throw new Error('Invalid id length');

        // Copy arrays
        this.sourceAddress = new Uint8Array(sourceAddress);
        this.destinationAddress = new Uint8Array(destinationAddress);
        this.changeAddress = new Uint8Array(changeAddress);
        this.signature = new Uint8Array(signature);
        this.id = new Uint8Array(id);

        // Set hex strings
        this.sourceAddressHex = Utils.bytesToHex(this.sourceAddress);
        this.destinationAddressHex = Utils.bytesToHex(this.destinationAddress);
        this.changeAddressHex = Utils.bytesToHex(this.changeAddress);
        this.signatureHex = Utils.bytesToHex(this.signature);
        this.idHex = Utils.bytesToHex(this.id);

        // Set amounts
        this.totalSend = totalSend;
        this.totalChange = totalChange;
        this.fee = fee;

        // Set ID value
        this.idValue = Transaction.txIdToInteger(this.id);
    }



    /**
     * Converts transaction ID to integer value
     */
    static txIdToInteger(txid: ByteArray): bigint {
        // Convert bytes to bigint in big-endian order
        let value = 0n;
        for (let i = 0; i < txid.length; i++) {
            value = (value << 8n) | BigInt(txid[i]);
        }
        return value;
    }

    /**
     * Calculates transaction ID from WOTS address
     */
    static txId(wots: ByteArray): ByteArray {
        if (wots.length !== 2208) {
            throw new Error('Invalid WOTS length');
        }
        return MochimoHasher.hash(wots);
    }

    /**
     * Validates WOTS signature
     */
    static isValidWOTSSignature(rawTransaction: ByteArray): boolean {
        const message = MochimoHasher.hash(rawTransaction.subarray(0, 6648));

        const srcAddr = rawTransaction.subarray(0, 2208);
        const pk = srcAddr.subarray(0, 2144);
        const pubSeed = srcAddr.subarray(2144, 2144 + 32);
        const rnd2 = srcAddr.subarray(2144 + 32, 2144 + 64);
        const signature = rawTransaction.subarray(6648, 6648 + 2144);

        const expectedPK = WOTS.wots_pk_from_sig(signature, message, pubSeed, rnd2);

        // Compare public keys
        if (expectedPK.length !== pk.length) return false;
        for (let i = 0; i < pk.length; i++) {
            if (expectedPK[i] !== pk[i]) return false;
        }
        return true;
    }

    /**
     * Creates Transaction from raw bytes
     */
    static of(serial: ByteArray): Transaction {
        if (serial.length !== TX_CONSTANTS.LENGTH) {
            throw new Error(`Data length must be ${TX_CONSTANTS.LENGTH}`);
        }

        const bb = ByteBuffer.wrap(serial);
        bb.order(ByteOrder.LITTLE_ENDIAN);

        // Read addresses
        const sourceAddress = new Uint8Array(2208);
        bb.get(sourceAddress);

        const destinationAddress = new Uint8Array(2208);
        bb.get(destinationAddress);

        const changeAddress = new Uint8Array(2208);
        bb.get(changeAddress);

        // Read amounts as unsigned using utility method
        const totalSend = Utils.readLittleEndianUnsigned(bb, 8);
        const totalChange = Utils.readLittleEndianUnsigned(bb, 8);
        const fee = Utils.readLittleEndianUnsigned(bb, 8);

        // Read signature and id
        const signature = new Uint8Array(2144);
        bb.get(signature);

        const id = new Uint8Array(32);
        bb.get(id);

        return new Transaction(
            sourceAddress,
            destinationAddress,
            changeAddress,
            totalSend,
            totalChange,
            fee,
            signature,
            id
        );
    }

    /**
     * Converts bigint to little-endian bytes
     */
    public static bigIntToLEBytes(value: bigint, length: number): ByteArray {
        const bytes = new Uint8Array(length);
        let remaining = value;
        for (let i = 0; i < length; i++) {
            bytes[i] = Number(remaining & 0xFFn);
            remaining >>= 8n;
        }
        return bytes;
    }

    /**
     * Converts little-endian bytes to bigint
     */
    public static bytesToBigInt(bytes: ByteArray): bigint {
        let value = 0n;
        for (let i = bytes.length - 1; i >= 0; i--) {
            value = (value << 8n) | BigInt(bytes[i]);
        }
        return value;
    }

    /**
     * Creates raw bytes from transaction
     */
    serialize(): ByteArray {
        const bb = ByteBuffer.allocate(TX_CONSTANTS.LENGTH);
        bb.order(ByteOrder.LITTLE_ENDIAN);

        bb.put(this.sourceAddress);
        bb.put(this.destinationAddress);
        bb.put(this.changeAddress);

        bb.put(Transaction.bigIntToLEBytes(this.totalSend, 8));
        bb.put(Transaction.bigIntToLEBytes(this.totalChange, 8));
        bb.put(Transaction.bigIntToLEBytes(this.fee, 8));

        bb.put(this.signature);
        bb.put(this.id);

        return bb.array();
    }


    /**
     * Validates a transaction
     */
    static validate(
        transaction: Transaction,
        minFee: bigint,
        previousTransaction?: Transaction
    ): string | null {
        const raw = transaction.serialize();
        if (raw.length !== TX_CONSTANTS.LENGTH) {
            return `Invalid transaction length (expected ${TX_CONSTANTS.LENGTH} but was ${raw.length})`;
        }

        // Check addresses
        if (Utils.compareBytes(transaction.sourceAddress, transaction.destinationAddress)) {
            return 'Source address is identical to destination address';
        }
        if (Utils.compareBytes(transaction.sourceAddress, transaction.changeAddress)) {
            return 'Source address is identical to change address';
        }

        // Check fee
        if (transaction.fee < minFee) {
            return `Invalid transaction fee (min required ${minFee} but was ${transaction.fee})`;
        }

        // Check ID
        const expectedId = Transaction.txId(transaction.sourceAddress);
        if (!Utils.compareBytes(expectedId, transaction.id)) {
            return `Invalid transaction id (expected ${Utils.bytesToHex(expectedId)} but was ${transaction.idHex})`;
        }

        // Check transaction order
        if (previousTransaction && transaction.idValue <= previousTransaction.idValue) {
            return `Invalid transaction order (id ${transaction.idValue} should be after ${previousTransaction.idValue})`;
        }

        // Check amounts
        if (transaction.totalSend < 0n) return 'Total send cannot be negative';
        if (transaction.totalChange < 0n) return 'Total change cannot be negative';
        if (transaction.fee < 0n) return 'Fee cannot be negative';

        // Check signature
        if (!Transaction.isValidWOTSSignature(raw)) {
            return 'Invalid WOTS signature';
        }

        return null;
    }


    /**
     * Signs a transaction
     */
    static sign(
        balance: bigint,
        payment: bigint,
        fee: bigint,
        changeAmount: bigint,
        source: ByteArray,
        sourceSecret: ByteArray,
        destination: ByteArray,
        change: ByteArray
    ): { datagram: ByteArray, tx: ByteArray } {
        // Validate inputs
        if (source.length !== 2208) throw new Error('Invalid source address length');
        if (destination.length !== 2208) throw new Error('Invalid destination address length');
        if (change.length !== 2208) throw new Error('Invalid change address length');
        if (balance <= 0n) throw new Error('Balance must be positive');
        if (payment < 0n) throw new Error('Payment cannot be negative');
        if (fee < 0n) throw new Error('Fee cannot be negative');
        if (changeAmount < 0n) throw new Error('Change cannot be negative');

        // Check amounts
        const availableAfterFee = balance - fee;
        if (availableAfterFee < 0n) throw new Error('Not enough fund for fee');

        const availableAfterFeePayment = availableAfterFee - payment;
        if (availableAfterFeePayment < 0n) throw new Error('Not enough fund for fee and payment');

        const availableAfterFeePaymentChange = availableAfterFeePayment - changeAmount;
        if (availableAfterFeePaymentChange < 0n) throw new Error('Not enough fund for fee, payment and change');
        if (availableAfterFeePaymentChange > 0n) throw new Error('Source address not fully spent');

        // Create transaction buffer
        const buffer = ByteBuffer.allocate(TX_CONSTANTS.LENGTH);
        buffer.order(ByteOrder.LITTLE_ENDIAN);

        // Write addresses
        buffer.put(source);
        buffer.put(destination);
        buffer.put(change);

        // Write amounts
        buffer.put(Transaction.bigIntToLEBytes(payment, TX_CONSTANTS.AMOUNT_LENGTH));
        buffer.put(Transaction.bigIntToLEBytes(changeAmount, TX_CONSTANTS.AMOUNT_LENGTH));
        buffer.put(Transaction.bigIntToLEBytes(fee, TX_CONSTANTS.AMOUNT_LENGTH));

        // Get message hash for signing
        const messageBuffer = buffer.array().subarray(0, 6648);
        const message = MochimoHasher.hash(messageBuffer);

        // Get WOTS components
        const pk = source.subarray(0, TX_CONSTANTS.SIGNATURE_LENGTH);
        const pubSeed = source.subarray(TX_CONSTANTS.SIGNATURE_LENGTH, TX_CONSTANTS.SIGNATURE_LENGTH + 32);
        const rnd2 = source.subarray(TX_CONSTANTS.SIGNATURE_LENGTH + 32, TX_CONSTANTS.SIGNATURE_LENGTH + 64);

        // Sign message
        const signature = new Uint8Array(TX_CONSTANTS.SIGNATURE_LENGTH);
        WOTS.wots_sign(signature, message, sourceSecret, pubSeed, 0, rnd2);

        // Write signature
        buffer.position(6648);
        buffer.put(signature);

        // Calculate and write transaction ID
        const id = Transaction.txId(source);
        buffer.put(id);
        if (buffer.array().length !== TX_CONSTANTS.LENGTH) {
            throw new Error('Transaction length mismatch');
        }
        const datagram = new Datagram();
        datagram.setOperation(Operation.Transaction)
        datagram.setSourceAddress(source);
        datagram.setDestinationAddress(destination);
        datagram.setChangeAddress(change);
        datagram.setTotalSend(Transaction.bigIntToLEBytes(payment, TX_CONSTANTS.AMOUNT_LENGTH));
        datagram.setTotalChange(Transaction.bigIntToLEBytes(changeAmount, TX_CONSTANTS.AMOUNT_LENGTH));
        datagram.setFee(Transaction.bigIntToLEBytes(fee, TX_CONSTANTS.AMOUNT_LENGTH));
        datagram.setSignature(signature);
        return { datagram: datagram.serialize(), tx: buffer.array() };

    }



}

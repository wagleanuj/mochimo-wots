import { ByteArray } from '@/types/byte-buffer';
import { Operation } from '@/types/enums';
import { ByteBuffer, ByteOrder } from '@/types/byte-buffer';
import { ByteUtils as Utils } from '@/utils';
import { crc } from '@/utils';    
/**
 * Datagram constants
 */
export const DATAGRAM_CONSTANTS = {
    LENGTH: 8920,
    TRANSACTION_BUFFER_LENGTH_OFFSET: 122,
    TRANSACTION_BUFFER_LENGTH_LENGTH: 2,
    TRANSACTION_BUFFER_OFFSET: 124,
    TRANSACTION_BUFFER_LENGTH: 8792,
    ADD_TO_PEER_LIST_TRANSACTION_BUFFER_LENGTH: 0,
    DO_NOT_ADD_TO_PEER_LIST_TRANSACTION_BUFFER_LENGTH: 1
} as const;

/**
 * Capability flags for datagram
 */
export enum Capability {
    Push = 7,
    Wallet = 6,
    Sanctuary = 5,
    MFee = 4,
    Logging = 3
}

/**
 * Datagram implementation
 */
export class Datagram {
    private version = 4;
    private flags = new Array<boolean>(8).fill(false);
    private network = 1337;
    private id1: number = 0;
    private id2: number = 0;
    private operation: Operation = Operation.Transaction;
    private cblock = 0n;
    private blocknum = 0n;
    private cblockhash = new Uint8Array(32);
    private pblockhash = new Uint8Array(32);
    private weight = new Uint8Array(32);
    private transactionBufferLength = 1;

    private sourceAddress = new Uint8Array(2208);
    private destinationAddress = new Uint8Array(2208);
    private changeAddress = new Uint8Array(2208);

    private totalSend = new Uint8Array(8);
    private totalChange = new Uint8Array(8);
    private fee = new Uint8Array(8);

    private signature = new Uint8Array(2144);

    private crc: number | undefined;
    private trailer = 43981;

    /**
     * Serializes datagram to bytes
     */
    serialize(): ByteArray {
        if (!this.operation) {
            throw new Error('Operation not set');
        }

        const buffer = ByteBuffer.allocate(DATAGRAM_CONSTANTS.LENGTH);
        buffer.order(ByteOrder.LITTLE_ENDIAN);

        // Write version
        buffer.put(this.version);

        // Write flags
        const flagBits = this.flags.map(f => f ? '1' : '0').join('');
        buffer.put(parseInt(flagBits, 2));

        // Write network and IDs
        buffer.put(Utils.numberToLittleEndian(this.network, 2));
        buffer.put(Utils.numberToLittleEndian(this.id1, 2));
        buffer.put(Utils.numberToLittleEndian(this.id2, 2));
        buffer.put(Utils.numberToLittleEndian(this.operation, 2));

        // Write block info
        buffer.put(Utils.numberToLittleEndian(Number(this.cblock), 8));
        buffer.put(Utils.numberToLittleEndian(Number(this.blocknum), 8));
        buffer.put(this.cblockhash);
        buffer.put(this.pblockhash);
        buffer.put(this.weight);
        buffer.put(Utils.numberToLittleEndian(this.transactionBufferLength, 2));

        // Write addresses
        buffer.put(this.sourceAddress);
        buffer.put(this.destinationAddress);
        buffer.put(this.changeAddress);

        // Write amounts
        buffer.put(this.totalSend);
        buffer.put(this.totalChange);
        buffer.put(this.fee);

        // Write signature
        buffer.put(this.signature);

        // Calculate and write CRC
        const data = buffer.array();
        this.crc = crc(data, 0, 8916);
        buffer.put(Utils.numberToLittleEndian(this.crc, 2));

        // Write trailer
        buffer.put(Utils.numberToLittleEndian(this.trailer, 2));

        return buffer.array();
    }

    /**
     * Gets the network ID
     */
    getNetwork(): number {
        return this.network;
    }

    /**
     * Gets the trailer
     */
    getTrailer(): number {
        return this.trailer;
    }

    /**
     * Gets ID1
     */
    getId1(): number {
        return this.id1;
    }

    /**
     * Sets ID1
     */
    setId1(id1: number): this {
        this.id1 = id1;
        return this;
    }

    /**
     * Gets ID2
     */
    getId2(): number {
        return this.id2;
    }

    /**
     * Sets ID2
     */
    setId2(id2: number): this {
        this.id2 = id2;
        return this;
    }

    /**
     * Gets operation
     */
    getOperation(): Operation {
        return this.operation;
    }

    /**
     * Sets operation
     */
    setOperation(operation: Operation): this {
        this.operation = operation;
        return this;
    }

    /**
     * Gets current block height
     */
    getCurrentBlockHeight(): bigint {
        return this.cblock;
    }

    /**
     * Sets current block height
     */
    setCurrentBlockHeight(cblock: bigint): this {
        this.cblock = cblock;
        return this;
    }

    /**
     * Sets current block hash
     */
    setCurrentBlockHash(hash: ByteArray): this {
        if (hash.length !== 32) throw new Error('Invalid hash length');
        this.cblockhash = new Uint8Array(hash);
        return this;
    }

    /**
     * Sets previous block hash
     */
    setPreviousBlockHash(hash: ByteArray): this {
        if (hash.length !== 32) throw new Error('Invalid hash length');
        this.pblockhash = new Uint8Array(hash);
        return this;
    }

    /**
     * Gets block number
     */
    getBlocknum(): bigint {
        return this.blocknum;
    }

    /**
     * Sets block number
     */
    setBlocknum(blocknum: bigint): this {
        this.blocknum = blocknum;
        return this;
    }

    /**
     * Gets weight
     */
    getWeight(): ByteArray {
        return new Uint8Array(this.weight);
    }

    /**
     * Sets weight from bigint
     */
    setWeight(weight: bigint): this {
        //convert weight to bytes
        const bytes = Utils.fit(weight.toString(), 32);
        this.weight = Utils.bytesToLittleEndian(bytes);
        return this;
    }

    /**
     * Sets weight from bytes
     */
    setWeightBytes(weight: ByteArray): this {
        if (weight.length !== 32) {
            throw new Error('Invalid weight length');
        }
        this.weight = Utils.bytesToLittleEndian(Utils.fit(weight, 32));
        return this;
    }

    /**
     * Gets CRC
     */
    getCRC(): number {
        return this.crc ?? 0;
    }

    /**
     * Gets source address
     */
    getSourceAddress(): ByteArray {
        return new Uint8Array(this.sourceAddress);
    }

    /**
     * Sets source address
     */
    setSourceAddress(addr: ByteArray): this {
        if (addr.length !== 2208) {
            throw new Error('Invalid address length');
        }
        this.sourceAddress = new Uint8Array(addr);
        return this;
    }

    /**
     * Gets destination address
     */
    getDestinationAddress(): ByteArray {
        return new Uint8Array(this.destinationAddress);
    }

    /**
     * Sets destination address
     */
    setDestinationAddress(addr: ByteArray): this {
        if (addr.length !== 2208) {
            throw new Error('Invalid address length');
        }
        this.destinationAddress = new Uint8Array(addr);
        return this;
    }

    /**
     * Gets change address
     */
    getChangeAddress(): ByteArray {
        return new Uint8Array(this.changeAddress);
    }

    /**
     * Sets change address
     */
    setChangeAddress(addr: ByteArray): this {
        if (addr.length !== 2208) {
            throw new Error('Invalid address length');
        }
        this.changeAddress = new Uint8Array(addr);
        return this;
    }

    /**
     * Gets total send amount
     */
    getTotalSend(): ByteArray {
        return new Uint8Array(this.totalSend);
    }

    /**
     * Sets total send amount
     */
    setTotalSend(amount: ByteArray): this {
        if (amount.length !== 8) {
            throw new Error('Invalid amount length');
        }
        this.totalSend = new Uint8Array(amount);
        return this;
    }

    /**
     * Sets total send amount from bigint
     */
    setTotalSendBigInt(amount: bigint): this {
        this.totalSend = Utils.numberToLittleEndian(Number(amount), 8);
        return this;
    }

    /**
     * Gets total change amount
     */
    getTotalChange(): ByteArray {
        return new Uint8Array(this.totalChange);
    }

    /**
     * Sets total change amount
     */
    setTotalChange(amount: ByteArray): this {
        if (amount.length !== 8) {
            throw new Error('Invalid amount length');
        }
        this.totalChange = new Uint8Array(amount);
        return this;
    }

    /**
     * Sets total change amount from bigint
     */
    setTotalChangeBigInt(amount: bigint): this {
        this.totalChange = Utils.numberToLittleEndian(Number(amount), 8);
        return this;
    }

    /**
     * Gets fee amount
     */
    getFee(): ByteArray {
        return new Uint8Array(this.fee);
    }

    /**
     * Sets fee amount
     */
    setFee(amount: ByteArray): this {
        if (amount.length !== 8) {
            throw new Error('Invalid amount length');
        }
        this.fee = new Uint8Array(amount);
        return this;
    }

    /**
     * Sets fee amount from bigint
     */
    setFeeBigInt(amount: bigint): this {
        this.fee = Utils.numberToLittleEndian(Number(amount), 8);
        return this;
    }

    /**
     * Gets signature
     */
    getSignature(): ByteArray {
        return new Uint8Array(this.signature);
    }

    /**
     * Sets signature
     */
    setSignature(sig: ByteArray): this {
        if (sig.length !== 2144) {
            throw new Error('Invalid signature length');
        }
        this.signature = new Uint8Array(sig);
        return this;
    }

    /**
     * Gets previous block hash
     */
    getPblockhash(): ByteArray {
        return new Uint8Array(this.pblockhash);
    }

    /**
     * Gets current block hash
     */
    getCblockhash(): ByteArray {
        return new Uint8Array(this.cblockhash);
    }

    /**
     * Parses capabilities from datagram
     */
    static parseCapabilities<D extends Set<Capability>>(datagram: Datagram, destination: D): D {
        for (const c of Object.values(Capability)) {
            if (typeof c === 'number' && datagram.flags[c]) {
                destination.add(c);
            }
        }
        return destination;
    }

    /**
     * Gets route as weight
     */
    static getRouteAsWeight<R extends string[]>(route: R): ByteArray {
        const weight = new Uint8Array(32);
        let wi = 0;

        const startIndex = route.length > 8 ? route.length - 8 : 0;
        for (let i = startIndex; i < route.length; i++) {
            const ip = route[i].trim();
            const parts = ip.split('.');

            if (parts.length !== 4) {
                throw new Error(`Invalid IP ${ip}`);
            }

            for (const part of parts) {
                const value = parseInt(part);
                if (value < 0 || value > 255) {
                    throw new Error(`Invalid byte ${value}`);
                }
                weight[wi++] = value;
            }
        }

        return weight;
    }

    /**
     * Parses transaction IPs from datagram
     */
    static parseTxIps<D extends Set<string>>(datagram: Datagram, destination: D): D {
        const ips = datagram.getWeight();

        for (let i = 0; i < ips.length; i += 4) {
            let zeros = 0;
            const parts: number[] = [];

            for (let j = 0; j < 4; j++) {
                const b = ips[i + j];
                if (b === 0) zeros++;
                if (zeros >= 4) break;
                parts.push(b);
            }

            if (zeros >= 4) break;
            destination.add(parts.join('.'));
        }

        return destination;
    }



    /**
     * Gets transaction buffer length
     */
    getTransactionBufferLength(): number {
        return this.transactionBufferLength;
    }

    /**
     * Sets transaction buffer length
     */
    setTransactionBufferLength(length: number): this {
        this.transactionBufferLength = length;
        return this;
    }

    /**
     * Checks if should add to peer list
     */
    isAddToPeerList(): boolean {
        return this.getTransactionBufferLength() !== 1;
    }

    /**
     * Sets add to peer list flag
     */
    setAddToPeerList(value: boolean): this {
        this.setTransactionBufferLength(value ? 0 : 1);
        return this;
    }

    /**
     * Gets version
     */
    getVersion(): number {
        return this.version;
    }

    /**
     * Creates a clone of this datagram
     */
    clone(): Datagram {
        return Datagram.of(this.serialize());
    }

    /**
     * Creates datagram from bytes
     */
    static of(data: ByteArray): Datagram {
        if (data.length < DATAGRAM_CONSTANTS.LENGTH) {
            throw new Error(`Data length cannot be less than datagram length (${DATAGRAM_CONSTANTS.LENGTH})`);
        }

        const buffer = ByteBuffer.allocate(DATAGRAM_CONSTANTS.LENGTH);
        buffer.order(ByteOrder.LITTLE_ENDIAN);
        buffer.put(data);
        buffer.rewind();

        const datagram = new Datagram();

        // Read version and flags
        datagram.version = buffer.get_();
        const flag = buffer.get_();
        const bits = flag.toString(2).padStart(8, '0');
        datagram.flags = Array.from(bits).map(b => b !== '0');

        // Read network and IDs using 2-byte values
        datagram.network = Number(Utils.readLittleEndianUnsigned(buffer, 2));
        datagram.id1 = Number(Utils.readLittleEndianUnsigned(buffer, 2));
        datagram.id2 = Number(Utils.readLittleEndianUnsigned(buffer, 2));

        // Read operation
        const opCode = Number(Utils.readLittleEndianUnsigned(buffer, 2));
        if (opCode === 0) {
            throw new Error('Invalid operation code 0');
        }
        datagram.operation = opCode;

        // Read block info using 8-byte values
        datagram.cblock = (Utils.readLittleEndianUnsigned(buffer, 8));
        datagram.blocknum = (Utils.readLittleEndianUnsigned(buffer, 8));

        // Read hashes and weight
        buffer.get(datagram.cblockhash);
        buffer.get(datagram.pblockhash);
        buffer.get(datagram.weight);

        // Read transaction buffer length
        datagram.transactionBufferLength = Number(Utils.readLittleEndianUnsigned(buffer, 2));

        // Read addresses
        buffer.get(datagram.sourceAddress);
        buffer.get(datagram.destinationAddress);
        buffer.get(datagram.changeAddress);

        // Read amounts
        buffer.get(datagram.totalSend);
        buffer.get(datagram.totalChange);
        buffer.get(datagram.fee);

        // Read signature
        buffer.get(datagram.signature);

        // Read CRC and trailer
        datagram.crc = Number(Utils.readLittleEndianUnsigned(buffer, 2));
        datagram.trailer = Number(Utils.readLittleEndianUnsigned(buffer, 2));

        return datagram;
    }
}

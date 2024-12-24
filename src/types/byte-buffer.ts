/**
 * ByteOrder enum to match Java's ByteOrder
 */
export enum ByteOrder {
    BIG_ENDIAN,
    LITTLE_ENDIAN
}

/**
 * TypeScript implementation of Java's ByteBuffer
 */
export class ByteBuffer {
    private buf: Uint8Array;
    private pos: number;
    private byteOrder: ByteOrder;

    private constructor(capacity: number) {
        this.buf = new Uint8Array(capacity);
        this.pos = 0;
        this.byteOrder = ByteOrder.BIG_ENDIAN;
    }

    /**
     * Creates a new ByteBuffer with the given capacity
     */
    static allocate(capacity: number): ByteBuffer {
        return new ByteBuffer(capacity);
    }

    /**
     * Creates a new ByteBuffer that wraps the given array
     */
    static wrap(array: Uint8Array): ByteBuffer {
        const buffer = new ByteBuffer(array.length);
        buffer.buf.set(array);
        return buffer;
    }

    /**
     * Sets this buffer's byte order
     */
    order(order: ByteOrder): ByteBuffer {
        this.byteOrder = order;
        return this;
    }

    /**
     * Sets or gets this buffer's position
     */
    position(newPosition?: number): number | ByteBuffer {
        if (newPosition === undefined) {
            return this.pos;
        }
        if (newPosition < 0 || newPosition > this.buf.length) {
            throw new Error('Invalid position, position: ' + newPosition + ', length: ' + this.buf.length);
        }
        this.pos = newPosition;
        return this;
    }

    /**
     * Returns this buffer's capacity
     */
    capacity(): number {
        return this.buf.length;
    }

    /**
     * Writes a byte or bytes into this buffer
     */
    put(input: number | Uint8Array, offset?: number, length?: number): ByteBuffer {
        if (typeof input === 'number') {
            if (this.pos >= this.buf.length) {
                throw new Error('Buffer overflow');
            }
            this.buf[this.pos++] = input & 0xFF;
            return this;
        }

        const srcOffset = offset || 0;
        const srcLength = length || input.length;

        if (srcOffset < 0 || srcOffset > input.length) {
            throw new Error('Invalid offset');
        }
        if (srcLength < 0 || srcOffset + srcLength > input.length) {
            throw new Error('Invalid length');
        }
        if (this.pos + srcLength > this.buf.length) {
            throw new Error('Buffer overflow');
        }

        this.buf.set(input.subarray(srcOffset, srcOffset + srcLength), this.pos);
        this.pos += srcLength;
        return this;
    }

    /**
     * Writes an integer into this buffer
     */
    putInt(value: number): ByteBuffer {
        if (this.pos + 4 > this.buf.length) {
            throw new Error('Buffer overflow');
        }

        if (this.byteOrder === ByteOrder.BIG_ENDIAN) {
            this.buf[this.pos++] = (value >>> 24) & 0xFF;
            this.buf[this.pos++] = (value >>> 16) & 0xFF;
            this.buf[this.pos++] = (value >>> 8) & 0xFF;
            this.buf[this.pos++] = value & 0xFF;
        } else {
            this.buf[this.pos++] = value & 0xFF;
            this.buf[this.pos++] = (value >>> 8) & 0xFF;
            this.buf[this.pos++] = (value >>> 16) & 0xFF;
            this.buf[this.pos++] = (value >>> 24) & 0xFF;
        }

        return this;
    }

    /**
     * Gets bytes from the buffer into the destination array
     */
    get(dst: ByteArray): ByteBuffer {
        // Check if we have enough bytes
        if (this.pos + dst.length > this.buf.length) {
            throw new Error('Buffer underflow');
        }

        // Copy bytes from current position to destination
        for (let i = 0; i < dst.length; i++) {
            dst[i] = this.buf[this.pos++];
        }
        return this;
    }

    /**
     * Gets a single byte from the buffer
     */
    get_(): number {
        if (this.pos >= this.buf.length) {
            throw new Error('Buffer underflow');
        }
        return this.buf[this.pos++];
    }

    /**
     * Returns a copy of the backing array
     */
    array(): Uint8Array {
        return new Uint8Array(this.buf);
    }

    /**
     * Rewinds this buffer. Sets the position to zero
     */
    rewind(): ByteBuffer {
        this.pos = 0;
        return this;
    }
}

// Common type aliases used throughout the codebase
export type byte = number;  // Java byte in TypeScript
export type ByteArray = Uint8Array; // Java byte[] in TypeScript
export type BigInt = bigint; // Java BigInteger in TypeScript

// Utility type for hex strings
export type HexString = string;

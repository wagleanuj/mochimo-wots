import { ByteArray } from "@/types";
import { crc } from "./crc16";
import bs58 from "bs58";
export function addrTagToBase58(addrTag: ByteArray): string | null {
    if (!addrTag) return null;
    if (addrTag.length !== 20) throw new Error('Invalid address tag length');
    
    const csum = crc(addrTag, 0, 20);
    const combined = new Uint8Array(22);
    combined.set(addrTag);
    
    // Convert csum to little-endian bytes
    const csumBytes = [(csum & 0xFF), (csum >> 8) & 0xFF];
    combined.set(csumBytes, addrTag.length);

    const result = bs58.encode(combined);
    console.log({
        addrTag: Buffer.from(addrTag).toString('hex'),
        csum: csum,
        csumBytes,
        result
    });
    return result;
}

export function validateBase58Tag(tag: string): boolean {
    try {
        // Decode base58 string
        const decoded = bs58.decode(tag);
        if (decoded.length !== 22) return false;

        // Get the stored checksum (last 2 bytes in little-endian)
        const storedCsum = (decoded[21] << 8) | decoded[20];
        
        // Calculate CRC on the tag portion (first 20 bytes)
        const actualCrc = crc(decoded.subarray(0, 20), 0, 20);
        
        return storedCsum === actualCrc;
    } catch (e) {
        // Return false for any decoding errors
        return false;
    }
}
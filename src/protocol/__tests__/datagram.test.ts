import { ByteBuffer } from '../../types/byte-buffer';
import { Datagram, Capability } from '../datagram';
import { Operation } from '@/types/enums';
import { ByteUtils as Utils } from '@/utils';

describe('Datagram', () => {
    describe('serialization', () => {
        it('should serialize and deserialize datagram', () => {
            const datagram = new Datagram();
            
            // Set test values
            datagram.setId1(1234);
            datagram.setId2(5678);
            datagram.setOperation(Operation.Transaction);
            datagram.setCurrentBlockHeight(1000n);
            datagram.setBlocknum(2000n);
            
            const sourceAddr = new Uint8Array(2208).fill(0x11);
            const destAddr = new Uint8Array(2208).fill(0x22);
            const changeAddr = new Uint8Array(2208).fill(0x33);
            
            datagram.setSourceAddress(sourceAddr);
            datagram.setDestinationAddress(destAddr);
            datagram.setChangeAddress(changeAddr);
            
            datagram.setTotalSendBigInt(1000000n);
            datagram.setTotalChangeBigInt(500000n);
            datagram.setFeeBigInt(10000n);
            
            const signature = new Uint8Array(2144).fill(0x44);
            datagram.setSignature(signature);

            // Serialize and deserialize
            const serialized = datagram.serialize();
            const deserialized = Datagram.of(serialized);

            // Verify all fields match
            expect(deserialized.getId1()).toBe(1234);
            expect(deserialized.getId2()).toBe(5678);
            expect(deserialized.getOperation()).toBe(Operation.Transaction);
            expect(deserialized.getCurrentBlockHeight()).toBe(1000n);
            expect(deserialized.getBlocknum()).toBe(2000n);
            
            expect(Utils.compareBytes(deserialized.getSourceAddress(), sourceAddr)).toBe(true);
            expect(Utils.compareBytes(deserialized.getDestinationAddress(), destAddr)).toBe(true);
            expect(Utils.compareBytes(deserialized.getChangeAddress(), changeAddr)).toBe(true);
            
            expect(Utils.compareBytes(deserialized.getSignature(), signature)).toBe(true);
        });

        it('should handle invalid operation code', () => {
            const buffer = new Uint8Array(8920);
            expect(() => Datagram.of(buffer)).toThrow('Invalid operation code 0');
        });

        it('should handle invalid data length', () => {
            const buffer = new Uint8Array(8919); // Too short
            expect(() => Datagram.of(buffer)).toThrow('Data length cannot be less than datagram length');
        });
    });

    describe('capabilities', () => {
        it('should parse capabilities', () => {
            const datagram = new Datagram();
            const capabilities = new Set<Capability>();
            
            // Set some capabilities
            datagram['flags'][Capability.Push] = true;
            datagram['flags'][Capability.Wallet] = true;
            
            Datagram.parseCapabilities(datagram, capabilities);
            
            expect(capabilities.has(Capability.Push)).toBe(true);
            expect(capabilities.has(Capability.Wallet)).toBe(true);
            expect(capabilities.has(Capability.Sanctuary)).toBe(false);
        });
    });

    describe('route handling', () => {
        it('should convert route to weight', () => {
            const route = ['192.168.1.1', '10.0.0.1'];
            const weight = Datagram.getRouteAsWeight(route);
            
            // First IP
            expect(weight[0]).toBe(192);  // Most significant byte first
            expect(weight[1]).toBe(168);
            expect(weight[2]).toBe(1);
            expect(weight[3]).toBe(1);
            
            // Second IP
            expect(weight[4]).toBe(10);
            expect(weight[5]).toBe(0);
            expect(weight[6]).toBe(0);
            expect(weight[7]).toBe(1);
            
            // Rest should be zeros
            expect(weight.slice(8).every(b => b === 0)).toBe(true);
        });

        it('should handle multiple IPs', () => {
            const route = [
                '192.168.1.1',
                '10.0.0.1',
                '172.16.0.1',
                '127.0.0.1'
            ];
            const weight = Datagram.getRouteAsWeight(route);
            
            // Should only use last 8 IPs (32 bytes)
            expect(weight[0]).toBe(192);
            expect(weight[1]).toBe(168);
            expect(weight[2]).toBe(1);
            expect(weight[3]).toBe(1);
            
            expect(weight[4]).toBe(10);
            expect(weight[5]).toBe(0);
            expect(weight[6]).toBe(0);
            expect(weight[7]).toBe(1);
            
            expect(weight[8]).toBe(172);
            expect(weight[9]).toBe(16);
            expect(weight[10]).toBe(0);
            expect(weight[11]).toBe(1);
            
            expect(weight[12]).toBe(127);
            expect(weight[13]).toBe(0);
            expect(weight[14]).toBe(0);
            expect(weight[15]).toBe(1);
        });

        it('should handle invalid IPs', () => {
            expect(() => Datagram.getRouteAsWeight(['invalid.ip']))
                .toThrow('Invalid IP invalid.ip');
            expect(() => Datagram.getRouteAsWeight(['256.1.2.3']))
                .toThrow('Invalid byte 256');
            expect(() => Datagram.getRouteAsWeight(['1.2.3']))
                .toThrow('Invalid IP 1.2.3');
        });

        it('should parse transaction IPs', () => {
            const datagram = new Datagram();
            const ips = new Set<string>();
            
            // Set weight with IP addresses
            const weight = new Uint8Array(32);
            weight.set([192, 168, 1, 1, 10, 0, 0, 1], 0);
            datagram['weight'] = weight;
            
            Datagram.parseTxIps(datagram, ips);
            
            expect(ips.has('192.168.1.1')).toBe(true);
            expect(ips.has('10.0.0.1')).toBe(true);
        });
    });

    describe('peer list handling', () => {
        it('should handle add to peer list flag', () => {
            const datagram = new Datagram();
            
            datagram.setAddToPeerList(true);
            expect(datagram.isAddToPeerList()).toBe(true);
            expect(datagram.getTransactionBufferLength()).toBe(0);
            
            datagram.setAddToPeerList(false);
            expect(datagram.isAddToPeerList()).toBe(false);
            expect(datagram.getTransactionBufferLength()).toBe(1);
        });
    });

    describe('CRC handling', () => {
        it('should handle undefined CRC', () => {
            const datagram = new Datagram();
            expect(datagram.getCRC()).toBe(0);
        });

        it('should calculate and store CRC during serialization', () => {
            const datagram = new Datagram();
            datagram.setId1(1234);
            datagram.setId2(5678);
            
            const serialized = datagram.serialize();
            expect(datagram.getCRC()).not.toBe(0);
            
            // Deserialize and verify CRC matches
            const deserialized = Datagram.of(serialized);
            expect(deserialized.getCRC()).toBe(datagram.getCRC());
        });
    });

    describe('address handling', () => {
        it('should handle source address', () => {
            const datagram = new Datagram();
            const addr = new Uint8Array(2208).fill(0x11);
            
            datagram.setSourceAddress(addr);
            expect(Utils.compareBytes(datagram.getSourceAddress(), addr)).toBe(true);
            
            // Should throw on invalid length
            expect(() => datagram.setSourceAddress(new Uint8Array(10)))
                .toThrow('Invalid address length');
        });

        it('should handle destination address', () => {
            const datagram = new Datagram();
            const addr = new Uint8Array(2208).fill(0x22);
            
            datagram.setDestinationAddress(addr);
            expect(Utils.compareBytes(datagram.getDestinationAddress(), addr)).toBe(true);
            
            expect(() => datagram.setDestinationAddress(new Uint8Array(10)))
                .toThrow('Invalid address length');
        });

        it('should handle change address', () => {
            const datagram = new Datagram();
            const addr = new Uint8Array(2208).fill(0x33);
            
            datagram.setChangeAddress(addr);
            expect(Utils.compareBytes(datagram.getChangeAddress(), addr)).toBe(true);
            
            expect(() => datagram.setChangeAddress(new Uint8Array(10)))
                .toThrow('Invalid address length');
        });
    });

    describe('amount handling', () => {
        it('should handle total send amount', () => {
            const datagram = new Datagram();
            const amount = new Uint8Array(8).fill(0x44);
            
            datagram.setTotalSend(amount);
            expect(Utils.compareBytes(datagram.getTotalSend(), amount)).toBe(true);
            
            // Test bigint version
            datagram.setTotalSendBigInt(1000000n);
            expect(Number(Utils.readLittleEndianUnsigned(
                ByteBuffer.wrap(datagram.getTotalSend())
            ))).toBe(1000000);
            
            expect(() => datagram.setTotalSend(new Uint8Array(10)))
                .toThrow('Invalid amount length');
        });

        it('should handle total change amount', () => {
            const datagram = new Datagram();
            const amount = new Uint8Array(8).fill(0x55);
            
            datagram.setTotalChange(amount);
            expect(Utils.compareBytes(datagram.getTotalChange(), amount)).toBe(true);
            
            datagram.setTotalChangeBigInt(500000n);
            expect(Number(Utils.readLittleEndianUnsigned(
                ByteBuffer.wrap(datagram.getTotalChange())
            ))).toBe(500000);
            
            expect(() => datagram.setTotalChange(new Uint8Array(10)))
                .toThrow('Invalid amount length');
        });

        it('should handle fee amount', () => {
            const datagram = new Datagram();
            const amount = new Uint8Array(8).fill(0x66);
            
            datagram.setFee(amount);
            expect(Utils.compareBytes(datagram.getFee(), amount)).toBe(true);
            
            datagram.setFeeBigInt(10000n);
            expect(Number(Utils.readLittleEndianUnsigned(
                ByteBuffer.wrap(datagram.getFee())
            ))).toBe(10000);
            
            expect(() => datagram.setFee(new Uint8Array(10)))
                .toThrow('Invalid amount length');
        });
    });

    describe('block handling', () => {
        it('should handle block hashes', () => {
            const datagram = new Datagram();
            const hash = new Uint8Array(32).fill(0x77);
            
            datagram.setCurrentBlockHash(hash);
            expect(Utils.compareBytes(datagram.getCblockhash(), hash)).toBe(true);
            
            datagram.setPreviousBlockHash(hash);
            expect(Utils.compareBytes(datagram.getPblockhash(), hash)).toBe(true);
            
            expect(() => datagram.setCurrentBlockHash(new Uint8Array(10)))
                .toThrow('Invalid hash length');
            expect(() => datagram.setPreviousBlockHash(new Uint8Array(10)))
                .toThrow('Invalid hash length');
        });

        it('should handle block numbers', () => {
            const datagram = new Datagram();
            
            datagram.setCurrentBlockHeight(1000n);
            expect(datagram.getCurrentBlockHeight()).toBe(1000n);
            
            datagram.setBlocknum(2000n);
            expect(datagram.getBlocknum()).toBe(2000n);
        });
    });

    describe('signature handling', () => {
        it('should handle signature', () => {
            const datagram = new Datagram();
            const sig = new Uint8Array(2144).fill(0x88);
            
            datagram.setSignature(sig);
            expect(Utils.compareBytes(datagram.getSignature(), sig)).toBe(true);
            
            expect(() => datagram.setSignature(new Uint8Array(10)))
                .toThrow('Invalid signature length');
        });
    });

    describe('cloning', () => {
        it('should create exact copy', () => {
            const original = new Datagram();
            original.setId1(1234);
            original.setId2(5678);
            original.setOperation(Operation.Transaction);
            original.setCurrentBlockHeight(1000n);
            
            const clone = original.clone();
            
            expect(clone.getId1()).toBe(original.getId1());
            expect(clone.getId2()).toBe(original.getId2());
            expect(clone.getOperation()).toBe(original.getOperation());
            expect(clone.getCurrentBlockHeight()).toBe(original.getCurrentBlockHeight());
            expect(clone.getCRC()).toBe(original.getCRC());
        });
    });
}); 
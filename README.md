# Mochimo WOTS v2

A TypeScript implementation of Mochimo's Winternitz One-Time Signature (WOTS) scheme.

## Overview

This library provides a TypeScript implementation of the WOTS signature scheme used in the Mochimo cryptocurrency. WOTS is a post-quantum secure one-time signature scheme that is resistant to attacks from quantum computers.

## Installation 
```bash
npm install mochimo-wots-v2
```

## Features

- TypeScript implementation of Mochimo's WOTS v2
- Post-quantum secure signatures
- Byte buffer utilities for efficient byte operations
- Comprehensive test coverage
- One external runtime dependency (@noble/hashes)

## Usage

### WOTS Operations
```typescript
import { WOTS, ByteUtils } from 'mochimo-wots-v2';
//Generate a valid wots address
 const sourcePK = new Uint8Array(2144);
 const sourcePubSeed = new Uint8Array(32).fill(0x12); //use some deterministic seed in real scenarios
 const sourceRnd2 = new Uint8Array(32).fill(0x34);
 WOTS.wots_pkgen(sourcePK, sourceSecret, sourcePubSeed, 0, sourceRnd2);

const sourceAddress = new Uint8Array(2208);
sourceAddress.set(sourcePK, 0);
sourceAddress.set(sourcePubSeed, 2144);
sourceAddress.set(sourceRnd2, 2176);
//Note that this address is valid but is not tagged. To tag the address, use the Tag.tag function
const tagBytes = new Uint8Array(12).fill(0x12);
const taggedSourceAddr = Tag.tag(sourceAddress, tagBytes);

```

### Advanced WOTS Usage
```typescript
// Custom components generator for deterministic addresses
function myComponentsGenerator(seed: Uint8Array) {
    // Generate deterministic components from seed
    return {
        private_seed: generatePrivateSeed(seed),
        public_seed: generatePublicSeed(seed),
        addr_seed: generateAddressSeed(seed)
    };
}

const secret = new Uint8Array(32).fill(0x12);
const tag = new Uint8Array(12).fill(0x34);

// Generate deterministic address
const address = WOTS.generateAddress(tag, secret, myComponentsGenerator);

// Validate address
const privateSeed = myComponentsGenerator(secret);
const isValid = WOTS.isValid(privateSeed, address);
console.log('Address valid:', isValid);
```

### Byte Buffer Operations
```typescript
import { ByteBuffer, ByteOrder } from 'mochimo-wots-v2';

// Create a new buffer
const buffer = ByteBuffer.allocate(1024);

// Write data
buffer.order(ByteOrder.LITTLE_ENDIAN)
      .putInt(0x12345678)
      .put(new Uint8Array([1, 2, 3, 4]));

// Read data
const data = new Uint8Array(4);
buffer.rewind().get(data);
```

### Creating a WOTS Wallet
```typescript
import { WOTSWallet } from 'mochimo-wots-v2';

// Create a secret (32 bytes)
const secret = new Uint8Array(32).fill(0x56); //simple example secret
const tag = new Uint8Array(12).fill(0x34); //simple example tag
//create the wallet
const wallet = WOTSWallet.create("Test Wallet", secret, tag);


// Get the public key (2208 bytes)
const address = wallet.getAddress();
console.log('Address:', wallet.getAddressHex());

// Get the tag
console.log('Tag:', wallet.getTagHex());
```

### Signing and Verifying Messages
```typescript
// Message to sign
const message = new TextEncoder().encode("Hello, Mochimo!");

// Sign the message
const signature = wallet.sign(message);

// Verify the signature
const isValid = wallet.verify(message, signature);
console.log('Signature valid:', isValid);

// Verify with modified message (should fail)
const modifiedMessage = new TextEncoder().encode("Hello, Modified!");
const isValidModified = wallet.verify(modifiedMessage, signature);
console.log('Modified message valid:', isValidModified); // false
```

### Important Notes
1. WOTS is a one-time signature scheme - each private key should only be used to sign once
2. The secret is used to deterministically generate the actual signing key
3. The address contains the public key and verification components
4. Tags are optional and can be used to categorize addresses

## Development

### Setup
```bash
# Install dependencies
pnpm install
```

### Testing
```bash
# Run all tests
pnpm test

# Run tests with coverage
pnpm test:coverage
```

### Building
```bash
# Build the project
pnpm build
```

## Project Structure

```
src/
├── hasher/         # Hashing implementations
├── protocol/       # WOTS protocol implementation
├── types/          # TypeScript type definitions
└── utils/          # Utility functions
```

## Contributing

Contributions are welcome! Please feel free to submit issues and pull requests.

## License

MIT License - see LICENSE file for details.

## Related

- [Mochimo](https://github.com/mochimodev/mochimo) - The Mochimo Cryptocurrency
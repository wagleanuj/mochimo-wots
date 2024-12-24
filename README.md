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
- Zero external runtime dependencies

## Usage

### WOTS Operations
```typescript
import { WOTS } from 'mochimo-wots-v2';

// Initialize WOTS
const wots = new WOTS();

// Generate keys and sign messages
// (Documentation coming soon)
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
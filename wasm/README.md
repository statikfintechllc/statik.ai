# WebAssembly Modules

This directory contains WebAssembly modules for high-performance computation tasks.

## Overview

WebAssembly provides near-native performance for compute-intensive operations. CSA.OS uses WASM for:
- Mathematical computations
- Data transformations
- Algorithm implementations
- Future: Neural network inference

## Building WASM Modules

### Option 1: C/C++ with Emscripten

```bash
# Install Emscripten
git clone https://github.com/emscripten-core/emsdk.git
cd emsdk
./emsdk install latest
./emsdk activate latest
source ./emsdk_env.sh

# Compile C to WASM
emcc example.c -o example.wasm \
  -O3 \
  -s WASM=1 \
  -s EXPORTED_FUNCTIONS='["_add","_multiply"]' \
  -s EXPORTED_RUNTIME_METHODS='["ccall","cwrap"]'
```

### Option 2: Rust

```bash
# Install Rust and wasm-pack
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
cargo install wasm-pack

# Build WASM module
wasm-pack build --target web
```

### Option 3: AssemblyScript (TypeScript-like)

```bash
# Install AssemblyScript
npm install -g assemblyscript

# Compile to WASM
asc example.ts -o example.wasm -O3
```

## Example: Simple Math Module (C)

```c
// math.c
#include <emscripten.h>

EMSCRIPTEN_KEEPALIVE
int add(int a, int b) {
    return a + b;
}

EMSCRIPTEN_KEEPALIVE
int multiply(int a, int b) {
    return a * b;
}

EMSCRIPTEN_KEEPALIVE
float vector_dot(float* a, float* b, int length) {
    float sum = 0.0f;
    for (int i = 0; i < length; i++) {
        sum += a[i] * b[i];
    }
    return sum;
}
```

Compile:
```bash
emcc math.c -o math.wasm \
  -O3 \
  -s WASM=1 \
  -s EXPORTED_FUNCTIONS='["_add","_multiply","_vector_dot"]' \
  -s ALLOW_MEMORY_GROWTH=1
```

## Usage in CSA.OS

```javascript
import wasm from '../core/wasm.js';

// Load module
const instance = await wasm.loadModule('math', '/wasm/math.wasm');

// Call functions
const result = wasm.call('math', 'add', 5, 3);
console.log('5 + 3 =', result); // 8

// Work with memory for array operations
const exports = wasm.getExports('math');
const memory = exports.memory;

// Allocate space for vectors
const vecLength = 1000;
const vecA = new Float32Array(memory.buffer, 0, vecLength);
const vecB = new Float32Array(memory.buffer, vecLength * 4, vecLength);

// Fill with data
for (let i = 0; i < vecLength; i++) {
    vecA[i] = i;
    vecB[i] = i * 2;
}

// Compute dot product
const dotProduct = exports.vector_dot(0, vecLength * 4, vecLength);
console.log('Dot product:', dotProduct);
```

## Threading Support

For multi-threaded WASM (requires Developer Mode):

```bash
emcc math.c -o math.wasm \
  -O3 \
  -s USE_PTHREADS=1 \
  -s PTHREAD_POOL_SIZE=4 \
  -s WASM=1
```

JavaScript:
```javascript
// Requires SharedArrayBuffer and Atomics
const instance = await wasm.loadModule('math-threaded', '/wasm/math-threaded.wasm', {
    env: {
        memory: new WebAssembly.Memory({
            initial: 256,
            maximum: 512,
            shared: true
        })
    }
});
```

## Planned Modules

### 1. Vector Operations (`vector.wasm`)
- Vector addition, subtraction, multiplication
- Dot product, cross product
- Normalization, magnitude
- SIMD optimizations

### 2. Matrix Operations (`matrix.wasm`)
- Matrix multiplication
- Transpose, inverse
- Determinant, eigenvalues
- Optimized for cache locality

### 3. Signal Processing (`signal.wasm`)
- FFT (Fast Fourier Transform)
- Filtering (low-pass, high-pass)
- Convolution
- Windowing functions

### 4. String Processing (`string.wasm`)
- Pattern matching
- Tokenization
- Hash functions
- Compression (LZ4, etc.)

### 5. Neural Network (`nn.wasm`)
- Matrix operations for NN
- Activation functions
- Forward/backward propagation
- Inference optimizations

## Performance Tips

1. **Minimize JS ↔ WASM crossing**: Batch operations
2. **Use typed arrays**: Direct memory access
3. **Enable SIMD**: `-msimd128` flag for vectorization
4. **Optimize for cache**: Structure data access patterns
5. **Use bulk memory ops**: `memory.copy`, `memory.fill`

## Debugging

### Chrome DevTools
1. Open DevTools → Sources
2. WASM modules appear in file tree
3. Set breakpoints in WASM code
4. Inspect memory and locals

### WASM Decompiler
```bash
# Install wabt (WebAssembly Binary Toolkit)
brew install wabt  # macOS
apt install wabt   # Linux

# Disassemble WASM to WAT (text format)
wasm2wat module.wasm -o module.wat

# Validate WASM
wasm-validate module.wasm
```

## Security

- All WASM runs in sandboxed environment
- No direct system access
- Memory is isolated per module
- Cannot access DOM directly
- Subject to same-origin policy

## Resources

- [WebAssembly MDN](https://developer.mozilla.org/en-US/docs/WebAssembly)
- [Emscripten Docs](https://emscripten.org/docs/)
- [Rust WASM Book](https://rustwasm.github.io/docs/book/)
- [AssemblyScript](https://www.assemblyscript.org/)
- [WABT Tools](https://github.com/WebAssembly/wabt)

## Contributing

When adding WASM modules:
1. Document the module purpose
2. Provide build instructions
3. Include usage examples
4. Add performance benchmarks
5. Test on iOS with Developer Mode

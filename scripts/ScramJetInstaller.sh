#!/bin/bash
set -euo pipefail

SCRAMJET_DIR="ScramJet"
CORE_DIR="$SCRAMJET_DIR/packages/core"
REWRITER_WASM_DIR="$CORE_DIR/rewriter/wasm"

if ! command -v rustc &> /dev/null; then
    echo "Rust not installed. Installing Rust..."
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
fi

source "$HOME/.cargo/env"
export PATH="$HOME/.cargo/bin:$PATH"

if ! rustup toolchain list | grep -q '^nightly'; then
    rustup install nightly
fi

rustup default nightly
rustup override set nightly

if ! rustup component list --toolchain nightly-x86_64-unknown-linux-gnu --installed | grep -q '^rust-src'; then
    rustup component add rust-src --toolchain nightly-x86_64-unknown-linux-gnu
fi

Panic="$HOME/.rustup/toolchains/nightly-x86_64-unknown-linux-gnu/lib/rustlib/src/rust/library/core/src/panicking.rs"
if [ -f "$Panic" ]; then
    if ! grep -q '^//\#\[cfg(feature = "panic_immediate_abort")\]' "$Panic"; then
        sed -i '/#\[cfg(feature = "panic_immediate_abort")\]/, /);/ s/^/\/\//' "$Panic"
        echo "Patched $Panic"
    fi
fi

if ! command -v wasm-bindgen >/dev/null 2>&1 || ! wasm-bindgen --version | grep -q '0.2.105'; then
    cargo install wasm-bindgen-cli --version 0.2.105
fi

if ! command -v wasm-snip >/dev/null 2>&1; then
    cargo install --git https://github.com/r58playz/wasm-snip
fi

if ! command -v wasm-opt >/dev/null 2>&1; then
    Version=$(curl -sI https://github.com/WebAssembly/binaryen/releases/latest \
        | awk -F '/' 'tolower($1) ~ /^location/ {print substr($NF, 1, length($NF)-1)}')
    curl -LO "https://github.com/WebAssembly/binaryen/releases/download/$Version/binaryen-${Version}-x86_64-linux.tar.gz"
    tar xf "binaryen-${Version}-x86_64-linux.tar.gz"
    rm -f "binaryen-${Version}-x86_64-linux.tar.gz"
    mkdir -p ~/.local/bin ~/.local/lib
    mv "binaryen-${Version}/bin/"* ~/.local/bin/
    mv "binaryen-${Version}/lib/"* ~/.local/lib/
    rm -rf "binaryen-${Version}"
fi

export PATH="$HOME/.local/bin:$PATH"
pnpm --dir "$SCRAMJET_DIR" install
export RUSTFLAGS='-Zlocation-detail=none -Zfmt-debug=none'

cd "$REWRITER_WASM_DIR"
bash build.sh
cd ../../../..

pnpm --dir "$CORE_DIR" run build
echo "ScramJet Installer complete!"

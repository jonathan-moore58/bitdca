# BitDCA — Dollar Cost Averaging on Bitcoin L1

**Automated DCA into any OP20 token, powered by OPNet smart contracts on Bitcoin.**

BitDCA lets users deposit tokens and configure recurring swaps via MotoSwap. A keeper bot monitors positions and triggers executions at configured intervals, delivering purchased tokens directly to the user's wallet.

## Architecture

```
bitdca/
├── contracts/     AssemblyScript smart contract (DCAVault)
├── frontend/      React + Vite dashboard
└── keeper/        Node.js keeper bot
```

### Smart Contract (`contracts/`)

- **DCAVault** — On-chain position management with reentrancy protection
- Users deposit OP20 tokens and set amount, interval, and target token
- Keeper-triggered swaps via MotoSwap router with slippage protection
- Position top-up, cancellation with refund, auto-deactivation when exhausted
- Uses `TransferHelper` / `OP20Utils` from btc-runtime for correct SHA256 selectors
- Emergency pause by deployer

### Frontend (`frontend/`)

- React 19 + TypeScript + Vite + TailwindCSS
- `@btc-vision/walletconnect` for native OPNet wallet integration
- Real-time position monitoring with block countdown timers
- Create, top-up, and cancel positions
- Uses `increaseAllowance` (not `approve`) per OP20 ATK-05

### Keeper Bot (`keeper/`)

- Polls all active positions every 30s
- Fetches MotoSwap quotes for slippage calculation
- Simulates then sends execution transactions
- Configurable via environment variables

## Quick Start

### Prerequisites

- Node.js 18+
- An OPNet wallet (e.g., OPWallet browser extension)

### Install & Build

```bash
# Install all dependencies
cd contracts && npm install && cd ..
cd frontend && npm install && cd ..
cd keeper && npm install && cd ..

# Build the smart contract (WASM)
cd contracts && npm run build

# Build the frontend
cd frontend && npm run build

# Build the keeper
cd keeper && npm run build
```

### Run Frontend (Development)

```bash
cd frontend
npm run dev
```

### Run Keeper Bot

```bash
cd keeper
DCA_VAULT_ADDRESS=0x... KEEPER_MNEMONIC="your words here" npm start
```

## Environment Variables

### Keeper

| Variable | Default | Description |
|----------|---------|-------------|
| `RPC_URL` | `https://testnet.opnet.org` | OPNet RPC endpoint |
| `NETWORK` | `testnet` | Network: regtest, testnet, mainnet |
| `DCA_VAULT_ADDRESS` | — | Deployed DCAVault hex address |
| `ROUTER_ADDRESS` | MotoSwap regtest | MotoSwap router hex address |
| `KEEPER_MNEMONIC` | dev mnemonic | BIP39 mnemonic for keeper wallet |
| `POLL_INTERVAL_MS` | `30000` | How often to scan positions |
| `SLIPPAGE_PERCENT` | `5` | Max slippage tolerance |
| `MAX_SATS_PER_TX` | `50000` | Max sats per execution TX |
| `FEE_RATE` | `10` | Fee rate (sat/vB) |

## Contract Deployment

Deploy with the OPNet CLI:

```bash
cd contracts
npx opnet-cli deploy --wasm build/dca.wasm \
  --abi abis/DCAVault.abi.json \
  --args ROUTER_ADDRESS,KEEPER_ADDRESS
```

After deployment, update `DCA_VAULT_ADDRESS` in:
- `frontend/src/config/contracts.ts`
- Keeper's environment variable

## Key Design Decisions

1. **SHA256 selectors** — OPNet uses SHA256 (not keccak256) for function selectors. All cross-contract calls use `encodeSelector()` from btc-runtime.

2. **`increaseAllowance` over `approve`** — Prevents the ERC20 approval race condition (ATK-05).

3. **Balance-diff pattern for swaps** — MotoSwap's `swapExactTokensForTokensSupportingFeeOnTransferTokens` returns void, so we snapshot balances before/after to measure output.

4. **Reentrancy guard** — DCAVault extends `ReentrancyGuard` with `STANDARD` level protection.

5. **State-before-interaction** — All state updates happen before external calls (CEI pattern).

## Tech Stack

- **Smart Contract**: AssemblyScript + `@btc-vision/btc-runtime`
- **Frontend**: React 19 + Vite + TailwindCSS + `@btc-vision/walletconnect`
- **Keeper**: Node.js + TypeScript + `opnet` SDK
- **DEX**: MotoSwap (on-chain AMM)
- **Network**: OPNet (Bitcoin L1 smart contracts)

## License

MIT

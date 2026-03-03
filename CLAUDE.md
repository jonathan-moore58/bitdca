# BitDCA — Dollar-Cost Average on Bitcoin L1

## What Is This Project?

BitDCA is a fully on-chain DCA (Dollar-Cost Averaging) protocol on OPNet (Bitcoin L1 smart contracts). Users deposit OP20 tokens and set a schedule — a keeper bot automatically executes swaps via MotoSwap at each interval.

Three parts:

1. **Contracts** (`/contracts/`) — DCAVault AssemblyScript smart contract
2. **Keeper** (`/keeper/`) — Node.js bot that monitors positions and triggers executions
3. **Frontend** (`/frontend/`) — React 19 SPA (Vite + TailwindCSS v4 + Framer Motion)

No npm workspaces — each directory has its own `package.json`.

---

## Quick Start

```bash
# Contracts (build WASM)
cd /d/bitdca/contracts
npm install
npm run build

# Keeper bot
cd /d/bitdca/keeper
npm install
npm run start

# Frontend (Vite dev server)
cd /d/bitdca/frontend
npm install
npm run dev
```

---

## Architecture

```
User deposits OP20 tokens → DCAVault contract holds deposit
Keeper bot polls positions → When interval elapses:
  1. Gets quote from MotoSwap router
  2. Calls vault.executeDCA(positionId, minAmountOut)
  3. Vault: transferFrom(deposit) → approve(router) → swap → tokens go to user
Frontend reads position data via OPNet SDK direct contract calls
```

### Contract: DCAVault

- Extends ReentrancyGuard (STANDARD level)
- Cross-contract calls to OP20 tokens and MotoSwap router
- Position storage: 13 fields per position via StoredMapU256
- Global state: nextPositionId, totalPositions, activePositions, totalExecutions, totalVolume
- Admin functions: setKeeper, setRouter, togglePause

### Key Methods

| Method | Access | Description |
|--------|--------|-------------|
| createPosition | Anyone | Deposit tokens + set DCA schedule |
| createBTCPosition | Keeper only | Create BTC→Token DCA (after BTC receipt) |
| executeDCA | Keeper only | Trigger OP20 swap + collect 0.25% fee |
| executeBTCDCA | Keeper only | Record BTC DCA execution |
| topUp | Owner/Keeper | Add more deposit |
| cancelPosition | Position owner | Cancel + refund remaining |
| getPosition | View | Read position data (14 fields incl. posType) |
| getStats | View | Read global stats |
| setFeeRecipient | Admin | Set protocol fee recipient |
| getFeeRecipient | View | Read fee recipient address |

### Keeper Bot

- Polls every 30s (configurable)
- Scans all positions, executes those where `block - lastExecBlock >= intervalBlocks`
- Uses MotoSwap getAmountsOut for slippage calculation
- Backend signing: `wallet.keypair` + `wallet.mldsaKeypair`

### Frontend

| Route | Component | Purpose |
|-------|-----------|---------|
| `/` | Dashboard | Stats + position grid |
| `/create` | CreatePosition | Multi-step form (tokens → amounts → review) |
| `/position/:id` | PositionDetail | Detail view + top-up/cancel |

---

## Contract Addresses

| Contract | Network | Address |
|----------|---------|---------|
| DCAVault | Testnet | opt1sqzx42tkrx9s3mzx7pg7ezevn66lt76v4pswy35ep |
| MotoSwap Router | Testnet | 0xa02aa5ca4c307107484d5fb690d811df1cf526f8de204d24528653dcae369a0f |
| Keeper | Testnet | opt1pqgsxumy0wvcs0cr9f3ffh30mhdnw4l9jcg65ezygsygk6z5f6ansa2y6ed |
| Fee Recipient | Testnet | opt1pqgsxumy0wvcs0cr9f3ffh30mhdnw4l9jcg65ezygsygk6z5f6ansa2y6ed |

## Fee Model

| Mode | Fee | Mechanism |
|------|-----|-----------|
| OP20→OP20 | 0.25% (25 bps) | On-chain: vault deducts from swap output, sends to feeRecipient |
| BTC→Token | 0.75% (75 bps) | Off-chain: keeper retains fee from sats before NativeSwap execution |

---

## Critical OPNet Patterns (MUST FOLLOW)

1. **Entry point**: `export * from '@btc-vision/btc-runtime/runtime/exports'` (NOT `/runtime`)
2. **Abort handler**: `abort=index-dca/abort` in asconfig
3. **No ECDSA** — Use ML-DSA for signatures
4. **No Buffer** — Use `Uint8Array` + `BufferHelper`
5. **Block.number for timing** — NEVER `medianTimestamp`
6. **Frontend signing**: `signer: null, mldsaSigner: null` — wallet handles it
7. **Backend signing**: `signer: wallet.keypair, mldsaSigner: wallet.mldsaKeypair`
8. **Always `contract.setSender(walletAddress)`** before simulation
9. **Testnet = `networks.opnetTestnet`**, NOT `networks.testnet`
10. **Use `@btc-vision/bitcoin`**, NOT `bitcoinjs-lib`

---

## Environment Variables

### Keeper (.env)
```
KEEPER_MNEMONIC=<your-12-word-mnemonic-here>
RPC_URL=https://testnet.opnet.org
DCA_VAULT_ADDRESS=opt1sqq2z4fjtkkr30w4asuaz85jgskzwxd79gqdefhl2
ROUTER_ADDRESS=0xa02aa5ca4c307107484d5fb690d811df1cf526f8de204d24528653dcae369a0f
POLL_INTERVAL_MS=30000
SLIPPAGE_PERCENT=5
MAX_SATS_PER_TX=50000
FEE_RATE=10
```

> **SECURITY**: Never commit your mnemonic to git. Use `.env` files only.

---

## Build Commands

```bash
# Contract
cd /d/bitdca/contracts && npm run build

# Deploy
cd /d/bitdca/contracts && npx tsx scripts/deploy-testnet.ts

# Frontend
cd /d/bitdca/frontend && npm run dev    # dev
cd /d/bitdca/frontend && npm run build  # prod

# Keeper
cd /d/bitdca/keeper && npm run start
```

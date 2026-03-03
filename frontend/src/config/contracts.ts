import { ABIDataTypes, BitcoinAbiTypes, type BitcoinInterfaceAbi } from 'opnet';

// ── Network & RPC ──────────────────────────────────────────────────────────
export const RPC_URL = import.meta.env.VITE_RPC_URL ?? 'https://testnet.opnet.org';

// ── Contract Addresses ─────────────────────────────────────────────────────
export const DCA_VAULT_ADDRESS =
    import.meta.env.VITE_DCA_VAULT_ADDRESS ?? 'opt1sqzx42tkrx9s3mzx7pg7ezevn66lt76v4pswy35ep';
// Contract public key (32-byte hex) — used for contract method params that need Address objects
// This is the vault's on-chain identity (= contractPublicKey from getCode RPC)
export const DCA_VAULT_ADDRESS_HEX =
    import.meta.env.VITE_DCA_VAULT_ADDRESS_HEX ?? '0x8991221671b62bbbf19362ba9c728c2c7f92e3c5281ec2bfe536c84d1302e15c';
export const MOTOSWAP_ROUTER =
    import.meta.env.VITE_MOTOSWAP_ROUTER ??
    '0xa02aa5ca4c307107484d5fb690d811df1cf526f8de204d24528653dcae369a0f';

// NativeSwap address (for BTC→Token quote reads)
export const NATIVE_SWAP_ADDRESS = import.meta.env.VITE_NATIVE_SWAP_ADDRESS ?? '';

// Keeper's BTC deposit address (users send BTC here for BTC→Token DCA)
export const KEEPER_BTC_ADDRESS = import.meta.env.VITE_KEEPER_BTC_ADDRESS ?? 'opt1pqgsxumy0wvcs0cr9f3ffh30mhdnw4l9jcg65ezygsygk6z5f6ansa2y6ed';

// Fee recipient address (protocol revenue)
export const FEE_RECIPIENT_ADDRESS = import.meta.env.VITE_FEE_RECIPIENT_ADDRESS ?? 'opt1pqgsxumy0wvcs0cr9f3ffh30mhdnw4l9jcg65ezygsygk6z5f6ansa2y6ed';

// Fee rates in basis points
export const OP20_FEE_BPS = 25;  // 0.25%
export const BTC_FEE_BPS = 75;   // 0.75%

// Sentinel value: tokenIn = 0x0000...0000 means "BTC" (not an OP20 token)
export const BTC_SENTINEL =
    '0x0000000000000000000000000000000000000000000000000000000000000000';

// ── Known Tokens (Testnet) ─────────────────────────────────────────────────
export interface TokenInfo {
    address: string;
    symbol: string;
    name: string;
    decimals: number;
    logo?: string;
}

export const KNOWN_TOKENS: TokenInfo[] = [
    {
        address:
            '0xfd4473840751d58d9f8b73bdd57d6c5260453d5518bd7cd02d0a4cf3df9bf4dd',
        symbol: 'MOTO',
        name: 'MotoSwap Token',
        decimals: 18,
    },
    {
        address:
            '0xb09fc29c112af8293539477e23d8df1d3126639642767d707277131352040cbb',
        symbol: 'PILL',
        name: 'PILL Token',
        decimals: 18,
    },
];

// ── Interval Presets ───────────────────────────────────────────────────────
export interface IntervalPreset {
    label: string;
    blocks: number;
    description: string;
}

export const INTERVAL_PRESETS: IntervalPreset[] = [
    { label: 'Every 10 blocks', blocks: 10, description: '~100 minutes' },
    { label: 'Every 50 blocks', blocks: 50, description: '~8 hours' },
    { label: 'Every 144 blocks', blocks: 144, description: '~1 day' },
    { label: 'Every 1008 blocks', blocks: 1008, description: '~1 week' },
    { label: 'Every 4320 blocks', blocks: 4320, description: '~1 month' },
];

// ── DCAVault ABI ───────────────────────────────────────────────────────────
export const DCA_VAULT_ABI: BitcoinInterfaceAbi = [
    {
        name: 'createPosition',
        type: BitcoinAbiTypes.Function,
        inputs: [
            { name: 'tokenIn', type: ABIDataTypes.ADDRESS },
            { name: 'tokenOut', type: ABIDataTypes.ADDRESS },
            { name: 'amountPerExec', type: ABIDataTypes.UINT256 },
            { name: 'intervalBlocks', type: ABIDataTypes.UINT256 },
            { name: 'depositAmount', type: ABIDataTypes.UINT256 },
        ],
        outputs: [{ name: 'positionId', type: ABIDataTypes.UINT256 }],
    },
    {
        name: 'createBTCPosition',
        type: BitcoinAbiTypes.Function,
        inputs: [
            { name: 'owner', type: ABIDataTypes.ADDRESS },
            { name: 'tokenOut', type: ABIDataTypes.ADDRESS },
            { name: 'satsPerExec', type: ABIDataTypes.UINT256 },
            { name: 'intervalBlocks', type: ABIDataTypes.UINT256 },
            { name: 'totalSatsDeposit', type: ABIDataTypes.UINT256 },
        ],
        outputs: [{ name: 'positionId', type: ABIDataTypes.UINT256 }],
    },
    {
        name: 'createBTCPositionPublic',
        type: BitcoinAbiTypes.Function,
        inputs: [
            { name: 'tokenOut', type: ABIDataTypes.ADDRESS },
            { name: 'satsPerExec', type: ABIDataTypes.UINT256 },
            { name: 'intervalBlocks', type: ABIDataTypes.UINT256 },
            { name: 'totalSatsDeposit', type: ABIDataTypes.UINT256 },
        ],
        outputs: [{ name: 'positionId', type: ABIDataTypes.UINT256 }],
    },
    {
        name: 'executeBTCDCA',
        type: BitcoinAbiTypes.Function,
        inputs: [
            { name: 'positionId', type: ABIDataTypes.UINT256 },
            { name: 'amountOut', type: ABIDataTypes.UINT256 },
        ],
        outputs: [{ name: 'recorded', type: ABIDataTypes.UINT256 }],
    },
    {
        name: 'topUp',
        type: BitcoinAbiTypes.Function,
        inputs: [
            { name: 'positionId', type: ABIDataTypes.UINT256 },
            { name: 'amount', type: ABIDataTypes.UINT256 },
        ],
        outputs: [{ name: 'newDeposit', type: ABIDataTypes.UINT256 }],
    },
    {
        name: 'cancelPosition',
        type: BitcoinAbiTypes.Function,
        inputs: [{ name: 'positionId', type: ABIDataTypes.UINT256 }],
        outputs: [{ name: 'refunded', type: ABIDataTypes.UINT256 }],
    },
    {
        name: 'getPosition',
        type: BitcoinAbiTypes.Function,
        inputs: [{ name: 'positionId', type: ABIDataTypes.UINT256 }],
        outputs: [
            { name: 'owner', type: ABIDataTypes.ADDRESS },
            { name: 'tokenIn', type: ABIDataTypes.ADDRESS },
            { name: 'tokenOut', type: ABIDataTypes.ADDRESS },
            { name: 'amountPerExec', type: ABIDataTypes.UINT256 },
            { name: 'intervalBlocks', type: ABIDataTypes.UINT256 },
            { name: 'lastExecBlock', type: ABIDataTypes.UINT256 },
            { name: 'totalExecs', type: ABIDataTypes.UINT256 },
            { name: 'totalSpent', type: ABIDataTypes.UINT256 },
            { name: 'totalReceived', type: ABIDataTypes.UINT256 },
            { name: 'depositRemaining', type: ABIDataTypes.UINT256 },
            { name: 'active', type: ABIDataTypes.UINT256 },
            { name: 'createdBlock', type: ABIDataTypes.UINT256 },
            { name: 'posType', type: ABIDataTypes.UINT256 },
        ],
    },
    {
        name: 'getStats',
        type: BitcoinAbiTypes.Function,
        inputs: [],
        outputs: [
            { name: 'nextPositionId', type: ABIDataTypes.UINT256 },
            { name: 'totalPositions', type: ABIDataTypes.UINT256 },
            { name: 'activePositions', type: ABIDataTypes.UINT256 },
            { name: 'totalExecutions', type: ABIDataTypes.UINT256 },
            { name: 'totalVolume', type: ABIDataTypes.UINT256 },
        ],
    },
    {
        name: 'setNativeSwap',
        type: BitcoinAbiTypes.Function,
        inputs: [{ name: 'newNativeSwap', type: ABIDataTypes.ADDRESS }],
        outputs: [{ name: 'success', type: ABIDataTypes.BOOL }],
    },
    {
        name: 'getNativeSwap',
        type: BitcoinAbiTypes.Function,
        inputs: [],
        outputs: [{ name: 'nativeSwap', type: ABIDataTypes.ADDRESS }],
    },
    {
        name: 'isPaused',
        type: BitcoinAbiTypes.Function,
        inputs: [],
        outputs: [{ name: 'paused', type: ABIDataTypes.BOOL }],
    },
    {
        name: 'setFeeRecipient',
        type: BitcoinAbiTypes.Function,
        inputs: [{ name: 'newFeeRecipient', type: ABIDataTypes.ADDRESS }],
        outputs: [{ name: 'success', type: ABIDataTypes.BOOL }],
    },
    {
        name: 'getFeeRecipient',
        type: BitcoinAbiTypes.Function,
        inputs: [],
        outputs: [{ name: 'feeRecipient', type: ABIDataTypes.ADDRESS }],
    },
];

// ── OP20 ABI (increaseAllowance + balanceOf) ─────────────────────────────
// OPNet OP20 uses increaseAllowance/decreaseAllowance — NOT approve (ATK-05)
export const OP20_ABI: BitcoinInterfaceAbi = [
    {
        name: 'increaseAllowance',
        type: BitcoinAbiTypes.Function,
        inputs: [
            { name: 'spender', type: ABIDataTypes.ADDRESS },
            { name: 'amount', type: ABIDataTypes.UINT256 },
        ],
        outputs: [],
    },
    {
        name: 'decreaseAllowance',
        type: BitcoinAbiTypes.Function,
        inputs: [
            { name: 'spender', type: ABIDataTypes.ADDRESS },
            { name: 'amount', type: ABIDataTypes.UINT256 },
        ],
        outputs: [],
    },
    {
        name: 'balanceOf',
        type: BitcoinAbiTypes.Function,
        inputs: [{ name: 'owner', type: ABIDataTypes.ADDRESS }],
        outputs: [{ name: 'balance', type: ABIDataTypes.UINT256 }],
    },
    {
        name: 'allowance',
        type: BitcoinAbiTypes.Function,
        inputs: [
            { name: 'owner', type: ABIDataTypes.ADDRESS },
            { name: 'spender', type: ABIDataTypes.ADDRESS },
        ],
        outputs: [{ name: 'remaining', type: ABIDataTypes.UINT256 }],
    },
    {
        name: 'name',
        type: BitcoinAbiTypes.Function,
        inputs: [],
        outputs: [{ name: 'name', type: ABIDataTypes.STRING }],
    },
    {
        name: 'symbol',
        type: BitcoinAbiTypes.Function,
        inputs: [],
        outputs: [{ name: 'symbol', type: ABIDataTypes.STRING }],
    },
    {
        name: 'decimals',
        type: BitcoinAbiTypes.Function,
        inputs: [],
        outputs: [{ name: 'decimals', type: ABIDataTypes.UINT8 }],
    },
];

import { ABIDataTypes, BitcoinAbiTypes, OP_NET_ABI } from 'opnet';

export const DCAVaultEvents = [
    {
        name: 'PositionCreated',
        values: [
            { name: 'positionId', type: ABIDataTypes.UINT256 },
            { name: 'owner', type: ABIDataTypes.ADDRESS },
            { name: 'tokenIn', type: ABIDataTypes.ADDRESS },
            { name: 'tokenOut', type: ABIDataTypes.ADDRESS },
            { name: 'amountPerExec', type: ABIDataTypes.UINT256 },
            { name: 'intervalBlocks', type: ABIDataTypes.UINT256 },
        ],
        type: BitcoinAbiTypes.Event,
    },
    {
        name: 'DCAExecuted',
        values: [
            { name: 'positionId', type: ABIDataTypes.UINT256 },
            { name: 'amountIn', type: ABIDataTypes.UINT256 },
            { name: 'amountOut', type: ABIDataTypes.UINT256 },
            { name: 'executionBlock', type: ABIDataTypes.UINT256 },
            { name: 'executionNumber', type: ABIDataTypes.UINT256 },
        ],
        type: BitcoinAbiTypes.Event,
    },
    {
        name: 'BTCPositionCreated',
        values: [
            { name: 'positionId', type: ABIDataTypes.UINT256 },
            { name: 'owner', type: ABIDataTypes.ADDRESS },
            { name: 'tokenOut', type: ABIDataTypes.ADDRESS },
            { name: 'satsPerExec', type: ABIDataTypes.UINT256 },
            { name: 'intervalBlocks', type: ABIDataTypes.UINT256 },
        ],
        type: BitcoinAbiTypes.Event,
    },
    {
        name: 'BTCDCAExecuted',
        values: [
            { name: 'positionId', type: ABIDataTypes.UINT256 },
            { name: 'satsSpent', type: ABIDataTypes.UINT256 },
            { name: 'tokensReceived', type: ABIDataTypes.UINT256 },
            { name: 'executionBlock', type: ABIDataTypes.UINT256 },
        ],
        type: BitcoinAbiTypes.Event,
    },
    {
        name: 'PositionToppedUp',
        values: [
            { name: 'positionId', type: ABIDataTypes.UINT256 },
            { name: 'amount', type: ABIDataTypes.UINT256 },
            { name: 'newDeposit', type: ABIDataTypes.UINT256 },
        ],
        type: BitcoinAbiTypes.Event,
    },
    {
        name: 'PositionCancelled',
        values: [
            { name: 'positionId', type: ABIDataTypes.UINT256 },
            { name: 'owner', type: ABIDataTypes.ADDRESS },
        ],
        type: BitcoinAbiTypes.Event,
    },
    {
        name: 'KeeperUpdated',
        values: [
            { name: 'oldKeeper', type: ABIDataTypes.ADDRESS },
            { name: 'newKeeper', type: ABIDataTypes.ADDRESS },
        ],
        type: BitcoinAbiTypes.Event,
    },
    {
        name: 'RouterUpdated',
        values: [
            { name: 'oldRouter', type: ABIDataTypes.ADDRESS },
            { name: 'newRouter', type: ABIDataTypes.ADDRESS },
        ],
        type: BitcoinAbiTypes.Event,
    },
    {
        name: 'NativeSwapUpdated',
        values: [
            { name: 'oldNativeSwap', type: ABIDataTypes.ADDRESS },
            { name: 'newNativeSwap', type: ABIDataTypes.ADDRESS },
        ],
        type: BitcoinAbiTypes.Event,
    },
    {
        name: 'FeeRecipientUpdated',
        values: [
            { name: 'oldRecipient', type: ABIDataTypes.ADDRESS },
            { name: 'newRecipient', type: ABIDataTypes.ADDRESS },
        ],
        type: BitcoinAbiTypes.Event,
    },
];

export const DCAVaultAbi = [
    {
        name: 'createPosition',
        inputs: [
            { name: 'tokenIn', type: ABIDataTypes.ADDRESS },
            { name: 'tokenOut', type: ABIDataTypes.ADDRESS },
            { name: 'amountPerExec', type: ABIDataTypes.UINT256 },
            { name: 'intervalBlocks', type: ABIDataTypes.UINT256 },
            { name: 'depositAmount', type: ABIDataTypes.UINT256 },
        ],
        outputs: [{ name: 'positionId', type: ABIDataTypes.UINT256 }],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'executeDCA',
        inputs: [
            { name: 'positionId', type: ABIDataTypes.UINT256 },
            { name: 'minAmountOut', type: ABIDataTypes.UINT256 },
        ],
        outputs: [{ name: 'amountOut', type: ABIDataTypes.UINT256 }],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'createBTCPosition',
        inputs: [
            { name: 'owner', type: ABIDataTypes.ADDRESS },
            { name: 'tokenOut', type: ABIDataTypes.ADDRESS },
            { name: 'satsPerExec', type: ABIDataTypes.UINT256 },
            { name: 'intervalBlocks', type: ABIDataTypes.UINT256 },
            { name: 'totalSatsDeposit', type: ABIDataTypes.UINT256 },
        ],
        outputs: [{ name: 'positionId', type: ABIDataTypes.UINT256 }],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'createBTCPositionPublic',
        inputs: [
            { name: 'tokenOut', type: ABIDataTypes.ADDRESS },
            { name: 'satsPerExec', type: ABIDataTypes.UINT256 },
            { name: 'intervalBlocks', type: ABIDataTypes.UINT256 },
            { name: 'totalSatsDeposit', type: ABIDataTypes.UINT256 },
        ],
        outputs: [{ name: 'positionId', type: ABIDataTypes.UINT256 }],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'executeBTCDCA',
        inputs: [
            { name: 'positionId', type: ABIDataTypes.UINT256 },
            { name: 'amountOut', type: ABIDataTypes.UINT256 },
        ],
        outputs: [{ name: 'recorded', type: ABIDataTypes.UINT256 }],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'topUp',
        inputs: [
            { name: 'positionId', type: ABIDataTypes.UINT256 },
            { name: 'amount', type: ABIDataTypes.UINT256 },
        ],
        outputs: [{ name: 'newDeposit', type: ABIDataTypes.UINT256 }],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'cancelPosition',
        inputs: [{ name: 'positionId', type: ABIDataTypes.UINT256 }],
        outputs: [{ name: 'refunded', type: ABIDataTypes.UINT256 }],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'getPosition',
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
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'getStats',
        inputs: [],
        outputs: [
            { name: 'nextPositionId', type: ABIDataTypes.UINT256 },
            { name: 'totalPositions', type: ABIDataTypes.UINT256 },
            { name: 'activePositions', type: ABIDataTypes.UINT256 },
            { name: 'totalExecutions', type: ABIDataTypes.UINT256 },
            { name: 'totalVolume', type: ABIDataTypes.UINT256 },
        ],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'setKeeper',
        inputs: [{ name: 'newKeeper', type: ABIDataTypes.ADDRESS }],
        outputs: [{ name: 'success', type: ABIDataTypes.BOOL }],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'setRouter',
        inputs: [{ name: 'newRouter', type: ABIDataTypes.ADDRESS }],
        outputs: [{ name: 'success', type: ABIDataTypes.BOOL }],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'setNativeSwap',
        inputs: [{ name: 'newNativeSwap', type: ABIDataTypes.ADDRESS }],
        outputs: [{ name: 'success', type: ABIDataTypes.BOOL }],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'getNativeSwap',
        inputs: [],
        outputs: [{ name: 'nativeSwap', type: ABIDataTypes.ADDRESS }],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'setFeeRecipient',
        inputs: [{ name: 'newFeeRecipient', type: ABIDataTypes.ADDRESS }],
        outputs: [{ name: 'success', type: ABIDataTypes.BOOL }],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'getFeeRecipient',
        inputs: [],
        outputs: [{ name: 'feeRecipient', type: ABIDataTypes.ADDRESS }],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'togglePause',
        inputs: [],
        outputs: [{ name: 'paused', type: ABIDataTypes.BOOL }],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'isPaused',
        inputs: [],
        outputs: [{ name: 'paused', type: ABIDataTypes.BOOL }],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'getKeeper',
        inputs: [],
        outputs: [{ name: 'keeper', type: ABIDataTypes.ADDRESS }],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'getRouter',
        inputs: [],
        outputs: [{ name: 'router', type: ABIDataTypes.ADDRESS }],
        type: BitcoinAbiTypes.Function,
    },
    ...DCAVaultEvents,
    ...OP_NET_ABI,
];

export default DCAVaultAbi;

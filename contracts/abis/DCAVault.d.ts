import { Address, AddressMap, ExtendedAddressMap, SchnorrSignature } from '@btc-vision/transaction';
import { CallResult, OPNetEvent, IOP_NETContract } from 'opnet';

// ------------------------------------------------------------------
// Event Definitions
// ------------------------------------------------------------------
export type PositionCreatedEvent = {
    readonly positionId: bigint;
    readonly owner: Address;
    readonly tokenIn: Address;
    readonly tokenOut: Address;
    readonly amountPerExec: bigint;
    readonly intervalBlocks: bigint;
};
export type DCAExecutedEvent = {
    readonly positionId: bigint;
    readonly amountIn: bigint;
    readonly amountOut: bigint;
    readonly executionBlock: bigint;
    readonly executionNumber: bigint;
};
export type BTCPositionCreatedEvent = {
    readonly positionId: bigint;
    readonly owner: Address;
    readonly tokenOut: Address;
    readonly satsPerExec: bigint;
    readonly intervalBlocks: bigint;
};
export type BTCDCAExecutedEvent = {
    readonly positionId: bigint;
    readonly satsSpent: bigint;
    readonly tokensReceived: bigint;
    readonly executionBlock: bigint;
};
export type PositionToppedUpEvent = {
    readonly positionId: bigint;
    readonly amount: bigint;
    readonly newDeposit: bigint;
};
export type PositionCancelledEvent = {
    readonly positionId: bigint;
    readonly owner: Address;
};
export type KeeperUpdatedEvent = {
    readonly oldKeeper: Address;
    readonly newKeeper: Address;
};
export type RouterUpdatedEvent = {
    readonly oldRouter: Address;
    readonly newRouter: Address;
};
export type NativeSwapUpdatedEvent = {
    readonly oldNativeSwap: Address;
    readonly newNativeSwap: Address;
};
export type FeeRecipientUpdatedEvent = {
    readonly oldRecipient: Address;
    readonly newRecipient: Address;
};

// ------------------------------------------------------------------
// Call Results
// ------------------------------------------------------------------

/**
 * @description Represents the result of the createPosition function call.
 */
export type CreatePosition = CallResult<
    {
        positionId: bigint;
    },
    OPNetEvent<PositionCreatedEvent>[]
>;

/**
 * @description Represents the result of the executeDCA function call.
 */
export type ExecuteDCA = CallResult<
    {
        amountOut: bigint;
    },
    OPNetEvent<DCAExecutedEvent>[]
>;

/**
 * @description Represents the result of the createBTCPosition function call.
 */
export type CreateBTCPosition = CallResult<
    {
        positionId: bigint;
    },
    OPNetEvent<BTCPositionCreatedEvent>[]
>;

/**
 * @description Represents the result of the createBTCPositionPublic function call.
 */
export type CreateBTCPositionPublic = CallResult<
    {
        positionId: bigint;
    },
    OPNetEvent<BTCPositionCreatedEvent>[]
>;

/**
 * @description Represents the result of the executeBTCDCA function call.
 */
export type ExecuteBTCDCA = CallResult<
    {
        recorded: bigint;
    },
    OPNetEvent<BTCDCAExecutedEvent>[]
>;

/**
 * @description Represents the result of the topUp function call.
 */
export type TopUp = CallResult<
    {
        newDeposit: bigint;
    },
    OPNetEvent<PositionToppedUpEvent>[]
>;

/**
 * @description Represents the result of the cancelPosition function call.
 */
export type CancelPosition = CallResult<
    {
        refunded: bigint;
    },
    OPNetEvent<PositionCancelledEvent>[]
>;

/**
 * @description Represents the result of the getPosition function call.
 */
export type GetPosition = CallResult<
    {
        owner: Address;
        tokenIn: Address;
        tokenOut: Address;
        amountPerExec: bigint;
        intervalBlocks: bigint;
        lastExecBlock: bigint;
        totalExecs: bigint;
        totalSpent: bigint;
        totalReceived: bigint;
        depositRemaining: bigint;
        active: bigint;
        createdBlock: bigint;
        posType: bigint;
    },
    OPNetEvent<never>[]
>;

/**
 * @description Represents the result of the getStats function call.
 */
export type GetStats = CallResult<
    {
        nextPositionId: bigint;
        totalPositions: bigint;
        activePositions: bigint;
        totalExecutions: bigint;
        totalVolume: bigint;
    },
    OPNetEvent<never>[]
>;

/**
 * @description Represents the result of the setKeeper function call.
 */
export type SetKeeper = CallResult<
    {
        success: boolean;
    },
    OPNetEvent<KeeperUpdatedEvent>[]
>;

/**
 * @description Represents the result of the setRouter function call.
 */
export type SetRouter = CallResult<
    {
        success: boolean;
    },
    OPNetEvent<RouterUpdatedEvent>[]
>;

/**
 * @description Represents the result of the setNativeSwap function call.
 */
export type SetNativeSwap = CallResult<
    {
        success: boolean;
    },
    OPNetEvent<NativeSwapUpdatedEvent>[]
>;

/**
 * @description Represents the result of the getNativeSwap function call.
 */
export type GetNativeSwap = CallResult<
    {
        nativeSwap: Address;
    },
    OPNetEvent<never>[]
>;

/**
 * @description Represents the result of the setFeeRecipient function call.
 */
export type SetFeeRecipient = CallResult<
    {
        success: boolean;
    },
    OPNetEvent<FeeRecipientUpdatedEvent>[]
>;

/**
 * @description Represents the result of the getFeeRecipient function call.
 */
export type GetFeeRecipient = CallResult<
    {
        feeRecipient: Address;
    },
    OPNetEvent<never>[]
>;

/**
 * @description Represents the result of the togglePause function call.
 */
export type TogglePause = CallResult<
    {
        paused: boolean;
    },
    OPNetEvent<never>[]
>;

/**
 * @description Represents the result of the isPaused function call.
 */
export type IsPaused = CallResult<
    {
        paused: boolean;
    },
    OPNetEvent<never>[]
>;

/**
 * @description Represents the result of the getKeeper function call.
 */
export type GetKeeper = CallResult<
    {
        keeper: Address;
    },
    OPNetEvent<never>[]
>;

/**
 * @description Represents the result of the getRouter function call.
 */
export type GetRouter = CallResult<
    {
        router: Address;
    },
    OPNetEvent<never>[]
>;

// ------------------------------------------------------------------
// IDCAVault
// ------------------------------------------------------------------
export interface IDCAVault extends IOP_NETContract {
    createPosition(
        tokenIn: Address,
        tokenOut: Address,
        amountPerExec: bigint,
        intervalBlocks: bigint,
        depositAmount: bigint,
    ): Promise<CreatePosition>;
    executeDCA(positionId: bigint, minAmountOut: bigint): Promise<ExecuteDCA>;
    createBTCPosition(
        owner: Address,
        tokenOut: Address,
        satsPerExec: bigint,
        intervalBlocks: bigint,
        totalSatsDeposit: bigint,
    ): Promise<CreateBTCPosition>;
    createBTCPositionPublic(
        tokenOut: Address,
        satsPerExec: bigint,
        intervalBlocks: bigint,
        totalSatsDeposit: bigint,
    ): Promise<CreateBTCPositionPublic>;
    executeBTCDCA(positionId: bigint, amountOut: bigint): Promise<ExecuteBTCDCA>;
    topUp(positionId: bigint, amount: bigint): Promise<TopUp>;
    cancelPosition(positionId: bigint): Promise<CancelPosition>;
    getPosition(positionId: bigint): Promise<GetPosition>;
    getStats(): Promise<GetStats>;
    setKeeper(newKeeper: Address): Promise<SetKeeper>;
    setRouter(newRouter: Address): Promise<SetRouter>;
    setNativeSwap(newNativeSwap: Address): Promise<SetNativeSwap>;
    getNativeSwap(): Promise<GetNativeSwap>;
    setFeeRecipient(newFeeRecipient: Address): Promise<SetFeeRecipient>;
    getFeeRecipient(): Promise<GetFeeRecipient>;
    togglePause(): Promise<TogglePause>;
    isPaused(): Promise<IsPaused>;
    getKeeper(): Promise<GetKeeper>;
    getRouter(): Promise<GetRouter>;
}

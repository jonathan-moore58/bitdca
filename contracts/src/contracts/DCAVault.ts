import { u256 } from '@btc-vision/as-bignum/assembly';
import {
    Blockchain,
    Address,
    Calldata,
    BytesWriter,
    SafeMath,
    Revert,
    StoredU256,
    StoredBoolean,
    StoredMapU256,
    ReentrancyGuard,
    ReentrancyLevel,
    EMPTY_POINTER,
    TransferHelper,
    OP20Utils,
    encodeSelector,
} from '@btc-vision/btc-runtime/runtime';

import {
    PositionCreatedEvent,
    DCAExecutedEvent,
    PositionCancelledEvent,
    KeeperUpdatedEvent,
    PositionToppedUpEvent,
    RouterUpdatedEvent,
    NativeSwapUpdatedEvent,
    BTCPositionCreatedEvent,
    BTCDCAExecutedEvent,
    BTCRefundRequiredEvent,
    FeeCollectedEvent,
    FeeRecipientUpdatedEvent,
} from '../lib/events';

import {
    POSITION_ACTIVE,
    POSITION_CANCELLED,
    POSITION_TYPE_TOKEN,
    POSITION_TYPE_BTC,
    MIN_INTERVAL_BLOCKS,
    MAX_INTERVAL_BLOCKS,
    MIN_AMOUNT_PER_EXEC,
    BPS_DENOMINATOR,
    OP20_FEE_BPS,
    SWAP_FEE_ON_TRANSFER_SIGNATURE,
} from '../lib/constants';

/**
 * DCAVault — Dollar Cost Averaging on Bitcoin L1 via OPNet.
 *
 * Users deposit OP20 tokens and set a schedule.
 * A keeper bot triggers swaps via MotoSwap at each interval.
 *
 * Features:
 * - Deposit tokenIn, auto-swap to tokenOut at intervals
 * - Configurable amount per execution and interval
 * - Keeper-triggered execution with slippage protection
 * - Position top-up and withdrawal
 * - Emergency pause
 * - Full reentrancy protection
 */
@final
export class DCAVault extends ReentrancyGuard {
    protected readonly reentrancyLevel: ReentrancyLevel = ReentrancyLevel.STANDARD;

    // ── Global state ────────────────────────────────────────────────

    private nextPositionIdPointer: u16 = Blockchain.nextPointer;
    private totalPositionsPointer: u16 = Blockchain.nextPointer;
    private activePositionsPointer: u16 = Blockchain.nextPointer;
    private totalExecutionsPointer: u16 = Blockchain.nextPointer;
    private totalVolumePointer: u16 = Blockchain.nextPointer;
    private pausedPointer: u16 = Blockchain.nextPointer;
    private keeperPointer: u16 = Blockchain.nextPointer;
    private routerPointer: u16 = Blockchain.nextPointer;

    // ── Position storage: positionId → field ────────────────────────

    private posOwnerPointer: u16 = Blockchain.nextPointer;
    private posTokenInPointer: u16 = Blockchain.nextPointer;
    private posTokenOutPointer: u16 = Blockchain.nextPointer;
    private posAmountPerExecPointer: u16 = Blockchain.nextPointer;
    private posIntervalBlocksPointer: u16 = Blockchain.nextPointer;
    private posLastExecBlockPointer: u16 = Blockchain.nextPointer;
    private posTotalExecsPointer: u16 = Blockchain.nextPointer;
    private posTotalSpentPointer: u16 = Blockchain.nextPointer;
    private posTotalReceivedPointer: u16 = Blockchain.nextPointer;
    private posDepositRemainingPointer: u16 = Blockchain.nextPointer;
    private posAccumulatedOutPointer: u16 = Blockchain.nextPointer;
    private posActivePointer: u16 = Blockchain.nextPointer;
    private posCreatedBlockPointer: u16 = Blockchain.nextPointer;
    private posTypePointer: u16 = Blockchain.nextPointer;

    // ── NativeSwap address storage ───────────────────────────────────
    private nativeSwapPointer: u16 = Blockchain.nextPointer;

    // ── Fee recipient address storage ─────────────────────────────────
    private feeRecipientPointer: u16 = Blockchain.nextPointer;

    // ── Stored instances ────────────────────────────────────────────

    private _nextPositionId!: StoredU256;
    private _totalPositions!: StoredU256;
    private _activePositions!: StoredU256;
    private _totalExecutions!: StoredU256;
    private _totalVolume!: StoredU256;
    private _paused!: StoredBoolean;
    private _keeper!: StoredU256;
    private _router!: StoredU256;

    private _posOwner!: StoredMapU256;
    private _posTokenIn!: StoredMapU256;
    private _posTokenOut!: StoredMapU256;
    private _posAmountPerExec!: StoredMapU256;
    private _posIntervalBlocks!: StoredMapU256;
    private _posLastExecBlock!: StoredMapU256;
    private _posTotalExecs!: StoredMapU256;
    private _posTotalSpent!: StoredMapU256;
    private _posTotalReceived!: StoredMapU256;
    private _posDepositRemaining!: StoredMapU256;
    private _posAccumulatedOut!: StoredMapU256;
    private _posActive!: StoredMapU256;
    private _posCreatedBlock!: StoredMapU256;
    private _posType!: StoredMapU256;

    private _nativeSwap!: StoredU256;
    private _feeRecipient!: StoredU256;

    public constructor() {
        super();

        this._nextPositionId = new StoredU256(this.nextPositionIdPointer, EMPTY_POINTER);
        this._totalPositions = new StoredU256(this.totalPositionsPointer, EMPTY_POINTER);
        this._activePositions = new StoredU256(this.activePositionsPointer, EMPTY_POINTER);
        this._totalExecutions = new StoredU256(this.totalExecutionsPointer, EMPTY_POINTER);
        this._totalVolume = new StoredU256(this.totalVolumePointer, EMPTY_POINTER);
        this._paused = new StoredBoolean(this.pausedPointer, false);
        this._keeper = new StoredU256(this.keeperPointer, EMPTY_POINTER);
        this._router = new StoredU256(this.routerPointer, EMPTY_POINTER);

        this._posOwner = new StoredMapU256(this.posOwnerPointer);
        this._posTokenIn = new StoredMapU256(this.posTokenInPointer);
        this._posTokenOut = new StoredMapU256(this.posTokenOutPointer);
        this._posAmountPerExec = new StoredMapU256(this.posAmountPerExecPointer);
        this._posIntervalBlocks = new StoredMapU256(this.posIntervalBlocksPointer);
        this._posLastExecBlock = new StoredMapU256(this.posLastExecBlockPointer);
        this._posTotalExecs = new StoredMapU256(this.posTotalExecsPointer);
        this._posTotalSpent = new StoredMapU256(this.posTotalSpentPointer);
        this._posTotalReceived = new StoredMapU256(this.posTotalReceivedPointer);
        this._posDepositRemaining = new StoredMapU256(this.posDepositRemainingPointer);
        this._posAccumulatedOut = new StoredMapU256(this.posAccumulatedOutPointer);
        this._posActive = new StoredMapU256(this.posActivePointer);
        this._posCreatedBlock = new StoredMapU256(this.posCreatedBlockPointer);
        this._posType = new StoredMapU256(this.posTypePointer);

        this._nativeSwap = new StoredU256(this.nativeSwapPointer, EMPTY_POINTER);
        this._feeRecipient = new StoredU256(this.feeRecipientPointer, EMPTY_POINTER);
    }

    // ── Deployment ──────────────────────────────────────────────────

    public override onDeployment(calldata: Calldata): void {
        const routerAddr: u256 = calldata.readU256();
        const keeperAddr: u256 = calldata.readU256();
        const nativeSwapAddr: u256 = calldata.readU256();
        const feeRecipientAddr: u256 = calldata.readU256();

        this._nextPositionId.value = u256.One;
        this._totalPositions.value = u256.Zero;
        this._activePositions.value = u256.Zero;
        this._totalExecutions.value = u256.Zero;
        this._totalVolume.value = u256.Zero;
        this._router.value = routerAddr;
        this._keeper.value = keeperAddr;
        this._nativeSwap.value = nativeSwapAddr;
        this._feeRecipient.value = feeRecipientAddr;
    }

    // ── Create DCA Position ─────────────────────────────────────────

    /**
     * Create a new DCA position. User must have approved this contract
     * for tokenIn BEFORE calling. Deposit amount is transferred in.
     *
     * @param tokenIn   OP20 token to spend
     * @param tokenOut  OP20 token to buy
     * @param amountPerExec  Amount of tokenIn per execution
     * @param intervalBlocks  Blocks between each execution
     * @param depositAmount  Initial deposit of tokenIn
     */
    @method(
        { name: 'tokenIn', type: ABIDataTypes.ADDRESS },
        { name: 'tokenOut', type: ABIDataTypes.ADDRESS },
        { name: 'amountPerExec', type: ABIDataTypes.UINT256 },
        { name: 'intervalBlocks', type: ABIDataTypes.UINT256 },
        { name: 'depositAmount', type: ABIDataTypes.UINT256 },
    )
    @returns({ name: 'positionId', type: ABIDataTypes.UINT256 })
    @emit('PositionCreated')
    public createPosition(calldata: Calldata): BytesWriter {
        if (this._paused.value) {
            throw new Revert('DCA is paused');
        }

        const tokenIn: Address = calldata.readAddress();
        const tokenOut: Address = calldata.readAddress();
        const amountPerExec: u256 = calldata.readU256();
        const intervalBlocks: u256 = calldata.readU256();
        const depositAmount: u256 = calldata.readU256();
        const sender: Address = Blockchain.tx.sender;

        // Validate inputs
        if (tokenIn == tokenOut) {
            throw new Revert('tokenIn cannot equal tokenOut');
        }
        if (amountPerExec < MIN_AMOUNT_PER_EXEC) {
            throw new Revert('Amount too small');
        }
        if (intervalBlocks < MIN_INTERVAL_BLOCKS) {
            throw new Revert('Interval too short');
        }
        if (intervalBlocks > MAX_INTERVAL_BLOCKS) {
            throw new Revert('Interval too long');
        }
        if (depositAmount < amountPerExec) {
            throw new Revert('Deposit must cover at least 1 execution');
        }

        // Transfer deposit from user → this contract
        this._transferFrom(tokenIn, sender, depositAmount);

        // Store position
        const posId: u256 = this._nextPositionId.value;
        this._posOwner.set(posId, this.addressToU256(sender));
        this._posTokenIn.set(posId, this.addressToU256(tokenIn));
        this._posTokenOut.set(posId, this.addressToU256(tokenOut));
        this._posAmountPerExec.set(posId, amountPerExec);
        this._posIntervalBlocks.set(posId, intervalBlocks);
        this._posLastExecBlock.set(posId, u256.fromU64(Blockchain.block.number));
        this._posTotalExecs.set(posId, u256.Zero);
        this._posTotalSpent.set(posId, u256.Zero);
        this._posTotalReceived.set(posId, u256.Zero);
        this._posDepositRemaining.set(posId, depositAmount);
        this._posAccumulatedOut.set(posId, u256.Zero);
        this._posActive.set(posId, POSITION_ACTIVE);
        this._posCreatedBlock.set(posId, u256.fromU64(Blockchain.block.number));
        this._posType.set(posId, POSITION_TYPE_TOKEN);

        // Update globals
        this._nextPositionId.value = SafeMath.add(posId, u256.One);
        this._totalPositions.value = SafeMath.add(this._totalPositions.value, u256.One);
        this._activePositions.value = SafeMath.add(this._activePositions.value, u256.One);

        // Emit event
        this.emitEvent(new PositionCreatedEvent(
            posId, sender, tokenIn, tokenOut, amountPerExec, intervalBlocks,
        ));

        const writer = new BytesWriter(32);
        writer.writeU256(posId);
        return writer;
    }

    // ── Execute DCA (Keeper only) ───────────────────────────────────

    /**
     * Execute a DCA position. Only callable by the authorized keeper.
     * Swaps tokenIn → tokenOut via MotoSwap router.
     *
     * @param positionId  Position to execute
     * @param minAmountOut  Minimum acceptable output (slippage protection)
     */
    @method(
        { name: 'positionId', type: ABIDataTypes.UINT256 },
        { name: 'minAmountOut', type: ABIDataTypes.UINT256 },
    )
    @returns({ name: 'amountOut', type: ABIDataTypes.UINT256 })
    @emit('DCAExecuted')
    public executeDCA(calldata: Calldata): BytesWriter {
        const positionId: u256 = calldata.readU256();
        const minAmountOut: u256 = calldata.readU256();

        // Only keeper can execute
        const senderU256: u256 = this.addressToU256(Blockchain.tx.sender);
        if (senderU256 != this._keeper.value) {
            throw new Revert('Only keeper');
        }

        if (this._paused.value) {
            throw new Revert('DCA is paused');
        }

        // Validate position
        const active: u256 = this._posActive.get(positionId);
        if (active != POSITION_ACTIVE) {
            throw new Revert('Position not active');
        }

        // Check interval elapsed
        const lastExecBlock: u256 = this._posLastExecBlock.get(positionId);
        const intervalBlocks: u256 = this._posIntervalBlocks.get(positionId);
        const currentBlock: u256 = u256.fromU64(Blockchain.block.number);
        const blocksSinceLast: u256 = SafeMath.sub(currentBlock, lastExecBlock);

        if (blocksSinceLast < intervalBlocks) {
            throw new Revert('Interval not elapsed');
        }

        // Check deposit has enough for this execution
        const amountPerExec: u256 = this._posAmountPerExec.get(positionId);
        const depositRemaining: u256 = this._posDepositRemaining.get(positionId);
        if (depositRemaining < amountPerExec) {
            throw new Revert('Insufficient deposit');
        }

        // ── State update FIRST (reentrancy protection) ──
        const newDeposit: u256 = SafeMath.sub(depositRemaining, amountPerExec);
        this._posDepositRemaining.set(positionId, newDeposit);
        this._posLastExecBlock.set(positionId, currentBlock);

        const execCount: u256 = this._posTotalExecs.get(positionId);
        const newExecCount: u256 = SafeMath.add(execCount, u256.One);
        this._posTotalExecs.set(positionId, newExecCount);

        const totalSpent: u256 = this._posTotalSpent.get(positionId);
        this._posTotalSpent.set(positionId, SafeMath.add(totalSpent, amountPerExec));

        // ── Execute swap via MotoSwap router ──
        const tokenIn: Address = this.u256ToAddress(this._posTokenIn.get(positionId));
        const tokenOut: Address = this.u256ToAddress(this._posTokenOut.get(positionId));
        const router: Address = this.u256ToAddress(this._router.value);
        const owner: Address = this.u256ToAddress(this._posOwner.get(positionId));
        const contractAddr: Address = Blockchain.contract.address;

        // 1. Increase allowance for router to spend our tokenIn
        this._increaseAllowance(tokenIn, router, amountPerExec);

        // 2. Swap via router: tokens sent to THIS CONTRACT (for fee split)
        const amountOut: u256 = this._executeSwap(
            router, tokenIn, tokenOut, amountPerExec, minAmountOut, contractAddr,
        );

        // Validate swap produced output
        if (amountOut.isZero()) {
            throw new Revert('Swap returned zero');
        }

        // 3. Collect 0.25% protocol fee, send remainder to owner
        const feeRecipientU256: u256 = this._feeRecipient.value;
        let userAmount: u256 = amountOut;

        if (feeRecipientU256 != u256.Zero) {
            const feeAmount: u256 = SafeMath.div(
                SafeMath.mul(amountOut, OP20_FEE_BPS),
                BPS_DENOMINATOR,
            );

            if (!feeAmount.isZero()) {
                userAmount = SafeMath.sub(amountOut, feeAmount);
                const feeRecipient: Address = this.u256ToAddress(feeRecipientU256);
                this._transfer(tokenOut, feeRecipient, feeAmount);
                this.emitEvent(new FeeCollectedEvent(positionId, feeAmount, feeRecipient));
            }
        }

        // Transfer remaining tokens to position owner
        this._transfer(tokenOut, owner, userAmount);

        // 4. Update received totals (user amount only — fee excluded)
        const totalReceived: u256 = this._posTotalReceived.get(positionId);
        this._posTotalReceived.set(positionId, SafeMath.add(totalReceived, userAmount));

        const accumulated: u256 = this._posAccumulatedOut.get(positionId);
        this._posAccumulatedOut.set(positionId, SafeMath.add(accumulated, userAmount));

        // 5. Update global stats
        this._totalExecutions.value = SafeMath.add(this._totalExecutions.value, u256.One);
        this._totalVolume.value = SafeMath.add(this._totalVolume.value, amountPerExec);

        // 6. Auto-deactivate if deposit is exhausted
        if (newDeposit < amountPerExec) {
            this._posActive.set(positionId, POSITION_CANCELLED);
            this._activePositions.value = SafeMath.sub(this._activePositions.value, u256.One);
        }

        // Emit
        this.emitEvent(new DCAExecutedEvent(
            positionId, amountPerExec, userAmount, currentBlock, newExecCount,
        ));

        const writer = new BytesWriter(32);
        writer.writeU256(userAmount);
        return writer;
    }

    // ── Create BTC→Token Position (Keeper only) ────────────────────

    /**
     * Create a BTC→Token DCA position. Keeper-only — called after the keeper
     * verifies off-chain that the user has sent BTC to the keeper's wallet.
     *
     * No transferFrom (BTC is not OP20). Deposit tracking is in satoshis.
     *
     * @param owner           The user who owns this position
     * @param tokenOut        OP20 token to buy via NativeSwap
     * @param satsPerExec     Satoshis to spend per execution
     * @param intervalBlocks  Blocks between each execution
     * @param totalSatsDeposit Total satoshis deposited to keeper
     */
    @method(
        { name: 'owner', type: ABIDataTypes.ADDRESS },
        { name: 'tokenOut', type: ABIDataTypes.ADDRESS },
        { name: 'satsPerExec', type: ABIDataTypes.UINT256 },
        { name: 'intervalBlocks', type: ABIDataTypes.UINT256 },
        { name: 'totalSatsDeposit', type: ABIDataTypes.UINT256 },
    )
    @returns({ name: 'positionId', type: ABIDataTypes.UINT256 })
    @emit('BTCPositionCreated')
    public createBTCPosition(calldata: Calldata): BytesWriter {
        // Only keeper can create BTC positions
        const senderU256: u256 = this.addressToU256(Blockchain.tx.sender);
        if (senderU256 != this._keeper.value) {
            throw new Revert('Only keeper');
        }

        if (this._paused.value) {
            throw new Revert('DCA is paused');
        }

        const owner: Address = calldata.readAddress();
        const tokenOut: Address = calldata.readAddress();
        const satsPerExec: u256 = calldata.readU256();
        const intervalBlocks: u256 = calldata.readU256();
        const totalSatsDeposit: u256 = calldata.readU256();

        // Validate inputs
        if (satsPerExec < MIN_AMOUNT_PER_EXEC) {
            throw new Revert('Amount too small');
        }
        if (intervalBlocks < MIN_INTERVAL_BLOCKS) {
            throw new Revert('Interval too short');
        }
        if (intervalBlocks > MAX_INTERVAL_BLOCKS) {
            throw new Revert('Interval too long');
        }
        if (totalSatsDeposit < satsPerExec) {
            throw new Revert('Deposit must cover at least 1 execution');
        }

        // Store position — tokenIn = u256.Zero sentinel (means "BTC")
        const posId: u256 = this._nextPositionId.value;
        this._posOwner.set(posId, this.addressToU256(owner));
        this._posTokenIn.set(posId, u256.Zero); // BTC sentinel
        this._posTokenOut.set(posId, this.addressToU256(tokenOut));
        this._posAmountPerExec.set(posId, satsPerExec);
        this._posIntervalBlocks.set(posId, intervalBlocks);
        this._posLastExecBlock.set(posId, u256.fromU64(Blockchain.block.number));
        this._posTotalExecs.set(posId, u256.Zero);
        this._posTotalSpent.set(posId, u256.Zero);
        this._posTotalReceived.set(posId, u256.Zero);
        this._posDepositRemaining.set(posId, totalSatsDeposit);
        this._posAccumulatedOut.set(posId, u256.Zero);
        this._posActive.set(posId, POSITION_ACTIVE);
        this._posCreatedBlock.set(posId, u256.fromU64(Blockchain.block.number));
        this._posType.set(posId, POSITION_TYPE_BTC);

        // Update globals
        this._nextPositionId.value = SafeMath.add(posId, u256.One);
        this._totalPositions.value = SafeMath.add(this._totalPositions.value, u256.One);
        this._activePositions.value = SafeMath.add(this._activePositions.value, u256.One);

        // Emit event
        this.emitEvent(new BTCPositionCreatedEvent(
            posId, owner, tokenOut, satsPerExec, intervalBlocks,
        ));

        const writer = new BytesWriter(32);
        writer.writeU256(posId);
        return writer;
    }

    // ── Create BTC→Token Position (Public — user calls directly) ─────

    /**
     * Create a BTC→Token DCA position. Callable by ANYONE.
     * The user calls this method via a contract interaction that also
     * includes an optionalOutput sending BTC to the keeper's address.
     *
     * No transferFrom (BTC is not OP20). Deposit tracking is in satoshis.
     * The caller (msg.sender) becomes the position owner.
     *
     * @param tokenOut        OP20 token to buy via NativeSwap
     * @param satsPerExec     Satoshis to spend per execution
     * @param intervalBlocks  Blocks between each execution
     * @param totalSatsDeposit Total satoshis deposited to keeper
     */
    @method(
        { name: 'tokenOut', type: ABIDataTypes.ADDRESS },
        { name: 'satsPerExec', type: ABIDataTypes.UINT256 },
        { name: 'intervalBlocks', type: ABIDataTypes.UINT256 },
        { name: 'totalSatsDeposit', type: ABIDataTypes.UINT256 },
    )
    @returns({ name: 'positionId', type: ABIDataTypes.UINT256 })
    @emit('BTCPositionCreated')
    public createBTCPositionPublic(calldata: Calldata): BytesWriter {
        if (this._paused.value) {
            throw new Revert('DCA is paused');
        }

        const tokenOut: Address = calldata.readAddress();
        const satsPerExec: u256 = calldata.readU256();
        const intervalBlocks: u256 = calldata.readU256();
        const totalSatsDeposit: u256 = calldata.readU256();
        const sender: Address = Blockchain.tx.sender;

        // Validate inputs
        if (satsPerExec < MIN_AMOUNT_PER_EXEC) {
            throw new Revert('Amount too small');
        }
        if (intervalBlocks < MIN_INTERVAL_BLOCKS) {
            throw new Revert('Interval too short');
        }
        if (intervalBlocks > MAX_INTERVAL_BLOCKS) {
            throw new Revert('Interval too long');
        }
        if (totalSatsDeposit < satsPerExec) {
            throw new Revert('Deposit must cover at least 1 execution');
        }

        // Store position — tokenIn = u256.Zero sentinel (means "BTC")
        const posId: u256 = this._nextPositionId.value;
        this._posOwner.set(posId, this.addressToU256(sender));
        this._posTokenIn.set(posId, u256.Zero); // BTC sentinel
        this._posTokenOut.set(posId, this.addressToU256(tokenOut));
        this._posAmountPerExec.set(posId, satsPerExec);
        this._posIntervalBlocks.set(posId, intervalBlocks);
        this._posLastExecBlock.set(posId, u256.fromU64(Blockchain.block.number));
        this._posTotalExecs.set(posId, u256.Zero);
        this._posTotalSpent.set(posId, u256.Zero);
        this._posTotalReceived.set(posId, u256.Zero);
        this._posDepositRemaining.set(posId, totalSatsDeposit);
        this._posAccumulatedOut.set(posId, u256.Zero);
        this._posActive.set(posId, POSITION_ACTIVE);
        this._posCreatedBlock.set(posId, u256.fromU64(Blockchain.block.number));
        this._posType.set(posId, POSITION_TYPE_BTC);

        // Update globals
        this._nextPositionId.value = SafeMath.add(posId, u256.One);
        this._totalPositions.value = SafeMath.add(this._totalPositions.value, u256.One);
        this._activePositions.value = SafeMath.add(this._activePositions.value, u256.One);

        // Emit event
        this.emitEvent(new BTCPositionCreatedEvent(
            posId, sender, tokenOut, satsPerExec, intervalBlocks,
        ));

        const writer = new BytesWriter(32);
        writer.writeU256(posId);
        return writer;
    }

    // ── Execute BTC DCA (Keeper only) ────────────────────────────────

    /**
     * Record a BTC→Token DCA execution. Keeper-only — called AFTER the keeper
     * has completed the NativeSwap reserve→swap externally.
     *
     * No on-chain swap happens here. The keeper reports the result and the
     * contract updates accounting. Tokens from NativeSwap go directly to
     * the user's wallet (the keeper sets the user as recipient in NativeSwap).
     *
     * @param positionId  BTC position to record execution for
     * @param amountOut   Tokens the user received from NativeSwap
     */
    @method(
        { name: 'positionId', type: ABIDataTypes.UINT256 },
        { name: 'amountOut', type: ABIDataTypes.UINT256 },
    )
    @returns({ name: 'recorded', type: ABIDataTypes.UINT256 })
    @emit('BTCDCAExecuted')
    public executeBTCDCA(calldata: Calldata): BytesWriter {
        const positionId: u256 = calldata.readU256();
        const amountOut: u256 = calldata.readU256();

        if (amountOut.isZero()) {
            throw new Revert('amountOut cannot be zero');
        }

        // Only keeper can execute
        const senderU256: u256 = this.addressToU256(Blockchain.tx.sender);
        if (senderU256 != this._keeper.value) {
            throw new Revert('Only keeper');
        }

        if (this._paused.value) {
            throw new Revert('DCA is paused');
        }

        // Must be a BTC position
        const posType: u256 = this._posType.get(positionId);
        if (posType != POSITION_TYPE_BTC) {
            throw new Revert('Not a BTC position');
        }

        // Validate position is active
        const active: u256 = this._posActive.get(positionId);
        if (active != POSITION_ACTIVE) {
            throw new Revert('Position not active');
        }

        // Check interval elapsed
        const lastExecBlock: u256 = this._posLastExecBlock.get(positionId);
        const intervalBlocks: u256 = this._posIntervalBlocks.get(positionId);
        const currentBlock: u256 = u256.fromU64(Blockchain.block.number);
        const blocksSinceLast: u256 = SafeMath.sub(currentBlock, lastExecBlock);

        if (blocksSinceLast < intervalBlocks) {
            throw new Revert('Interval not elapsed');
        }

        // Check deposit has enough sats for this execution
        const satsPerExec: u256 = this._posAmountPerExec.get(positionId);
        const depositRemaining: u256 = this._posDepositRemaining.get(positionId);
        if (depositRemaining < satsPerExec) {
            throw new Revert('Insufficient deposit');
        }

        // ── State updates ──
        const newDeposit: u256 = SafeMath.sub(depositRemaining, satsPerExec);
        this._posDepositRemaining.set(positionId, newDeposit);
        this._posLastExecBlock.set(positionId, currentBlock);

        const execCount: u256 = this._posTotalExecs.get(positionId);
        const newExecCount: u256 = SafeMath.add(execCount, u256.One);
        this._posTotalExecs.set(positionId, newExecCount);

        const totalSpent: u256 = this._posTotalSpent.get(positionId);
        this._posTotalSpent.set(positionId, SafeMath.add(totalSpent, satsPerExec));

        const totalReceived: u256 = this._posTotalReceived.get(positionId);
        this._posTotalReceived.set(positionId, SafeMath.add(totalReceived, amountOut));

        const accumulated: u256 = this._posAccumulatedOut.get(positionId);
        this._posAccumulatedOut.set(positionId, SafeMath.add(accumulated, amountOut));

        // Update global stats
        this._totalExecutions.value = SafeMath.add(this._totalExecutions.value, u256.One);
        this._totalVolume.value = SafeMath.add(this._totalVolume.value, satsPerExec);

        // Auto-deactivate if deposit is exhausted
        if (newDeposit < satsPerExec) {
            this._posActive.set(positionId, POSITION_CANCELLED);
            this._activePositions.value = SafeMath.sub(this._activePositions.value, u256.One);
        }

        // Emit
        this.emitEvent(new BTCDCAExecutedEvent(
            positionId, satsPerExec, amountOut, currentBlock,
        ));

        const writer = new BytesWriter(32);
        writer.writeU256(amountOut);
        return writer;
    }

    // ── Top Up Position ─────────────────────────────────────────────

    @method(
        { name: 'positionId', type: ABIDataTypes.UINT256 },
        { name: 'amount', type: ABIDataTypes.UINT256 },
    )
    @returns({ name: 'newDeposit', type: ABIDataTypes.UINT256 })
    @emit('PositionToppedUp')
    public topUp(calldata: Calldata): BytesWriter {
        const positionId: u256 = calldata.readU256();
        const amount: u256 = calldata.readU256();
        const sender: Address = Blockchain.tx.sender;
        const senderU256: u256 = this.addressToU256(sender);

        const posType: u256 = this._posType.get(positionId);

        if (posType == POSITION_TYPE_BTC) {
            // BTC positions: only keeper can top up (after verifying BTC receipt)
            if (senderU256 != this._keeper.value) {
                throw new Revert('Only keeper can top up BTC positions');
            }
        } else {
            // Token positions: only owner can top up
            const ownerU256: u256 = this._posOwner.get(positionId);
            if (ownerU256 != senderU256) {
                throw new Revert('Not position owner');
            }

            // Transfer OP20 deposit from user → this contract
            const tokenIn: Address = this.u256ToAddress(this._posTokenIn.get(positionId));
            this._transferFrom(tokenIn, sender, amount);
        }

        const currentDeposit: u256 = this._posDepositRemaining.get(positionId);
        const newDeposit: u256 = SafeMath.add(currentDeposit, amount);
        this._posDepositRemaining.set(positionId, newDeposit);

        // Reactivate if it was deactivated due to empty deposit
        const active: u256 = this._posActive.get(positionId);
        if (active != POSITION_ACTIVE) {
            this._posActive.set(positionId, POSITION_ACTIVE);
            this._activePositions.value = SafeMath.add(this._activePositions.value, u256.One);
        }

        this.emitEvent(new PositionToppedUpEvent(positionId, amount, newDeposit));

        const writer = new BytesWriter(32);
        writer.writeU256(newDeposit);
        return writer;
    }

    // ── Cancel Position ─────────────────────────────────────────────

    @method({ name: 'positionId', type: ABIDataTypes.UINT256 })
    @returns({ name: 'refunded', type: ABIDataTypes.UINT256 })
    @emit('PositionCancelled')
    public cancelPosition(calldata: Calldata): BytesWriter {
        const positionId: u256 = calldata.readU256();
        const sender: Address = Blockchain.tx.sender;

        const ownerU256: u256 = this._posOwner.get(positionId);
        if (ownerU256 != this.addressToU256(sender)) {
            throw new Revert('Not position owner');
        }

        const active: u256 = this._posActive.get(positionId);
        if (active != POSITION_ACTIVE) {
            throw new Revert('Position not active');
        }

        // Deactivate
        this._posActive.set(positionId, POSITION_CANCELLED);
        this._activePositions.value = SafeMath.sub(this._activePositions.value, u256.One);

        // Refund remaining deposit
        const remaining: u256 = this._posDepositRemaining.get(positionId);
        const posType: u256 = this._posType.get(positionId);

        if (!remaining.isZero()) {
            this._posDepositRemaining.set(positionId, u256.Zero);

            if (posType == POSITION_TYPE_BTC) {
                // BTC positions: emit event so keeper sends BTC refund off-chain
                const owner: Address = this.u256ToAddress(ownerU256);
                this.emitEvent(new BTCRefundRequiredEvent(positionId, owner, remaining));
            } else {
                // Token positions: refund OP20 tokens on-chain
                const tokenIn: Address = this.u256ToAddress(this._posTokenIn.get(positionId));
                this._transfer(tokenIn, sender, remaining);
            }
        }

        this.emitEvent(new PositionCancelledEvent(positionId, sender));

        const writer = new BytesWriter(32);
        writer.writeU256(remaining);
        return writer;
    }

    // ── View: Get Position ──────────────────────────────────────────

    @method({ name: 'positionId', type: ABIDataTypes.UINT256 })
    @returns(
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
    )
    public getPosition(calldata: Calldata): BytesWriter {
        const positionId: u256 = calldata.readU256();

        const writer = new BytesWriter(416);
        writer.writeAddress(this.u256ToAddress(this._posOwner.get(positionId)));
        writer.writeAddress(this.u256ToAddress(this._posTokenIn.get(positionId)));
        writer.writeAddress(this.u256ToAddress(this._posTokenOut.get(positionId)));
        writer.writeU256(this._posAmountPerExec.get(positionId));
        writer.writeU256(this._posIntervalBlocks.get(positionId));
        writer.writeU256(this._posLastExecBlock.get(positionId));
        writer.writeU256(this._posTotalExecs.get(positionId));
        writer.writeU256(this._posTotalSpent.get(positionId));
        writer.writeU256(this._posTotalReceived.get(positionId));
        writer.writeU256(this._posDepositRemaining.get(positionId));
        writer.writeU256(this._posActive.get(positionId));
        writer.writeU256(this._posCreatedBlock.get(positionId));
        writer.writeU256(this._posType.get(positionId));
        return writer;
    }

    // ── View: Get Global Stats ──────────────────────────────────────

    @method()
    @returns(
        { name: 'nextPositionId', type: ABIDataTypes.UINT256 },
        { name: 'totalPositions', type: ABIDataTypes.UINT256 },
        { name: 'activePositions', type: ABIDataTypes.UINT256 },
        { name: 'totalExecutions', type: ABIDataTypes.UINT256 },
        { name: 'totalVolume', type: ABIDataTypes.UINT256 },
    )
    public getStats(_calldata: Calldata): BytesWriter {
        const writer = new BytesWriter(160);
        writer.writeU256(this._nextPositionId.value);
        writer.writeU256(this._totalPositions.value);
        writer.writeU256(this._activePositions.value);
        writer.writeU256(this._totalExecutions.value);
        writer.writeU256(this._totalVolume.value);
        return writer;
    }

    // ── Admin: Set Keeper ───────────────────────────────────────────

    @method({ name: 'newKeeper', type: ABIDataTypes.ADDRESS })
    @returns({ name: 'success', type: ABIDataTypes.BOOL })
    @emit('KeeperUpdated')
    public setKeeper(calldata: Calldata): BytesWriter {
        this.onlyDeployer(Blockchain.tx.sender);

        const newKeeper: Address = calldata.readAddress();
        const oldKeeper: Address = this.u256ToAddress(this._keeper.value);
        this._keeper.value = this.addressToU256(newKeeper);

        this.emitEvent(new KeeperUpdatedEvent(oldKeeper, newKeeper));

        const writer = new BytesWriter(1);
        writer.writeBoolean(true);
        return writer;
    }

    // ── Admin: Set Router ───────────────────────────────────────────

    @method({ name: 'newRouter', type: ABIDataTypes.ADDRESS })
    @returns({ name: 'success', type: ABIDataTypes.BOOL })
    @emit('RouterUpdated')
    public setRouter(calldata: Calldata): BytesWriter {
        this.onlyDeployer(Blockchain.tx.sender);

        const newRouter: Address = calldata.readAddress();
        const oldRouter: Address = this.u256ToAddress(this._router.value);
        this._router.value = this.addressToU256(newRouter);

        this.emitEvent(new RouterUpdatedEvent(oldRouter, newRouter));

        const writer = new BytesWriter(1);
        writer.writeBoolean(true);
        return writer;
    }

    // ── Admin: Set NativeSwap ────────────────────────────────────────

    @method({ name: 'newNativeSwap', type: ABIDataTypes.ADDRESS })
    @returns({ name: 'success', type: ABIDataTypes.BOOL })
    @emit('NativeSwapUpdated')
    public setNativeSwap(calldata: Calldata): BytesWriter {
        this.onlyDeployer(Blockchain.tx.sender);

        const newNativeSwap: Address = calldata.readAddress();
        const oldNativeSwap: Address = this.u256ToAddress(this._nativeSwap.value);
        this._nativeSwap.value = this.addressToU256(newNativeSwap);

        this.emitEvent(new NativeSwapUpdatedEvent(oldNativeSwap, newNativeSwap));

        const writer = new BytesWriter(1);
        writer.writeBoolean(true);
        return writer;
    }

    // ── View: Get NativeSwap ────────────────────────────────────────

    @method()
    @returns({ name: 'nativeSwap', type: ABIDataTypes.ADDRESS })
    public getNativeSwap(_calldata: Calldata): BytesWriter {
        const writer = new BytesWriter(32);
        writer.writeAddress(this.u256ToAddress(this._nativeSwap.value));
        return writer;
    }

    // ── Admin: Set Fee Recipient ─────────────────────────────────────

    @method({ name: 'newFeeRecipient', type: ABIDataTypes.ADDRESS })
    @returns({ name: 'success', type: ABIDataTypes.BOOL })
    @emit('FeeRecipientUpdated')
    public setFeeRecipient(calldata: Calldata): BytesWriter {
        this.onlyDeployer(Blockchain.tx.sender);

        const newFeeRecipient: Address = calldata.readAddress();
        const oldFeeRecipient: Address = this.u256ToAddress(this._feeRecipient.value);
        this._feeRecipient.value = this.addressToU256(newFeeRecipient);

        this.emitEvent(new FeeRecipientUpdatedEvent(oldFeeRecipient, newFeeRecipient));

        const writer = new BytesWriter(1);
        writer.writeBoolean(true);
        return writer;
    }

    // ── View: Get Fee Recipient ──────────────────────────────────────

    @method()
    @returns({ name: 'feeRecipient', type: ABIDataTypes.ADDRESS })
    public getFeeRecipient(_calldata: Calldata): BytesWriter {
        const writer = new BytesWriter(32);
        writer.writeAddress(this.u256ToAddress(this._feeRecipient.value));
        return writer;
    }

    // ── Admin: Pause / Unpause ──────────────────────────────────────

    @method()
    @returns({ name: 'paused', type: ABIDataTypes.BOOL })
    public togglePause(_calldata: Calldata): BytesWriter {
        this.onlyDeployer(Blockchain.tx.sender);
        this._paused.value = !this._paused.value;

        const writer = new BytesWriter(1);
        writer.writeBoolean(this._paused.value);
        return writer;
    }

    // ── View: Is Paused ─────────────────────────────────────────────

    @method()
    @returns({ name: 'paused', type: ABIDataTypes.BOOL })
    public isPaused(_calldata: Calldata): BytesWriter {
        const writer = new BytesWriter(1);
        writer.writeBoolean(this._paused.value);
        return writer;
    }

    // ── View: Get Keeper ────────────────────────────────────────────

    @method()
    @returns({ name: 'keeper', type: ABIDataTypes.ADDRESS })
    public getKeeper(_calldata: Calldata): BytesWriter {
        const writer = new BytesWriter(32);
        writer.writeAddress(this.u256ToAddress(this._keeper.value));
        return writer;
    }

    // ── View: Get Router ────────────────────────────────────────────

    @method()
    @returns({ name: 'router', type: ABIDataTypes.ADDRESS })
    public getRouter(_calldata: Calldata): BytesWriter {
        const writer = new BytesWriter(32);
        writer.writeAddress(this.u256ToAddress(this._router.value));
        return writer;
    }

    // ── Internal: Cross-contract calls ──────────────────────────────
    //
    // Uses TransferHelper / OP20Utils from btc-runtime which compute
    // selectors via SHA256 (encodeSelector), NOT keccak256 like EVM.

    private _transferFrom(token: Address, from: Address, amount: u256): void {
        TransferHelper.transferFrom(token, from, Blockchain.contract.address, amount);
    }

    private _transfer(token: Address, to: Address, amount: u256): void {
        TransferHelper.transfer(token, to, amount);
    }

    private _increaseAllowance(token: Address, spender: Address, amount: u256): void {
        TransferHelper.increaseAllowance(token, spender, amount);
    }

    /**
     * Execute a swap on MotoSwap router.
     *
     * The router's only swap function is:
     *   swapExactTokensForTokensSupportingFeeOnTransferTokens(
     *       uint256 amountIn, uint256 amountOutMin, address[] path,
     *       address to, uint64 deadline
     *   )
     *
     * It returns NOTHING (void), so we measure the recipient's tokenOut
     * balance before & after to compute the actual output amount.
     */
    private _executeSwap(
        router: Address,
        tokenIn: Address,
        tokenOut: Address,
        amountIn: u256,
        minAmountOut: u256,
        recipient: Address,
    ): u256 {
        // 1. Snapshot recipient's tokenOut balance BEFORE the swap
        const balBefore: u256 = OP20Utils.balanceOf(tokenOut, recipient);

        // 2. Build calldata for the router swap
        //    deadline is UINT64, not UINT256 — matches the MotoSwap ABI
        const deadline: u64 = Blockchain.block.number + 100;
        const path: Address[] = [tokenIn, tokenOut];

        // Calldata size: selector(4) + amountIn(32) + amountOutMin(32)
        //   + path array (u16 length prefix 2 + 2*32 addresses) + to(32) + deadline(8)
        //   = 4 + 32 + 32 + 66 + 32 + 8 = 174
        const writer = new BytesWriter(174);
        writer.writeSelector(encodeSelector(SWAP_FEE_ON_TRANSFER_SIGNATURE));
        writer.writeU256(amountIn);
        writer.writeU256(minAmountOut);
        writer.writeAddressArray(path);
        writer.writeAddress(recipient);
        writer.writeU64(deadline);

        Blockchain.call(router, writer);

        // 3. Snapshot recipient's tokenOut balance AFTER the swap
        const balAfter: u256 = OP20Utils.balanceOf(tokenOut, recipient);

        // 4. Compute actual output via balance difference
        const amountOut: u256 = SafeMath.sub(balAfter, balBefore);

        return amountOut;
    }

    // ── Address conversion helpers ──────────────────────────────────

    private addressToU256(addr: Address): u256 {
        return u256.fromUint8ArrayBE(addr);
    }

    private u256ToAddress(value: u256): Address {
        return Address.fromUint8Array(value.toUint8Array(true));
    }
}

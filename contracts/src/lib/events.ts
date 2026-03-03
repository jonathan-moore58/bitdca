import { u256 } from '@btc-vision/as-bignum/assembly';
import {
    NetEvent,
    Address,
    BytesWriter,
} from '@btc-vision/btc-runtime/runtime';

/** Emitted when a new DCA position is created */
export class PositionCreatedEvent extends NetEvent {
    constructor(
        positionId: u256,
        owner: Address,
        tokenIn: Address,
        tokenOut: Address,
        amountPerExec: u256,
        intervalBlocks: u256,
    ) {
        const data: BytesWriter = new BytesWriter(192);
        data.writeU256(positionId);
        data.writeAddress(owner);
        data.writeAddress(tokenIn);
        data.writeAddress(tokenOut);
        data.writeU256(amountPerExec);
        data.writeU256(intervalBlocks);
        super('PositionCreated', data);
    }
}

/** Emitted when a DCA execution completes */
export class DCAExecutedEvent extends NetEvent {
    constructor(
        positionId: u256,
        amountIn: u256,
        amountOut: u256,
        executionBlock: u256,
        executionNumber: u256,
    ) {
        const data: BytesWriter = new BytesWriter(160);
        data.writeU256(positionId);
        data.writeU256(amountIn);
        data.writeU256(amountOut);
        data.writeU256(executionBlock);
        data.writeU256(executionNumber);
        super('DCAExecuted', data);
    }
}

/** Emitted when a position is cancelled */
export class PositionCancelledEvent extends NetEvent {
    constructor(positionId: u256, owner: Address) {
        const data: BytesWriter = new BytesWriter(64);
        data.writeU256(positionId);
        data.writeAddress(owner);
        super('PositionCancelled', data);
    }
}

/** Emitted when keeper is updated */
export class KeeperUpdatedEvent extends NetEvent {
    constructor(oldKeeper: Address, newKeeper: Address) {
        const data: BytesWriter = new BytesWriter(64);
        data.writeAddress(oldKeeper);
        data.writeAddress(newKeeper);
        super('KeeperUpdated', data);
    }
}

/** Emitted when a position is topped up with more deposit */
export class PositionToppedUpEvent extends NetEvent {
    constructor(positionId: u256, amount: u256, newDeposit: u256) {
        const data: BytesWriter = new BytesWriter(96);
        data.writeU256(positionId);
        data.writeU256(amount);
        data.writeU256(newDeposit);
        super('PositionToppedUp', data);
    }
}

/** Emitted when the router address is updated */
export class RouterUpdatedEvent extends NetEvent {
    constructor(oldRouter: Address, newRouter: Address) {
        const data: BytesWriter = new BytesWriter(64);
        data.writeAddress(oldRouter);
        data.writeAddress(newRouter);
        super('RouterUpdated', data);
    }
}

/** Emitted when the NativeSwap address is updated */
export class NativeSwapUpdatedEvent extends NetEvent {
    constructor(oldNativeSwap: Address, newNativeSwap: Address) {
        const data: BytesWriter = new BytesWriter(64);
        data.writeAddress(oldNativeSwap);
        data.writeAddress(newNativeSwap);
        super('NativeSwapUpdated', data);
    }
}

/** Emitted when a BTC→Token DCA position is created (keeper-only) */
export class BTCPositionCreatedEvent extends NetEvent {
    constructor(
        positionId: u256,
        owner: Address,
        tokenOut: Address,
        satsPerExec: u256,
        intervalBlocks: u256,
    ) {
        const data: BytesWriter = new BytesWriter(192);
        data.writeU256(positionId);
        data.writeAddress(owner);
        data.writeAddress(tokenOut);
        data.writeU256(satsPerExec);
        data.writeU256(intervalBlocks);
        super('BTCPositionCreated', data);
    }
}

/** Emitted when a BTC DCA execution is recorded by the keeper */
export class BTCDCAExecutedEvent extends NetEvent {
    constructor(
        positionId: u256,
        satsSpent: u256,
        tokensReceived: u256,
        executionBlock: u256,
    ) {
        const data: BytesWriter = new BytesWriter(128);
        data.writeU256(positionId);
        data.writeU256(satsSpent);
        data.writeU256(tokensReceived);
        data.writeU256(executionBlock);
        super('BTCDCAExecuted', data);
    }
}

/** Emitted when a protocol fee is collected from a DCA execution */
export class FeeCollectedEvent extends NetEvent {
    constructor(positionId: u256, feeAmount: u256, feeRecipient: Address) {
        const data: BytesWriter = new BytesWriter(96);
        data.writeU256(positionId);
        data.writeU256(feeAmount);
        data.writeAddress(feeRecipient);
        super('FeeCollected', data);
    }
}

/** Emitted when the fee recipient address is updated */
export class FeeRecipientUpdatedEvent extends NetEvent {
    constructor(oldRecipient: Address, newRecipient: Address) {
        const data: BytesWriter = new BytesWriter(64);
        data.writeAddress(oldRecipient);
        data.writeAddress(newRecipient);
        super('FeeRecipientUpdated', data);
    }
}

/** Emitted when a BTC position is cancelled and keeper must refund remaining sats */
export class BTCRefundRequiredEvent extends NetEvent {
    constructor(positionId: u256, owner: Address, satsRemaining: u256) {
        const data: BytesWriter = new BytesWriter(96);
        data.writeU256(positionId);
        data.writeAddress(owner);
        data.writeU256(satsRemaining);
        super('BTCRefundRequired', data);
    }
}

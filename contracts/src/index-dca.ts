import { Blockchain } from '@btc-vision/btc-runtime/runtime';
import { revertOnError } from '@btc-vision/btc-runtime/runtime/abort/abort';
import { DCAVault } from './contracts/DCAVault';

Blockchain.contract = (): DCAVault => {
    return new DCAVault();
};

// MUST be this exact path — NOT /runtime
export * from '@btc-vision/btc-runtime/runtime/exports';

export function abort(message: string, fileName: string, line: u32, column: u32): void {
    revertOnError(message, fileName, line, column);
}

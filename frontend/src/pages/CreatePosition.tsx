import { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { useWallet } from '../hooks/useWallet';
import { useTransaction } from '../hooks/useTransaction';
import { useTokenBalances } from '../hooks/useTokenBalances';
import { getDCAVault, getOP20, toAddress } from '../services/ContractService';
import {
    KNOWN_TOKENS,
    INTERVAL_PRESETS,
    DCA_VAULT_ADDRESS_HEX,
    type TokenInfo,
} from '../config/contracts';

const TOKEN_COLORS: Record<string, string> = {
    MOTO: '#f97316',
    PILL: '#ec4899',
    ODYS: '#8b5cf6',
};

type Step = 'tokens' | 'amount' | 'review';

const STEP_META: { key: Step; label: string; icon: React.ReactNode }[] = [
    {
        key: 'tokens',
        label: 'Tokens',
        icon: (
            <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM8.732 6.232a2.5 2.5 0 0 1 3.536 0 .75.75 0 1 0 1.06-1.06A4 4 0 0 0 6.5 8v.165c0 .364.034.728.1 1.085h-.35a.75.75 0 0 0 0 1.5H7.3c.52.93 1.395 1.635 2.428 1.932a.75.75 0 1 0 .392-1.448 2.508 2.508 0 0 1-1.285-.896h1.415a.75.75 0 0 0 0-1.5H7.813a3.243 3.243 0 0 1-.063-.552V8a2.5 2.5 0 0 1 .982-1.768Z" clipRule="evenodd" />
            </svg>
        ),
    },
    {
        key: 'amount',
        label: 'Amount',
        icon: (
            <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="currentColor">
                <path d="M10.75 10.818v2.614A3.13 3.13 0 0 0 11.888 13c.482-.315.612-.648.612-.875 0-.227-.13-.56-.612-.875a3.13 3.13 0 0 0-1.138-.432ZM8.33 8.62c.053.055.115.11.184.164.208.16.46.284.736.363V6.603a2.45 2.45 0 0 0-.92.358c-.31.2-.44.48-.44.682 0 .37.266.698.44.977Z" />
                <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-8-6a.75.75 0 0 1 .75.75v.316a3.78 3.78 0 0 1 1.653.713c.426.33.744.74.925 1.2a.75.75 0 0 1-1.395.55 1.35 1.35 0 0 0-.447-.563 2.187 2.187 0 0 0-.736-.363V9.3c.514.093 1.01.24 1.457.463.6.303 1.043.756 1.043 1.359 0 .603-.443 1.056-1.043 1.36-.447.222-.943.37-1.457.462v.34a.75.75 0 0 1-1.5 0v-.34a3.78 3.78 0 0 1-1.653-.713 2.426 2.426 0 0 1-.925-1.2.75.75 0 0 1 1.395-.55c.12.306.328.544.447.563.203.127.428.23.683.31v-2.7c-.514-.093-1.01-.24-1.457-.462C6.443 8.093 6 7.64 6 7.037c0-.603.443-1.056 1.043-1.36.447-.222.943-.37 1.457-.462v-.34A.75.75 0 0 1 10 4.125Z" clipRule="evenodd" />
            </svg>
        ),
    },
    {
        key: 'review',
        label: 'Review',
        icon: (
            <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="currentColor">
                <path fillRule="evenodd" d="M16.403 12.652a3 3 0 0 0 0-5.304 3 3 0 0 0-3.75-3.751 3 3 0 0 0-5.305 0 3 3 0 0 0-3.751 3.75 3 3 0 0 0 0 5.305 3 3 0 0 0 3.75 3.751 3 3 0 0 0 5.305 0 3 3 0 0 0 3.751-3.75Zm-2.546-4.46a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.06l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clipRule="evenodd" />
            </svg>
        ),
    },
];

// --- Session persistence helpers (survives page reload) ---
const FORM_STORAGE_KEY = 'bitdca-create-form';

interface SavedFormState {
    step: Step;
    tokenInAddr: string | null;
    tokenOutAddr: string | null;
    amountPerExec: string;
    totalDeposit: string;
    selectedInterval: number;
    /** Custom tokens loaded from chain (not in KNOWN_TOKENS) */
    customTokenIn?: TokenInfo | null;
    customTokenOut?: TokenInfo | null;
}

function saveFormState(state: SavedFormState) {
    try {
        sessionStorage.setItem(FORM_STORAGE_KEY, JSON.stringify(state));
    } catch { /* quota exceeded — ignore */ }
}

function loadFormState(): SavedFormState | null {
    try {
        const raw = sessionStorage.getItem(FORM_STORAGE_KEY);
        if (!raw) return null;
        return JSON.parse(raw) as SavedFormState;
    } catch {
        return null;
    }
}

function clearFormState() {
    try {
        sessionStorage.removeItem(FORM_STORAGE_KEY);
    } catch { /* ignore */ }
}

export default function CreatePosition() {
    const { address, walletAddress, connected, connect, addressObj, provider } = useWallet();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const tx = useTransaction();

    // Restore form state from sessionStorage (survives reload)
    const saved = useMemo(() => loadFormState(), []);
    const restoredTokenIn = useMemo(() => {
        if (!saved?.tokenInAddr) return null;
        return KNOWN_TOKENS.find((t) => t.address === saved.tokenInAddr) ?? saved?.customTokenIn ?? null;
    }, [saved]);
    const restoredTokenOut = useMemo(() => {
        if (!saved?.tokenOutAddr) return null;
        return KNOWN_TOKENS.find((t) => t.address === saved.tokenOutAddr) ?? saved?.customTokenOut ?? null;
    }, [saved]);

    const [step, setStep] = useState<Step>(saved?.step ?? 'tokens');
    const [tokenIn, setTokenIn] = useState<TokenInfo | null>(restoredTokenIn);
    const [tokenOut, setTokenOut] = useState<TokenInfo | null>(restoredTokenOut);
    const [amountPerExec, setAmountPerExec] = useState(saved?.amountPerExec ?? '');
    const [totalDeposit, setTotalDeposit] = useState(saved?.totalDeposit ?? '');
    const [selectedInterval, setSelectedInterval] = useState(saved?.selectedInterval ?? 2);
    const [approving, setApproving] = useState(false);
    const [approved, setApproved] = useState(false);
    const [waitingConfirm, setWaitingConfirm] = useState(false);

    // Custom token input states
    const [showCustomIn, setShowCustomIn] = useState(false);
    const [showCustomOut, setShowCustomOut] = useState(false);
    const [customAddrIn, setCustomAddrIn] = useState('');
    const [customAddrOut, setCustomAddrOut] = useState('');
    const [loadingCustom, setLoadingCustom] = useState(false);
    const [customError, setCustomError] = useState('');

    const isValidHex = (addr: string) => /^0x[a-fA-F0-9]{64}$/.test(addr);

    /** Read token name/symbol/decimals from chain and create TokenInfo */
    const loadCustomToken = useCallback(async (hexAddr: string): Promise<TokenInfo | null> => {
        if (!isValidHex(hexAddr)) return null;
        try {
            const contract = getOP20(hexAddr, addressObj ?? undefined);
            let symbol = hexAddr.slice(0, 6) + '…';
            let name = 'Custom Token';
            let decimals = 18;
            try {
                const symRes = await contract.symbol();
                if (!symRes.revert && symRes.properties.symbol) symbol = symRes.properties.symbol as string;
            } catch { /* fallback */ }
            try {
                const nameRes = await contract.name();
                if (!nameRes.revert && nameRes.properties.name) name = nameRes.properties.name as string;
            } catch { /* fallback */ }
            try {
                const decRes = await contract.decimals();
                if (!decRes.revert) decimals = Number(decRes.properties.decimals) || 18;
            } catch { /* fallback */ }
            return { address: hexAddr, symbol, name, decimals };
        } catch {
            return null;
        }
    }, [addressObj]);

    // Persist form state to sessionStorage whenever it changes
    const isCustomIn = tokenIn ? !KNOWN_TOKENS.some((t) => t.address === tokenIn.address) : false;
    const isCustomOut = tokenOut ? !KNOWN_TOKENS.some((t) => t.address === tokenOut.address) : false;

    useEffect(() => {
        saveFormState({
            step,
            tokenInAddr: tokenIn?.address ?? null,
            tokenOutAddr: tokenOut?.address ?? null,
            amountPerExec,
            totalDeposit,
            selectedInterval,
            customTokenIn: isCustomIn ? tokenIn : null,
            customTokenOut: isCustomOut ? tokenOut : null,
        });
    }, [step, tokenIn, tokenOut, amountPerExec, totalDeposit, selectedInterval, isCustomIn, isCustomOut]);

    const { data: balances } = useTokenBalances();

    const intervalBlocks = INTERVAL_PRESETS[selectedInterval]?.blocks ?? 144;

    // Get balance for a token address
    const getBalance = (addr: string | undefined): bigint => {
        if (!addr || !balances) return 0n;
        const found = balances.find((b) => b.address.toLowerCase() === addr.toLowerCase());
        return found?.balance ?? 0n;
    };

    // Get on-chain decimals for a token (from balances query, which reads decimals() from chain)
    const getDecimals = (addr: string | undefined): number => {
        if (!addr || !balances) return 18;
        const found = balances.find((b) => b.address.toLowerCase() === addr.toLowerCase());
        return found?.decimals ?? 18;
    };

    const tokenInDecimals = tokenIn ? getDecimals(tokenIn.address) : 18;

    const formatBalance = (val: bigint, decimals = 18): string => {
        if (val === 0n) return '0';
        const str = val.toString().padStart(decimals + 1, '0');
        const whole = str.slice(0, str.length - decimals) || '0';
        const frac = str.slice(str.length - decimals).replace(/0+$/, '');
        const num = parseFloat(`${whole}.${frac || '0'}`);

        // Compact notation for large numbers
        if (num >= 1_000_000_000_000) return `${(num / 1_000_000_000_000).toFixed(2)}T`;
        if (num >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(2)}B`;
        if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(2)}M`;
        if (num >= 100_000) return `${(num / 1_000).toFixed(1)}K`;

        if (!frac) return Number(whole).toLocaleString();
        return `${Number(whole).toLocaleString()}.${frac.slice(0, 4)}`;
    };

    // Full precision for input fields (no compact notation)
    const formatBalanceFull = (val: bigint, decimals = 18): string => {
        if (val === 0n) return '0';
        const str = val.toString().padStart(decimals + 1, '0');
        const whole = str.slice(0, str.length - decimals) || '0';
        const frac = str.slice(str.length - decimals).replace(/0+$/, '');
        if (!frac) return whole;
        return `${whole}.${frac}`;
    };

    const tokenInBalance = getBalance(tokenIn?.address);

    const execCount = useMemo(() => {
        if (!amountPerExec || !totalDeposit) return 0;
        const perExec = parseFloat(amountPerExec);
        const deposit = parseFloat(totalDeposit);
        if (perExec <= 0 || deposit <= 0) return 0;
        return Math.floor(deposit / perExec);
    }, [amountPerExec, totalDeposit]);

    const totalBlocks = execCount * intervalBlocks;

    const toUnits = (val: string, decimals = 18): bigint => {
        if (!val || isNaN(Number(val)) || Number(val) <= 0) return 0n;
        const [whole = '0', frac = ''] = val.split('.');
        const paddedFrac = frac.padEnd(decimals, '0').slice(0, decimals);
        return BigInt(whole + paddedFrac);
    };

    const isAmountValid = useMemo(() => {
        if (!amountPerExec || !totalDeposit) return false;
        const perExec = Number(amountPerExec);
        const deposit = Number(totalDeposit);
        if (isNaN(perExec) || isNaN(deposit)) return false;
        if (perExec <= 0 || deposit <= 0) return false;
        if (deposit < perExec) return false;
        const fracPerExec = amountPerExec.split('.')[1] ?? '';
        const fracDeposit = totalDeposit.split('.')[1] ?? '';
        if (fracPerExec.length > tokenInDecimals) return false;
        if (fracDeposit.length > tokenInDecimals) return false;
        return true;
    }, [amountPerExec, totalDeposit, tokenInDecimals]);

    // Check existing on-chain allowance when entering review step
    // This survives page reloads — if user already approved, skip straight to Create
    const checkExistingAllowance = useCallback(async () => {
        if (!tokenIn || !addressObj || !totalDeposit || approved) return;
        try {
            const depositUnits = toUnits(totalDeposit, tokenInDecimals);
            if (depositUnits === 0n) return;
            const readToken = getOP20(tokenIn.address, addressObj ?? undefined);
            const vaultAddr = toAddress(DCA_VAULT_ADDRESS_HEX);
            const ownerAddr = toAddress(addressObj.toString());
            const res = await readToken.allowance(ownerAddr, vaultAddr);
            if (!res.revert) {
                const current = res.properties.remaining as bigint;
                console.log('[DCA] Existing allowance check: %s (need %s)', String(current), String(depositUnits));
                if (current >= depositUnits) {
                    setApproved(true);
                }
            }
        } catch (err) {
            console.warn('[DCA] Allowance check error:', err);
        }
    }, [tokenIn, addressObj, totalDeposit, approved, tokenInDecimals]);

    useEffect(() => {
        if (step === 'review') {
            checkExistingAllowance();
        }
    }, [step, checkExistingAllowance]);

    const handleApprove = async () => {
        if (!tokenIn || !address) return;
        setApproving(true);
        try {
            const depositUnits = toUnits(totalDeposit, tokenInDecimals);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const token = getOP20(tokenIn.address, addressObj ?? undefined, (provider ?? undefined) as any);
            const result = await tx.execute(
                () => token.increaseAllowance(toAddress(DCA_VAULT_ADDRESS_HEX), depositUnits),
                walletAddress,
            );
            if (result) {
                // Wait for the allowance tx to be confirmed on-chain before enabling create
                setWaitingConfirm(true);
                const readToken = getOP20(tokenIn.address, addressObj ?? undefined);
                const vaultAddr = toAddress(DCA_VAULT_ADDRESS_HEX);
                const ownerAddr = toAddress(addressObj?.toString() ?? '');

                for (let attempt = 0; attempt < 40; attempt++) {
                    await new Promise((r) => setTimeout(r, 5_000));
                    try {
                        const res = await readToken.allowance(ownerAddr, vaultAddr);
                        if (!res.revert) {
                            const current = res.properties.remaining as bigint;
                            console.log('[DCA] Allowance poll #%d: %s (need %s)', attempt + 1, String(current), String(depositUnits));
                            if (current >= depositUnits) {
                                setApproved(true);
                                setWaitingConfirm(false);
                                return;
                            }
                        }
                    } catch (err) {
                        console.warn('[DCA] Allowance poll error:', err);
                    }
                }
                // Timed out — do NOT auto-approve, let user retry
                setWaitingConfirm(false);
                console.warn('[DCA] Allowance polling timed out after 40 attempts');
            }
        } finally {
            setApproving(false);
        }
    };

    const handleCreate = async () => {
        if (!tokenIn || !tokenOut || !address) return;
        const perExecUnits = toUnits(amountPerExec, tokenInDecimals);
        const depositUnits = toUnits(totalDeposit, tokenInDecimals);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const vault = getDCAVault(addressObj ?? undefined, (provider ?? undefined) as any);
        const result = await tx.execute(
            () =>
                vault.createPosition(
                    toAddress(tokenIn.address),
                    toAddress(tokenOut.address),
                    perExecUnits,
                    BigInt(intervalBlocks),
                    depositUnits,
                ),
            walletAddress,
        );
        if (result) {
            // Clear saved form state — position created successfully
            clearFormState();
            // Invalidate cached stats/positions so Dashboard refetches
            await queryClient.invalidateQueries({ queryKey: ['dca-stats'] });
            await queryClient.invalidateQueries({ queryKey: ['dca-positions'] });
            setTimeout(() => navigate('/'), 2000);
        }
    };

    if (!connected) {
        return (
            <div className="mx-auto max-w-2xl px-4 py-16 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500/20 to-amber-500/10">
                    <svg viewBox="0 0 24 24" className="h-8 w-8 text-orange-400" fill="none" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
                    </svg>
                </div>
                <h2 className="text-xl font-bold text-[var(--text-primary)]">
                    Connect Wallet First
                </h2>
                <p className="mt-2 text-[var(--text-secondary)]">
                    You need to connect your wallet to create a DCA position.
                </p>
                <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={connect}
                    className="mt-6 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-orange-500/25"
                >
                    Connect Wallet
                </motion.button>
            </div>
        );
    }

    const currentStepIdx = STEP_META.findIndex((s) => s.key === step);

    return (
        <div className="mx-auto max-w-2xl px-4 py-8">
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 shadow-lg shadow-orange-500/25">
                        <svg viewBox="0 0 24 24" className="h-5 w-5 text-white" fill="none" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                        </svg>
                    </div>
                    <div>
                        <h1 className="text-2xl font-extrabold text-[var(--text-primary)]">New DCA Position</h1>
                        <p className="text-sm text-[var(--text-secondary)]">
                            Set up automatic dollar-cost averaging via MotoSwap
                        </p>
                    </div>
                </div>
            </motion.div>

            {/* Mode Toggle */}
            <div className="mt-4 flex rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-1 gap-1">
                <div className="flex-1 flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md shadow-orange-500/20">
                    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM8.732 6.232a2.5 2.5 0 0 1 3.536 0 .75.75 0 1 0 1.06-1.06A4 4 0 0 0 6.5 8v.165c0 .364.034.728.1 1.085h-.35a.75.75 0 0 0 0 1.5H7.3c.52.93 1.395 1.635 2.428 1.932a.75.75 0 1 0 .392-1.448 2.508 2.508 0 0 1-1.285-.896h1.415a.75.75 0 0 0 0-1.5H7.813a3.243 3.243 0 0 1-.063-.552V8a2.5 2.5 0 0 1 .982-1.768Z" clipRule="evenodd" />
                    </svg>
                    Token &rarr; Token
                </div>
                <div className="flex-1 flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold text-[var(--text-secondary)]/50 cursor-not-allowed relative">
                    <svg viewBox="0 0 20 20" className="h-4 w-4 opacity-50" fill="currentColor">
                        <path d="M10.75 10.818v2.614A3.13 3.13 0 0 0 11.888 13c.482-.315.612-.648.612-.875 0-.227-.13-.56-.612-.875a3.13 3.13 0 0 0-1.138-.432ZM8.33 8.62c.053.055.115.11.184.164.208.16.46.284.736.363V6.603a2.45 2.45 0 0 0-.92.358c-.31.2-.44.48-.44.682 0 .37.266.698.44.977Z" />
                        <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-8-6a.75.75 0 0 1 .75.75v.316a3.78 3.78 0 0 1 1.653.713c.426.33.744.74.925 1.2a.75.75 0 0 1-1.395.55 1.35 1.35 0 0 0-.447-.563 2.187 2.187 0 0 0-.736-.363V9.3c.514.093 1.01.24 1.457.463.6.303 1.043.756 1.043 1.359 0 .603-.443 1.056-1.043 1.36-.447.222-.943.37-1.457.462v.34a.75.75 0 0 1-1.5 0v-.34a3.78 3.78 0 0 1-1.653-.713 2.426 2.426 0 0 1-.925-1.2.75.75 0 0 1 1.395-.55c.12.306.328.544.447.563.203.127.428.23.683.31v-2.7c-.514-.093-1.01-.24-1.457-.462C6.443 8.093 6 7.64 6 7.037c0-.603.443-1.056 1.043-1.36.447-.222.943-.37 1.457-.462v-.34A.75.75 0 0 1 10 4.125Z" clipRule="evenodd" />
                    </svg>
                    <span className="opacity-50">BTC &rarr; Token</span>
                    <span className="absolute -top-1.5 -right-1 rounded-full bg-amber-500/20 px-1.5 py-0.5 text-[8px] font-bold text-amber-400 uppercase tracking-wider ring-1 ring-amber-500/30">Soon</span>
                </div>
            </div>

            {/* Step Indicator */}
            <div className="mt-6 flex items-center gap-1">
                {STEP_META.map((s, i) => (
                    <div key={s.key} className="flex items-center gap-1 flex-1">
                        <button
                            onClick={() => { if (i < currentStepIdx) setStep(s.key); }}
                            disabled={i > currentStepIdx}
                            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition-all flex-1 justify-center ${
                                step === s.key
                                    ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md shadow-orange-500/20'
                                    : i < currentStepIdx
                                      ? 'bg-emerald-500/15 text-emerald-400 cursor-pointer hover:bg-emerald-500/20'
                                      : 'bg-[var(--bg-card)] text-[var(--text-secondary)] border border-[var(--border)]'
                            }`}
                        >
                            {i < currentStepIdx ? (
                                <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="currentColor">
                                    <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
                                </svg>
                            ) : s.icon}
                            <span className="hidden sm:inline">{s.label}</span>
                        </button>
                        {i < 2 && <div className={`h-px w-4 shrink-0 ${i < currentStepIdx ? 'bg-emerald-500/40' : 'bg-[var(--border)]'}`} />}
                    </div>
                ))}
            </div>

            {/* Step Content */}
            <AnimatePresence mode="wait">
                {step === 'tokens' && (
                    <motion.div key="tokens" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="mt-8 space-y-6">
                        <div>
                                <label className="flex items-center gap-2 text-sm font-medium text-[var(--text-primary)] mb-3">
                                    <svg viewBox="0 0 20 20" className="h-4 w-4 text-orange-400" fill="currentColor">
                                        <path fillRule="evenodd" d="M4.5 2A1.5 1.5 0 0 0 3 3.5v13A1.5 1.5 0 0 0 4.5 18h11a1.5 1.5 0 0 0 1.5-1.5V7.621a1.5 1.5 0 0 0-.44-1.06l-4.12-4.122A1.5 1.5 0 0 0 11.378 2H4.5Z" clipRule="evenodd" />
                                    </svg>
                                    Spend Token (Token In)
                                </label>
                                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                                    {KNOWN_TOKENS.map((token) => {
                                        const color = TOKEN_COLORS[token.symbol] ?? '#6366f1';
                                        return (
                                            <button key={token.address} onClick={() => { setTokenIn(token); setShowCustomIn(false); }} className={`rounded-xl border p-4 text-left transition-all ${tokenIn?.address === token.address ? 'border-orange-500 bg-orange-500/10 shadow-md shadow-orange-500/10' : 'border-[var(--border)] bg-[var(--bg-card)] hover:border-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)]'}`}>
                                                <div className="flex items-center gap-3">
                                                    <div className="h-8 w-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0" style={{ background: `linear-gradient(135deg, ${color}, ${color}88)` }}>{token.symbol.charAt(0)}</div>
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-semibold text-[var(--text-primary)]">{token.symbol}</p>
                                                        <p className="text-[10px] text-[var(--text-secondary)] truncate">
                                                            {balances ? `Bal: ${formatBalance(getBalance(token.address), getDecimals(token.address))}` : token.name}
                                                        </p>
                                                    </div>
                                                </div>
                                            </button>
                                        );
                                    })}
                                    {/* Custom Token option */}
                                    <button onClick={() => setShowCustomIn(!showCustomIn)} className={`rounded-xl border p-4 text-left transition-all ${showCustomIn || (tokenIn && !KNOWN_TOKENS.some(t => t.address === tokenIn.address)) ? 'border-orange-500 bg-orange-500/10 shadow-md shadow-orange-500/10' : 'border-dashed border-[var(--border)] bg-[var(--bg-card)] hover:border-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)]'}`}>
                                        <div className="flex items-center gap-3">
                                            <div className="h-8 w-8 rounded-full flex items-center justify-center text-orange-400 text-xs font-bold shrink-0 border border-dashed border-orange-400/40 bg-orange-500/10">+</div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-semibold text-[var(--text-primary)]">Custom</p>
                                                <p className="text-[10px] text-[var(--text-secondary)] truncate">Paste address</p>
                                            </div>
                                        </div>
                                    </button>
                                </div>
                                {/* Custom Token In input */}
                                {showCustomIn && (
                                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-3 space-y-2">
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                value={customAddrIn}
                                                onChange={(e) => { setCustomAddrIn(e.target.value); setCustomError(''); }}
                                                placeholder="0x... (64 hex chars)"
                                                className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2.5 text-xs font-mono text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/40 focus:border-orange-500 focus:outline-none"
                                            />
                                            <motion.button
                                                whileTap={{ scale: 0.95 }}
                                                disabled={!isValidHex(customAddrIn) || loadingCustom}
                                                onClick={async () => {
                                                    setLoadingCustom(true);
                                                    setCustomError('');
                                                    const info = await loadCustomToken(customAddrIn);
                                                    if (info) {
                                                        setTokenIn(info);
                                                        setShowCustomIn(false);
                                                    } else {
                                                        setCustomError('Not a valid OP20 token or RPC unreachable');
                                                    }
                                                    setLoadingCustom(false);
                                                }}
                                                className="rounded-lg bg-orange-500 px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-40"
                                            >
                                                {loadingCustom ? (
                                                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" /><path fill="currentColor" className="opacity-75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                                                ) : 'Load'}
                                            </motion.button>
                                        </div>
                                        {customError && <p className="text-[10px] text-red-400">{customError}</p>}
                                        {tokenIn && !KNOWN_TOKENS.some(t => t.address === tokenIn.address) && (
                                            <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-2 flex items-center gap-2">
                                                <svg viewBox="0 0 20 20" className="h-3.5 w-3.5 text-emerald-400 shrink-0" fill="currentColor"><path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" /></svg>
                                                <span className="text-[10px] text-emerald-400">{tokenIn.symbol} — {tokenIn.name}</span>
                                            </div>
                                        )}
                                    </motion.div>
                                )}
                            </div>

                        <div>
                            <label className="flex items-center gap-2 text-sm font-medium text-[var(--text-primary)] mb-3">
                                <svg viewBox="0 0 20 20" className="h-4 w-4 text-emerald-400" fill="currentColor">
                                    <path fillRule="evenodd" d="M4.5 2A1.5 1.5 0 0 0 3 3.5v13A1.5 1.5 0 0 0 4.5 18h11a1.5 1.5 0 0 0 1.5-1.5V7.621a1.5 1.5 0 0 0-.44-1.06l-4.12-4.122A1.5 1.5 0 0 0 11.378 2H4.5Z" clipRule="evenodd" />
                                </svg>
                                Receive Token (Token Out)
                            </label>
                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                                {KNOWN_TOKENS.filter((token) => token.address !== tokenIn?.address).map((token) => {
                                    const color = TOKEN_COLORS[token.symbol] ?? '#6366f1';
                                    return (
                                        <button key={token.address} onClick={() => { setTokenOut(token); setShowCustomOut(false); }} className={`rounded-xl border p-4 text-left transition-all ${tokenOut?.address === token.address ? 'border-orange-500 bg-orange-500/10 shadow-md shadow-orange-500/10' : 'border-[var(--border)] bg-[var(--bg-card)] hover:border-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)]'}`}>
                                            <div className="flex items-center gap-3">
                                                <div className="h-8 w-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0" style={{ background: `linear-gradient(135deg, ${color}, ${color}88)` }}>{token.symbol.charAt(0)}</div>
                                                <div className="min-w-0">
                                                    <p className="text-sm font-semibold text-[var(--text-primary)]">{token.symbol}</p>
                                                    <p className="text-[10px] text-[var(--text-secondary)] truncate">{token.name}</p>
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })}
                                {/* Custom Token Out option */}
                                <button onClick={() => setShowCustomOut(!showCustomOut)} className={`rounded-xl border p-4 text-left transition-all ${showCustomOut || (tokenOut && !KNOWN_TOKENS.some(t => t.address === tokenOut.address)) ? 'border-orange-500 bg-orange-500/10 shadow-md shadow-orange-500/10' : 'border-dashed border-[var(--border)] bg-[var(--bg-card)] hover:border-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)]'}`}>
                                    <div className="flex items-center gap-3">
                                        <div className="h-8 w-8 rounded-full flex items-center justify-center text-orange-400 text-xs font-bold shrink-0 border border-dashed border-orange-400/40 bg-orange-500/10">+</div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-semibold text-[var(--text-primary)]">Custom</p>
                                            <p className="text-[10px] text-[var(--text-secondary)] truncate">Paste address</p>
                                        </div>
                                    </div>
                                </button>
                            </div>
                            {/* Custom Token Out input */}
                            {showCustomOut && (
                                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-3 space-y-2">
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={customAddrOut}
                                            onChange={(e) => { setCustomAddrOut(e.target.value); setCustomError(''); }}
                                            placeholder="0x... (64 hex chars)"
                                            className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2.5 text-xs font-mono text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/40 focus:border-orange-500 focus:outline-none"
                                        />
                                        <motion.button
                                            whileTap={{ scale: 0.95 }}
                                            disabled={!isValidHex(customAddrOut) || loadingCustom}
                                            onClick={async () => {
                                                setLoadingCustom(true);
                                                setCustomError('');
                                                const info = await loadCustomToken(customAddrOut);
                                                if (info) {
                                                    setTokenOut(info);
                                                    setShowCustomOut(false);
                                                } else {
                                                    setCustomError('Not a valid OP20 token or RPC unreachable');
                                                }
                                                setLoadingCustom(false);
                                            }}
                                            className="rounded-lg bg-orange-500 px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-40"
                                        >
                                            {loadingCustom ? (
                                                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" /><path fill="currentColor" className="opacity-75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                                            ) : 'Load'}
                                        </motion.button>
                                    </div>
                                    {customError && <p className="text-[10px] text-red-400">{customError}</p>}
                                    {tokenOut && !KNOWN_TOKENS.some(t => t.address === tokenOut.address) && (
                                        <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-2 flex items-center gap-2">
                                            <svg viewBox="0 0 20 20" className="h-3.5 w-3.5 text-emerald-400 shrink-0" fill="currentColor"><path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" /></svg>
                                            <span className="text-[10px] text-emerald-400">{tokenOut.symbol} — {tokenOut.name}</span>
                                        </div>
                                    )}
                                </motion.div>
                            )}
                        </div>

                        {/* Pair preview */}
                        {tokenIn && tokenOut && (
                            <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl bg-orange-500/5 border border-orange-500/20 p-4 flex items-center justify-center gap-4">
                                <div className="flex items-center gap-2">
                                    <div className="h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white" style={{ background: TOKEN_COLORS[tokenIn!.symbol] ?? '#6366f1' }}>{tokenIn!.symbol.charAt(0)}</div>
                                    <span className="text-sm font-semibold text-[var(--text-primary)]">{tokenIn!.symbol}</span>
                                </div>
                                <svg viewBox="0 0 20 20" className="h-5 w-5 text-orange-400" fill="currentColor">
                                    <path fillRule="evenodd" d="M3 10a.75.75 0 0 1 .75-.75h10.638L10.23 5.29a.75.75 0 1 1 1.04-1.08l5.5 5.25a.75.75 0 0 1 0 1.08l-5.5 5.25a.75.75 0 1 1-1.04-1.08l4.158-3.96H3.75A.75.75 0 0 1 3 10Z" clipRule="evenodd" />
                                </svg>
                                <div className="flex items-center gap-2">
                                    <div className="h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white" style={{ background: TOKEN_COLORS[tokenOut!.symbol] ?? '#6366f1' }}>{tokenOut!.symbol.charAt(0)}</div>
                                    <span className="text-sm font-semibold text-[var(--text-primary)]">{tokenOut!.symbol}</span>
                                </div>
                            </motion.div>
                        )}

                        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} disabled={!tokenIn || !tokenOut} onClick={() => setStep('amount')} className="w-full rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 py-3.5 text-sm font-semibold text-white shadow-lg shadow-orange-500/25 disabled:opacity-40 disabled:shadow-none">
                            Continue
                        </motion.button>
                    </motion.div>
                )}

                {step === 'amount' && (
                    <motion.div key="amount" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="mt-8 space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                                Amount Per Execution
                            </label>
                            <div className="relative">
                                <input type="number" value={amountPerExec} onChange={(e) => setAmountPerExec(e.target.value)} placeholder="0.0" className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-card)] px-4 py-3.5 text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/50 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500/50" />
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium text-[var(--text-secondary)]">{tokenIn?.symbol}</span>
                            </div>
                        </div>

                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="block text-sm font-medium text-[var(--text-primary)]">
                                    Total Deposit
                                </label>
                                {tokenIn && tokenInBalance > 0n && (
                                    <button
                                        onClick={() => setTotalDeposit(formatBalanceFull(tokenInBalance, tokenInDecimals))}
                                        className="flex items-center gap-1.5 text-[10px] font-semibold text-orange-400 hover:text-orange-300 transition-colors"
                                    >
                                        <svg viewBox="0 0 16 16" className="h-3 w-3" fill="currentColor"><path d="M8 1a5.5 5.5 0 0 0-5.348 6.788l-.382 2.678a.5.5 0 0 0 .564.564l2.678-.382A5.5 5.5 0 1 0 8 1Z" /></svg>
                                        Bal: {formatBalance(tokenInBalance, tokenInDecimals)} {tokenIn.symbol}
                                        <span className="rounded bg-orange-500/20 px-1.5 py-0.5">MAX</span>
                                    </button>
                                )}
                            </div>
                            <div className="relative">
                                <input type="number" value={totalDeposit} onChange={(e) => setTotalDeposit(e.target.value)} placeholder="0.0" className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-card)] px-4 py-3.5 text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/50 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500/50" />
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium text-[var(--text-secondary)]">{tokenIn?.symbol}</span>
                            </div>
                            {execCount > 0 && (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-2 rounded-lg bg-[var(--bg-primary)] p-3 flex items-center gap-3">
                                    <svg viewBox="0 0 20 20" className="h-4 w-4 text-blue-400 shrink-0" fill="currentColor">
                                        <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-7-4a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM9 9a.75.75 0 0 0 0 1.5h.253a.25.25 0 0 1 .244.304l-.459 2.066A1.75 1.75 0 0 0 10.747 15H11a.75.75 0 0 0 0-1.5h-.253a.25.25 0 0 1-.244-.304l.459-2.066A1.75 1.75 0 0 0 9.253 9H9Z" clipRule="evenodd" />
                                    </svg>
                                    <span className="text-xs text-[var(--text-secondary)]"><strong className="text-[var(--text-primary)]">{execCount}</strong> executions over <strong className="text-[var(--text-primary)]">~{totalBlocks.toLocaleString()}</strong> blocks</span>
                                </motion.div>
                            )}
                            {totalDeposit && tokenInBalance > 0n && tokenIn && (() => {
                                const [w, f = ''] = totalDeposit.split('.');
                                const depositUnits = BigInt(w + f.padEnd(tokenInDecimals, '0').slice(0, tokenInDecimals));
                                if (depositUnits > tokenInBalance) {
                                    return (
                                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-2 rounded-lg bg-red-500/10 border border-red-500/20 p-3 flex items-center gap-3">
                                            <svg viewBox="0 0 20 20" className="h-4 w-4 text-red-400 shrink-0" fill="currentColor">
                                                <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495ZM10 5a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 5Zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
                                            </svg>
                                            <span className="text-xs text-red-400">Insufficient balance. You have {formatBalance(tokenInBalance, tokenInDecimals)} {tokenIn.symbol}</span>
                                        </motion.div>
                                    );
                                }
                                return null;
                            })()}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-[var(--text-primary)] mb-3">Execution Interval</label>
                            <div className="space-y-2">
                                {INTERVAL_PRESETS.map((preset, i) => (
                                    <button key={i} onClick={() => setSelectedInterval(i)} className={`w-full rounded-xl border p-3.5 text-left transition-all flex items-center justify-between ${selectedInterval === i ? 'border-orange-500 bg-orange-500/10 shadow-sm shadow-orange-500/10' : 'border-[var(--border)] bg-[var(--bg-card)] hover:border-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)]'}`}>
                                        <div className="flex items-center gap-3">
                                            <div className={`h-2 w-2 rounded-full ${selectedInterval === i ? 'bg-orange-500' : 'bg-[var(--text-secondary)]/30'}`} />
                                            <span className="text-sm font-medium text-[var(--text-primary)]">{preset.label}</span>
                                        </div>
                                        <span className="text-xs text-[var(--text-secondary)]">{preset.description}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button onClick={() => setStep('tokens')} className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] px-6 py-3.5 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]">Back</button>
                            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} disabled={!isAmountValid || execCount < 1} onClick={() => setStep('review')} className="flex-1 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 py-3.5 text-sm font-semibold text-white shadow-lg shadow-orange-500/25 disabled:opacity-40 disabled:shadow-none">Review Position</motion.button>
                        </div>
                    </motion.div>
                )}

                {step === 'review' && (
                    <motion.div key="review" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="mt-8 space-y-6">
                        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6 space-y-4">
                            <div className="flex items-center gap-2">
                                <svg viewBox="0 0 24 24" className="h-5 w-5 text-orange-400" fill="none" stroke="currentColor" strokeWidth={1.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                                </svg>
                                <h3 className="text-sm font-semibold text-[var(--text-primary)]">Position Summary</h3>
                            </div>
                            <div className="space-y-3">
                                {[
                                    ['Swap', `${tokenIn?.symbol} → ${tokenOut?.symbol}`],
                                    ['Per Execution', `${amountPerExec} ${tokenIn?.symbol}`],
                                    ['Total Deposit', `${totalDeposit} ${tokenIn?.symbol}`],
                                    ['Interval', INTERVAL_PRESETS[selectedInterval]?.label],
                                    ['Executions', `${execCount}`],
                                    ['Duration', `~${totalBlocks.toLocaleString()} blocks`],
                                ].map(([label, value]) => (
                                    <div key={label} className="flex items-center justify-between py-1">
                                        <span className="text-sm text-[var(--text-secondary)]">{label}</span>
                                        <span className="text-sm font-medium text-[var(--text-primary)]">{value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="rounded-xl bg-orange-500/10 border border-orange-500/20 p-4 flex items-start gap-3">
                            <svg viewBox="0 0 20 20" className="h-5 w-5 text-orange-400 shrink-0 mt-0.5" fill="currentColor">
                                <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-7-4a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM9 9a.75.75 0 0 0 0 1.5h.253a.25.25 0 0 1 .244.304l-.459 2.066A1.75 1.75 0 0 0 10.747 15H11a.75.75 0 0 0 0-1.5h-.253a.25.25 0 0 1-.244-.304l.459-2.066A1.75 1.75 0 0 0 9.253 9H9Z" clipRule="evenodd" />
                            </svg>
                            <p className="text-xs text-orange-300 leading-relaxed">
                                You&apos;ll need to approve the DCA vault to spend your {tokenIn?.symbol} tokens first, then create the position. The keeper bot will automatically execute swaps at each interval.
                            </p>
                        </div>

                        <div className="space-y-3">
                            {!approved ? (
                                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleApprove} disabled={approving || tx.loading || waitingConfirm} className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-orange-500 bg-orange-500/10 py-3.5 text-sm font-semibold text-orange-400 transition-colors hover:bg-orange-500/20 disabled:opacity-40">
                                    {waitingConfirm ? (
                                        <><svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" /><path fill="currentColor" className="opacity-75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>Waiting for on-chain confirmation...</>
                                    ) : approving || tx.loading ? (
                                        <><svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" /><path fill="currentColor" className="opacity-75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>Approving...</>
                                    ) : (
                                        <><svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor"><path fillRule="evenodd" d="M10 1a4.5 4.5 0 0 0-4.5 4.5V9H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-.5V5.5A4.5 4.5 0 0 0 10 1Zm3 8V5.5a3 3 0 1 0-6 0V9h6Z" clipRule="evenodd" /></svg>Approve {totalDeposit} {tokenIn?.symbol}</>
                                    )}
                                </motion.button>
                            ) : (
                                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleCreate} disabled={tx.loading} className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 py-3.5 text-sm font-semibold text-white shadow-lg shadow-orange-500/25 disabled:opacity-40">
                                    {tx.loading ? (
                                        <><svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" /><path fill="currentColor" className="opacity-75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>Creating Position...</>
                                    ) : (
                                        <><svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor"><path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" /></svg>Create DCA Position</>
                                    )}
                                </motion.button>
                            )}
                            <button onClick={() => setStep('amount')} className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-card)] py-3 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]">Back</button>
                        </div>

                        {tx.error && (
                            <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl bg-red-500/10 border border-red-500/20 p-4 flex items-center gap-3">
                                <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0 text-red-400" fill="none" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" /></svg>
                                <p className="text-xs text-red-400">{tx.error}</p>
                            </motion.div>
                        )}
                        {tx.txId && (
                            <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-4 flex items-center gap-3">
                                <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0 text-emerald-400" fill="none" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>
                                <div>
                                    <p className="text-xs font-semibold text-emerald-400">Position created successfully!</p>
                                    <p className="text-[10px] text-emerald-400/70 font-mono mt-0.5">TX: {tx.txId.slice(0, 16)}...</p>
                                </div>
                            </motion.div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    CartesianGrid,
    AreaChart,
    Area,
} from 'recharts';
import { useWallet } from '../hooks/useWallet';
import { useDCAPosition, useBlockNumber } from '../hooks/useDCA';
import { useTransaction } from '../hooks/useTransaction';
import { getDCAVault, getOP20, toAddress } from '../services/ContractService';
import { KNOWN_TOKENS, DCA_VAULT_ADDRESS_HEX } from '../config/contracts';

/* ── Helpers ───────────────────────────────────────────────────────────────── */

function getTokenSymbol(address: string): string {
    const token = KNOWN_TOKENS.find(
        (t) => t.address.toLowerCase() === address.toLowerCase(),
    );
    return token?.symbol ?? address.slice(0, 8) + '...';
}

function formatBigint(val: bigint, decimals = 18): string {
    if (val === 0n) return '0';
    const str = val.toString().padStart(decimals + 1, '0');
    const whole = str.slice(0, str.length - decimals) || '0';
    const frac = str.slice(str.length - decimals).replace(/0+$/, '');
    if (!frac) return Number(whole).toLocaleString();
    return `${Number(whole).toLocaleString()}.${frac.slice(0, 4)}`;
}

const TOKEN_COLORS: Record<string, string> = {
    MOTO: '#f97316',
    PILL: '#ec4899',
    ODYS: '#8b5cf6',
};

function TokenDot({ symbol, size = 28 }: { symbol: string; size?: number }) {
    const color = TOKEN_COLORS[symbol] ?? '#6366f1';
    return (
        <div
            className="flex items-center justify-center rounded-full font-bold text-white shrink-0"
            style={{
                width: size,
                height: size,
                fontSize: size * 0.35,
                background: `linear-gradient(135deg, ${color}, ${color}88)`,
                boxShadow: `0 0 14px ${color}40`,
            }}
        >
            {symbol.charAt(0)}
        </div>
    );
}

/* ── Simulated execution history chart data ─────────────────────────────── */

function generateExecHistory(totalExecs: number, totalSpent: bigint, totalReceived: bigint) {
    if (totalExecs === 0) return [];
    const data: { exec: number; spent: number; received: number; cumSpent: number; cumReceived: number }[] = [];
    const perSpent = Number(totalSpent) / totalExecs / 1e8;
    const avgReceived = Number(totalReceived) / totalExecs / 1e8;

    let cumSpent = 0;
    let cumReceived = 0;

    for (let i = 1; i <= Math.min(totalExecs, 30); i++) {
        // Add slight variation for visual interest
        const variance = 0.8 + Math.random() * 0.4;
        const spent = perSpent;
        const received = avgReceived * variance;
        cumSpent += spent;
        cumReceived += received;

        data.push({
            exec: i,
            spent: Math.round(spent * 1e4) / 1e4,
            received: Math.round(received * 1e4) / 1e4,
            cumSpent: Math.round(cumSpent * 1e4) / 1e4,
            cumReceived: Math.round(cumReceived * 1e4) / 1e4,
        });
    }
    return data;
}

/* ── Component ─────────────────────────────────────────────────────────────── */

export default function PositionDetail() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { address, walletAddress, addressObj, provider } = useWallet();
    const { data: position, isLoading } = useDCAPosition(id);
    const { data: blockNumber } = useBlockNumber();
    const tx = useTransaction();

    const [topUpAmount, setTopUpAmount] = useState('');
    const [showTopUp, setShowTopUp] = useState(false);
    const [chartTab, setChartTab] = useState<'per-exec' | 'cumulative'>('cumulative');
    const [copied, setCopied] = useState(false);

    const handleShare = () => {
        const url = window.location.href;
        navigator.clipboard.writeText(url).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    const toUnits = (val: string, decimals = 18): bigint => {
        const [whole, frac = ''] = val.split('.');
        const paddedFrac = frac.padEnd(decimals, '0').slice(0, decimals);
        return BigInt(whole + paddedFrac);
    };

    const handleCancel = async () => {
        if (!id || !address) return;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const vault = getDCAVault(addressObj ?? undefined, (provider ?? undefined) as any);
        const result = await tx.execute(
            () => vault.cancelPosition(BigInt(id)),
            walletAddress,
        );
        if (result) {
            setTimeout(() => navigate('/'), 2000);
        }
    };

    const handleTopUp = async () => {
        if (!id || !address || !topUpAmount || !position) return;
        const amount = toUnits(topUpAmount);

        // First increaseAllowance (NOT approve — OPNet OP20 ATK-05)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const token = getOP20(position.tokenIn, addressObj ?? undefined, (provider ?? undefined) as any);
        const approveResult = await tx.execute(
            () => token.increaseAllowance(toAddress(DCA_VAULT_ADDRESS_HEX), amount),
            walletAddress,
        );
        if (!approveResult) return;

        // Then top up
        tx.reset();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const vault = getDCAVault(addressObj ?? undefined, (provider ?? undefined) as any);
        const result = await tx.execute(
            () => vault.topUp(BigInt(id), amount),
            walletAddress,
        );
        if (result) {
            setShowTopUp(false);
            setTopUpAmount('');
        }
    };

    // Chart data
    const execHistory = useMemo(() => {
        if (!position) return [];
        return generateExecHistory(
            Number(position.totalExecs),
            position.totalSpent,
            position.totalReceived,
        );
    }, [position]);

    /* ── Loading State ────────────────────────────────────────────────────── */

    if (isLoading) {
        return (
            <div className="mx-auto max-w-3xl px-4 py-16">
                <div className="space-y-4">
                    <div className="h-16 animate-pulse rounded-2xl bg-[var(--bg-card)] border border-[var(--border)]" />
                    <div className="h-48 animate-pulse rounded-2xl bg-[var(--bg-card)] border border-[var(--border)]" />
                    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="h-24 animate-pulse rounded-xl bg-[var(--bg-card)] border border-[var(--border)]" />
                        ))}
                    </div>
                    <div className="h-64 animate-pulse rounded-2xl bg-[var(--bg-card)] border border-[var(--border)]" />
                </div>
            </div>
        );
    }

    /* ── Not Found ────────────────────────────────────────────────────────── */

    if (!position) {
        return (
            <div className="mx-auto max-w-3xl px-4 py-16 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-500/10">
                    <svg viewBox="0 0 24 24" className="h-8 w-8 text-orange-400" fill="none" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                    </svg>
                </div>
                <h2 className="text-xl font-bold text-[var(--text-primary)]">Position Not Found</h2>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">
                    Position #{id} doesn&apos;t exist or hasn&apos;t been indexed yet.
                </p>
                <button
                    onClick={() => navigate('/')}
                    className="mt-6 rounded-xl bg-[var(--bg-card)] border border-[var(--border)] px-6 py-2.5 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                >
                    ← Back to Dashboard
                </button>
            </div>
        );
    }

    /* ── Calculations ─────────────────────────────────────────────────────── */

    const isBTC = position.posType === 1;
    const tokenInSymbol = isBTC ? 'BTC' : getTokenSymbol(position.tokenIn);
    const tokenOutSymbol = getTokenSymbol(position.tokenOut);
    const totalDeposit = position.totalSpent + position.depositRemaining;
    const progressPct =
        totalDeposit > 0n
            ? Number((position.totalSpent * 10000n) / totalDeposit) / 100
            : 0;

    const interval = Number(position.intervalBlocks);
    const blocksSince = blockNumber ? Number(blockNumber - position.lastExecBlock) : 0;
    const blocksLeft = Math.max(0, interval - blocksSince);

    // Owner check
    const myHex = addressObj?.toString()?.toLowerCase() ?? '';
    const isOwner = myHex !== '' && myHex === position.owner.toLowerCase();

    // Average price
    const avgPrice =
        position.totalExecs > 0n && position.totalReceived > 0n
            ? Number(position.totalSpent * 100000000n / position.totalReceived) / 100000000
            : 0;

    // Remaining execs estimate
    const remainingExecs =
        position.amountPerExec > 0n
            ? Number(position.depositRemaining / position.amountPerExec)
            : 0;

    return (
        <div className="mx-auto max-w-3xl px-4 py-8">
            {/* Back button */}
            <button
                onClick={() => navigate('/')}
                className="mb-6 flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors group"
            >
                <svg viewBox="0 0 20 20" className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" fill="currentColor">
                    <path fillRule="evenodd" d="M17 10a.75.75 0 0 1-.75.75H5.612l4.158 3.96a.75.75 0 1 1-1.04 1.08l-5.5-5.25a.75.75 0 0 1 0-1.08l5.5-5.25a.75.75 0 1 1 1.04 1.08L5.612 9.25H16.25A.75.75 0 0 1 17 10Z" clipRule="evenodd" />
                </svg>
                Back to Dashboard
            </button>

            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-between mb-8"
            >
                <div className="flex items-center gap-4">
                    <div className="relative">
                        <TokenDot symbol={tokenInSymbol} size={44} />
                        <div className="absolute -bottom-1 -right-1">
                            <TokenDot symbol={tokenOutSymbol} size={26} />
                        </div>
                    </div>
                    <div className="ml-1">
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl font-extrabold text-[var(--text-primary)]">
                                {tokenInSymbol} → {tokenOutSymbol}
                            </h1>
                            <span className="rounded-md bg-[var(--bg-primary)] px-2 py-0.5 text-xs font-medium text-[var(--text-secondary)]">
                                #{id}
                            </span>
                            {isBTC && (
                                <span className="rounded-full px-2.5 py-0.5 text-[10px] font-semibold tracking-wide uppercase bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/20">
                                    NativeSwap
                                </span>
                            )}
                        </div>
                        <p className="text-sm text-[var(--text-secondary)]">
                            {formatBigint(position.amountPerExec)} {tokenInSymbol} every {interval} blocks
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleShare}
                        className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--text-secondary)] transition-colors"
                        title="Copy link"
                    >
                        {copied ? (
                            <svg viewBox="0 0 20 20" className="h-4 w-4 text-emerald-400" fill="currentColor">
                                <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
                            </svg>
                        ) : (
                            <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor">
                                <path d="M12.232 4.232a2.5 2.5 0 0 1 3.536 3.536l-1.225 1.224a.75.75 0 0 0 1.061 1.06l1.224-1.224a4 4 0 0 0-5.656-5.656l-3 3a4 4 0 0 0 .225 5.865.75.75 0 0 0 .977-1.138 2.5 2.5 0 0 1-.142-3.667l3-3Z" />
                                <path d="M11.603 7.963a.75.75 0 0 0-.977 1.138 2.5 2.5 0 0 1 .142 3.667l-3 3a2.5 2.5 0 0 1-3.536-3.536l1.225-1.224a.75.75 0 0 0-1.061-1.06l-1.224 1.224a4 4 0 1 0 5.656 5.656l3-3a4 4 0 0 0-.225-5.865Z" />
                            </svg>
                        )}
                    </button>
                    <span
                        className={`rounded-full px-4 py-1.5 text-xs font-semibold tracking-wide uppercase ${
                            position.active
                                ? 'bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/20'
                                : 'bg-red-500/15 text-red-400 ring-1 ring-red-500/20'
                        }`}
                    >
                        {position.active ? 'Active' : 'Cancelled'}
                    </span>
                </div>
            </motion.div>

            {/* Next Execution Banner */}
            {position.active && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`mb-6 rounded-2xl border p-5 ${
                        blocksLeft === 0
                            ? 'border-emerald-500/30 bg-emerald-500/10'
                            : 'border-blue-500/20 bg-blue-500/5'
                    }`}
                >
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                                blocksLeft === 0 ? 'bg-emerald-500/20' : 'bg-blue-500/20'
                            }`}>
                                <svg viewBox="0 0 24 24" className={`h-5 w-5 ${blocksLeft === 0 ? 'text-emerald-400' : 'text-blue-400'}`} fill="none" stroke="currentColor" strokeWidth={1.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
                                    Next Execution
                                </p>
                                <p className="mt-0.5 text-lg font-bold text-[var(--text-primary)]">
                                    {blocksLeft === 0 ? (
                                        <span className="text-emerald-400">Ready to Execute!</span>
                                    ) : (
                                        `${blocksLeft} blocks remaining`
                                    )}
                                </p>
                            </div>
                        </div>
                        {blocksLeft === 0 && (
                            <div className="flex items-center gap-2 rounded-full bg-emerald-500/20 px-3 py-1">
                                <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                                <span className="text-xs font-semibold text-emerald-400">Live</span>
                            </div>
                        )}
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--bg-primary)]">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{
                                width: blocksLeft === 0 ? '100%' : `${Math.min(100, (blocksSince / interval) * 100)}%`,
                            }}
                            transition={{ duration: 1, ease: 'easeOut' }}
                            className={`h-full rounded-full ${
                                blocksLeft === 0 ? 'bg-emerald-500' : 'bg-blue-500/60'
                            }`}
                        />
                    </div>
                </motion.div>
            )}

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3 mb-6 md:grid-cols-4">
                {[
                    {
                        label: 'Executions',
                        value: position.totalExecs.toString(),
                        icon: (
                            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" />
                            </svg>
                        ),
                        color: 'text-orange-400 bg-orange-500/15',
                    },
                    {
                        label: 'Total Spent',
                        value: `${formatBigint(position.totalSpent)}`,
                        sub: tokenInSymbol,
                        icon: (
                            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5 12 3m0 0 7.5 7.5M12 3v18" />
                            </svg>
                        ),
                        color: 'text-blue-400 bg-blue-500/15',
                    },
                    {
                        label: 'Total Received',
                        value: `${formatBigint(position.totalReceived)}`,
                        sub: tokenOutSymbol,
                        icon: (
                            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 13.5 12 21m0 0-7.5-7.5M12 21V3" />
                            </svg>
                        ),
                        color: 'text-emerald-400 bg-emerald-500/15',
                    },
                    {
                        label: 'Avg Price',
                        value: avgPrice > 0 ? avgPrice.toFixed(6) : '\u2014',
                        sub: avgPrice > 0 ? `${tokenInSymbol}/${tokenOutSymbol}` : undefined,
                        icon: (
                            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
                            </svg>
                        ),
                        color: 'text-purple-400 bg-purple-500/15',
                    },
                ].map((stat) => (
                    <motion.div
                        key={stat.label}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4"
                    >
                        <div className="flex items-center gap-2 mb-2">
                            <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${stat.color}`}>
                                {stat.icon}
                            </div>
                            <span className="text-[10px] font-medium uppercase tracking-wider text-[var(--text-secondary)]">
                                {stat.label}
                            </span>
                        </div>
                        <p className="text-sm font-bold text-[var(--text-primary)] truncate">{stat.value}</p>
                        {stat.sub && (
                            <p className="text-[10px] text-[var(--text-secondary)]">{stat.sub}</p>
                        )}
                    </motion.div>
                ))}
            </div>

            {/* Deposit Progress Card */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6 mb-6"
            >
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <svg viewBox="0 0 24 24" className="h-5 w-5 text-orange-400" fill="none" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
                        </svg>
                        <h3 className="text-sm font-semibold text-[var(--text-primary)]">Deposit Progress</h3>
                    </div>
                    <span className="text-lg font-bold text-[var(--accent)]">{progressPct.toFixed(1)}%</span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-[var(--bg-primary)]">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${progressPct}%` }}
                        transition={{ duration: 1, ease: 'easeOut' }}
                        className="h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-500"
                    />
                </div>
                <div className="mt-3 flex justify-between text-xs text-[var(--text-secondary)]">
                    <span>Spent: {formatBigint(position.totalSpent)} {tokenInSymbol}</span>
                    <span>Remaining: {formatBigint(position.depositRemaining)} {tokenInSymbol}</span>
                </div>
                {remainingExecs > 0 && position.active && (
                    <p className="mt-2 text-xs text-[var(--text-secondary)]">
                        ~{remainingExecs} executions remaining at current rate
                    </p>
                )}
            </motion.div>

            {/* Execution Performance Chart */}
            {execHistory.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6 mb-6"
                >
                    <div className="flex items-center justify-between mb-5">
                        <div className="flex items-center gap-2">
                            <svg viewBox="0 0 24 24" className="h-5 w-5 text-blue-400" fill="none" stroke="currentColor" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18 9 11.25l4.306 4.306a11.95 11.95 0 0 1 5.814-5.518l2.74-1.22m0 0-5.94-2.281m5.94 2.28-2.28 5.941" />
                            </svg>
                            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                                Execution History
                            </h3>
                        </div>
                        <div className="flex gap-1 rounded-lg bg-[var(--bg-primary)] p-0.5">
                            {(['cumulative', 'per-exec'] as const).map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => setChartTab(tab)}
                                    className={`rounded-md px-3 py-1 text-[10px] font-semibold uppercase tracking-wider transition-colors ${
                                        chartTab === tab
                                            ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-sm'
                                            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                                    }`}
                                >
                                    {tab === 'cumulative' ? 'Cumulative' : 'Per Exec'}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="h-56">
                        <ResponsiveContainer width="100%" height="100%">
                            {chartTab === 'cumulative' ? (
                                <AreaChart data={execHistory} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="cumSpentGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="cumRecvGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" />
                                    <XAxis dataKey="exec" tick={{ fontSize: 10, fill: '#8888a0' }} axisLine={{ stroke: '#1e1e2e' }} />
                                    <YAxis tick={{ fontSize: 10, fill: '#8888a0' }} axisLine={{ stroke: '#1e1e2e' }} />
                                    <Tooltip
                                        contentStyle={{
                                            background: '#1a1a25',
                                            border: '1px solid #2a2a3a',
                                            borderRadius: '12px',
                                            fontSize: '12px',
                                        }}
                                        labelStyle={{ color: '#8888a0' }}
                                        labelFormatter={(v) => `Execution #${v}`}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="cumSpent"
                                        name={`Spent (${tokenInSymbol})`}
                                        stroke="#6366f1"
                                        strokeWidth={2}
                                        fill="url(#cumSpentGrad)"
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="cumReceived"
                                        name={`Received (${tokenOutSymbol})`}
                                        stroke="#22c55e"
                                        strokeWidth={2}
                                        fill="url(#cumRecvGrad)"
                                    />
                                </AreaChart>
                            ) : (
                                <BarChart data={execHistory} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" />
                                    <XAxis dataKey="exec" tick={{ fontSize: 10, fill: '#8888a0' }} axisLine={{ stroke: '#1e1e2e' }} />
                                    <YAxis tick={{ fontSize: 10, fill: '#8888a0' }} axisLine={{ stroke: '#1e1e2e' }} />
                                    <Tooltip
                                        contentStyle={{
                                            background: '#1a1a25',
                                            border: '1px solid #2a2a3a',
                                            borderRadius: '12px',
                                            fontSize: '12px',
                                        }}
                                        labelStyle={{ color: '#8888a0' }}
                                        labelFormatter={(v) => `Execution #${v}`}
                                    />
                                    <Bar dataKey="received" name={`Received (${tokenOutSymbol})`} fill="#22c55e" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            )}
                        </ResponsiveContainer>
                    </div>
                    <p className="mt-2 text-center text-[10px] text-[var(--text-secondary)]">
                        Simulated per-execution breakdown for visualization
                    </p>
                </motion.div>
            )}

            {/* Position Details */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6 mb-6"
            >
                <div className="flex items-center gap-2 mb-4">
                    <svg viewBox="0 0 24 24" className="h-5 w-5 text-[var(--text-secondary)]" fill="none" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m5.231 13.481L15 17.25m-4.5-15H5.625c-.621 0-1.125.504-1.125 1.125v16.5c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Zm3.75 11.625a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
                    </svg>
                    <h3 className="text-sm font-semibold text-[var(--text-primary)]">Configuration</h3>
                </div>
                <div className="space-y-0">
                    {[
                        ['Owner', position.owner.slice(0, 12) + '...' + position.owner.slice(-8)],
                        ['Type', isBTC ? 'BTC → Token (NativeSwap)' : 'Token → Token (MotoSwap)'],
                        ...(isBTC
                            ? [['Token Out', `${tokenOutSymbol} (${position.tokenOut.slice(0, 16)}...)`]]
                            : [
                                  ['Token In', `${tokenInSymbol} (${position.tokenIn.slice(0, 16)}...)`],
                                  ['Token Out', `${tokenOutSymbol} (${position.tokenOut.slice(0, 16)}...)`],
                              ]),
                        ['Per Execution', isBTC ? `${position.amountPerExec.toString()} sats` : `${formatBigint(position.amountPerExec)} ${tokenInSymbol}`],
                        ['Interval', `${interval} blocks (~${Math.round(interval * 10 / 60)} hrs)`],
                        ['Created at Block', position.createdBlock.toString()],
                        ['Last Executed', position.lastExecBlock.toString()],
                    ].map(([label, value]) => (
                        <div key={label} className="flex items-center justify-between py-2.5 border-b border-[var(--border)]/50 last:border-0">
                            <span className="text-xs text-[var(--text-secondary)]">{label}</span>
                            <span className="text-xs font-medium text-[var(--text-primary)] font-mono">{value}</span>
                        </div>
                    ))}
                </div>
            </motion.div>

            {/* Actions (only for owner) */}
            {isOwner && position.active && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="space-y-3"
                >
                    {/* Top Up — only for Token positions (BTC top-up handled by keeper) */}
                    {isBTC ? (
                        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-center">
                            <p className="text-xs text-amber-400">
                                To top up a BTC position, send additional BTC to the keeper&apos;s wallet address.
                            </p>
                        </div>
                    ) : showTopUp ? (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="rounded-2xl border border-orange-500/20 bg-[var(--bg-card)] p-6"
                        >
                            <div className="flex items-center gap-2 mb-4">
                                <svg viewBox="0 0 24 24" className="h-5 w-5 text-orange-400" fill="none" stroke="currentColor" strokeWidth={1.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                                </svg>
                                <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                                    Top Up Deposit
                                </h3>
                            </div>
                            <div className="relative mb-4">
                                <input
                                    type="number"
                                    value={topUpAmount}
                                    onChange={(e) => setTopUpAmount(e.target.value)}
                                    placeholder="0.0"
                                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] px-4 py-3 text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/50 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500/50"
                                />
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium text-[var(--text-secondary)]">
                                    {tokenInSymbol}
                                </span>
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowTopUp(false)}
                                    className="rounded-xl border border-[var(--border)] px-5 py-2.5 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                                >
                                    Cancel
                                </button>
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={handleTopUp}
                                    disabled={!topUpAmount || tx.loading}
                                    className="flex-1 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 py-2.5 text-sm font-semibold text-white shadow-lg shadow-orange-500/20 disabled:opacity-40"
                                >
                                    {tx.loading ? 'Processing...' : 'Approve & Top Up'}
                                </motion.button>
                            </div>
                        </motion.div>
                    ) : (
                        <motion.button
                            whileHover={{ scale: 1.01 }}
                            whileTap={{ scale: 0.99 }}
                            onClick={() => setShowTopUp(true)}
                            className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-orange-500/40 bg-orange-500/10 py-3.5 text-sm font-semibold text-orange-400 transition-colors hover:bg-orange-500/20"
                        >
                            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                            </svg>
                            Top Up Deposit
                        </motion.button>
                    )}

                    {/* Cancel */}
                    <motion.button
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        onClick={handleCancel}
                        disabled={tx.loading}
                        className="w-full flex items-center justify-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 py-3.5 text-sm font-semibold text-red-400 transition-colors hover:bg-red-500/20 disabled:opacity-40"
                    >
                        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                        </svg>
                        {tx.loading ? 'Cancelling...' : isBTC ? 'Cancel Position (BTC refund by keeper)' : 'Cancel Position & Refund'}
                    </motion.button>
                    {isBTC && (
                        <p className="text-center text-[10px] text-[var(--text-secondary)]">
                            BTC refund will be sent by the keeper to your wallet after cancellation
                        </p>
                    )}
                </motion.div>
            )}

            {/* TX Status */}
            {tx.error && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4 rounded-xl bg-red-500/10 border border-red-500/20 p-4 flex items-center gap-3"
                >
                    <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0 text-red-400" fill="none" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                    </svg>
                    <p className="text-xs text-red-400">{tx.error}</p>
                </motion.div>
            )}
            {tx.txId && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-4 flex items-center gap-3"
                >
                    <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0 text-emerald-400" fill="none" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                    </svg>
                    <div>
                        <p className="text-xs font-semibold text-emerald-400">Transaction Successful!</p>
                        <p className="text-[10px] text-emerald-400/70 font-mono mt-0.5">
                            TX: {tx.txId.slice(0, 24)}...
                        </p>
                    </div>
                </motion.div>
            )}
        </div>
    );
}

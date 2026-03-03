import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import type { DCAPosition } from '../hooks/useDCA';
import { KNOWN_TOKENS } from '../config/contracts';

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
                boxShadow: `0 0 12px ${color}40`,
            }}
        >
            {symbol.charAt(0)}
        </div>
    );
}

/** Mini circular progress ring */
function ProgressRing({ pct, size = 44 }: { pct: number; size?: number }) {
    const r = (size - 6) / 2;
    const circ = 2 * Math.PI * r;
    const offset = circ - (pct / 100) * circ;

    return (
        <svg width={size} height={size} className="shrink-0 -rotate-90">
            <circle
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke="var(--bg-primary)"
                strokeWidth={4}
            />
            <motion.circle
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke="url(#ring-grad)"
                strokeWidth={4}
                strokeLinecap="round"
                strokeDasharray={circ}
                initial={{ strokeDashoffset: circ }}
                animate={{ strokeDashoffset: offset }}
                transition={{ duration: 1, ease: 'easeOut' }}
            />
            <defs>
                <linearGradient id="ring-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#f97316" />
                    <stop offset="100%" stopColor="#f59e0b" />
                </linearGradient>
            </defs>
        </svg>
    );
}

interface PositionCardProps {
    position: DCAPosition;
    index: number;
    currentBlock?: bigint;
}

export default function PositionCard({ position, index, currentBlock }: PositionCardProps) {
    const isBTC = position.posType === 1;
    const tokenInSymbol = isBTC ? 'BTC' : getTokenSymbol(position.tokenIn);
    const tokenOutSymbol = getTokenSymbol(position.tokenOut);

    // Progress: how much of deposit has been used
    const totalDeposit = position.totalSpent + position.depositRemaining;
    const progressPct =
        totalDeposit > 0n
            ? Number((position.totalSpent * 10000n) / totalDeposit) / 100
            : 0;

    // Blocks until next exec
    const blocksSince = currentBlock
        ? Number(currentBlock - position.lastExecBlock)
        : 0;
    const interval = Number(position.intervalBlocks);
    const blocksLeft = Math.max(0, interval - blocksSince);
    const timePct = interval > 0 ? Math.min(100, (blocksSince / interval) * 100) : 0;

    // Simple gain indicator
    const hasExecs = position.totalExecs > 0n;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
        >
            <Link
                to={`/position/${position.id.toString()}`}
                className="group block relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-5 transition-all hover:border-orange-500/30 hover:bg-[var(--bg-card-hover)] hover:shadow-lg hover:shadow-orange-500/5 no-underline"
            >
                {/* Shimmer hover overlay */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none animate-shimmer" />

                {/* Top Row: Token pair + status */}
                <div className="relative flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        {/* Token pair dots */}
                        <div className="relative">
                            <TokenDot symbol={tokenInSymbol} size={32} />
                            <div className="absolute -bottom-1 -right-1">
                                <TokenDot symbol={tokenOutSymbol} size={20} />
                            </div>
                        </div>
                        <div className="ml-1">
                            <p className="text-sm font-semibold text-[var(--text-primary)]">
                                {tokenInSymbol}
                                <span className="mx-1.5 text-[var(--text-secondary)]">→</span>
                                {tokenOutSymbol}
                            </p>
                            <p className="text-xs text-[var(--text-secondary)]">
                                {formatBigint(position.amountPerExec)} / {interval} blocks
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                        {isBTC ? (
                            <span className="rounded-full px-2.5 py-1 text-[10px] font-semibold tracking-wide uppercase bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/20" title="BTC held by keeper wallet (semi-custodial)">
                                Semi-Custodial
                            </span>
                        ) : (
                            <span className="rounded-full px-2.5 py-1 text-[10px] font-semibold tracking-wide uppercase bg-emerald-500/10 text-emerald-500 ring-1 ring-emerald-500/20" title="Tokens held by vault smart contract (trustless)">
                                Trustless
                            </span>
                        )}
                        <span
                            className={`rounded-full px-3 py-1 text-[10px] font-semibold tracking-wide uppercase ${
                                position.active
                                    ? 'bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/20'
                                    : 'bg-red-500/15 text-red-400 ring-1 ring-red-500/20'
                            }`}
                        >
                            {position.active ? 'Active' : 'Ended'}
                        </span>
                    </div>
                </div>

                {/* Progress + Ring */}
                <div className="relative mt-4 flex items-center gap-4">
                    <ProgressRing pct={progressPct} />
                    <div className="flex-1 min-w-0">
                        <div className="flex items-baseline justify-between">
                            <span className="text-xs text-[var(--text-secondary)]">Deposit used</span>
                            <span className="text-sm font-bold text-[var(--text-primary)]">
                                {progressPct.toFixed(1)}%
                            </span>
                        </div>
                        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[var(--bg-primary)]">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${progressPct}%` }}
                                transition={{ duration: 0.8, ease: 'easeOut' }}
                                className="h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-500"
                            />
                        </div>
                        {/* Next exec timer */}
                        {position.active && (
                            <div className="mt-2 flex items-center gap-2">
                                {blocksLeft === 0 ? (
                                    <span className="flex items-center gap-1.5 text-[10px] font-semibold text-emerald-400">
                                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                        Ready to execute
                                    </span>
                                ) : (
                                    <>
                                        <div className="h-1 flex-1 overflow-hidden rounded-full bg-[var(--bg-primary)]">
                                            <div
                                                className="h-full rounded-full bg-blue-500/50 transition-all"
                                                style={{ width: `${timePct}%` }}
                                            />
                                        </div>
                                        <span className="text-[10px] text-[var(--text-secondary)] shrink-0">
                                            {blocksLeft} blocks
                                        </span>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Stats Row */}
                <div className="relative mt-4 grid grid-cols-3 gap-3 border-t border-[var(--border)] pt-3">
                    <div>
                        <p className="text-[10px] uppercase tracking-wider text-[var(--text-secondary)]">
                            Execs
                        </p>
                        <p className="mt-0.5 text-sm font-bold text-[var(--text-primary)]">
                            {position.totalExecs.toString()}
                        </p>
                    </div>
                    <div>
                        <p className="text-[10px] uppercase tracking-wider text-[var(--text-secondary)]">
                            Spent
                        </p>
                        <p className="mt-0.5 text-sm font-bold text-[var(--text-primary)]">
                            {formatBigint(position.totalSpent)}
                        </p>
                    </div>
                    <div>
                        <p className="text-[10px] uppercase tracking-wider text-[var(--text-secondary)]">
                            Received
                        </p>
                        <p className={`mt-0.5 text-sm font-bold ${hasExecs ? 'text-emerald-400' : 'text-[var(--text-primary)]'}`}>
                            {formatBigint(position.totalReceived)}
                        </p>
                    </div>
                </div>

                {/* Bottom hover hint */}
                <div className="relative mt-3 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-[10px] text-[var(--text-secondary)] flex items-center gap-1">
                        View details
                        <svg viewBox="0 0 20 20" className="h-3 w-3" fill="currentColor">
                            <path fillRule="evenodd" d="M3 10a.75.75 0 0 1 .75-.75h10.638L10.23 5.29a.75.75 0 1 1 1.04-1.08l5.5 5.25a.75.75 0 0 1 0 1.08l-5.5 5.25a.75.75 0 1 1-1.04-1.08l4.158-3.96H3.75A.75.75 0 0 1 3 10Z" clipRule="evenodd" />
                        </svg>
                    </span>
                </div>
            </Link>
        </motion.div>
    );
}

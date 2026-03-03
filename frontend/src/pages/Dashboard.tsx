import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useWallet } from '../hooks/useWallet';
import { useDCAStats, useDCAPositions, useBlockNumber } from '../hooks/useDCA';
import StatCard from '../components/StatCard';
import PositionCard from '../components/PositionCard';
import ProtocolFeatures from '../components/ProtocolFeatures';
import DCASimulator from '../components/DCASimulator';
import LiveBlockCount from '../components/LiveBlockCount';
import { KEEPER_BTC_ADDRESS } from '../config/contracts';

function formatBigint(val: bigint, decimals = 18): string {
    if (val === 0n) return '0';
    const str = val.toString().padStart(decimals + 1, '0');
    const whole = str.slice(0, str.length - decimals) || '0';
    const frac = str.slice(str.length - decimals).replace(/0+$/, '');
    if (!frac) return Number(whole).toLocaleString();
    return `${Number(whole).toLocaleString()}.${frac.slice(0, 4)}`;
}

export default function Dashboard() {
    const { connected, connect } = useWallet();
    const { data: stats, isError: statsError } = useDCAStats();
    const { data: positions, isLoading: posLoading, isError: posError } = useDCAPositions();
    const { data: blockNumber } = useBlockNumber();

    return (
        <div className="mx-auto max-w-6xl px-4 py-8">
            {/* Hero Section */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-10"
            >
                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 shadow-lg shadow-orange-500/25">
                            <svg viewBox="0 0 24 24" className="h-5 w-5 text-white" fill="none" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18 9 11.25l4.306 4.306a11.95 11.95 0 0 1 5.814-5.518l2.74-1.22m0 0-5.94-2.281m5.94 2.28-2.28 5.941" />
                            </svg>
                        </div>
                        <div>
                            <div className="flex items-center gap-2.5 flex-wrap">
                                <h1 className="text-3xl font-extrabold text-[var(--text-primary)]">
                                    Auto-Stack on{' '}
                                    <span className="bg-gradient-to-r from-orange-400 to-amber-400 bg-clip-text text-transparent">
                                        Bitcoin L1
                                    </span>
                                </h1>
                                <LiveBlockCount />
                            </div>
                        </div>
                    </div>
                    <p className="mt-2 max-w-2xl text-[var(--text-secondary)]">
                        Dollar-cost average into any OP20 token via MotoSwap.
                        Fully on-chain, trustless, non-custodial. Powered by OPNet smart contracts.
                    </p>
                </div>
            </motion.div>

            {/* Stats Grid */}
            <div className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
                <StatCard
                    label="Active Positions"
                    value={stats ? stats.activePositions.toString() : '\u2014'}
                    icon={
                        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
                        </svg>
                    }
                    color="orange"
                />
                <StatCard
                    label="Total Executions"
                    value={stats ? stats.totalExecutions.toString() : '\u2014'}
                    icon={
                        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" />
                        </svg>
                    }
                    color="blue"
                />
                <StatCard
                    label="Total Volume"
                    value={stats ? formatBigint(stats.totalVolume) : '\u2014'}
                    subtitle="OP20 tokens"
                    icon={
                        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                        </svg>
                    }
                    color="green"
                />
                <StatCard
                    label="Current Block"
                    value={blockNumber ? blockNumber.toString() : '\u2014'}
                    icon={
                        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="m21 7.5-9-5.25L3 7.5m18 0-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
                        </svg>
                    }
                    color="purple"
                />
            </div>

            {/* Positions Section */}
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-[var(--text-primary)]">Your Positions</h2>
                <Link to="/create" className="no-underline">
                    <motion.button
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-orange-500/25 transition-all hover:shadow-orange-500/40"
                    >
                        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                        </svg>
                        New Position
                    </motion.button>
                </Link>
            </div>

            {!connected ? (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--border)] bg-[var(--bg-card)] p-16"
                >
                    <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500/20 to-amber-500/10">
                        <svg viewBox="0 0 24 24" className="h-8 w-8 text-orange-400" fill="none" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 0 0-2.25-2.25H15a3 3 0 1 1-6 0H5.25A2.25 2.25 0 0 0 3 12m18 0v6a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 9m18 0V6a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 6v3" />
                        </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                        Connect Your Wallet
                    </h3>
                    <p className="mt-2 text-sm text-[var(--text-secondary)] text-center max-w-sm">
                        Connect your OP_WALLET to view and manage your DCA positions on Bitcoin L1.
                    </p>
                    <motion.button
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={connect}
                        className="mt-6 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-orange-500/25"
                    >
                        Connect Wallet
                    </motion.button>
                </motion.div>
            ) : (statsError || posError) ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-2xl border border-red-500/20 bg-red-500/5 p-8 text-center">
                    <div className="mb-3 flex h-12 w-12 mx-auto items-center justify-center rounded-xl bg-red-500/15">
                        <svg viewBox="0 0 20 20" className="h-6 w-6 text-red-400" fill="currentColor">
                            <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-8-5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 10 5Zm0 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
                        </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-[var(--text-primary)]">Connection Error</h3>
                    <p className="mt-2 text-sm text-[var(--text-secondary)]">Failed to connect to OPNet. Check your network and try again.</p>
                </motion.div>
            ) : posLoading ? (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {[1, 2, 3].map((i) => (
                        <div
                            key={i}
                            className="h-52 animate-pulse rounded-2xl bg-[var(--bg-card)] border border-[var(--border)]"
                        />
                    ))}
                </div>
            ) : positions && positions.length > 0 ? (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {positions.map((pos, i) => (
                        <PositionCard
                            key={pos.id.toString()}
                            position={pos}
                            index={i}
                            currentBlock={blockNumber}
                        />
                    ))}
                </div>
            ) : (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--border)] bg-[var(--bg-card)] p-16"
                >
                    <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500/20 to-amber-500/10">
                        <svg viewBox="0 0 24 24" className="h-8 w-8 text-orange-400" fill="none" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 0 1-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 0 0 6.16-12.12A14.98 14.98 0 0 0 9.631 8.41m5.96 5.96a14.926 14.926 0 0 1-5.841 2.58m-.119-8.54a6 6 0 0 0-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 0 0-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 0 1-2.448-2.448 14.9 14.9 0 0 1 .06-.312m-2.24 2.39a4.493 4.493 0 0 0-1.757 4.306 4.493 4.493 0 0 0 4.306-1.758M16.5 9a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Z" />
                        </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                        No Positions Yet
                    </h3>
                    <p className="mt-2 text-sm text-[var(--text-secondary)] text-center max-w-sm">
                        Create your first DCA position to start auto-stacking on Bitcoin.
                    </p>
                    <Link to="/create" className="no-underline">
                        <motion.button
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.97 }}
                            className="mt-6 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-orange-500/25"
                        >
                            Create First Position
                        </motion.button>
                    </Link>
                </motion.div>
            )}

            {/* DCA Simulator */}
            <div className="mt-12">
                <DCASimulator />
            </div>

            {/* Protocol Features */}
            <div className="mt-12">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="mb-6"
                >
                    <h3 className="text-xl font-bold text-[var(--text-primary)]">
                        Why BitDCA?
                    </h3>
                    <p className="mt-1 text-sm text-[var(--text-secondary)]">
                        The first automated DCA protocol native to Bitcoin L1
                    </p>
                </motion.div>
                <ProtocolFeatures />
            </div>

            {/* How It Works */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="mt-12 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-8"
            >
                <h3 className="text-lg font-bold text-[var(--text-primary)] mb-6">How It Works</h3>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                    {[
                        {
                            step: '1',
                            title: 'Deposit Tokens',
                            desc: 'Choose a token pair and deposit your OP20 tokens into the DCA vault.',
                            gradient: 'from-orange-500 to-amber-500',
                        },
                        {
                            step: '2',
                            title: 'Set Schedule',
                            desc: 'Pick how much per execution and the interval in blocks between swaps.',
                            gradient: 'from-blue-500 to-cyan-500',
                        },
                        {
                            step: '3',
                            title: 'Auto-Execute',
                            desc: 'The keeper bot triggers swaps via MotoSwap at each interval \u2014 fully trustless.',
                            gradient: 'from-emerald-500 to-green-500',
                        },
                    ].map((item) => (
                        <div key={item.step} className="flex gap-4">
                            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${item.gradient} text-sm font-extrabold text-white shadow-lg`}>
                                {item.step}
                            </div>
                            <div>
                                <h4 className="text-sm font-semibold text-[var(--text-primary)]">{item.title}</h4>
                                <p className="mt-1 text-xs text-[var(--text-secondary)] leading-relaxed">
                                    {item.desc}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </motion.div>

            {/* Roadmap */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.45 }}
                className="mt-12 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6"
            >
                <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-indigo-500 text-sm">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>
                    </div>
                    <h3 className="text-lg font-bold text-[var(--text-primary)]">Roadmap</h3>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                        <div className="mb-2 flex items-center gap-2">
                            <span className="inline-flex items-center rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Live</span>
                            <span className="text-sm font-semibold text-[var(--text-primary)]">Token-to-Token DCA</span>
                            <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-[9px] font-bold text-emerald-500 uppercase tracking-wider ring-1 ring-emerald-500/20">Trustless</span>
                        </div>
                        <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                            Automated DCA between any OP20 tokens via MotoSwap. Deposit, set a schedule, and the keeper bot handles everything. Fully non-custodial.
                        </p>
                    </div>
                    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4 opacity-60">
                        <div className="mb-2 flex items-center gap-2">
                            <span className="inline-flex items-center rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-400 uppercase tracking-wider">Coming Soon</span>
                            <span className="text-sm font-semibold text-[var(--text-primary)]">BTC &rarr; Token DCA</span>
                        </div>
                        <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                            DCA from native BTC into any OP20 token via NativeSwap — no wrapping needed. Coming soon with semi-custodial keeper support.
                        </p>
                    </div>
                </div>
            </motion.div>

            {/* Keeper Transparency */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="mt-12 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6"
            >
                <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 text-sm">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-[var(--text-primary)]">Keeper Transparency</h3>
                        <p className="text-xs text-[var(--text-secondary)]">Automated keeper bot executes your DCA swaps via MotoSwap</p>
                    </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] p-4 space-y-3">
                        <div className="flex items-center gap-2">
                            <span className="inline-flex items-center rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Trustless</span>
                        </div>
                        <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                            Token-to-Token DCA is fully non-custodial. Your tokens stay in the vault contract until swapped. The keeper bot only triggers executions — it never holds your funds.
                        </p>
                    </div>
                    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] p-4 space-y-3">
                        <p className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider font-medium">Keeper Address</p>
                        {KEEPER_BTC_ADDRESS ? (
                            <p className="text-sm font-mono text-[var(--text-primary)] break-all select-all">{KEEPER_BTC_ADDRESS}</p>
                        ) : (
                            <p className="text-sm text-[var(--text-secondary)] italic">Not configured</p>
                        )}
                        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[var(--border)]">
                            <div>
                                <p className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider">Total Executions</p>
                                <p className="text-sm font-bold text-[var(--text-primary)]">{stats ? stats.totalExecutions.toString() : '\u2014'}</p>
                            </div>
                            <div>
                                <p className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider">Status</p>
                                <p className="text-sm font-bold text-emerald-400 flex items-center gap-1.5">
                                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                    Online
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Tech Stack Badge */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="mt-8 flex flex-wrap items-center justify-center gap-3"
            >
                {['Bitcoin L1', 'OPNet', 'MotoSwap', 'NativeSwap', 'AssemblyScript', 'React'].map((tech) => (
                    <span
                        key={tech}
                        className="rounded-full border border-[var(--border)] bg-[var(--bg-card)] px-4 py-1.5 text-xs font-medium text-[var(--text-secondary)]"
                    >
                        {tech}
                    </span>
                ))}
            </motion.div>
        </div>
    );
}

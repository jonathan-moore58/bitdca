import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useWallet } from '../hooks/useWallet';

export default function Header() {
    const { connected, address, connecting, connect, disconnect } = useWallet();
    const location = useLocation();
    const [mobileOpen, setMobileOpen] = useState(false);

    const navItems = [
        { path: '/', label: 'Dashboard' },
        { path: '/create', label: 'New Position' },
    ];

    const shortAddr = address
        ? `${address.slice(0, 8)}...${address.slice(-6)}`
        : '';

    return (
        <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--bg-primary)]/80 backdrop-blur-xl">
            <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
                {/* Logo */}
                <Link to="/" className="flex items-center gap-2.5 no-underline">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-amber-600 text-sm font-extrabold text-white shadow-lg shadow-orange-500/25">
                        B
                    </div>
                    <span className="text-lg font-bold text-[var(--text-primary)]">
                        Bit<span className="text-[var(--accent)]">DCA</span>
                    </span>
                </Link>

                {/* Desktop Nav */}
                <nav className="hidden items-center gap-1 sm:flex">
                    {navItems.map((item) => {
                        const isActive = location.pathname === item.path;
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={`relative rounded-lg px-4 py-2 text-sm font-medium transition-colors no-underline ${
                                    isActive
                                        ? 'text-[var(--accent)]'
                                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                                }`}
                            >
                                {isActive && (
                                    <motion.div
                                        layoutId="nav-pill"
                                        className="absolute inset-0 rounded-lg bg-[var(--accent)]/10"
                                        transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }}
                                    />
                                )}
                                <span className="relative">{item.label}</span>
                            </Link>
                        );
                    })}
                </nav>

                <div className="flex items-center gap-2">
                    {/* Wallet */}
                    {connected ? (
                        <div className="flex items-center gap-2">
                            <div className="hidden sm:flex items-center gap-2 rounded-full bg-[var(--bg-card)] px-4 py-2 border border-[var(--border)]">
                                <div className="h-2 w-2 rounded-full bg-[var(--success)] animate-pulse" />
                                <span className="text-sm font-medium text-[var(--text-primary)]">
                                    {shortAddr}
                                </span>
                            </div>
                            <div className="flex sm:hidden items-center gap-1.5 rounded-full bg-[var(--bg-card)] px-3 py-1.5 border border-[var(--border)]">
                                <div className="h-2 w-2 rounded-full bg-[var(--success)] animate-pulse" />
                                <span className="text-xs font-medium text-[var(--text-primary)]">
                                    {address ? `${address.slice(0, 6)}...` : ''}
                                </span>
                            </div>
                            <button
                                onClick={disconnect}
                                className="hidden sm:block rounded-lg px-3 py-2 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-card)] hover:text-[var(--danger)]"
                            >
                                Disconnect
                            </button>
                        </div>
                    ) : (
                        <motion.button
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.97 }}
                            onClick={connect}
                            disabled={connecting}
                            className="rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 px-4 py-2 sm:px-5 sm:py-2.5 text-xs sm:text-sm font-semibold text-white shadow-lg shadow-orange-500/25 transition-all hover:shadow-orange-500/40 disabled:opacity-60"
                        >
                            {connecting ? 'Connecting...' : 'Connect'}
                        </motion.button>
                    )}

                    {/* Mobile hamburger */}
                    <button
                        onClick={() => setMobileOpen(!mobileOpen)}
                        className="flex sm:hidden h-9 w-9 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-secondary)]"
                    >
                        {mobileOpen ? (
                            <svg viewBox="0 0 20 20" className="h-5 w-5" fill="currentColor">
                                <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                            </svg>
                        ) : (
                            <svg viewBox="0 0 20 20" className="h-5 w-5" fill="currentColor">
                                <path fillRule="evenodd" d="M2 4.75A.75.75 0 0 1 2.75 4h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 4.75ZM2 10a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 10Zm0 5.25a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1-.75-.75Z" clipRule="evenodd" />
                            </svg>
                        )}
                    </button>
                </div>
            </div>

            {/* Mobile menu dropdown */}
            <AnimatePresence>
                {mobileOpen && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden border-t border-[var(--border)] bg-[var(--bg-primary)]/95 backdrop-blur-xl sm:hidden"
                    >
                        <div className="px-4 py-3 space-y-1">
                            {navItems.map((item) => {
                                const isActive = location.pathname === item.path;
                                return (
                                    <Link
                                        key={item.path}
                                        to={item.path}
                                        onClick={() => setMobileOpen(false)}
                                        className={`block rounded-lg px-4 py-3 text-sm font-medium no-underline transition-colors ${
                                            isActive
                                                ? 'bg-[var(--accent)]/10 text-[var(--accent)]'
                                                : 'text-[var(--text-secondary)] hover:bg-[var(--bg-card)] hover:text-[var(--text-primary)]'
                                        }`}
                                    >
                                        {item.label}
                                    </Link>
                                );
                            })}
                            {connected && (
                                <button
                                    onClick={() => {
                                        disconnect();
                                        setMobileOpen(false);
                                    }}
                                    className="w-full rounded-lg px-4 py-3 text-left text-sm font-medium text-red-400 hover:bg-red-500/10"
                                >
                                    Disconnect Wallet
                                </button>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </header>
    );
}

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useBlockNumber } from '../hooks/useDCA';

/**
 * LiveBlockCount — Compact inline network status badge.
 * Shows a pulsing live indicator + current block number.
 */
export default function LiveBlockCount() {
    const { data: blockNumber, dataUpdatedAt } = useBlockNumber();
    const [flash, setFlash] = useState(false);

    // Flash animation on block change
    useEffect(() => {
        if (blockNumber) {
            setFlash(true);
            const t = setTimeout(() => setFlash(false), 1500);
            return () => clearTimeout(t);
        }
    }, [blockNumber]);

    // Seconds since last update
    const [elapsed, setElapsed] = useState(0);
    useEffect(() => {
        const interval = setInterval(() => {
            setElapsed(Math.floor((Date.now() - dataUpdatedAt) / 1000));
        }, 1000);
        return () => clearInterval(interval);
    }, [dataUpdatedAt]);

    if (!blockNumber) {
        return (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--bg-card)]/60 border border-[var(--border)] px-2.5 py-1 backdrop-blur-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--text-secondary)]/30 animate-pulse" />
                <span className="text-[10px] text-[var(--text-secondary)]">Syncing...</span>
            </span>
        );
    }

    return (
        <motion.span
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/8 border border-emerald-500/20 px-2.5 py-1 backdrop-blur-sm"
        >
            {/* Live dot with pulse ring */}
            <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                <AnimatePresence>
                    {flash && (
                        <motion.span
                            initial={{ scale: 1, opacity: 0.6 }}
                            animate={{ scale: 3, opacity: 0 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.8 }}
                            className="absolute inset-0 rounded-full bg-emerald-400"
                        />
                    )}
                </AnimatePresence>
            </span>

            {/* Block number */}
            <span className="text-[10px] font-mono font-semibold text-emerald-400">
                #{blockNumber.toLocaleString()}
            </span>

            {/* Elapsed divider + time */}
            <span className="text-emerald-500/30">·</span>
            <span className="text-[10px] text-emerald-400/60">
                {elapsed < 5 ? 'live' : `${elapsed}s`}
            </span>
        </motion.span>
    );
}

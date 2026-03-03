import { type ReactNode } from 'react';
import { motion } from 'framer-motion';

interface StatCardProps {
    label: string;
    value: string;
    subtitle?: string;
    icon: ReactNode;
    color?: string;
}

export default function StatCard({ label, value, subtitle, icon, color = 'orange' }: StatCardProps) {
    const colorMap: Record<string, string> = {
        orange: 'from-orange-500/15 to-amber-500/5 border-orange-500/20',
        green: 'from-emerald-500/15 to-green-500/5 border-emerald-500/20',
        blue: 'from-blue-500/15 to-cyan-500/5 border-blue-500/20',
        purple: 'from-purple-500/15 to-violet-500/5 border-purple-500/20',
    };

    const iconColorMap: Record<string, string> = {
        orange: 'bg-orange-500/20 text-orange-400',
        green: 'bg-emerald-500/20 text-emerald-400',
        blue: 'bg-blue-500/20 text-blue-400',
        purple: 'bg-purple-500/20 text-purple-400',
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`rounded-2xl border bg-gradient-to-br p-5 ${colorMap[color]}`}
        >
            <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--text-secondary)]">
                        {label}
                    </p>
                    <p className="mt-2 text-2xl font-bold text-[var(--text-primary)] truncate">
                        {value}
                    </p>
                    {subtitle && (
                        <p className="mt-1 text-xs text-[var(--text-secondary)]">{subtitle}</p>
                    )}
                </div>
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconColorMap[color]}`}>
                    {icon}
                </div>
            </div>
        </motion.div>
    );
}

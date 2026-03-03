import { motion } from 'framer-motion';

const features = [
    {
        icon: (
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
        ),
        title: 'Dollar Cost Averaging',
        description: 'Automated recurring buys reduce timing risk. Set your schedule and let the protocol handle the rest.',
        gradient: 'from-orange-500 to-amber-500',
        glow: 'shadow-orange-500/20',
    },
    {
        icon: (
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
            </svg>
        ),
        title: 'Fully On-Chain',
        description: 'Runs natively on Bitcoin L1 via OPNet smart contracts. No bridges, no L2s, no custodians.',
        gradient: 'from-emerald-500 to-green-500',
        glow: 'shadow-emerald-500/20',
    },
    {
        icon: (
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
            </svg>
        ),
        title: 'MotoSwap Integration',
        description: 'Swaps execute through MotoSwap AMM for deep liquidity and best execution prices.',
        gradient: 'from-blue-500 to-cyan-500',
        glow: 'shadow-blue-500/20',
    },
    {
        icon: (
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
            </svg>
        ),
        title: 'Non-Custodial',
        description: 'You keep full control. Cancel anytime and withdraw your remaining deposit instantly.',
        gradient: 'from-purple-500 to-violet-500',
        glow: 'shadow-purple-500/20',
    },
];

const container = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: { staggerChildren: 0.08 },
    },
};

const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
};

export default function ProtocolFeatures() {
    return (
        <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 gap-4 sm:grid-cols-2"
        >
            {features.map((f) => (
                <motion.div
                    key={f.title}
                    variants={item}
                    className="group relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6 transition-all hover:border-transparent"
                >
                    {/* Hover gradient border effect */}
                    <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${f.gradient} opacity-0 transition-opacity group-hover:opacity-[0.08]`} />

                    <div className="relative">
                        <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${f.gradient} text-white shadow-lg ${f.glow}`}>
                            {f.icon}
                        </div>
                        <h4 className="text-sm font-bold text-[var(--text-primary)]">{f.title}</h4>
                        <p className="mt-2 text-xs leading-relaxed text-[var(--text-secondary)]">
                            {f.description}
                        </p>
                    </div>
                </motion.div>
            ))}
        </motion.div>
    );
}

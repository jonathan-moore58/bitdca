export default function GlowBackground() {
    return (
        <div className="pointer-events-none fixed inset-0 overflow-hidden">
            {/* Top-right orange glow */}
            <div
                className="absolute -top-40 right-0 h-[500px] w-[500px] rounded-full opacity-[0.07] animate-float"
                style={{
                    background: 'radial-gradient(circle, #f97316 0%, transparent 70%)',
                }}
            />
            {/* Bottom-left blue glow */}
            <div
                className="absolute -bottom-40 -left-40 h-[400px] w-[400px] rounded-full opacity-[0.05]"
                style={{
                    background: 'radial-gradient(circle, #3b82f6 0%, transparent 70%)',
                    animation: 'float 8s ease-in-out infinite reverse',
                }}
            />
            {/* Center-left emerald accent */}
            <div
                className="absolute top-1/3 -left-20 h-[300px] w-[300px] rounded-full opacity-[0.04]"
                style={{
                    background: 'radial-gradient(circle, #10b981 0%, transparent 70%)',
                    animation: 'float 10s ease-in-out infinite 2s',
                }}
            />
            {/* Grid pattern */}
            <div
                className="absolute inset-0 opacity-[0.025]"
                style={{
                    backgroundImage: `
                        linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
                    `,
                    backgroundSize: '60px 60px',
                }}
            />
            {/* Noise texture overlay for depth */}
            <div
                className="absolute inset-0 opacity-[0.015]"
                style={{
                    backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\' opacity=\'0.5\'/%3E%3C/svg%3E")',
                }}
            />
        </div>
    );
}

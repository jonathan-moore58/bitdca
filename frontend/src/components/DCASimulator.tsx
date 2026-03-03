import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    CartesianGrid,
    Legend,
} from 'recharts';
import { OP20_FEE_BPS } from '../config/contracts';

// ── Scenario definitions ──────────────────────────────────────────────
interface Scenario {
    label: string;
    annualReturn: number;   // expected annual drift (e.g. 0.5 = +50%)
    annualVol: number;      // annual volatility (e.g. 0.6 = 60%)
    color: string;
}

const SCENARIOS: Record<string, Scenario> = {
    bear:     { label: 'Bear (-30%/yr)',      annualReturn: -0.30, annualVol: 0.70, color: '#ef4444' },
    sideways: { label: 'Sideways (0%/yr)',    annualReturn: 0.00,  annualVol: 0.55, color: '#f59e0b' },
    bull:     { label: 'Bull (+50%/yr)',       annualReturn: 0.50,  annualVol: 0.60, color: '#22c55e' },
    superbull:{ label: 'Super Bull (+150%/yr)',annualReturn: 1.50,  annualVol: 0.80, color: '#8b5cf6' },
};

// ── Seeded PRNG (mulberry32) ──────────────────────────────────────────
function mulberry32(seed: number): () => number {
    let s = seed | 0;
    return () => {
        s = (s + 0x6d2b79f5) | 0;
        let t = Math.imul(s ^ (s >>> 15), 1 | s);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/** Box-Muller transform: two uniform randoms → one normal random */
function normalRandom(rand: () => number): number {
    const u1 = rand();
    const u2 = rand();
    return Math.sqrt(-2 * Math.log(Math.max(u1, 1e-10))) * Math.cos(2 * Math.PI * u2);
}

// ── Simulation engine ─────────────────────────────────────────────────
interface SimPoint {
    period: number;
    invested: number;
    dcaValue: number;
    lumpValue: number;
    price: number;
    avgCost: number;
    fees: number;
}

function simulateDCA(
    totalInvest: number,
    periods: number,
    scenario: Scenario,
    feeBps: number,
    seed: number,
): SimPoint[] {
    const rand = mulberry32(seed);
    const data: SimPoint[] = [];
    const perPeriod = totalInvest / periods;

    // Geometric Brownian Motion parameters (per-period)
    // Assume each period = 1 month, so 12 periods/year
    const dt = 1 / 12;
    const drift = scenario.annualReturn * dt;
    const vol = scenario.annualVol * Math.sqrt(dt);

    let price = 100; // starting price (arbitrary units)
    let totalTokensDCA = 0;
    let totalFees = 0;
    const feeRate = feeBps / 10000;

    // Lump sum: buy everything at period 1 price
    let lumpTokens = 0;

    for (let i = 1; i <= periods; i++) {
        // Price evolution: GBM step
        const z = normalRandom(rand);
        price = price * Math.exp((drift - 0.5 * vol * vol) + vol * z);
        price = Math.max(1, price); // floor

        // DCA: buy tokens with this period's investment, minus fee
        const feeThisPeriod = perPeriod * feeRate;
        const investAfterFee = perPeriod - feeThisPeriod;
        const tokensBought = investAfterFee / price;
        totalTokensDCA += tokensBought;
        totalFees += feeThisPeriod;

        // Lump sum: buy all at period 1
        if (i === 1) {
            const lumpFee = totalInvest * feeRate;
            lumpTokens = (totalInvest - lumpFee) / price;
        }

        const invested = Math.round(perPeriod * i);
        const dcaValue = Math.round(totalTokensDCA * price);
        const lumpValue = Math.round(lumpTokens * price);
        const avgCost = totalTokensDCA > 0 ? (perPeriod * i) / totalTokensDCA : 0;

        data.push({
            period: i,
            invested,
            dcaValue,
            lumpValue,
            price: Math.round(price * 100) / 100,
            avgCost: Math.round(avgCost * 100) / 100,
            fees: Math.round(totalFees * 100) / 100,
        });
    }
    return data;
}

// ── Custom tooltip ────────────────────────────────────────────────────
function SimTooltip({ active, payload, label }: any) {
    if (!active || !payload?.length) return null;
    const d = payload[0]?.payload as SimPoint | undefined;
    if (!d) return null;

    return (
        <div className="rounded-xl border border-[var(--border)] bg-[#1a1a25] p-3 text-xs shadow-lg">
            <p className="mb-1.5 font-semibold text-[var(--text-secondary)]">Period {label}</p>
            <p className="text-indigo-400">Invested: <span className="font-bold text-[var(--text-primary)]">{d.invested.toLocaleString()}</span></p>
            <p className="text-orange-400">DCA Value: <span className="font-bold text-[var(--text-primary)]">{d.dcaValue.toLocaleString()}</span></p>
            <p className="text-cyan-400">Lump Sum: <span className="font-bold text-[var(--text-primary)]">{d.lumpValue.toLocaleString()}</span></p>
            <div className="mt-1.5 border-t border-[var(--border)] pt-1.5">
                <p className="text-[var(--text-secondary)]">Price: {d.price} &middot; Avg Cost: {d.avgCost}</p>
                <p className="text-[var(--text-secondary)]">Fees paid: {d.fees}</p>
            </div>
        </div>
    );
}

// ── Component ─────────────────────────────────────────────────────────
export default function DCASimulator() {
    const [totalInvest, setTotalInvest] = useState(1000);
    const [periods, setPeriods] = useState(12);
    const [scenarioKey, setScenarioKey] = useState<string>('bull');

    const scenario = SCENARIOS[scenarioKey];
    const feeBps = OP20_FEE_BPS;

    const chartData = useMemo(
        () => simulateDCA(totalInvest, periods, scenario, feeBps, totalInvest * 1000 + periods * 7 + scenarioKey.length * 31),
        [totalInvest, periods, scenario, feeBps, scenarioKey],
    );

    const last = chartData[chartData.length - 1];
    const dcaReturn = last && last.invested > 0
        ? ((last.dcaValue - last.invested) / last.invested * 100).toFixed(1)
        : '0';
    const lumpReturn = last && last.invested > 0
        ? ((last.lumpValue - last.invested) / last.invested * 100).toFixed(1)
        : '0';
    const dcaWins = last ? last.dcaValue >= last.lumpValue : false;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6"
        >
            {/* Header */}
            <div className="mb-4">
                <h3 className="text-lg font-bold text-[var(--text-primary)]">
                    DCA Simulator
                </h3>
                <p className="text-xs text-[var(--text-secondary)]">
                    Compare DCA vs Lump Sum across market scenarios &middot; {feeBps / 100}% fee per execution
                </p>
            </div>

            {/* Controls Row */}
            <div className="mb-4 flex flex-wrap gap-2">
                {/* Scenario selector */}
                {Object.entries(SCENARIOS).map(([key, s]) => (
                    <button
                        key={key}
                        onClick={() => setScenarioKey(key)}
                        className={`rounded-lg px-3 py-1.5 text-[11px] font-semibold transition-all ${
                            scenarioKey === key
                                ? 'ring-1 text-white shadow-sm'
                                : 'bg-[var(--bg-primary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                        }`}
                        style={scenarioKey === key ? { background: s.color + '25', color: s.color, outline: `1px solid ${s.color}50` } : undefined}
                    >
                        {s.label}
                    </button>
                ))}
            </div>

            <div className="mb-4 flex gap-3">
                <div className="flex items-center gap-2 rounded-lg bg-[var(--bg-primary)] px-3 py-1.5">
                    <label className="text-[10px] uppercase tracking-wider text-[var(--text-secondary)]">
                        Total
                    </label>
                    <select
                        value={totalInvest}
                        onChange={(e) => setTotalInvest(Number(e.target.value))}
                        className="bg-transparent text-sm font-semibold text-[var(--text-primary)] outline-none"
                    >
                        <option value={500}>500</option>
                        <option value={1000}>1,000</option>
                        <option value={5000}>5,000</option>
                        <option value={10000}>10,000</option>
                    </select>
                </div>
                <div className="flex items-center gap-2 rounded-lg bg-[var(--bg-primary)] px-3 py-1.5">
                    <label className="text-[10px] uppercase tracking-wider text-[var(--text-secondary)]">
                        Periods
                    </label>
                    <select
                        value={periods}
                        onChange={(e) => setPeriods(Number(e.target.value))}
                        className="bg-transparent text-sm font-semibold text-[var(--text-primary)] outline-none"
                    >
                        <option value={6}>6 months</option>
                        <option value={12}>12 months</option>
                        <option value={24}>24 months</option>
                        <option value={52}>52 weeks</option>
                    </select>
                </div>
            </div>

            {/* Stats Row */}
            <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-xl bg-[var(--bg-primary)] p-3">
                    <p className="text-[10px] uppercase tracking-wider text-[var(--text-secondary)]">
                        Invested
                    </p>
                    <p className="mt-1 text-lg font-bold text-[var(--text-primary)]">
                        {last?.invested.toLocaleString() ?? 0}
                    </p>
                </div>
                <div className="rounded-xl bg-[var(--bg-primary)] p-3">
                    <p className="text-[10px] uppercase tracking-wider text-[var(--text-secondary)]">
                        DCA Value
                    </p>
                    <p className={`mt-1 text-lg font-bold ${Number(dcaReturn) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {last?.dcaValue.toLocaleString() ?? 0}
                        <span className="ml-1.5 text-xs">({Number(dcaReturn) >= 0 ? '+' : ''}{dcaReturn}%)</span>
                    </p>
                </div>
                <div className="rounded-xl bg-[var(--bg-primary)] p-3">
                    <p className="text-[10px] uppercase tracking-wider text-[var(--text-secondary)]">
                        Lump Sum
                    </p>
                    <p className={`mt-1 text-lg font-bold ${Number(lumpReturn) >= 0 ? 'text-cyan-400' : 'text-red-400'}`}>
                        {last?.lumpValue.toLocaleString() ?? 0}
                        <span className="ml-1.5 text-xs">({Number(lumpReturn) >= 0 ? '+' : ''}{lumpReturn}%)</span>
                    </p>
                </div>
                <div className="rounded-xl bg-[var(--bg-primary)] p-3">
                    <p className="text-[10px] uppercase tracking-wider text-[var(--text-secondary)]">
                        {dcaWins ? 'DCA Advantage' : 'Lump Sum Advantage'}
                    </p>
                    <p className={`mt-1 text-lg font-bold ${dcaWins ? 'text-orange-400' : 'text-cyan-400'}`}>
                        {last ? Math.abs(last.dcaValue - last.lumpValue).toLocaleString() : 0}
                    </p>
                    <p className="text-[10px] text-[var(--text-secondary)]">
                        Fees: {last?.fees ?? 0}
                    </p>
                </div>
            </div>

            {/* Chart */}
            <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                        <defs>
                            <linearGradient id="investedGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="dcaGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="lumpGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.15} />
                                <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" />
                        <XAxis
                            dataKey="period"
                            tick={{ fontSize: 10, fill: '#8888a0' }}
                            axisLine={{ stroke: '#1e1e2e' }}
                        />
                        <YAxis
                            tick={{ fontSize: 10, fill: '#8888a0' }}
                            axisLine={{ stroke: '#1e1e2e' }}
                        />
                        <Tooltip content={<SimTooltip />} />
                        <Legend
                            verticalAlign="top"
                            height={28}
                            iconType="line"
                            wrapperStyle={{ fontSize: '11px' }}
                        />
                        <Area
                            type="monotone"
                            dataKey="invested"
                            name="Invested"
                            stroke="#6366f1"
                            strokeWidth={2}
                            strokeDasharray="4 4"
                            fill="url(#investedGrad)"
                        />
                        <Area
                            type="monotone"
                            dataKey="dcaValue"
                            name="DCA Strategy"
                            stroke="#f97316"
                            strokeWidth={2.5}
                            fill="url(#dcaGrad)"
                        />
                        <Area
                            type="monotone"
                            dataKey="lumpValue"
                            name="Lump Sum"
                            stroke="#06b6d4"
                            strokeWidth={1.5}
                            strokeDasharray="6 3"
                            fill="url(#lumpGrad)"
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>

            <p className="mt-3 text-center text-[10px] text-[var(--text-secondary)]">
                Modeled with Geometric Brownian Motion ({scenario.label}, {(scenario.annualVol * 100).toFixed(0)}% volatility). Not financial advice.
            </p>
        </motion.div>
    );
}

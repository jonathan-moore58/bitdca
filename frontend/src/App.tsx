import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import Header from './components/Header';
import GlowBackground from './components/GlowBackground';
import ErrorBoundary from './components/ErrorBoundary';
import { ToastProvider } from './components/Toast';

// Lazy-loaded pages for code splitting
const Dashboard = lazy(() => import('./pages/Dashboard'));
const CreatePosition = lazy(() => import('./pages/CreatePosition'));
const PositionDetail = lazy(() => import('./pages/PositionDetail'));
const NotFound = lazy(() => import('./pages/NotFound'));

/** Loading skeleton shown while lazy chunks load */
function PageLoader() {
    return (
        <div className="mx-auto max-w-6xl px-4 py-12">
            <div className="space-y-6">
                <div className="h-10 w-64 animate-pulse rounded-xl bg-[var(--bg-card)]" />
                <div className="h-5 w-96 animate-pulse rounded-lg bg-[var(--bg-card)]" />
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="h-28 animate-pulse rounded-2xl bg-[var(--bg-card)]" />
                    ))}
                </div>
            </div>
        </div>
    );
}

/** Page transition wrapper */
const pageVariants = {
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -8 },
};

function AnimatedRoutes() {
    const location = useLocation();
    return (
        <AnimatePresence mode="wait">
            <motion.div
                key={location.pathname}
                variants={pageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: 0.2, ease: 'easeOut' }}
            >
                <Suspense fallback={<PageLoader />}>
                    <Routes location={location}>
                        <Route path="/" element={<Dashboard />} />
                        <Route path="/create" element={<CreatePosition />} />
                        <Route path="/position/:id" element={<PositionDetail />} />
                        <Route path="*" element={<NotFound />} />
                    </Routes>
                </Suspense>
            </motion.div>
        </AnimatePresence>
    );
}

export default function App() {
    return (
        <ErrorBoundary>
            <BrowserRouter>
                <ToastProvider>
                    <div className="relative min-h-screen bg-[var(--bg-primary)]">
                        <GlowBackground />
                        <Header />
                        <main>
                            <AnimatedRoutes />
                        </main>

                        {/* Footer */}
                        <footer className="border-t border-[var(--border)] py-8 mt-16">
                            <div className="mx-auto max-w-6xl px-4">
                                <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
                                    <div className="flex items-center gap-2">
                                        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-orange-500 to-amber-600 text-[10px] font-extrabold text-white">
                                            B
                                        </div>
                                        <span className="text-sm font-semibold text-[var(--text-secondary)]">
                                            BitDCA
                                        </span>
                                    </div>
                                    <p className="text-xs text-[var(--text-secondary)]">
                                        Auto-Stack on Bitcoin L1 — Powered by OPNet & MotoSwap
                                    </p>
                                </div>
                            </div>
                        </footer>
                    </div>
                </ToastProvider>
            </BrowserRouter>
        </ErrorBoundary>
    );
}

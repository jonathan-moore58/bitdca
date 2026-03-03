import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

export default function NotFound() {
    return (
        <div className="mx-auto max-w-2xl px-4 py-24 text-center">
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                className="flex flex-col items-center"
            >
                {/* 404 number with gradient */}
                <div className="relative">
                    <span className="text-[120px] font-black leading-none bg-gradient-to-b from-orange-400/30 to-transparent bg-clip-text text-transparent select-none">
                        404
                    </span>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500/20 to-amber-500/10 backdrop-blur-sm">
                            <svg
                                viewBox="0 0 24 24"
                                className="h-10 w-10 text-orange-400"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth={1.5}
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
                                />
                            </svg>
                        </div>
                    </div>
                </div>

                <h1 className="mt-4 text-2xl font-extrabold text-[var(--text-primary)]">
                    Page Not Found
                </h1>
                <p className="mt-2 text-sm text-[var(--text-secondary)] max-w-sm">
                    The page you're looking for doesn't exist or has been moved. Let's get you back on track.
                </p>

                <div className="mt-8 flex items-center gap-3">
                    <Link to="/" className="no-underline">
                        <motion.button
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.97 }}
                            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-orange-500/25"
                        >
                            <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor">
                                <path
                                    fillRule="evenodd"
                                    d="M9.293 2.293a1 1 0 0 1 1.414 0l7 7A1 1 0 0 1 17 11h-1v6a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1v-3a1 1 0 0 0-1-1H9a1 1 0 0 0-1 1v3a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-6H3a1 1 0 0 1-.707-1.707l7-7Z"
                                    clipRule="evenodd"
                                />
                            </svg>
                            Back to Dashboard
                        </motion.button>
                    </Link>
                    <Link to="/create" className="no-underline">
                        <button className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] px-6 py-3 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)] hover:border-[var(--text-secondary)]">
                            <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor">
                                <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
                            </svg>
                            New Position
                        </button>
                    </Link>
                </div>
            </motion.div>
        </div>
    );
}

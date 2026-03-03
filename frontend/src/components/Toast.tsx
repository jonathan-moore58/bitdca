import { createContext, useCallback, useContext, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
    id: number;
    type: ToastType;
    title: string;
    message?: string;
    duration?: number;
}

interface ToastContextType {
    toast: (type: ToastType, title: string, message?: string, duration?: number) => void;
    success: (title: string, message?: string) => void;
    error: (title: string, message?: string) => void;
    info: (title: string, message?: string) => void;
    warning: (title: string, message?: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

let nextId = 0;

const typeConfig: Record<ToastType, { bg: string; border: string; icon: string; color: string }> = {
    success: {
        bg: 'bg-emerald-500/10',
        border: 'border-emerald-500/25',
        icon: 'M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
        color: 'text-emerald-400',
    },
    error: {
        bg: 'bg-red-500/10',
        border: 'border-red-500/25',
        icon: 'M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z',
        color: 'text-red-400',
    },
    info: {
        bg: 'bg-blue-500/10',
        border: 'border-blue-500/25',
        icon: 'm11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z',
        color: 'text-blue-400',
    },
    warning: {
        bg: 'bg-amber-500/10',
        border: 'border-amber-500/25',
        icon: 'M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z',
        color: 'text-amber-400',
    },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const removeToast = useCallback((id: number) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    const addToast = useCallback(
        (type: ToastType, title: string, message?: string, duration = 4000) => {
            const id = ++nextId;
            setToasts((prev) => [...prev.slice(-4), { id, type, title, message, duration }]);
            if (duration > 0) {
                setTimeout(() => removeToast(id), duration);
            }
        },
        [removeToast],
    );

    const contextValue: ToastContextType = {
        toast: addToast,
        success: (title, message) => addToast('success', title, message),
        error: (title, message) => addToast('error', title, message),
        info: (title, message) => addToast('info', title, message),
        warning: (title, message) => addToast('warning', title, message),
    };

    return (
        <ToastContext.Provider value={contextValue}>
            {children}

            {/* Toast container — fixed bottom-right */}
            <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
                <AnimatePresence mode="popLayout">
                    {toasts.map((t) => {
                        const cfg = typeConfig[t.type];
                        return (
                            <motion.div
                                key={t.id}
                                layout
                                initial={{ opacity: 0, x: 60, scale: 0.95 }}
                                animate={{ opacity: 1, x: 0, scale: 1 }}
                                exit={{ opacity: 0, x: 60, scale: 0.95 }}
                                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                                className={`pointer-events-auto flex items-start gap-3 rounded-xl border ${cfg.border} ${cfg.bg} px-4 py-3 shadow-2xl backdrop-blur-md min-w-[280px] max-w-[380px]`}
                            >
                                <svg
                                    viewBox="0 0 24 24"
                                    className={`h-5 w-5 shrink-0 ${cfg.color}`}
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth={1.5}
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" d={cfg.icon} />
                                </svg>
                                <div className="flex-1 min-w-0">
                                    <p className={`text-sm font-semibold ${cfg.color}`}>{t.title}</p>
                                    {t.message && (
                                        <p className="mt-0.5 text-xs text-[var(--text-secondary)] leading-relaxed">
                                            {t.message}
                                        </p>
                                    )}
                                </div>
                                <button
                                    onClick={() => removeToast(t.id)}
                                    className="shrink-0 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                                >
                                    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor">
                                        <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                                    </svg>
                                </button>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </div>
        </ToastContext.Provider>
    );
}

export function useToast(): ToastContextType {
    const ctx = useContext(ToastContext);
    if (!ctx) throw new Error('useToast must be used within <ToastProvider>');
    return ctx;
}

export function Brand({ compact = false }: { compact?: boolean }) {
    return (
        <div className="brand" aria-label="Portal Financeiro">
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none" aria-hidden="true">
                <path d="M7 29V14a11 11 0 0 1 22 0v15" stroke="currentColor" strokeWidth="3.2" />
                <path d="M15 29V17a4 4 0 0 1 8 0v12" stroke="#a79be8" strokeWidth="3.2" />
            </svg>
            {!compact && (
                <span>
                    portal<span className="brand-subtitle">financeiro</span>
                </span>
            )}
        </div>
    );
}

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { useFinance } from '../context/FinanceContext';

interface MobileDateSelectorProps {
    className?: string;
}

export const MobileDateSelector: React.FC<MobileDateSelectorProps> = ({ className }) => {
    const { selectedDate, setSelectedDate } = useFinance();
    const [isExpanded, setIsExpanded] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const selectedRef = useRef<HTMLButtonElement>(null);

    // Generate months for 2000-2100
    const startYear = 2000;
    const endYear = 2100;
    const months: Date[] = [];
    for (let y = startYear; y <= endYear; y++) {
        for (let m = 0; m < 12; m++) {
            months.push(new Date(y, m, 1));
        }
    }

    // Scroll to selected date
    useEffect(() => {
        if (isExpanded && selectedRef.current && scrollRef.current) {
            const container = scrollRef.current;
            const selected = selectedRef.current;

            const containerWidth = container.clientWidth;
            const selectedWidth = selected.clientWidth;
            const selectedLeft = selected.offsetLeft;

            // Calculate scroll position to center the element
            const scrollPos = selectedLeft - (containerWidth / 2) + (selectedWidth / 2);

            container.scrollTo({
                left: scrollPos,
                behavior: 'smooth'
            });
        }
    }, [selectedDate, isExpanded]);

    const changeMonth = (date: Date) => {
        setSelectedDate(date);
    };

    const currentMonthName = selectedDate.toLocaleString('pt-BR', { month: 'long' });
    const isDifferentYear = selectedDate.getFullYear() !== new Date().getFullYear();
    const currentYear = isDifferentYear ? ` ${selectedDate.getFullYear()}` : '';

    return (
        <div className={className} style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {/* Header */}
            <div
                onClick={() => setIsExpanded(!isExpanded)}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    cursor: 'pointer',
                    padding: '0.5rem',
                    borderRadius: '0.5rem',
                    backgroundColor: isExpanded ? 'var(--bg-card)' : 'transparent',
                    transition: 'background-color 0.2s',
                    zIndex: 20
                }}
            >
                <img src="/logo-icon.png" alt="Logo" style={{ height: '24px', width: '24px' }} />
                <span style={{
                    fontSize: '1.125rem',
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    textTransform: 'capitalize'
                }}>
                    {currentMonthName} {currentYear}
                </span>
                <ChevronDown size={20} style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
            </div>

            {/* Expandable Carousel - Absolutely Positioned */}
            {isExpanded && (
                <>
                    <div
                        style={{ position: 'fixed', inset: 0, zIndex: 10 }}
                        onClick={() => setIsExpanded(false)}
                    />
                    <div style={{
                        position: 'absolute',
                        top: '100%',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        width: '90vw',
                        maxWidth: '350px',
                        backgroundColor: 'var(--bg-card)',
                        border: '1px solid var(--border)',
                        borderRadius: '1rem',
                        padding: '1rem 0',
                        marginTop: '0.5rem',
                        boxShadow: 'var(--shadow-lg)',
                        zIndex: 20,
                        animation: 'fadeIn 0.2s ease-out'
                    }}>
                        <div
                            ref={scrollRef}
                            style={{
                                display: 'flex',
                                gap: '0.5rem',
                                overflowX: 'auto',
                                padding: '0 50%', // Large padding to allow centering first/last items
                                scrollbarWidth: 'none',
                                msOverflowStyle: 'none',
                                scrollBehavior: 'smooth',
                                scrollSnapType: 'x mandatory'
                            }}
                        >
                            {months.map((date, index) => {
                                const isSelected = date.getMonth() === selectedDate.getMonth() && date.getFullYear() === selectedDate.getFullYear();
                                const isDifferentYear = date.getFullYear() !== new Date().getFullYear();
                                const label = date.toLocaleString('pt-BR', { month: 'long' });
                                const yearLabel = isDifferentYear ? ` ${date.getFullYear()}` : '';

                                return (
                                    <button
                                        key={index}
                                        ref={isSelected ? selectedRef : null}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            changeMonth(date);
                                        }}
                                        style={{
                                            flex: '0 0 auto',
                                            width: '100px',
                                            padding: '0.5rem 0',
                                            borderRadius: '2rem',
                                            border: isSelected ? '2px solid var(--primary)' : '1px solid var(--border)',
                                            backgroundColor: isSelected ? 'rgba(139, 92, 246, 0.1)' : 'transparent',
                                            color: isSelected ? 'var(--primary)' : 'var(--text-secondary)',
                                            fontWeight: isSelected ? 700 : 400,
                                            cursor: 'pointer',
                                            textTransform: 'capitalize',
                                            whiteSpace: 'nowrap',
                                            transition: 'all 0.2s ease',
                                            scrollSnapAlign: 'center',
                                            textAlign: 'center'
                                        }}
                                    >
                                        {label}{yearLabel}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

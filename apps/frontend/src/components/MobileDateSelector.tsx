import React, { useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { useFinance } from '../context/FinanceContext';

interface MobileDateTriggerProps {
    isExpanded: boolean;
    onToggle: () => void;
    className?: string;
}

export const MobileDateTrigger: React.FC<MobileDateTriggerProps> = ({ isExpanded, onToggle, className }) => {
    const { selectedDate } = useFinance();

    const currentMonthName = selectedDate.toLocaleString('pt-BR', { month: 'long' });
    const isDifferentYear = selectedDate.getFullYear() !== new Date().getFullYear();
    const currentYear = isDifferentYear ? ` ${selectedDate.getFullYear()}` : '';

    return (
        <div
            className={className}
            onClick={onToggle}
            style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                cursor: 'pointer',
                padding: '0.5rem',
                borderRadius: '0.5rem',
                backgroundColor: 'transparent',
                zIndex: 20
            }}
        >
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
    );
};

interface MobileDateCarouselProps {
    isExpanded: boolean;
}

export const MobileDateCarousel: React.FC<MobileDateCarouselProps> = ({ isExpanded }) => {
    const { selectedDate, setSelectedDate } = useFinance();
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

    return (
        <div style={{
            width: '100%',
            maxHeight: isExpanded ? '80px' : '0',
            opacity: isExpanded ? 1 : 0,
            overflow: 'hidden',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        }}>
            <div
                ref={scrollRef}
                style={{
                    display: 'flex',
                    gap: '0.75rem',
                    overflowX: 'auto',
                    padding: '0.5rem 1rem 1rem 1rem',
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
                            onClick={() => changeMonth(date)}
                            style={{
                                flex: '0 0 auto',
                                minWidth: '30%', // Approx 3 items visible
                                padding: '0.5rem 0',
                                borderRadius: '2rem',
                                border: isSelected ? 'none' : '1px solid var(--border)',
                                backgroundColor: isSelected ? 'var(--primary)' : 'rgba(255, 255, 255, 0.03)',
                                color: isSelected ? 'white' : 'var(--text-secondary)',
                                fontWeight: isSelected ? 600 : 400,
                                cursor: 'pointer',
                                textTransform: 'capitalize',
                                whiteSpace: 'nowrap',
                                transition: 'all 0.2s ease',
                                boxShadow: isSelected ? '0 4px 12px rgba(99, 102, 241, 0.3)' : 'none',
                                scrollSnapAlign: 'center'
                            }}
                        >
                            {label}{yearLabel}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

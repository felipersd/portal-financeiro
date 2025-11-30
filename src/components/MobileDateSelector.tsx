import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { useFinance } from '../context/FinanceContext';

export const MobileDateSelector: React.FC = () => {
    const { selectedDate, setSelectedDate } = useFinance();
    const [isExpanded, setIsExpanded] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Generate months for the carousel (current - 6 to current + 6 for broader range)
    const getCarouselMonths = () => {
        const months = [];
        for (let i = -6; i <= 6; i++) {
            const d = new Date(selectedDate);
            d.setMonth(d.getMonth() + i);
            months.push(d);
        }
        return months;
    };

    const carouselMonths = getCarouselMonths();

    const changeMonth = (date: Date) => {
        setSelectedDate(date);
        // Optional: Collapse after selection if desired, but user might want to browse
        // setIsExpanded(false); 
    };

    // Auto-scroll to center when expanded or date changes
    useEffect(() => {
        if (isExpanded && scrollRef.current) {
            const scrollWidth = scrollRef.current.scrollWidth;
            const clientWidth = scrollRef.current.clientWidth;
            // Calculate center position based on selected item index (approximate)
            // Better approach: find the selected element and scroll to it
            // For now, simple centering of the view
            scrollRef.current.scrollLeft = (scrollWidth - clientWidth) / 2;
        }
    }, [selectedDate, isExpanded]);

    const currentMonthName = selectedDate.toLocaleString('pt-BR', { month: 'long' });
    const currentYear = selectedDate.getFullYear();

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', gap: '0.5rem' }}>
            {/* Header: Centered Month/Year with Dropdown Arrow */}
            <div
                onClick={() => setIsExpanded(!isExpanded)}
                style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                    fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)', cursor: 'pointer',
                    padding: '0.5rem', borderRadius: '0.5rem', transition: 'background-color 0.2s'
                }}
            >
                <span style={{ textTransform: 'capitalize' }}>{currentMonthName} {currentYear}</span>
                <ChevronDown size={20} style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
            </div>

            {/* Expandable Carousel Area */}
            <div style={{
                width: '100%',
                maxHeight: isExpanded ? '80px' : '0',
                opacity: isExpanded ? 1 : 0,
                overflow: 'hidden',
                transition: 'all 0.3s ease-in-out',
            }}>
                <div
                    ref={scrollRef}
                    style={{
                        display: 'flex', gap: '0.75rem', overflowX: 'auto', padding: '0.5rem 1rem',
                        scrollbarWidth: 'none', msOverflowStyle: 'none', justifyContent: 'flex-start' // Align start to allow scrolling
                    }}
                >
                    {carouselMonths.map((date, index) => {
                        const isSelected = date.getMonth() === selectedDate.getMonth() && date.getFullYear() === selectedDate.getFullYear();
                        const isDifferentYear = date.getFullYear() !== new Date().getFullYear();
                        const label = date.toLocaleString('pt-BR', { month: 'long' });
                        const yearLabel = isDifferentYear ? ` ${date.getFullYear()}` : '';

                        return (
                            <button
                                key={index}
                                onClick={() => changeMonth(date)}
                                style={{
                                    flex: '0 0 auto',
                                    padding: '0.5rem 1.25rem',
                                    borderRadius: '2rem',
                                    border: isSelected ? 'none' : '1px solid var(--border)',
                                    backgroundColor: isSelected ? 'var(--primary)' : 'var(--bg-card)',
                                    color: isSelected ? 'white' : 'var(--text-secondary)',
                                    fontWeight: isSelected ? 600 : 400,
                                    cursor: 'pointer',
                                    textTransform: 'capitalize',
                                    whiteSpace: 'nowrap',
                                    transition: 'all 0.2s ease',
                                    boxShadow: isSelected ? '0 4px 12px rgba(99, 102, 241, 0.3)' : 'none'
                                }}
                            >
                                {label}{yearLabel}
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

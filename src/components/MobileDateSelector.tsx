import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { useFinance } from '../context/FinanceContext';

export const MobileDateSelector: React.FC = () => {
    const { selectedDate, setSelectedDate } = useFinance();
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Generate months for the carousel (current - 2 to current + 2)
    const getCarouselMonths = () => {
        const months = [];
        for (let i = -2; i <= 2; i++) {
            const d = new Date(selectedDate);
            d.setMonth(d.getMonth() + i);
            months.push(d);
        }
        return months;
    };

    const carouselMonths = getCarouselMonths();

    const changeMonth = (date: Date) => {
        setSelectedDate(date);
    };

    const changeYear = (increment: number) => {
        const newDate = new Date(selectedDate);
        newDate.setFullYear(newDate.getFullYear() + increment);
        setSelectedDate(newDate);
    };

    const selectMonthFromDropdown = (monthIndex: number) => {
        const newDate = new Date(selectedDate);
        newDate.setMonth(monthIndex);
        setSelectedDate(newDate);
        setIsDropdownOpen(false);
    };

    // Auto-scroll to center (simple implementation)
    useEffect(() => {
        if (scrollRef.current) {
            // Center the scroll view
            const scrollWidth = scrollRef.current.scrollWidth;
            const clientWidth = scrollRef.current.clientWidth;
            scrollRef.current.scrollLeft = (scrollWidth - clientWidth) / 2;
        }
    }, [selectedDate]);

    const currentMonthName = selectedDate.toLocaleString('pt-BR', { month: 'long' });
    const currentYear = selectedDate.getFullYear();

    const allMonths = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%' }}>
            {/* Header: Centered Month/Year with Dropdown */}
            <div
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                    fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)', cursor: 'pointer'
                }}
            >
                <span style={{ textTransform: 'capitalize' }}>{currentMonthName} {currentYear}</span>
                <ChevronDown size={20} style={{ transform: isDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
            </div>

            {/* Dropdown for Year/Month Selection */}
            {isDropdownOpen && (
                <div className="card" style={{
                    position: 'absolute', top: '60px', left: '50%', transform: 'translateX(-50%)',
                    width: '90%', maxWidth: '350px', zIndex: 100, padding: '1rem',
                    boxShadow: 'var(--shadow-lg)', border: '1px solid var(--border)'
                }}>
                    {/* Year Selector */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <button onClick={(e) => { e.stopPropagation(); changeYear(-1); }} style={{ background: 'none', border: 'none', color: 'var(--text-primary)' }}><ChevronLeft /></button>
                        <span style={{ fontSize: '1.1rem', fontWeight: 700 }}>{currentYear}</span>
                        <button onClick={(e) => { e.stopPropagation(); changeYear(1); }} style={{ background: 'none', border: 'none', color: 'var(--text-primary)' }}><ChevronRight /></button>
                    </div>

                    {/* Month Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                        {allMonths.map((m, idx) => (
                            <button
                                key={m}
                                onClick={(e) => { e.stopPropagation(); selectMonthFromDropdown(idx); }}
                                style={{
                                    padding: '0.5rem', borderRadius: '0.5rem', border: 'none',
                                    backgroundColor: idx === selectedDate.getMonth() ? 'var(--primary)' : 'transparent',
                                    color: idx === selectedDate.getMonth() ? 'white' : 'var(--text-primary)',
                                    cursor: 'pointer', fontSize: '0.9rem'
                                }}
                            >
                                {m.substring(0, 3)}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Horizontal Scrollable Months (Carousel) */}
            <div
                ref={scrollRef}
                style={{
                    display: 'flex', gap: '0.75rem', overflowX: 'auto', padding: '0.5rem 0',
                    scrollbarWidth: 'none', msOverflowStyle: 'none', justifyContent: 'space-between'
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
    );
};

import React from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { useFinance } from '../context/FinanceContext';

export const MonthYearPicker: React.FC = () => {
    const { selectedDate, setSelectedDate } = useFinance();

    const changeMonth = (increment: number) => {
        const newDate = new Date(selectedDate);
        newDate.setMonth(newDate.getMonth() + increment);
        setSelectedDate(newDate);
    };

    const monthName = selectedDate.toLocaleString('pt-BR', { month: 'long' });
    const year = selectedDate.getFullYear();

    return (
        <div style={{
            display: 'flex', alignItems: 'center', gap: '1rem',
            backgroundColor: 'var(--bg-card)', padding: '0.5rem 1rem', borderRadius: '2rem',
            border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)'
        }}>
            <button
                onClick={() => changeMonth(-1)}
                style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex' }}
            >
                <ChevronLeft size={20} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: '140px', justifyContent: 'center' }}>
                <Calendar size={18} className="text-primary" />
                <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>
                    {monthName} {year}
                </span>
            </div>

            <button
                onClick={() => changeMonth(1)}
                style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex' }}
            >
                <ChevronRight size={20} />
            </button>
        </div>
    );
};

import React from 'react';
import { KpiCard, KpiCardProps } from './KpiCard';

export interface KpiRowProps {
  cards?: KpiCardProps[];
  children?: React.ReactNode;
  style?: React.CSSProperties;
}

/**
 * KpiRow
 * Layout row for 2-5 KPI cards according to HMS Design Bible § 2 & § 9.
 * Provides the standard auto-fit grid with 16px gap.
 */
export const KpiRow: React.FC<KpiRowProps> = ({ cards, children, style }) => {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '16px',
        ...style,
      }}
    >
      {cards ? cards.map((card, idx) => <KpiCard key={card.label || idx} {...card} />) : children}
    </div>
  );
};

export default KpiRow;

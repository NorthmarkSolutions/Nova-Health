// Accounts Manager · small bar chart for trends inside a detail section (HMS tokens only).
import React from 'react';
import { HMS } from '../../../components/hms';

export const ManagerBars: React.FC<{
  labels: string[];
  a: number[];
  b?: number[];
  legend?: [string, string];
  tip?: (i: number) => string;
  colorA?: (v: number, i: number) => string;
  line?: { value: number; label: string };
}> = ({ labels, a, b, legend, tip, colorA, line }) => {
  const mx = Math.max(...a.map(Math.abs), ...(b || [0]).map(Math.abs), line?.value || 0) || 1;
  const h = (v: number) => `${Math.max(2, Math.round((Math.abs(v) / mx) * 110))}px`;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {legend && (
        <div style={{ display: 'flex', gap: '14px', fontSize: '12px', color: HMS.textSecondary }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: HMS.primary }} />
            {legend[0]}
          </span>
          {b && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: '#cbd5e1' }} />
              {legend[1]}
            </span>
          )}
        </div>
      )}
      <div style={{ position: 'relative', height: '120px', display: 'flex', alignItems: 'flex-end', gap: '4px', borderBottom: `1px solid ${HMS.border}` }}>
        {line && (
          <div style={{ position: 'absolute', left: 0, right: 0, bottom: `${Math.round((line.value / mx) * 110)}px`, borderTop: '1.5px dashed #dc2626' }}>
            <span style={{ position: 'absolute', left: 0, bottom: '2px', fontSize: '12px', fontWeight: 600, color: '#b91c1c', background: '#ffffff', padding: '0 4px' }}>{line.label}</span>
          </div>
        )}
        {labels.map((l, i) => (
          <div key={i} title={tip ? tip(i) : l} style={{ flex: 1, minWidth: 0, height: '100%', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: '2px' }}>
            <div style={{ flex: 1, maxWidth: '22px', borderRadius: '3px 3px 0 0', height: h(a[i]), background: colorA ? colorA(a[i], i) : HMS.primary }} />
            {b && <div style={{ flex: 1, maxWidth: '22px', borderRadius: '3px 3px 0 0', height: h(b[i]), background: '#cbd5e1' }} />}
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: '4px' }}>
        {labels.map((l, i) => (
          <span key={i} style={{ flex: 1, minWidth: 0, textAlign: 'center', fontSize: '12px', color: HMS.textSecondary, whiteSpace: 'nowrap', overflow: 'hidden' }}>
            {l}
          </span>
        ))}
      </div>
    </div>
  );
};

// Front Desk — lobby calling screen, opened in its own window on the waiting-area TV (/reception?tv=1).
// Shows the token being called to each chamber and who is next, from the same live queue the desk uses.
import React, { useEffect, useState } from 'react';
import { useReceptionData, isWaiting, tokenLabel } from './receptionData';

export const ReceptionTvBoard: React.FC = () => {
  const data = useReceptionData();
  const [clock, setClock] = useState(() => new Date());
  useEffect(() => {
    const t = window.setInterval(() => setClock(new Date()), 1000);
    return () => window.clearInterval(t);
  }, []);

  const calling = data.queue.filter((t) => t.callingStatus === 'CALLING' && t.status !== 'COMPLETED').sort((a, b) => b.token - a.token);
  const rank = (t: (typeof data.queue)[number]) => (t.priority === 'EMERGENCY' || t.status === 'EMERGENCY' ? 0 : t.priority === 'URGENT' || t.priority === 'VIP' ? 1 : 2);
  const next = data.queue.filter(isWaiting).sort((a, b) => rank(a) - rank(b) || a.token - b.token).slice(0, 8);
  // Patient privacy on a public screen: first name and last initial only
  const shortName = (n: string) => {
    const [f, ...rest] = n.split(' ');
    return `${f}${rest.length ? ` ${rest[rest.length - 1].charAt(0)}.` : ''}`;
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0b1220', color: '#ffffff', fontFamily: "'Inter', sans-serif", padding: '32px 40px', display: 'flex', flexDirection: 'column', gap: '28px' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: '28px', fontWeight: 700 }}>North Hospital · OPD</div>
          <div style={{ fontSize: '16px', color: '#94a3b8' }}>Please wait for your token to be called</div>
        </div>
        <div style={{ fontSize: '40px', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{clock.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
      </header>
      <section style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr)', gap: '28px', flex: 1 }}>
        <div style={{ background: '#111a2e', borderRadius: '16px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ fontSize: '18px', fontWeight: 600, color: '#93c5fd', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Now calling</div>
          {calling.length === 0 && <div style={{ fontSize: '22px', color: '#94a3b8' }}>No token is being called right now.</div>}
          {calling.slice(0, 5).map((t, i) => (
            <div key={t.token} style={{ display: 'grid', gridTemplateColumns: '160px minmax(0, 1fr) auto', alignItems: 'center', gap: '20px', padding: '16px 20px', borderRadius: '12px', background: i === 0 ? '#1d4ed8' : '#18233d' }}>
              <span style={{ fontSize: i === 0 ? '64px' : '44px', fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{tokenLabel(t.token)}</span>
              <span style={{ fontSize: '24px', fontWeight: 600 }}>{shortName(t.patient)}</span>
              <span style={{ fontSize: '28px', fontWeight: 700 }}>{t.callPoint || t.room}</span>
            </div>
          ))}
        </div>
        <div style={{ background: '#111a2e', borderRadius: '16px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ fontSize: '18px', fontWeight: 600, color: '#93c5fd', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Next</div>
          {next.length === 0 && <div style={{ fontSize: '20px', color: '#94a3b8' }}>Nobody waiting.</div>}
          {next.map((t) => (
            <div key={t.token} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderRadius: '10px', background: '#18233d', fontSize: '22px' }}>
              <span style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{tokenLabel(t.token)}</span>
              <span style={{ color: '#cbd5e1' }}>{t.doctor.replace(/\s*\(.*\)$/, '')}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

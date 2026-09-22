import React, { useState, useEffect } from 'react';
import {
  X,
  Tv,
  Volume2,
  Maximize2,
  Clock,
  DoorClosed,
  Stethoscope,
  Bell,
  Sparkles,
} from 'lucide-react';
import { SharedQueueToken } from '../../../services/patientJourneyService';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  queue: SharedQueueToken[];
}

export const LobbyTvDisplayModal: React.FC<Props> = ({ isOpen, onClose, queue }) => {
  if (!isOpen) return null;

  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const currentlyServing = queue.filter(
    (q) => q.status === 'IN_CONSULTATION' || q.callingStatus === 'CALLING'
  );
  const nextInLine = queue.filter((q) => q.status === 'WAITING' || q.status === 'TRIAGED');

  const playChime = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.15); // A5
      gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.8);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.8);
    } catch {
      // Audio fallback
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: '#090d16',
        color: '#ffffff',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
    >
      {/* Top TV Header Bar */}
      <header
        style={{
          padding: '1.25rem 2.5rem',
          backgroundColor: '#0f172a',
          borderBottom: '2px solid #1e293b',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '10px',
              backgroundColor: '#0284c7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Tv size={26} color="#ffffff" />
          </div>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 900, margin: 0, letterSpacing: '-0.02em', color: '#f8fafc' }}>
              NORTH HOSPITAL • OPD WAITING LOBBY
            </h1>
            <p style={{ margin: 0, fontSize: '0.875rem', color: '#38bdf8', fontWeight: 600 }}>
              Live Consultation Queue & Examination Chamber Announcer
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', backgroundColor: '#1e293b', padding: '0.5rem 1.25rem', borderRadius: '30px' }}>
            <Clock size={20} color="#38bdf8" />
            <span style={{ fontSize: '1.25rem', fontWeight: 900, fontFamily: 'monospace', color: '#f8fafc' }}>
              {currentTime}
            </span>
          </div>

          <button
            type="button"
            onClick={playChime}
            className="btn btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#1e293b', color: '#38bdf8', border: '1px solid #334155' }}
            title="Play Chime Audio"
          >
            <Volume2 size={18} /> Test Chime
          </button>

          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '0.6rem 1.2rem',
              backgroundColor: '#ef4444',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 800,
              fontSize: '0.875rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
            }}
          >
            <X size={18} /> Exit TV Display Mode
          </button>
        </div>
      </header>

      {/* Main Split Screen */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1.4fr 1fr', padding: '2rem', gap: '2rem', overflow: 'hidden' }}>
        {/* Left Column: Currently Serving in Chambers */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', borderBottom: '2px solid #0284c7', paddingBottom: '0.75rem' }}>
            <span style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#22c55e', display: 'inline-block', boxShadow: '0 0 12px #22c55e' }} />
            <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 900, color: '#f8fafc', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              NOW SERVING IN CHAMBERS
            </h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto', flex: 1 }}>
            {currentlyServing.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b', fontSize: '1.25rem', backgroundColor: '#0f172a', borderRadius: '16px', border: '1px dashed #334155' }}>
                Doctors are currently reviewing patient charts. Next token calling shortly.
              </div>
            ) : (
              currentlyServing.map((item) => (
                <div
                  key={item.token}
                  style={{
                    backgroundColor: item.callingStatus === 'CALLING' ? '#082f49' : '#0f172a',
                    border: `2px solid ${item.callingStatus === 'CALLING' ? '#38bdf8' : '#334155'}`,
                    borderRadius: '16px',
                    padding: '1.5rem 2rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    animation: item.callingStatus === 'CALLING' ? 'pulse 2s infinite' : undefined,
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.4)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
                    <div
                      style={{
                        fontSize: '3.25rem',
                        fontWeight: 900,
                        fontFamily: 'monospace',
                        color: '#38bdf8',
                        lineHeight: 1,
                        backgroundColor: '#1e293b',
                        padding: '0.6rem 1.25rem',
                        borderRadius: '12px',
                        border: '1.5px solid #0284c7',
                      }}
                    >
                      #{String(item.token).padStart(2, '0')}
                    </div>

                    <div>
                      <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#ffffff' }}>
                        {item.patient}
                      </div>
                      <div style={{ fontSize: '1rem', color: '#94a3b8', marginTop: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Stethoscope size={18} color="#38bdf8" />
                        <span>{item.doctor}</span>
                      </div>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '0.8125rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>
                      Report To
                    </span>
                    <div
                      style={{
                        fontSize: '2rem',
                        fontWeight: 900,
                        color: '#4ade80',
                        backgroundColor: '#064e3b',
                        padding: '0.5rem 1.25rem',
                        borderRadius: '12px',
                        border: '1.5px solid #059669',
                        marginTop: '0.25rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                      }}
                    >
                      <DoorClosed size={24} />
                      <span>{item.room}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column: Next in Line Waiting */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', borderBottom: '2px solid #f59e0b', paddingBottom: '0.75rem' }}>
            <Bell size={22} color="#f59e0b" />
            <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 900, color: '#f8fafc', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              NEXT IN LINE ({nextInLine.length})
            </h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', overflowY: 'auto', flex: 1 }}>
            {nextInLine.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b', fontSize: '1.1rem', backgroundColor: '#0f172a', borderRadius: '12px', border: '1px dashed #334155' }}>
                No patients waiting in lobby. All up to date!
              </div>
            ) : (
              nextInLine.slice(0, 6).map((item, idx) => (
                <div
                  key={item.token}
                  style={{
                    backgroundColor: '#0f172a',
                    border: '1px solid #1e293b',
                    borderRadius: '12px',
                    padding: '1rem 1.25rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <span style={{ fontSize: '1.5rem', fontWeight: 900, color: idx === 0 ? '#f59e0b' : '#94a3b8', width: '55px' }}>
                      #{String(item.token).padStart(2, '0')}
                    </span>
                    <div>
                      <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#ffffff' }}>
                        {item.patient}
                      </div>
                      <div style={{ fontSize: '0.8125rem', color: '#94a3b8' }}>
                        {item.doctor.split('(')[0]}
                      </div>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <span
                      style={{
                        padding: '0.3rem 0.65rem',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        fontWeight: 800,
                        backgroundColor: item.priority === 'URGENT' ? '#7f1d1d' : '#1e293b',
                        color: item.priority === 'URGENT' ? '#fca5a5' : '#38bdf8',
                        border: item.priority === 'URGENT' ? '1px solid #ef4444' : '1px solid #334155',
                      }}
                    >
                      {item.priority === 'URGENT' ? '🚨 URGENT' : item.status}
                    </span>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.2rem' }}>
                      Est. Wait ~{(idx + 1) * 10} mins
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Footer Ticker */}
      <footer
        style={{
          padding: '0.75rem 2.5rem',
          backgroundColor: '#0284c7',
          color: '#ffffff',
          fontWeight: 700,
          fontSize: '0.875rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span>
          💡 Please keep your Token Slip ready. When your token is called, proceed directly to the indicated Chamber room.
        </span>
        <span style={{ fontSize: '0.75rem', opacity: 0.9 }}>
          Reception Desk #1 Active • Hospital Emergency Code 999
        </span>
      </footer>
    </div>
  );
};

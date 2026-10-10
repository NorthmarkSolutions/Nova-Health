import React, { useState, useRef, useEffect } from 'react';
import {
  Clock,
  Tags,
  Scale,
  ScrollText,
  ChevronDown
} from 'lucide-react';
import { WorkloadResponse } from '../../../services/accountsService';

export type RoleViewKey = 'executive' | 'supervisor' | 'manager' | 'controller' | 'cfo' | 'auditor';

export interface AccountsStickyAppBarProps {
  activeRoleView?: RoleViewKey;
  onSelectRole?: (role: RoleViewKey) => void;
  workload?: WorkloadResponse['queues'] | null;
  breadcrumbScreen?: string;
  onOpenMaster?: (master: 'coa' | 'dofa' | 'audit') => void;
  currentTime?: Date;
}

export const AccountsStickyAppBar: React.FC<AccountsStickyAppBarProps> = ({
  breadcrumbScreen = 'Accounts Executive Operational Workspace',
  onOpenMaster,
  currentTime = new Date(),
}) => {
  const [isMastersDropdownOpen, setIsMastersDropdownOpen] = useState(false);
  const mastersRef = useRef<HTMLDivElement>(null);

  // Close masters dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (mastersRef.current && !mastersRef.current.contains(event.target as Node)) {
        setIsMastersDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '16px',
        height: '52px',
        padding: '0 24px',
        borderBottom: '1px solid #e5e7eb',
        background: '#ffffff',
        flexShrink: 0,
        position: 'sticky',
        top: 0,
        zIndex: 20,
      }}
    >
      {/* Left: Breadcrumbs & Live Period Badge (Matches Pharmacy layout) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#6b7280' }}>
        <span>North Hospital</span>
        <span style={{ color: '#d1d5db' }}>/</span>
        <span>Accounts &amp; Finance</span>
        <span style={{ color: '#d1d5db' }}>/</span>
        <span style={{ color: '#111827', fontWeight: 600 }}>
          {breadcrumbScreen}
        </span>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            marginLeft: '8px',
            fontSize: '12px',
            fontWeight: 600,
            color: '#16a34a',
            background: '#f0fdf4',
            borderRadius: '4px',
            padding: '2px 6px',
          }}
        >
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#16a34a' }}></span>
          Live FY27 · Period 7 Open
        </span>
      </div>

      {/* Right: Masters Pill + Last Sync Clock (Role switcher removed as each user logs into their specific role) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {/* Foundation Masters Menu */}
        <div ref={mastersRef} style={{ position: 'relative' }}>
          <button
            type="button"
            onClick={() => setIsMastersDropdownOpen(!isMastersDropdownOpen)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              height: '32px',
              padding: '0 12px',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 500,
              color: '#374151',
              background: '#ffffff',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            <span>Masters</span>
            <ChevronDown size={13} style={{ color: '#6b7280' }} />
          </button>

          {isMastersDropdownOpen && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: '4px',
                width: '215px',
                background: '#ffffff',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                padding: '4px',
                zIndex: 50,
                display: 'flex',
                flexDirection: 'column',
                gap: '2px',
              }}
            >
              <button
                type="button"
                onClick={() => {
                  setIsMastersDropdownOpen(false);
                  onOpenMaster?.('coa');
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 10px',
                  borderRadius: '6px',
                  border: 'none',
                  background: 'transparent',
                  color: '#1f2937',
                  fontSize: '12px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <Tags size={14} color="#2563eb" />
                <span>Chart of Accounts</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsMastersDropdownOpen(false);
                  onOpenMaster?.('dofa');
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 10px',
                  borderRadius: '6px',
                  border: 'none',
                  background: 'transparent',
                  color: '#1f2937',
                  fontSize: '12px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <Scale size={14} color="#d97706" />
                <span>DoFA Matrix (POL-01)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsMastersDropdownOpen(false);
                  onOpenMaster?.('audit');
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 10px',
                  borderRadius: '6px',
                  border: 'none',
                  background: 'transparent',
                  color: '#1f2937',
                  fontSize: '12px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <ScrollText size={14} color="#16a34a" />
                <span>Audit Hash Chain</span>
              </button>
            </div>
          )}
        </div>

        {/* Last Sync Clock (Identical to Pharmacy: Clock icon + Last sync · HH:MM PM) */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            height: '32px',
            padding: '0 12px',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            fontSize: '12px',
            color: '#374151',
            whiteSpace: 'nowrap',
            background: '#ffffff',
          }}
        >
          <Clock size={14} /> Last sync · {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </div>
  );
};

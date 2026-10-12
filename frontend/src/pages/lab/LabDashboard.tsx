// /lab — the Technician and Pathologist each work in their own HMS workspace.
// This keeps old links (/lab?tab=queue, /lab?tab=review …) working by sending them to the right one.
import React from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { RoleType } from '../../types';

const PATHOLOGIST_TABS: Record<string, string> = { review: '', callbacks: 'callbacks', 'signed-reports': 'signed-reports', catalog: 'catalog' };
const TECHNICIAN_TABS: Record<string, string> = { queue: '', intake: '', results: 'results', submitted: 'submitted', equipment: 'analyzers', analyzers: 'analyzers' };

export const LabDashboard: React.FC = () => {
  const { role } = useAuth();
  const [searchParams] = useSearchParams();
  const tab = searchParams.get('tab') || '';
  const toPathologist = tab in PATHOLOGIST_TABS || (role === RoleType.PATHOLOGIST && !(tab in TECHNICIAN_TABS));
  const target = toPathologist ? PATHOLOGIST_TABS[tab] ?? '' : TECHNICIAN_TABS[tab] ?? '';
  const base = toPathologist ? '/lab/pathologist' : '/lab/technician';
  return <Navigate to={target ? `${base}?tab=${target}` : base} replace />;
};

export default LabDashboard;

import React, { useState } from 'react';
import {
  Building2,
  Layers,
  LayoutGrid,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { ProfileSection } from './organization/ProfileSection';
import { CampusInfrastructureSection } from './organization/CampusInfrastructureSection';
import { DepartmentsSection } from './organization/DepartmentsSection';
import { OnboardingProgressSection } from './organization/OnboardingProgressSection';

export const OrganizationSetup: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<
    'profile' | 'infrastructure' | 'departments' | 'onboarding'
  >('profile');

  return (
    <div>
      {/* 4-Part Hospital Onboarding Master Sub-Navigation */}
      <div className="subtab-bar" style={{ marginBottom: '1.5rem', overflowX: 'auto', paddingBottom: '0.25rem' }}>
        <button
          className={`subtab-pill ${activeSubTab === 'profile' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('profile')}
        >
          <Building2 size={16} /> 1. Hospital Profile
        </button>
        <button
          className={`subtab-pill ${activeSubTab === 'infrastructure' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('infrastructure')}
        >
          <Layers size={16} /> 2. Campus Infrastructure
        </button>
        <button
          className={`subtab-pill ${activeSubTab === 'departments' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('departments')}
        >
          <LayoutGrid size={16} /> 3. Departments Master
        </button>
        <button
          className={`subtab-pill ${activeSubTab === 'onboarding' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('onboarding')}
        >
          <Sparkles size={16} /> 4. Onboarding Progress (0% to 100%)
        </button>
      </div>

      {/* Render selected onboarding module */}
      {activeSubTab === 'profile' && <ProfileSection />}
      {activeSubTab === 'infrastructure' && <CampusInfrastructureSection />}
      {activeSubTab === 'departments' && <DepartmentsSection />}
      {activeSubTab === 'onboarding' && (
        <OnboardingProgressSection
          onNavigateToTab={(tab) => setActiveSubTab(tab)}
        />
      )}
    </div>
  );
};

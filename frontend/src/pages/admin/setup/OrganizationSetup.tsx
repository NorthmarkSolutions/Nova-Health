import React, { useState } from 'react';
import {
  Building2,
  GitFork,
  LayoutGrid,
  Building,
  Layers,
  DoorClosed,
  BedDouble,
  SlidersHorizontal,
  Users,
} from 'lucide-react';
import { ProfileSection } from './organization/ProfileSection';
import { BranchesSection } from './organization/BranchesSection';
import { DepartmentsSection } from './organization/DepartmentsSection';
import { BuildingsSection } from './organization/BuildingsSection';
import { FloorsSection } from './organization/FloorsSection';
import { RoomsSection } from './organization/RoomsSection';
import { WardsSection } from './organization/WardsSection';
import { BedsSection } from './organization/BedsSection';
import { OrgHierarchySection } from './organization/OrgHierarchySection';

export const OrganizationSetup: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<
    'profile' | 'branches' | 'departments' | 'buildings' | 'floors' | 'rooms' | 'wards' | 'beds' | 'hierarchy'
  >('profile');

  return (
    <div>
      {/* 9-Part Organization Master Setup Sub-Navigation */}
      <div className="subtab-bar" style={{ marginBottom: '1.5rem' }}>
        <button
          className={`subtab-pill ${activeSubTab === 'profile' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('profile')}
        >
          <Building2 size={16} /> 1. Hospital Profile
        </button>
        <button
          className={`subtab-pill ${activeSubTab === 'branches' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('branches')}
        >
          <GitFork size={16} /> 2. Branches
        </button>
        <button
          className={`subtab-pill ${activeSubTab === 'departments' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('departments')}
        >
          <LayoutGrid size={16} /> 3. Departments
        </button>
        <button
          className={`subtab-pill ${activeSubTab === 'buildings' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('buildings')}
        >
          <Building size={16} /> 4. Buildings
        </button>
        <button
          className={`subtab-pill ${activeSubTab === 'floors' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('floors')}
        >
          <Layers size={16} /> 5. Floors
        </button>
        <button
          className={`subtab-pill ${activeSubTab === 'rooms' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('rooms')}
        >
          <DoorClosed size={16} /> 6. Rooms
        </button>
        <button
          className={`subtab-pill ${activeSubTab === 'wards' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('wards')}
        >
          <BedDouble size={16} /> 7. Wards
        </button>
        <button
          className={`subtab-pill ${activeSubTab === 'beds' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('beds')}
        >
          <SlidersHorizontal size={16} /> 8. Beds (Lifecycle)
        </button>
        <button
          className={`subtab-pill ${activeSubTab === 'hierarchy' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('hierarchy')}
        >
          <Users size={16} /> 9. Org Hierarchy
        </button>
      </div>

      {/* Render selected organization setup module */}
      {activeSubTab === 'profile' && <ProfileSection />}
      {activeSubTab === 'branches' && <BranchesSection />}
      {activeSubTab === 'departments' && <DepartmentsSection />}
      {activeSubTab === 'buildings' && <BuildingsSection />}
      {activeSubTab === 'floors' && <FloorsSection />}
      {activeSubTab === 'rooms' && <RoomsSection />}
      {activeSubTab === 'wards' && <WardsSection />}
      {activeSubTab === 'beds' && <BedsSection />}
      {activeSubTab === 'hierarchy' && <OrgHierarchySection />}
    </div>
  );
};

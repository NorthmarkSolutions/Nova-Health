import {
  BuildingNode,
  getCampusBuildings,
  saveCampusBuildings,
} from '../pages/admin/setup/organization/CampusInfrastructureSection';
import { DepartmentProfileData } from '../pages/admin/setup/organization/DepartmentProfileView';
import {
  StaffMember,
  DepartmentPersonnelStats,
  getHospitalStaff,
  saveHospitalStaff,
  addHospitalStaff,
  syncStaffToDepartments,
  assignStaffMembersToDepartment,
  getDepartmentPersonnelStats,
} from '../pages/admin/setup/organization/hospitalStaffStore';
import {
  DepartmentWorkspace,
  DepartmentWorkspaceConfig,
} from '../types';
import {
  getDepartmentWorkspaceById,
  autoProvisionWorkspace,
} from '../pages/department/departmentWorkspaceStore';

export const DEPARTMENTS_STORAGE_KEY = 'north_hospital_departments_master';
export const CAMPUS_BUILDINGS_STORAGE_KEY = 'north_hospital_campus_buildings';

class AdminProvisioningService {
  // ---------------------------------------------------------------------------
  // 1. CAMPUS INFRASTRUCTURE: BUILDINGS
  // ---------------------------------------------------------------------------

  public getBuildings(): BuildingNode[] {
    return getCampusBuildings();
  }

  public getBuildingById(id: string): BuildingNode | undefined {
    return this.getBuildings().find(
      (b) => b.id === id || b.code.toLowerCase() === id.toLowerCase()
    );
  }

  public createBuilding(building: BuildingNode): BuildingNode {
    const buildings = this.getBuildings();
    // Check if duplicate ID or Code exists
    const existingIdx = buildings.findIndex(
      (b) => b.id === building.id || b.code.toUpperCase() === building.code.toUpperCase()
    );

    let updated: BuildingNode[];
    if (existingIdx !== -1) {
      updated = buildings.map((b, i) => (i === existingIdx ? { ...b, ...building } : b));
    } else {
      updated = [...buildings, building];
    }

    saveCampusBuildings(updated);
    return building;
  }

  // ---------------------------------------------------------------------------
  // 2. DEPARTMENTS MASTER
  // ---------------------------------------------------------------------------

  public getDepartments(): DepartmentProfileData[] {
    try {
      const raw = localStorage.getItem(DEPARTMENTS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (err) {
      console.error('Failed to read departments from localStorage', err);
    }
    return [];
  }

  public getDepartmentById(id: string): DepartmentProfileData | undefined {
    return this.getDepartments().find(
      (d) =>
        d.id === id ||
        d.code.toLowerCase() === id.toLowerCase() ||
        (d.shortName && d.shortName.toLowerCase() === id.toLowerCase())
    );
  }

  public createDepartment(dept: DepartmentProfileData): DepartmentProfileData {
    const current = this.getDepartments();
    const existingIdx = current.findIndex(
      (d) => d.id === dept.id || d.code.toUpperCase() === dept.code.toUpperCase()
    );

    let updated: DepartmentProfileData[];
    if (existingIdx !== -1) {
      updated = current.map((d, i) => (i === existingIdx ? { ...d, ...dept } : d));
    } else {
      updated = [dept, ...current];
    }

    this.saveDepartments(updated);

    // Auto-provision the matching department workspace
    autoProvisionWorkspace(dept.id, {
      departmentCode: dept.code,
      departmentName: dept.name,
      shortName: dept.shortName || dept.name.split(' ')[0],
      category: dept.category,
      adminName: dept.head,
      operatingHours: dept.hours,
      config: {
        hasQueue: true,
        hasAppointments: dept.consultationEnabled !== undefined ? dept.consultationEnabled : true,
        hasAdmissions: dept.admissionEnabled !== undefined ? dept.admissionEnabled : (dept.code.includes('IPD') || dept.code.includes('ICU')),
        hasBeds: dept.bedsCount !== undefined && dept.bedsCount > 0,
        hasPrescriptions: dept.prescriptionEnabled !== undefined ? dept.prescriptionEnabled : true,
        hasTests: dept.labRequestsEnabled !== undefined ? dept.labRequestsEnabled : true,
        hasBilling: dept.billingEnabled !== undefined ? dept.billingEnabled : true,
        hasDoctors: dept.category === 'clinical',
        hasRooms: true,
        hasSchedules: true,
        hasWalkIn: true,
      },
    });

    return dept;
  }

  public saveDepartments(depts: DepartmentProfileData[]): void {
    try {
      localStorage.setItem(DEPARTMENTS_STORAGE_KEY, JSON.stringify(depts));
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('north_hospital_departments_updated', { detail: depts })
        );
      }
    } catch (err) {
      console.error('Failed to save departments to localStorage', err);
    }
  }

  // ---------------------------------------------------------------------------
  // 3. STAFF MANAGEMENT
  // ---------------------------------------------------------------------------

  public getStaff(): StaffMember[] {
    return getHospitalStaff();
  }

  public getStaffById(staffId: string): StaffMember | undefined {
    return this.getStaff().find(
      (s) => s.id === staffId || s.employeeCode.toUpperCase() === staffId.toUpperCase()
    );
  }

  public createStaff(member: StaffMember): StaffMember {
    addHospitalStaff(member);
    return member;
  }

  public assignStaffToDepartment(
    staffIds: string[],
    departmentId: string,
    departmentName: string,
    buildingId?: string,
    buildingName?: string
  ): void {
    const current = getHospitalStaff();
    const updated = current.map((member) => {
      if (staffIds.includes(member.id)) {
        const currentDeptIds = member.departmentIds || (member.departmentId ? [member.departmentId] : []);
        const currentDeptNames = member.departmentNames || (member.departmentName ? [member.departmentName] : []);
        const newDeptIds = Array.from(new Set([...currentDeptIds, departmentId]));
        const newDeptNames = Array.from(new Set([...currentDeptNames, departmentName]));

        return {
          ...member,
          departmentId: member.departmentId || departmentId,
          departmentName: member.departmentName || departmentName,
          departmentIds: newDeptIds,
          departmentNames: newDeptNames,
          buildingId: buildingId || member.buildingId,
          buildingName: buildingName || member.buildingName,
        };
      }
      return member;
    });

    saveHospitalStaff(updated);
    syncStaffToDepartments(updated);
  }

  public getDepartmentStats(deptId: string, deptName?: string): DepartmentPersonnelStats {
    return getDepartmentPersonnelStats(deptId, deptName);
  }

  // ---------------------------------------------------------------------------
  // 4. DEPARTMENT WORKSPACE PROVISIONING
  // ---------------------------------------------------------------------------

  public getWorkspace(departmentId: string): DepartmentWorkspace {
    return getDepartmentWorkspaceById(departmentId);
  }
}

export const adminProvisioningService = new AdminProvisioningService();

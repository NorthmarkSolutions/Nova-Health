import React, { useState, useMemo } from 'react';
import {
  X,
  Users,
  Search,
  Stethoscope,
  Activity,
  Award,
  Clock,
  Phone,
  Mail,
  ShieldCheck,
  UserCheck,
  Building2,
  Filter,
} from 'lucide-react';
import {
  StaffMember,
  StaffRole,
  getDepartmentPersonnelStats,
} from './hospitalStaffStore';

interface DepartmentAssignedStaffModalProps {
  isOpen: boolean;
  onClose: () => void;
  department: {
    id: string;
    name: string;
    code: string;
    head?: string;
    category?: string;
  } | null;
}

export const DepartmentAssignedStaffModal: React.FC<DepartmentAssignedStaffModalProps> = ({
  isOpen,
  onClose,
  department,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');

  const stats = useMemo(() => {
    if (!department) return null;
    return getDepartmentPersonnelStats(department.id, department.name);
  }, [department, isOpen]);

  const filteredStaff = useMemo(() => {
    if (!stats) return [];
    return stats.assignedStaff.filter((staff) => {
      const matchesRole = roleFilter === 'all' || staff.role === roleFilter;
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        staff.fullName.toLowerCase().includes(q) ||
        staff.employeeCode.toLowerCase().includes(q) ||
        staff.designation.toLowerCase().includes(q) ||
        (staff.email && staff.email.toLowerCase().includes(q)) ||
        (staff.phone && staff.phone.includes(q));

      return matchesRole && matchesSearch;
    });
  }, [stats, roleFilter, searchQuery]);

  if (!isOpen || !department || !stats) return null;

  const getRoleBadge = (role: StaffRole) => {
    switch (role) {
      case 'doctor':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
            <Stethoscope className="w-3 h-3" />
            Doctor
          </span>
        );
      case 'nurse':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800">
            <Activity className="w-3 h-3" />
            Nurse
          </span>
        );
      case 'technician':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800">
            <Users className="w-3 h-3" />
            Technician
          </span>
        );
      case 'admin':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800">
            <ShieldCheck className="w-3 h-3" />
            Administration
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">
            <UserCheck className="w-3 h-3" />
            {role.toUpperCase()}
          </span>
        );
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
            Active
          </span>
        );
      case 'ON_LEAVE':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
            On Leave
          </span>
        );
      case 'SUSPENDED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
            Suspended
          </span>
        );
      case 'RESIGNED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400">
            Resigned
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative w-full max-w-5xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-teal-600/10 text-teal-600 dark:bg-teal-500/20 dark:text-teal-400 flex items-center justify-center">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                  {department.name}
                </h3>
                <span className="px-2 py-0.5 rounded text-xs font-semibold font-mono bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-200">
                  {department.code}
                </span>
                {stats.hodName && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800">
                    <Award className="w-3 h-3 text-amber-500" />
                    HOD: {stats.hodName}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Active Medical & Clinical Personnel Roster Breakdown
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Role Distribution Metric Strip */}
        <div className="p-6 pb-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Total Staff
              </span>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="text-2xl font-black text-slate-900 dark:text-white">
                  {stats.total}
                </span>
                <Users className="w-4 h-4 text-slate-400" />
              </div>
            </div>

            <div className="p-3.5 rounded-xl border border-emerald-200/70 dark:border-emerald-900/50 bg-emerald-50/50 dark:bg-emerald-950/20">
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                Doctors
              </span>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="text-2xl font-black text-emerald-700 dark:text-emerald-400">
                  {stats.doctors}
                </span>
                <Stethoscope className="w-4 h-4 text-emerald-500" />
              </div>
            </div>

            <div className="p-3.5 rounded-xl border border-blue-200/70 dark:border-blue-900/50 bg-blue-50/50 dark:bg-blue-950/20">
              <span className="text-xs font-semibold uppercase tracking-wider text-blue-700 dark:text-blue-300">
                Nurses
              </span>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="text-2xl font-black text-blue-700 dark:text-blue-400">
                  {stats.nurses}
                </span>
                <Activity className="w-4 h-4 text-blue-500" />
              </div>
            </div>

            <div className="p-3.5 rounded-xl border border-purple-200/70 dark:border-purple-900/50 bg-purple-50/50 dark:bg-purple-950/20">
              <span className="text-xs font-semibold uppercase tracking-wider text-purple-700 dark:text-purple-300">
                Technicians
              </span>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="text-2xl font-black text-purple-700 dark:text-purple-400">
                  {stats.techs}
                </span>
                <Users className="w-4 h-4 text-purple-500" />
              </div>
            </div>

            <div className="p-3.5 rounded-xl border border-amber-200/70 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20">
              <span className="text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-300">
                Admin & Support
              </span>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="text-2xl font-black text-amber-700 dark:text-amber-400">
                  {stats.admin}
                </span>
                <ShieldCheck className="w-4 h-4 text-amber-500" />
              </div>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="mt-4 flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search staff by name, employee code, designation..."
                className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Filter className="w-4 h-4 text-slate-400 hidden sm:block" />
              <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-full sm:w-auto overflow-x-auto">
                {['all', 'doctor', 'nurse', 'technician', 'admin'].map((role) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => setRoleFilter(role)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg capitalize transition-colors ${
                      roleFilter === role
                        ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-300 shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {role === 'all' ? 'All Roles' : role}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Assigned Staff Table / Roster */}
        <div className="flex-1 overflow-y-auto p-6">
          {filteredStaff.length === 0 ? (
            <div className="py-12 text-center">
              <Users className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <h4 className="text-base font-semibold text-slate-800 dark:text-slate-200">
                {stats.assignedStaff.length === 0
                  ? 'No staff members assigned to this department yet'
                  : 'No staff match the current search or role filter'}
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1">
                {stats.assignedStaff.length === 0
                  ? 'Assign staff members directly via the Staff Master section or bulk import your hospital roster using the Excel template.'
                  : 'Try clearing your search query or switching to "All Roles" to view all personnel.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/80 text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-4 py-3">Personnel</th>
                    <th className="px-4 py-3">Role & Cadre</th>
                    <th className="px-4 py-3">Designation / Qual.</th>
                    <th className="px-4 py-3">Assigned Shifts</th>
                    <th className="px-4 py-3">Contact</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {filteredStaff.map((staff) => {
                    const isHead =
                      staff.isDepartmentHead &&
                      (staff.hodDepartmentId === department.id ||
                        staff.hodDepartmentName === department.name);

                    return (
                      <tr
                        key={staff.id}
                        className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300 font-bold text-xs flex items-center justify-center flex-shrink-0">
                              {staff.fullName
                                .replace('Dr. ', '')
                                .replace('Nurse ', '')
                                .slice(0, 2)
                                .toUpperCase()}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5 font-medium text-slate-900 dark:text-white">
                                {staff.fullName}
                                {isHead && (
                                  <span
                                    title="Department Head (HOD)"
                                    className="p-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                                  >
                                    <Award className="w-3.5 h-3.5" />
                                  </span>
                                )}
                              </div>
                              <span className="text-xs font-mono text-slate-400 dark:text-slate-500">
                                {staff.employeeCode}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">{getRoleBadge(staff.role)}</td>
                        <td className="px-4 py-3">
                          <div className="text-xs text-slate-800 dark:text-slate-200 font-medium">
                            {staff.designation}
                          </div>
                          {staff.qualification && (
                            <div className="text-[11px] text-slate-400 dark:text-slate-500">
                              {staff.qualification}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {staff.shiftNames && staff.shiftNames.length > 0 ? (
                              staff.shiftNames.map((shiftName, idx) => (
                                <span
                                  key={idx}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                                >
                                  <Clock className="w-3 h-3 text-slate-400" />
                                  {shiftName.split('(')[0].trim()}
                                </span>
                              ))
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                                <Clock className="w-3 h-3 text-slate-400" />
                                {staff.shiftName || 'Morning Shift'}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-300">
                          {staff.email && (
                            <div className="flex items-center gap-1.5 truncate max-w-[180px]">
                              <Mail className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                              <span className="truncate">{staff.email}</span>
                            </div>
                          )}
                          {staff.phone && (
                            <div className="flex items-center gap-1.5 mt-0.5 text-slate-500 dark:text-slate-400">
                              <Phone className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                              <span>{staff.phone}</span>
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">{getStatusBadge(staff.status)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex items-center justify-between">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Showing <strong className="text-slate-800 dark:text-slate-200">{filteredStaff.length}</strong> of{' '}
            <strong className="text-slate-800 dark:text-slate-200">{stats.total}</strong> assigned staff members
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-sm font-semibold rounded-xl bg-slate-800 hover:bg-slate-900 text-white dark:bg-slate-700 dark:hover:bg-slate-600 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

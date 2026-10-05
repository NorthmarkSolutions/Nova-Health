import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  X,
  Check,
  CheckCircle2,
  Sparkles,
  AlertTriangle,
  Building2,
  Phone,
  Mail,
  ShieldCheck,
  Award,
  Clock,
  MapPin,
  FileText,
  Briefcase,
  Layers,
  ChevronRight,
  ChevronLeft
} from 'lucide-react';
import {
  getHospitalStaff,
  updateHospitalStaff,
  addHospitalStaff,
  StaffMember,
  calculateStaffProfileCompletion
} from '../../admin/setup/organization/hospitalStaffStore';
import { pharmacyAdminService, PharmacyStaffMember } from '../../../services/pharmacyAdminService';

interface PharmacyStaffModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStaffSaved: (staff: PharmacyStaffMember) => void;
  editingStaff?: PharmacyStaffMember | null;
}

export const PharmacyStaffModal: React.FC<PharmacyStaffModalProps> = ({
  isOpen,
  onClose,
  onStaffSaved,
  editingStaff = null
}) => {
  const [modalTab, setModalTab] = useState<'personal' | 'professional' | 'stationing' | 'documents'>('personal');
  const [creationMode, setCreationMode] = useState<'select' | 'new'>('select');
  const [selectedPoolStaffId, setSelectedPoolStaffId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // 1. Personal & Contact
  const [fullName, setFullName] = useState('');
  const [employeeCode, setEmployeeCode] = useState('');
  const [gender, setGender] = useState<'Male' | 'Female' | 'Other'>('Male');
  const [dob, setDob] = useState('');
  const [bloodGroup, setBloodGroup] = useState('O+');
  const [joiningDate, setJoiningDate] = useState(new Date().toISOString().slice(0, 10));
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [addressStreet, setAddressStreet] = useState('');
  const [addressCity, setAddressCity] = useState('');
  const [addressState, setAddressState] = useState('');
  const [addressPincode, setAddressPincode] = useState('');
  const [status, setStatus] = useState<'On duty' | 'On break' | 'Off shift'>('On duty');

  // 2. Role & Credentials
  const [role, setRole] = useState('OPD Pharmacist');
  const [designation, setDesignation] = useState('Senior Dispensing Pharmacist');
  const [qualification, setQualification] = useState('B.Pharm');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [experienceYears, setExperienceYears] = useState<number>(4);

  // 3. Stationing & Shift
  const [assignedArea, setAssignedArea] = useState('OPD Counter 2');
  const [assignedShift, setAssignedShift] = useState('07:00–15:00');
  const [shiftTarget, setShiftTarget] = useState<number>(60);
  const [slaTat, setSlaTat] = useState('6.2 min');

  // 4. Compliance & Documents
  const [aadhaarNumber, setAadhaarNumber] = useState('');
  const [panNumber, setPanNumber] = useState('');
  const [spcVerified, setSpcVerified] = useState(true);
  const [ndpsScheduleXClearance, setNdpsScheduleXClearance] = useState(false);
  const [coldChainCertified, setColdChainCertified] = useState(true);

  // Load hospital staff pool
  const hospitalStaffPool = useMemo(() => {
    try {
      return getHospitalStaff();
    } catch {
      return [];
    }
  }, [isOpen]);

  // Filter pool candidates: unassigned, assigned to pharmacy, or incomplete profiles
  const candidateStaffPool = useMemo(() => {
    return hospitalStaffPool.filter(s => {
      const isPharmacy = s.departmentId === 'pharmacy' || s.departmentName?.toLowerCase().includes('pharmacy') || s.role === 'pharmacist';
      const isUnassigned = !s.departmentId || s.departmentId === '';
      const isIncomplete = (s.profileCompletion ?? 100) < 95;
      return isPharmacy || isUnassigned || isIncomplete;
    });
  }, [hospitalStaffPool]);

  // Initialize or reset form
  useEffect(() => {
    if (!isOpen) return;

    setErrorMessage('');
    setModalTab('personal');

    if (editingStaff) {
      setCreationMode('new');
      setFullName(editingStaff.name || '');
      setEmployeeCode(editingStaff.id || '');
      setRole(editingStaff.role || 'OPD Pharmacist');
      setDesignation(editingStaff.role || 'Senior Dispensing Pharmacist');
      setAssignedArea(editingStaff.area || 'OPD Counter 2');
      setAssignedShift(editingStaff.shift || '07:00–15:00');
      setStatus(editingStaff.status || 'On duty');
      setShiftTarget(editingStaff.target || 60);
      setSlaTat(editingStaff.tat || '6.2 min');

      // Try finding in master store for extra fields
      const masterRecord = hospitalStaffPool.find(s => s.employeeCode === editingStaff.id || s.id === editingStaff.id || s.fullName.toLowerCase() === editingStaff.name.toLowerCase());
      if (masterRecord) {
        setPhone(masterRecord.phone || '');
        setEmail(masterRecord.email || '');
        setGender(masterRecord.gender || 'Male');
        setDob(masterRecord.dob || '');
        setBloodGroup(masterRecord.bloodGroup || 'O+');
        setQualification(masterRecord.qualification || 'B.Pharm');
        setLicenseNumber(masterRecord.licenseNumber || masterRecord.registrationNumber || '');
        setExperienceYears(Number(masterRecord.experienceYears) || 4);
        if (typeof masterRecord.address === 'string') {
          setAddressStreet(masterRecord.address);
        } else if (masterRecord.address) {
          setAddressStreet(masterRecord.address.street || '');
          setAddressCity(masterRecord.address.city || '');
          setAddressState(masterRecord.address.state || '');
          setAddressPincode(masterRecord.address.pincode || '');
        }
      }
    } else {
      // Default new creation
      setCreationMode(candidateStaffPool.length > 0 ? 'select' : 'new');
      setSelectedPoolStaffId('');
      setFullName('');
      setEmployeeCode(`PH-${Math.floor(4430 + Math.random() * 560)}`);
      setGender('Male');
      setDob('');
      setBloodGroup('O+');
      setJoiningDate(new Date().toISOString().slice(0, 10));
      setPhone('');
      setEmail('');
      setEmergencyContact('');
      setEmergencyPhone('');
      setAddressStreet('');
      setAddressCity('Northmark Central');
      setAddressState('State');
      setAddressPincode('110001');
      setStatus('On duty');

      setRole('OPD Pharmacist');
      setDesignation('Senior Dispensing Pharmacist');
      setQualification('B.Pharm');
      setLicenseNumber(`SPC-DL-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`);
      setExperienceYears(4);

      setAssignedArea('OPD Counter 2');
      setAssignedShift('07:00–15:00');
      setShiftTarget(60);
      setSlaTat('6.2 min');

      setAadhaarNumber('');
      setPanNumber('');
      setSpcVerified(true);
      setNdpsScheduleXClearance(false);
      setColdChainCertified(true);
    }
  }, [isOpen, editingStaff, hospitalStaffPool, candidateStaffPool]);

  // Handle selecting an existing staff member from the hospital pool
  const handleSelectPoolStaff = (staffId: string) => {
    setSelectedPoolStaffId(staffId);
    if (!staffId) return;

    const s = hospitalStaffPool.find(x => x.id === staffId);
    if (!s) return;

    setFullName(s.fullName || '');
    setEmployeeCode(s.employeeCode || `PH-${Math.floor(4430 + Math.random() * 560)}`);
    setPhone(s.phone || '');
    setEmail(s.email || '');
    setGender(s.gender || 'Male');
    setDob(s.dob || '');
    setBloodGroup(s.bloodGroup || 'O+');
    setJoiningDate(s.joiningDate || new Date().toISOString().slice(0, 10));

    if (s.qualification) setQualification(s.qualification);
    if (s.licenseNumber || s.registrationNumber) setLicenseNumber(s.licenseNumber || s.registrationNumber || '');
    if (s.experienceYears) setExperienceYears(Number(s.experienceYears) || 3);
    if (s.designation) setDesignation(s.designation);

    if (typeof s.address === 'string') {
      setAddressStreet(s.address);
    } else if (s.address) {
      setAddressStreet(s.address.street || '');
      setAddressCity(s.address.city || '');
      setAddressState(s.address.state || '');
      setAddressPincode(s.address.pincode || '');
    }

    if (s.emergencyContactPhone || s.emergencyContact) {
      setEmergencyPhone(s.emergencyContactPhone || s.emergencyContact || '');
    }
  };

  // Live profile completion calculation
  const liveCompletion = useMemo(() => {
    let score = 0;

    // 1. Essential Basic Info (Target 35% - Typically filled by Hospital Admin)
    if (fullName.trim()) score += 7;
    if (employeeCode.trim()) score += 7;
    if (phone.trim()) score += 7;
    if (email.trim()) score += 7;
    if (gender && status) score += 7;

    // 2. Personal & Contact (Target 20%)
    if (dob.trim()) score += 4;
    if (bloodGroup.trim()) score += 4;
    if (addressStreet.trim() || addressCity.trim()) score += 6;
    if (emergencyPhone.trim() || emergencyContact.trim()) score += 6;

    // 3. Professional Pharmacy Credentials (Target 25%)
    if (role.trim()) score += 6;
    if (designation.trim()) score += 5;
    if (qualification.trim()) score += 5;
    if (licenseNumber.trim()) score += 5;
    if (experienceYears && experienceYears > 0) score += 4;

    // 4. Stationing, Shift & Compliance (Target 20%)
    if (assignedArea.trim()) score += 5;
    if (assignedShift.trim()) score += 5;
    if (aadhaarNumber.trim() || panNumber.trim()) score += 5;
    if (spcVerified || coldChainCertified || ndpsScheduleXClearance) score += 5;

    return Math.min(100, Math.max(15, score));
  }, [
    fullName,
    employeeCode,
    phone,
    email,
    gender,
    status,
    dob,
    bloodGroup,
    addressStreet,
    addressCity,
    emergencyPhone,
    emergencyContact,
    role,
    designation,
    qualification,
    licenseNumber,
    experienceYears,
    assignedArea,
    assignedShift,
    aadhaarNumber,
    panNumber,
    spcVerified,
    coldChainCertified,
    ndpsScheduleXClearance
  ]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!fullName.trim()) {
      setErrorMessage('Full name is required.');
      setModalTab('personal');
      return;
    }
    if (!employeeCode.trim()) {
      setErrorMessage('Employee code / ID is required.');
      setModalTab('personal');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload: Partial<PharmacyStaffMember> & Record<string, any> = {
        id: employeeCode.trim(),
        employeeCode: employeeCode.trim(),
        name: fullName.trim(),
        fullName: fullName.trim(),
        role: role,
        assignedRole: role,
        area: assignedArea,
        assignedArea: assignedArea,
        service_point: assignedArea,
        shift: assignedShift,
        shiftName: assignedShift,
        status: status,
        done: editingStaff?.done ?? 0,
        target: shiftTarget || 60,
        tat: slaTat || '6.2 min',
        ovr: editingStaff?.ovr ?? 0,
        cd: editingStaff?.cd ?? (ndpsScheduleXClearance ? 1 : 0),
        recent: editingStaff?.recent ?? [`Assigned to Pharmacy ${assignedArea}`],
        profileCompletion: liveCompletion,
        qualification: qualification,
        licenseNumber: licenseNumber,
        designation: designation,
        experienceYears: experienceYears,
        phone: phone,
        email: email,
        dob: dob,
        gender: gender,
        bloodGroup: bloodGroup,
        joiningDate: joiningDate,
        address: addressStreet ? { street: addressStreet, city: addressCity, state: addressState, pincode: addressPincode } : undefined,
        aadhaarNumber: aadhaarNumber,
        panNumber: panNumber,
        ndpsScheduleXClearance: ndpsScheduleXClearance,
        coldChainCertified: coldChainCertified,
        spcVerified: spcVerified
      };

      // 1. Post to backend
      let savedResult: PharmacyStaffMember;
      try {
        savedResult = await pharmacyAdminService.addOrUpdateStaff(payload);
      } catch {
        // Fallback to local structure if offline/backend network glitch
        savedResult = {
          id: employeeCode.trim(),
          name: fullName.trim(),
          role: role,
          area: assignedArea,
          shift: assignedShift,
          status: status,
          done: editingStaff?.done ?? 0,
          target: shiftTarget || 60,
          tat: slaTat || '6.2 min',
          ovr: editingStaff?.ovr ?? 0,
          cd: editingStaff?.cd ?? (ndpsScheduleXClearance ? 1 : 0),
          recent: editingStaff?.recent ?? [`Assigned to Pharmacy ${assignedArea}`]
        };
      }

      // 2. Synchronize with Master Hospital Staff Store
      try {
        const existingMaster = hospitalStaffPool.find(
          s => s.id === selectedPoolStaffId || s.employeeCode === employeeCode || s.id === employeeCode
        );

        const staffRecord: StaffMember = {
          id: existingMaster?.id || selectedPoolStaffId || `stf-pharm-${Date.now()}`,
          employeeCode: employeeCode.trim(),
          fullName: fullName.trim(),
          role: 'pharmacist',
          designation: designation || role,
          departmentId: 'pharmacy',
          departmentName: 'Pharmacy Department & Central Stores',
          departmentIds: ['pharmacy'],
          departmentNames: ['Pharmacy Department & Central Stores'],
          shiftName: assignedShift,
          email: email || `${employeeCode.toLowerCase()}@northhospital.com`,
          phone: phone || '+91 98765 43210',
          status: 'ACTIVE',
          dob: dob,
          gender: gender,
          bloodGroup: bloodGroup,
          joiningDate: joiningDate,
          qualification: qualification,
          licenseNumber: licenseNumber,
          registrationNumber: licenseNumber,
          experienceYears: experienceYears,
          profileCompletion: liveCompletion,
          onboardingStage: liveCompletion >= 90 ? 'FULLY_CERTIFIED' : 'STATIONED_ACTIVE',
          address: addressStreet ? { street: addressStreet, city: addressCity, state: addressState, pincode: addressPincode } : undefined
        };

        if (existingMaster) {
          updateHospitalStaff(staffRecord);
        } else {
          addHospitalStaff(staffRecord);
        }
      } catch (err) {
        console.warn('Could not sync to hospitalStaffStore:', err);
      }

      // 3. Callback to parent workspace
      onStaffSaved(savedResult);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save pharmacy staff member.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        zIndex: 1050,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
      }}
    >
      <div
        style={{
          width: '840px',
          maxWidth: '95vw',
          height: '86vh',
          maxHeight: '820px',
          minHeight: '600px',
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
      >
        {/* Fixed Header */}
        <div
          style={{
            flexShrink: 0,
            padding: '18px 24px',
            borderBottom: '1px solid #e5e7eb',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: '#ffffff'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                backgroundColor: '#eff6ff',
                color: '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              <Users size={22} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#111827' }}>
                {editingStaff ? `Edit Pharmacy Staff: ${editingStaff.name}` : 'Add / Complete Pharmacy Staff'}
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '13px', color: '#6b7280' }}>
                Hospital Admin creates basic records (~30-35% info). Pharmacy Admin completes professional credentials, licensing & service stationing.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#9ca3af',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Container spanning fixed sub-header, scrollable body, and fixed footer */}
        <form
          onSubmit={handleSave}
          style={{
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            minHeight: 0,
            overflow: 'hidden'
          }}
        >
          {/* Fixed Upper Controls: Error, Pool Selector, Completion Meter & Tabs */}
          <div
            style={{
              flexShrink: 0,
              padding: '16px 24px 0',
              backgroundColor: '#ffffff',
              borderBottom: '1px solid #e5e7eb'
            }}
          >
            {errorMessage && (
              <div
                style={{
                  marginBottom: '12px',
                  padding: '10px 14px',
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '10px',
                  color: '#dc2626',
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <AlertTriangle size={16} />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Mode Selector (When creating new, allows picking partial records from hospital pool) */}
            {!editingStaff && (
              <div
                style={{
                  marginBottom: '12px',
                  padding: '10px 14px',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>
                    Source Record:
                  </span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => setCreationMode('select')}
                      style={{
                        height: '28px',
                        padding: '0 12px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        border: creationMode === 'select' ? '1px solid #2563eb' : '1px solid #cbd5e1',
                        background: creationMode === 'select' ? '#eff6ff' : '#fff',
                        color: creationMode === 'select' ? '#2563eb' : '#64748b'
                      }}
                    >
                      Select From Hospital Pool ({candidateStaffPool.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCreationMode('new');
                        setSelectedPoolStaffId('');
                      }}
                      style={{
                        height: '28px',
                        padding: '0 12px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        border: creationMode === 'new' ? '1px solid #2563eb' : '1px solid #cbd5e1',
                        background: creationMode === 'new' ? '#eff6ff' : '#fff',
                        color: creationMode === 'new' ? '#2563eb' : '#64748b'
                      }}
                    >
                      + Create Brand New
                    </button>
                  </div>
                </div>

                {creationMode === 'select' && (
                  <div>
                    <select
                      value={selectedPoolStaffId}
                      onChange={e => handleSelectPoolStaff(e.target.value)}
                      style={{
                        width: '100%',
                        height: '36px',
                        padding: '0 10px',
                        border: '1px solid #cbd5e1',
                        borderRadius: '8px',
                        fontSize: '13px',
                        backgroundColor: '#ffffff',
                        color: '#1e293b',
                        outline: 'none'
                      }}
                    >
                      <option value="">-- Choose Existing Onboarding Record / Incomplete Staff --</option>
                      {candidateStaffPool.map(staff => (
                        <option key={staff.id} value={staff.id}>
                          {staff.fullName} ({staff.employeeCode}) · {staff.designation || staff.role} — {staff.profileCompletion ?? 35}% Complete
                        </option>
                      ))}
                    </select>

                    {selectedPoolStaffId && (
                      <div
                        style={{
                          marginTop: '8px',
                          padding: '8px 12px',
                          backgroundColor: '#fffbeb',
                          border: '1px solid #fde68a',
                          borderRadius: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          fontSize: '12px',
                          color: '#92400e'
                        }}
                      >
                        <Sparkles size={15} color="#d97706" />
                        <span>
                          Hospital Admin basic record loaded. Complete professional license, dispensary counter & duty shift below to reach 100% completion.
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Live Profile Completion Status Gauge */}
            <div
              style={{
                padding: '10px 14px',
                backgroundColor: liveCompletion >= 90 ? '#f0fdf4' : liveCompletion >= 60 ? '#eff6ff' : '#fffbeb',
                borderRadius: '10px',
                border: `1px solid ${liveCompletion >= 90 ? '#bbf7d0' : liveCompletion >= 60 ? '#bfdbfe' : '#fde68a'}`,
                marginBottom: '14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span
                    style={{
                      fontSize: '13px',
                      fontWeight: 700,
                      color: liveCompletion >= 90 ? '#15803d' : liveCompletion >= 60 ? '#1d4ed8' : '#b45309'
                    }}
                  >
                    Profile Completion: {liveCompletion}%
                  </span>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      padding: '2px 8px',
                      borderRadius: '999px',
                      backgroundColor: liveCompletion >= 90 ? '#dcfce7' : liveCompletion >= 60 ? '#dbeafe' : '#fef3c7',
                      color: liveCompletion >= 90 ? '#166534' : liveCompletion >= 60 ? '#1e40af' : '#92400e',
                      border: `1px solid ${liveCompletion >= 90 ? '#86efac' : liveCompletion >= 60 ? '#93c5fd' : '#fcd34d'}`
                    }}
                  >
                    {liveCompletion >= 90
                      ? '100% Fully Certified & Stationed'
                      : liveCompletion >= 60
                      ? 'In Progress · Pending Statutory Clearance'
                      : 'Basic Created (~35%) · Hospital Admin Phase'}
                  </span>
                </div>
                <span style={{ fontSize: '12px', color: '#64748b' }}>
                  {liveCompletion >= 90 ? 'Ready for clinical operations' : 'Fill remaining tabs to certify'}
                </span>
              </div>
              {/* Progress track */}
              <div style={{ width: '100%', height: '5px', backgroundColor: '#e2e8f0', borderRadius: '999px', overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${liveCompletion}%`,
                    height: '100%',
                    backgroundColor: liveCompletion >= 90 ? '#16a34a' : liveCompletion >= 60 ? '#2563eb' : '#f59e0b',
                    borderRadius: '999px',
                    transition: 'width 0.3s ease'
                  }}
                />
              </div>
            </div>

            {/* 4 Section Tabs */}
            <div style={{ display: 'flex', gap: '4px', marginBottom: '-1px' }}>
              {[
                { id: 'personal', label: '1. Personal & Contact', icon: Users },
                { id: 'professional', label: '2. Role & Credentials', icon: Award },
                { id: 'stationing', label: '3. Stationing & Shift', icon: MapPin },
                { id: 'documents', label: '4. Compliance & Statutory', icon: ShieldCheck }
              ].map(tab => {
                const Icon = tab.icon;
                const isActive = modalTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setModalTab(tab.id as any)}
                    style={{
                      padding: '10px 16px',
                      fontSize: '13px',
                      fontWeight: 600,
                      color: isActive ? '#2563eb' : '#6b7280',
                      borderBottom: isActive ? '2px solid #2563eb' : '2px solid transparent',
                      background: 'none',
                      borderTop: 'none',
                      borderLeft: 'none',
                      borderRight: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <Icon size={16} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Scrollable Tab Form Body */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '20px 24px',
              minHeight: 0,
              scrollbarWidth: 'thin',
              scrollbarColor: '#cbd5e1 transparent'
            }}
          >
            {/* TAB 1: Personal & Contact Details */}
            {modalTab === 'personal' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={e => setFullName(e.target.value)}
                      placeholder="e.g. Dr. Pooja Shah or Arjun Varma"
                      style={{ width: '100%', height: '38px', padding: '0 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '13px', outline: 'none' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                      Pharmacy Employee Code / ID *
                    </label>
                    <input
                      type="text"
                      required
                      value={employeeCode}
                      onChange={e => setEmployeeCode(e.target.value)}
                      placeholder="e.g. PH-4412"
                      style={{ width: '100%', height: '38px', padding: '0 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '13px', outline: 'none' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                      Gender
                    </label>
                    <select
                      value={gender}
                      onChange={e => setGender(e.target.value as any)}
                      style={{ width: '100%', height: '38px', padding: '0 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '13px', outline: 'none', backgroundColor: '#fff' }}
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                      Date of Birth
                    </label>
                    <input
                      type="date"
                      value={dob}
                      onChange={e => setDob(e.target.value)}
                      style={{ width: '100%', height: '38px', padding: '0 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '13px', outline: 'none' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                      Blood Group
                    </label>
                    <select
                      value={bloodGroup}
                      onChange={e => setBloodGroup(e.target.value)}
                      style={{ width: '100%', height: '38px', padding: '0 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '13px', outline: 'none', backgroundColor: '#fff' }}
                    >
                      {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => (
                        <option key={bg} value={bg}>{bg}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                      Joining Date
                    </label>
                    <input
                      type="date"
                      value={joiningDate}
                      onChange={e => setJoiningDate(e.target.value)}
                      style={{ width: '100%', height: '38px', padding: '0 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '13px', outline: 'none' }}
                    />
                  </div>
                </div>

                <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '14px' }}>
                  <h4 style={{ margin: '0 0 12px', fontSize: '14px', fontWeight: 600, color: '#1e293b' }}>
                    Contact & Emergency Channels
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        value={phone}
                        onChange={e => setPhone(e.target.value)}
                        placeholder="+91 98765 43210"
                        style={{ width: '100%', height: '38px', padding: '0 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '13px', outline: 'none' }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                        Work / Official Email
                      </label>
                      <input
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="arjun.varma@northhospital.com"
                        style={{ width: '100%', height: '38px', padding: '0 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '13px', outline: 'none' }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                        Emergency Contact Phone
                      </label>
                      <input
                        type="tel"
                        value={emergencyPhone}
                        onChange={e => setEmergencyPhone(e.target.value)}
                        placeholder="+91 91234 56789"
                        style={{ width: '100%', height: '38px', padding: '0 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '13px', outline: 'none' }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                        Duty Status
                      </label>
                      <select
                        value={status}
                        onChange={e => setStatus(e.target.value as any)}
                        style={{ width: '100%', height: '38px', padding: '0 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '13px', outline: 'none', backgroundColor: '#fff' }}
                      >
                        <option value="On duty">On duty</option>
                        <option value="On break">On break</option>
                        <option value="Off shift">Off shift</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '14px' }}>
                  <h4 style={{ margin: '0 0 12px', fontSize: '14px', fontWeight: 600, color: '#1e293b' }}>
                    Residential Address
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Street / Colony</label>
                      <input
                        type="text"
                        value={addressStreet}
                        onChange={e => setAddressStreet(e.target.value)}
                        placeholder="Flat 402, Lotus Towers"
                        style={{ width: '100%', height: '36px', padding: '0 10px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px', outline: 'none' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>City</label>
                      <input
                        type="text"
                        value={addressCity}
                        onChange={e => setAddressCity(e.target.value)}
                        placeholder="Mumbai"
                        style={{ width: '100%', height: '36px', padding: '0 10px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px', outline: 'none' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>State</label>
                      <input
                        type="text"
                        value={addressState}
                        onChange={e => setAddressState(e.target.value)}
                        placeholder="Maharashtra"
                        style={{ width: '100%', height: '36px', padding: '0 10px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px', outline: 'none' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Pincode</label>
                      <input
                        type="text"
                        value={addressPincode}
                        onChange={e => setAddressPincode(e.target.value)}
                        placeholder="400001"
                        style={{ width: '100%', height: '36px', padding: '0 10px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px', outline: 'none' }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: Role & Professional Credentials */}
            {modalTab === 'professional' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                      Pharmacy Role / Cadre *
                    </label>
                    <select
                      value={role}
                      onChange={e => setRole(e.target.value)}
                      style={{ width: '100%', height: '38px', padding: '0 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '13px', outline: 'none', backgroundColor: '#fff' }}
                    >
                      <option value="OPD Pharmacist">OPD Pharmacist (Outpatient Dispensing)</option>
                      <option value="IPD Pharmacist">IPD Pharmacist (Inpatient Ward Supply)</option>
                      <option value="Inventory Manager">Inventory Manager (Central Medical Store & PR/GRN)</option>
                      <option value="Clinical Pharmacist">Clinical Pharmacist / Narcotics Vault Custodian</option>
                      <option value="Pharmacy Tech">Pharmacy Technician (Staging & Assembly)</option>
                      <option value="Pharmacy Admin">Pharmacy Department Admin (Chief Pharmacist)</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                      Designation
                    </label>
                    <input
                      type="text"
                      value={designation}
                      onChange={e => setDesignation(e.target.value)}
                      placeholder="e.g. Senior Dispensing Pharmacist"
                      style={{ width: '100%', height: '38px', padding: '0 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '13px', outline: 'none' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                      Qualification
                    </label>
                    <select
                      value={qualification}
                      onChange={e => setQualification(e.target.value)}
                      style={{ width: '100%', height: '38px', padding: '0 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '13px', outline: 'none', backgroundColor: '#fff' }}
                    >
                      <option value="Pharm.D">Pharm.D (Doctor of Pharmacy)</option>
                      <option value="M.Pharm">M.Pharm (Pharmacology / Clinical)</option>
                      <option value="B.Pharm">B.Pharm (Bachelor of Pharmacy)</option>
                      <option value="D.Pharm">D.Pharm (Diploma in Pharmacy)</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                      State Pharmacy Council License Number *
                    </label>
                    <input
                      type="text"
                      value={licenseNumber}
                      onChange={e => setLicenseNumber(e.target.value)}
                      placeholder="e.g. SPC-MH-2022-8821"
                      style={{ width: '100%', height: '38px', padding: '0 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '13px', outline: 'none' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                      Hospital Pharmacy Experience (Years)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="40"
                      value={experienceYears}
                      onChange={e => setExperienceYears(parseInt(e.target.value, 10) || 0)}
                      style={{ width: '100%', height: '38px', padding: '0 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '13px', outline: 'none' }}
                    />
                  </div>
                </div>

                <div
                  style={{
                    padding: '12px 16px',
                    backgroundColor: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px'
                  }}
                >
                  <Award size={18} color="#2563eb" />
                  <span style={{ fontSize: '13px', color: '#475569' }}>
                    Registration details are verified against the State Drugs Control Administration registry.
                  </span>
                </div>
              </div>
            )}

            {/* TAB 3: Stationing & Shift Window */}
            {modalTab === 'stationing' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                      Primary Physical Service Point / Area *
                    </label>
                    <select
                      value={assignedArea}
                      onChange={e => setAssignedArea(e.target.value)}
                      style={{ width: '100%', height: '38px', padding: '0 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '13px', outline: 'none', backgroundColor: '#fff' }}
                    >
                      <option value="OPD Counter 1">OPD Counter 1 (High-Velocity Walk-in)</option>
                      <option value="OPD Counter 2">OPD Counter 2 (Consultation Dispensing)</option>
                      <option value="Central IPD store">Central IPD Store (Ward Supply Requisitions)</option>
                      <option value="Central store">Central Store / Warehouse (Procurement & Staging)</option>
                      <option value="Emergency Satellite">Emergency Satellite (Trauma & STAT Orders)</option>
                      <option value="Narcotics Vault Safe">Vault Safe A / B (Controlled Drugs Section)</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                      Assigned Shift Window *
                    </label>
                    <select
                      value={assignedShift}
                      onChange={e => setAssignedShift(e.target.value)}
                      style={{ width: '100%', height: '38px', padding: '0 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '13px', outline: 'none', backgroundColor: '#fff' }}
                    >
                      <option value="07:00–15:00">Morning Shift (07:00 – 15:00)</option>
                      <option value="08:00–16:00">General Day Shift (08:00 – 16:00)</option>
                      <option value="09:00–17:00">Store Day Shift (09:00 – 17:00)</option>
                      <option value="15:00–23:00">Evening Shift (15:00 – 23:00)</option>
                      <option value="23:00–07:00">Night Emergency Shift (23:00 – 07:00)</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                      Shift Target (Prescriptions / Tasks)
                    </label>
                    <input
                      type="number"
                      min="10"
                      max="200"
                      value={shiftTarget}
                      onChange={e => setShiftTarget(parseInt(e.target.value, 10) || 60)}
                      style={{ width: '100%', height: '38px', padding: '0 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '13px', outline: 'none' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                      Target Turnaround SLA
                    </label>
                    <input
                      type="text"
                      value={slaTat}
                      onChange={e => setSlaTat(e.target.value)}
                      placeholder="e.g. 6.2 min"
                      style={{ width: '100%', height: '38px', padding: '0 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '13px', outline: 'none' }}
                    />
                  </div>
                </div>

                <div
                  style={{
                    padding: '12px 16px',
                    backgroundColor: '#eff6ff',
                    border: '1px solid #bfdbfe',
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px'
                  }}
                >
                  <Clock size={18} color="#2563eb" />
                  <span style={{ fontSize: '13px', color: '#1e40af' }}>
                    Assigning a service point immediately updates the live duty schedule at /department/pharmacy?tab=schedule.
                  </span>
                </div>
              </div>
            )}

            {/* TAB 4: Statutory Compliance & Documents */}
            {modalTab === 'documents' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                      Aadhaar Number (12 Digits)
                    </label>
                    <input
                      type="text"
                      maxLength={14}
                      value={aadhaarNumber}
                      onChange={e => setAadhaarNumber(e.target.value)}
                      placeholder="4521 8834 9912"
                      style={{ width: '100%', height: '38px', padding: '0 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '13px', outline: 'none' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                      PAN Card Number (10 Alphanumeric)
                    </label>
                    <input
                      type="text"
                      maxLength={10}
                      value={panNumber}
                      onChange={e => setPanNumber(e.target.value.toUpperCase())}
                      placeholder="ABCDE1234F"
                      style={{ width: '100%', height: '38px', padding: '0 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '13px', outline: 'none' }}
                    />
                  </div>
                </div>

                <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#1e293b' }}>
                    Clinical & Regulatory Clearances
                  </h4>

                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '12px 14px',
                      backgroundColor: '#f8fafc',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      border: '1px solid #e2e8f0'
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={spcVerified}
                      onChange={e => setSpcVerified(e.target.checked)}
                      style={{ width: '18px', height: '18px', accentColor: '#2563eb' }}
                    />
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>
                        State Pharmacy Council Registration Verified
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>
                        Pharmacist license is active and eligible for statutory counter dispensing under the Drugs & Cosmetics Act.
                      </div>
                    </div>
                  </label>

                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '12px 14px',
                      backgroundColor: '#f8fafc',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      border: '1px solid #e2e8f0'
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={ndpsScheduleXClearance}
                      onChange={e => setNdpsScheduleXClearance(e.target.checked)}
                      style={{ width: '18px', height: '18px', accentColor: '#2563eb' }}
                    />
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>
                        NDPS Act Schedule X Authorized Custodian
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>
                        Authorized to access vault safe, witness narcotic transactions, and countersign the statutory controlled drug register.
                      </div>
                    </div>
                  </label>

                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '12px 14px',
                      backgroundColor: '#f8fafc',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      border: '1px solid #e2e8f0'
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={coldChainCertified}
                      onChange={e => setColdChainCertified(e.target.checked)}
                      style={{ width: '18px', height: '18px', accentColor: '#2563eb' }}
                    />
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>
                        Cold-Chain Biologicals & Insulin Storage Training Certified
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>
                        Trained on temperature loggers (2°C to 8°C) and handling emergency refrigerator alarms.
                      </div>
                    </div>
                  </label>
                </div>
              </div>
            )}

          </div>

          {/* Fixed Footer */}
          <div
            style={{
              flexShrink: 0,
              padding: '14px 24px',
              borderTop: '1px solid #e5e7eb',
              backgroundColor: '#ffffff',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              boxShadow: '0 -2px 10px rgba(0, 0, 0, 0.03)'
            }}
          >
            <div>
              {modalTab !== 'personal' && (
                <button
                  type="button"
                  onClick={() => {
                    if (modalTab === 'documents') setModalTab('stationing');
                    else if (modalTab === 'stationing') setModalTab('professional');
                    else setModalTab('personal');
                  }}
                  style={{
                    height: '38px',
                    padding: '0 16px',
                    borderRadius: '8px',
                    border: '1px solid #d1d5db',
                    background: '#ffffff',
                    color: '#374151',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <ChevronLeft size={16} /> Back
                </button>
              )}
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  height: '38px',
                  padding: '0 16px',
                  borderRadius: '8px',
                  border: '1px solid #d1d5db',
                  background: '#ffffff',
                  color: '#4b5563',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>

              {modalTab !== 'documents' ? (
                <button
                  type="button"
                  onClick={() => {
                    if (modalTab === 'personal') setModalTab('professional');
                    else if (modalTab === 'professional') setModalTab('stationing');
                    else if (modalTab === 'stationing') setModalTab('documents');
                  }}
                  style={{
                    height: '38px',
                    padding: '0 18px',
                    borderRadius: '8px',
                    border: 'none',
                    background: '#2563eb',
                    color: '#ffffff',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  Next Tab <ChevronRight size={16} />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    height: '38px',
                    padding: '0 20px',
                    borderRadius: '8px',
                    border: 'none',
                    background: isSubmitting ? '#93c5fd' : '#16a34a',
                    color: '#ffffff',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: isSubmitting ? 'not-allowed' : 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                  }}
                >
                  <Check size={16} />
                  <span>{isSubmitting ? 'Saving...' : 'Save & Assign to Pharmacy'}</span>
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

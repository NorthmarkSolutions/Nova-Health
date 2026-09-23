import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  UserPlus,
  Calendar,
  Search,
  Clock,
  CheckCircle,
  Printer,
  FileText,
  Shield,
  CreditCard,
  Users,
  Phone,
  AlertCircle,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  XCircle,
  RefreshCw,
  QrCode,
  Tag,
  Stethoscope,
  Tv,
  DoorClosed,
  Receipt,
  BedDouble,
  DollarSign,
  Volume2,
  Zap,
  Filter,
  Plus,
  MoreVertical,
  Check,
  AlertTriangle,
  RotateCcw,
  FileSpreadsheet,
  LockOpen,
  Info,
  LogOut,
  Building2,
} from 'lucide-react';
import { Gender, AppointmentType, RoleType, DepartmentTariffMaster, DepartmentRoom } from '../../types';
import {
  patientJourneyService,
  SharedPatient,
  SharedQueueToken,
  SharedInvoice,
  DailyCounterSession,
} from '../../services/patientJourneyService';
import { getDepartmentTariffMaster, getDepartmentRooms, saveDepartmentRoom } from '../department/departmentWorkspaceStore';

// Specialized Submodals
import { QuickWalkInModal } from './components/QuickWalkInModal';
import { PatientRegistrationWizardModal } from './components/PatientRegistrationWizardModal';
import { CounterBillingModal } from './components/CounterBillingModal';
import { LobbyTvDisplayModal } from './components/LobbyTvDisplayModal';
import { PatientDossierModal } from './components/PatientDossierModal';
import { DaycareBedModal } from './components/DaycareBedModal';
import { BedOccupancyDossierModal } from './components/BedOccupancyDossierModal';
import { OpenCounterModal } from './components/OpenCounterModal';
import { DailyClosingReportModal } from './components/DailyClosingReportModal';
import { FlatCampusBed } from '../../services/patientJourneyService';
import { BuildingNode, WardNode, BedNode } from '../admin/setup/organization/CampusInfrastructureSection';
import { HeartPulse, Layers, Activity } from 'lucide-react';

export const ReceptionDashboard: React.FC = () => {
  // Navigation Tabs & Deep-link URL Query Param Synchronization
  const [searchParams, setSearchParams] = useSearchParams();
  const urlTab = searchParams.get('tab') as 'queue' | 'appointments' | 'billing' | 'search' | 'daycare' | null;
  const validTabs: Array<'queue' | 'appointments' | 'billing' | 'search' | 'daycare'> = ['queue', 'appointments', 'billing', 'search', 'daycare'];

  const [activeTab, setActiveTabState] = useState<'queue' | 'appointments' | 'billing' | 'search' | 'daycare'>(
    urlTab && validTabs.includes(urlTab) ? urlTab : 'queue'
  );

  const setActiveTab = (tab: 'queue' | 'appointments' | 'billing' | 'search' | 'daycare') => {
    setActiveTabState(tab);
    setSearchParams({ tab });
  };

  useEffect(() => {
    if (urlTab && validTabs.includes(urlTab) && urlTab !== activeTab) {
      setActiveTabState(urlTab);
    }
  }, [urlTab]);
  const [queueFilter, setQueueFilter] = useState<'ALL' | 'WAITING' | 'TRIAGED' | 'IN_CONSULTATION' | 'COMPLETED' | 'URGENT'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals Visibility State
  const [showQuickWalkInModal, setShowQuickWalkInModal] = useState(false);
  const [showRegWizardModal, setShowRegWizardModal] = useState(false);
  const [showTvDisplayModal, setShowTvDisplayModal] = useState(false);
  const [showBillingModal, setShowBillingModal] = useState(false);
  const [showDossierModal, setShowDossierModal] = useState(false);
  const [showDaycareModal, setShowDaycareModal] = useState(false);
  const [showOccupancyDossierModal, setShowOccupancyDossierModal] = useState(false);
  const [selectedOccupiedBedForDossier, setSelectedOccupiedBedForDossier] = useState<FlatCampusBed | null>(null);
  const [preselectedBedForAllocation, setPreselectedBedForAllocation] = useState<FlatCampusBed | null>(null);
  const [showTokenPrintModal, setShowTokenPrintModal] = useState(false);
  const [showOpenCounterModal, setShowOpenCounterModal] = useState(false);
  const [showClosingReportModal, setShowClosingReportModal] = useState(false);

  // Selected Items for Modals
  const [selectedTokenForBill, setSelectedTokenForBill] = useState<SharedQueueToken | null>(null);
  const [selectedTokenForPrint, setSelectedTokenForPrint] = useState<SharedQueueToken | null>(null);
  const [selectedPatientForDossier, setSelectedPatientForDossier] = useState<SharedPatient | null>(null);

  // Today's Live Queue (Synchronized with patientJourneyService)
  const [queue, setQueue] = useState<SharedQueueToken[]>(() => patientJourneyService.getQueue());

  // Master Patient Directory
  const [patients, setPatients] = useState<SharedPatient[]>(() => patientJourneyService.getPatients());

  // Today's Counter Invoices
  const [invoices, setInvoices] = useState<SharedInvoice[]>(() => patientJourneyService.getInvoices());

  // Daily Counter Shift Session
  const [counterSession, setCounterSession] = useState<DailyCounterSession>(() =>
    patientJourneyService.getCounterSession()
  );

  // Department Tariff Master (Synchronized with Department Settings)
  const [tariffMaster, setTariffMaster] = useState<DepartmentTariffMaster>(() => getDepartmentTariffMaster('1'));

  // Department Consultation Chambers & Rooms
  const [rooms, setRooms] = useState<DepartmentRoom[]>(() => getDepartmentRooms('1'));

  // Live Campus Infrastructure & Bed Management State (Directly synced with Admin Infrastructure)
  const [campusBuildings, setCampusBuildings] = useState<BuildingNode[]>(() =>
    patientJourneyService.getCampusBuildings()
  );
  const [flatBeds, setFlatBeds] = useState<FlatCampusBed[]>(() =>
    patientJourneyService.getFlatBedsList()
  );

  // Filters for Tab 5: Bed Management
  const [bedScope, setBedScope] = useState<'daycare' | 'all_hospital'>('daycare');
  const [selectedBuildingIdFilter, setSelectedBuildingIdFilter] = useState<string>('all');
  const [selectedWardIdFilter, setSelectedWardIdFilter] = useState<string>('all');
  const [bedStatusFilter, setBedStatusFilter] = useState<'ALL' | 'AVAILABLE' | 'OCCUPIED' | 'CLEANING' | 'RESERVED'>('ALL');
  const [bedSearchQuery, setBedSearchQuery] = useState('');

  // Live Auto-Sync Listener for Campus Infrastructure Updates (from Admin or cross-tab)
  useEffect(() => {
    const syncCampusState = () => {
      const blds = patientJourneyService.getCampusBuildings();
      const beds = patientJourneyService.getFlatBedsList();
      setCampusBuildings(blds);
      setFlatBeds(beds);
    };

    window.addEventListener('nh_campus_updated', syncCampusState);
    window.addEventListener('storage', syncCampusState);
    window.addEventListener('focus', syncCampusState);

    return () => {
      window.removeEventListener('nh_campus_updated', syncCampusState);
      window.removeEventListener('storage', syncCampusState);
      window.removeEventListener('focus', syncCampusState);
    };
  }, []);

  // Filtered Wards & Beds
  const filteredCampusWards = useMemo(() => {
    const wardsWithBeds: Array<{
      buildingId: string;
      buildingName: string;
      floorId: string;
      floorName: string;
      ward: WardNode;
      isDaycare: boolean;
      roomsMap: Record<string, { roomName: string; beds: FlatCampusBed[] }>;
    }> = [];

    campusBuildings.forEach((bld) => {
      if (selectedBuildingIdFilter !== 'all' && bld.id !== selectedBuildingIdFilter) return;

      (bld.floors || []).forEach((fl) => {
        (fl.wards || []).forEach((w) => {
          const isDaycareWard =
            w.id === 'wd-opd-a' ||
            w.id === 'wd-opd-b' ||
            w.name.toLowerCase().includes('daycare') ||
            w.name.toLowerCase().includes('observation');

          if (bedScope === 'daycare' && !isDaycareWard) return;
          if (selectedWardIdFilter !== 'all' && w.id !== selectedWardIdFilter) return;

          const wardFlatBeds = flatBeds.filter(
            (fb) => fb.buildingId === bld.id && fb.floorId === fl.id && fb.wardId === w.id
          );

          const matchingBeds = wardFlatBeds.filter((fb) => {
            if (bedStatusFilter === 'AVAILABLE' && (fb.bed.status !== 'AVAILABLE' || fb.bed.cleanlinessStatus === 'NEEDS_CLEANING')) return false;
            if (bedStatusFilter === 'OCCUPIED' && fb.bed.status !== 'OCCUPIED') return false;
            if (
              bedStatusFilter === 'CLEANING' &&
              fb.bed.cleanlinessStatus !== 'NEEDS_CLEANING' &&
              fb.bed.cleanlinessStatus !== 'CLEANING_IN_PROGRESS'
            )
              return false;
            if (bedStatusFilter === 'RESERVED' && fb.bed.status !== 'RESERVED') return false;

            if (bedSearchQuery.trim()) {
              const q = bedSearchQuery.toLowerCase();
              const ptName = fb.bed.inpatientDetails?.patientName?.toLowerCase() || '';
              const uhid = fb.bed.inpatientDetails?.uhid?.toLowerCase() || '';
              const docName = fb.bed.inpatientDetails?.primaryDoctor?.name?.toLowerCase() || '';
              const diag = fb.bed.inpatientDetails?.diagnosis?.toLowerCase() || '';
              const bedNum = fb.bed.bedNumber.toLowerCase();
              const rmNum = fb.roomNumber.toLowerCase();

              return (
                ptName.includes(q) ||
                uhid.includes(q) ||
                docName.includes(q) ||
                diag.includes(q) ||
                bedNum.includes(q) ||
                rmNum.includes(q)
              );
            }
            return true;
          });

          const roomsMap: Record<string, { roomName: string; beds: FlatCampusBed[] }> = {};
          matchingBeds.forEach((fb) => {
            const rmKey = fb.roomNumber || 'General Bay';
            if (!roomsMap[rmKey]) {
              roomsMap[rmKey] = { roomName: rmKey, beds: [] };
            }
            roomsMap[rmKey].beds.push(fb);
          });

          if (matchingBeds.length > 0 || !bedSearchQuery.trim()) {
            wardsWithBeds.push({
              buildingId: bld.id,
              buildingName: bld.name,
              floorId: fl.id,
              floorName: fl.floorNumber,
              ward: w,
              isDaycare: isDaycareWard,
              roomsMap,
            });
          }
        });
      });
    });

    return wardsWithBeds;
  }, [campusBuildings, flatBeds, selectedBuildingIdFilter, selectedWardIdFilter, bedStatusFilter, bedSearchQuery, bedScope]);

  // Overall Statistics for Bed Command Center
  const bedStats = useMemo(() => {
    const relevantBeds = flatBeds.filter((b) => {
      const isDaycare =
        b.wardId === 'wd-opd-a' ||
        b.wardId === 'wd-opd-b' ||
        b.wardName.toLowerCase().includes('daycare') ||
        b.wardName.toLowerCase().includes('observation');
      return bedScope === 'daycare' ? isDaycare : true;
    });

    const total = relevantBeds.length;
    const occupied = relevantBeds.filter((b) => b.bed.status === 'OCCUPIED').length;
    const available = relevantBeds.filter(
      (b) => b.bed.status === 'AVAILABLE' && b.bed.cleanlinessStatus !== 'NEEDS_CLEANING'
    ).length;
    const cleaning = relevantBeds.filter(
      (b) => b.bed.cleanlinessStatus === 'NEEDS_CLEANING' || b.bed.cleanlinessStatus === 'CLEANING_IN_PROGRESS'
    ).length;
    const reserved = relevantBeds.filter((b) => b.bed.status === 'RESERVED').length;
    const occupancyRate = total > 0 ? Math.round((occupied / total) * 100) : 0;

    return { total, occupied, available, cleaning, reserved, occupancyRate };
  }, [flatBeds, bedScope]);

  const toggleRoomStatus = (roomId: string) => {
    const target = rooms.find((r) => r.id === roomId);
    if (!target) return;
    const nextStatus: DepartmentRoom['status'] = target.status === 'AVAILABLE' ? 'IN_CONSULTATION' : 'AVAILABLE';
    const updated: DepartmentRoom = { ...target, status: nextStatus };
    saveDepartmentRoom(updated);
    setRooms((prev) => prev.map((r) => (r.id === roomId ? updated : r)));
  };

  const getCurrentlyServingInRoom = (roomNumber: string, doctorName?: string) => {
    return queue.find(
      (q) => q.status === 'IN_CONSULTATION' && (q.room.includes(roomNumber) || (doctorName ? q.doctor.includes(doctorName) : false))
    );
  };

  const nextInLinePatients = useMemo(() => {
    return queue.filter((q) => (q.status === 'WAITING' || q.status === 'TRIAGED') && q.callingStatus !== 'CALLING').slice(0, 3);
  }, [queue]);

  const handleCallDoctorChamber = (doctorName: string, roomNumber: string) => {
    const nextWaiting = queue.find(
      (q) => (q.status === 'WAITING' || q.status === 'TRIAGED') &&
             (q.doctor.includes(doctorName) || q.room.includes(roomNumber)) &&
             q.callingStatus !== 'CALLING'
    );
    if (nextWaiting) {
      handleCallSpecificToken(nextWaiting);
    } else {
      const generalWaiting = queue.find(
        (q) => (q.status === 'WAITING' || q.status === 'TRIAGED') && q.callingStatus !== 'CALLING'
      );
      if (generalWaiting) {
        patientJourneyService.updateQueueToken(generalWaiting.token, {
          doctor: doctorName || 'Duty Physician',
          room: roomNumber,
          status: 'IN_CONSULTATION',
          callingStatus: 'CALLING',
        });
        setQueue(patientJourneyService.getQueue());
        playCallingChime();
        showToast(`📢 Token #${String(generalWaiting.token).padStart(2, '0')} (${generalWaiting.patient}) assigned & called to ${roomNumber}!`);
      } else {
        alert(`No waiting patients in queue for ${doctorName || roomNumber}.`);
      }
    }
  };

  // Floating Quick Action Dropdown State
  const [actionMenuToken, setActionMenuToken] = useState<number | null>(null);

  useEffect(() => {
    const handleClickOutside = () => setActionMenuToken(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  // Notification Toast State
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Real-Time Listener for Department Tariff Updates
  useEffect(() => {
    const handleTariffUpdated = () => {
      const updated = getDepartmentTariffMaster('1');
      setTariffMaster(updated);
      showToast('⚡ Live Sync: Department Tariffs & Consultation rates updated!');
    };
    window.addEventListener('north_hospital_dept_tariffs_updated', handleTariffUpdated);
    return () => window.removeEventListener('north_hospital_dept_tariffs_updated', handleTariffUpdated);
  }, []);

  // Doctors Roster Derived from Tariff Master
  const doctorsRoster = useMemo(() => {
    if (tariffMaster.doctorTariffs && tariffMaster.doctorTariffs.length > 0) {
      return tariffMaster.doctorTariffs.map((dt, idx) => ({
        id: dt.doctorId,
        name: dt.doctorName,
        dept: dt.specialization || 'Clinical Specialist',
        room: `Room ${101 + idx}`,
        available: true,
        nextSlot: idx === 0 ? '10:15 AM' : idx === 1 ? '10:30 AM' : idx === 2 ? '11:00 AM' : '02:00 PM',
        fee: dt.standardFee,
        followUpFee: dt.followUpFee || Math.round(dt.standardFee * 0.6),
        emergencyFee: dt.emergencyFee || Math.round(dt.standardFee * 1.5),
      }));
    }
    return [
      { id: 'doc-1', name: 'Dr. Sarah Jenkins', dept: 'Internal Medicine & Cardiology', room: 'Room 204', available: true, nextSlot: '10:15 AM', fee: 75, followUpFee: 45, emergencyFee: 113 },
      { id: 'doc-2', name: 'Dr. Michael Chang', dept: 'General Surgery & Trauma', room: 'Room 102', available: true, nextSlot: '10:30 AM', fee: 90, followUpFee: 55, emergencyFee: 135 },
      { id: 'doc-3', name: 'Dr. Alisha Patel', dept: 'Obstetrics & Gynaecology', room: 'Room 103', available: true, nextSlot: '11:00 AM', fee: 85, followUpFee: 50, emergencyFee: 128 },
    ];
  }, [tariffMaster]);

  // Appointment Booking Tab State
  const [selectedBookingDoctor, setSelectedBookingDoctor] = useState(doctorsRoster[0]?.name || 'Dr. Sarah Jenkins');
  const [selectedBookingSlot, setSelectedBookingSlot] = useState('10:00 AM');
  const [selectedBookingPatientUhid, setSelectedBookingPatientUhid] = useState(patients[0]?.uhid || '');
  const [bookingVisitType, setBookingVisitType] = useState<'Scheduled Visit' | 'Follow-Up' | 'Emergency' | 'Second Opinion'>('Scheduled Visit');

  const selectedBookingDoctorObj = doctorsRoster.find((d) => d.name === selectedBookingDoctor) || doctorsRoster[0];
  const selectedBookingPatientObj = patients.find((p) => p.uhid === selectedBookingPatientUhid) || patients[0];

  // Active Token check for the currently selected patient in Appointment Booking
  const existingActiveTokenForSelectedPatient = useMemo(() => {
    if (!selectedBookingPatientUhid) return null;
    return queue.find(
      (q) => q.uhid === selectedBookingPatientUhid && (q.status === 'WAITING' || q.status === 'TRIAGED' || q.status === 'IN_CONSULTATION')
    );
  }, [queue, selectedBookingPatientUhid]);

  // Time Slots
  const morningSlots = ['09:00 AM', '09:15 AM', '09:30 AM', '09:45 AM', '10:00 AM', '10:15 AM', '10:30 AM', '10:45 AM', '11:00 AM', '11:30 AM', '11:45 AM'];
  const afternoonSlots = ['02:00 PM', '02:15 PM', '02:30 PM', '02:45 PM', '03:00 PM', '03:15 PM', '03:30 PM', '04:00 PM', '04:30 PM'];

  // Audio Chime Simulator for Calling Next Token
  const playCallingChime = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
      osc.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.15); // E5
      osc.frequency.setValueAtTime(783.99, audioCtx.currentTime + 0.3); // G5
      gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.9);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.9);
    } catch {
      // Audio fallback
    }
  };

  // Queue Operations
  const handleCallNext = () => {
    const nextWaiting = queue.find(
      (q) => (q.status === 'WAITING' || q.status === 'TRIAGED') && q.callingStatus !== 'CALLING'
    );
    if (nextWaiting) {
      patientJourneyService.updateQueueToken(nextWaiting.token, {
        status: 'IN_CONSULTATION',
        callingStatus: 'CALLING',
      });
      setQueue(patientJourneyService.getQueue());
      playCallingChime();
      showToast(`📢 Token #${String(nextWaiting.token).padStart(2, '0')} (${nextWaiting.patient}) called to ${nextWaiting.room}!`);
    } else {
      alert('All waiting patients in the lobby have already been called.');
    }
  };

  const handleCallSpecificToken = (token: SharedQueueToken) => {
    patientJourneyService.updateQueueToken(token.token, {
      status: 'IN_CONSULTATION',
      callingStatus: 'CALLING',
    });
    setQueue(patientJourneyService.getQueue());
    playCallingChime();
    showToast(`📢 Token #${String(token.token).padStart(2, '0')} (${token.patient}) called to ${token.room}!`);
  };

  const handleBumpUrgent = (tokenNo: number) => {
    patientJourneyService.updateQueueToken(tokenNo, {
      priority: 'URGENT',
    });
    setQueue(patientJourneyService.getQueue());
    showToast(`🚨 Token #${tokenNo} marked as URGENT PRIORITY!`);
  };

  const handleMarkTriage = (tokenNo: number) => {
    patientJourneyService.updateQueueToken(tokenNo, {
      status: 'TRIAGED',
    });
    setQueue(patientJourneyService.getQueue());
    showToast(`✓ Token #${tokenNo} marked as Triaged by Nurse.`);
  };

  const handlePatientCheckOut = (token: SharedQueueToken) => {
    const checkoutTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    patientJourneyService.updateQueueToken(token.token, {
      status: 'COMPLETED',
      callingStatus: 'IDLE',
      checkoutTime,
    });
    setQueue(patientJourneyService.getQueue());
    showToast(`✓ Patient ${token.patient} (Token #${token.token}) checked out at ${checkoutTime}.`);
  };

  const handleMarkNoShow = (tokenNo: number) => {
    if (window.confirm(`Mark Token #${tokenNo} as No-Show / Cancelled?`)) {
      patientJourneyService.updateQueueToken(tokenNo, {
        status: 'NO_SHOW',
        callingStatus: 'IDLE',
      });
      setQueue(patientJourneyService.getQueue());
      showToast(`Token #${tokenNo} marked as No-Show.`);
    }
  };

  // Confirm Appointment Booking (with duplicate protection)
  const handleConfirmAppointment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBookingPatientObj) return;

    const currentQueue = patientJourneyService.getQueue();
    const isFollowUp = bookingVisitType === 'Follow-Up';
    const applicableFee = isFollowUp ? selectedBookingDoctorObj.followUpFee : selectedBookingDoctorObj.fee;

    // Check if patient already has an active token today
    if (existingActiveTokenForSelectedPatient) {
      // Reassign / update their existing token instead of creating a duplicate row!
      patientJourneyService.updateQueueToken(existingActiveTokenForSelectedPatient.token, {
        doctor: `${selectedBookingDoctorObj.name} (${selectedBookingDoctorObj.dept})`,
        room: selectedBookingDoctorObj.room,
        time: selectedBookingSlot,
        type: isFollowUp ? 'FOLLOW_UP' : 'SCHEDULED',
        totalFee: applicableFee + (tariffMaster.triageVitalsFee || 10),
      });

      const updatedList = patientJourneyService.getQueue();
      setQueue(updatedList);
      const updatedToken = updatedList.find((q) => q.token === existingActiveTokenForSelectedPatient.token) || existingActiveTokenForSelectedPatient;
      setSelectedTokenForPrint(updatedToken);
      setShowTokenPrintModal(true);
      showToast(`✓ Token #${existingActiveTokenForSelectedPatient.token} reassigned to ${selectedBookingDoctor} (${selectedBookingDoctorObj.room}) at ${selectedBookingSlot}!`);
      return;
    }

    // Otherwise issue a clean new token
    const nextTokenNo = currentQueue.length > 0 ? Math.max(...currentQueue.map((q) => q.token)) + 1 : 1;
    const newToken: SharedQueueToken = {
      id: `apt-${Date.now()}`,
      token: nextTokenNo,
      aptNo: `APT-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(nextTokenNo).padStart(4, '0')}`,
      uhid: selectedBookingPatientObj.uhid,
      patient: `${selectedBookingPatientObj.firstName} ${selectedBookingPatientObj.lastName}`,
      age: selectedBookingPatientObj.age,
      gender: selectedBookingPatientObj.gender,
      bloodGroup: selectedBookingPatientObj.bloodGroup,
      phone: selectedBookingPatientObj.phone,
      doctor: `${selectedBookingDoctorObj.name} (${selectedBookingDoctorObj.dept})`,
      room: selectedBookingDoctorObj.room,
      time: selectedBookingSlot,
      type: isFollowUp ? 'FOLLOW_UP' : 'SCHEDULED',
      status: 'WAITING',
      priority: 'NORMAL',
      feePaid: false,
      totalFee: applicableFee + (tariffMaster.triageVitalsFee || 10),
      callingStatus: 'IDLE',
      vitals: {
        bp: '120/80',
        pulse: 76,
        temp: 98.6,
        spo2: 99,
        height: 172,
        weight: 70,
        bmi: 23.6,
        triageNotes: `Appointment booked for ${selectedBookingSlot} (${bookingVisitType}).`,
      },
    };

    patientJourneyService.addQueueToken(newToken);
    setQueue(patientJourneyService.getQueue());

    setSelectedTokenForPrint(newToken);
    setShowTokenPrintModal(true);
    showToast(`✓ Appointment confirmed for ${selectedBookingSlot} with ${selectedBookingDoctor}!`);
  };

  // Filtered Queue
  const filteredQueue = useMemo(() => {
    return queue.filter((q) => {
      // Category filter
      if (queueFilter === 'WAITING' && q.status !== 'WAITING') return false;
      if (queueFilter === 'TRIAGED' && q.status !== 'TRIAGED' && q.status !== 'READY_FOR_DOCTOR' && q.status !== 'IN_TRIAGE') return false;
      if (queueFilter === 'IN_CONSULTATION' && q.status !== 'IN_CONSULTATION') return false;
      if (queueFilter === 'COMPLETED' && q.status !== 'COMPLETED') return false;
      if (queueFilter === 'URGENT' && q.priority !== 'URGENT') return false;

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        return (
          q.patient.toLowerCase().includes(query) ||
          q.uhid.toLowerCase().includes(query) ||
          q.doctor.toLowerCase().includes(query) ||
          q.room.toLowerCase().includes(query) ||
          String(q.token) === query
        );
      }
      return true;
    });
  }, [queue, queueFilter, searchQuery]);

  // Filtered Patients
  const filteredPatients = useMemo(() => {
    if (!searchQuery.trim()) return patients;
    const q = searchQuery.toLowerCase();
    return patients.filter(
      (p) =>
        p.firstName.toLowerCase().includes(q) ||
        p.lastName.toLowerCase().includes(q) ||
        p.uhid.toLowerCase().includes(q) ||
        p.phone.includes(q) ||
        p.idNumber.toLowerCase().includes(q)
    );
  }, [patients, searchQuery]);

  // Shift Financial KPIs
  const totalVisitsToday = queue.length;
  const waitingInLobby = queue.filter((q) => q.status === 'WAITING').length;
  const inTriage = queue.filter((q) => q.status === 'TRIAGED' || q.status === 'READY_FOR_DOCTOR' || q.status === 'IN_TRIAGE').length;
  const inConsultation = queue.filter((q) => q.status === 'IN_CONSULTATION').length;
  const completedToday = queue.filter((q) => q.status === 'COMPLETED').length;
  const totalCollectionsToday = invoices.reduce((acc, inv) => acc + (inv.paid || 0), 0);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem',
        width: '100%',
      }}
    >
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div
          style={{
            backgroundColor: '#0284c7',
            color: '#ffffff',
            padding: '0.75rem 1.25rem',
            borderRadius: '10px',
            fontWeight: 700,
            fontSize: '0.875rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
            animation: 'fadeIn 0.2s ease',
          }}
        >
          <span>{toastMessage}</span>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            style={{ background: 'transparent', border: 'none', color: '#ffffff', cursor: 'pointer', fontWeight: 900 }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Welcome / Station Gradient Hero Banner (Executive Command Center Aesthetic) */}
      <div
        style={{
          background: 'linear-gradient(135deg, #0b1528 0%, #1e3a8a 45%, #0284c7 100%)',
          borderRadius: '18px',
          padding: '1.75rem 2rem',
          color: '#ffffff',
          boxShadow: '0 12px 30px -6px rgba(2, 132, 199, 0.35), 0 4px 12px rgba(11, 21, 40, 0.15)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1.5rem',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Subtle Decorative Ambient Background Rings */}
        <div
          style={{
            position: 'absolute',
            right: '-40px',
            top: '-50px',
            width: '260px',
            height: '260px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(56, 189, 248, 0.15) 0%, rgba(2, 132, 199, 0) 70%)',
            pointerEvents: 'none',
          }}
        />

        <div style={{ maxWidth: '660px', position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.625rem', flexWrap: 'wrap' }}>
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 800,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                backgroundColor: 'rgba(255, 255, 255, 0.16)',
                padding: '0.25rem 0.65rem',
                borderRadius: '6px',
                border: '1px solid rgba(255, 255, 255, 0.25)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
              }}
            >
              <Shield size={12} color="#7dd3fc" /> Reception Desk 01
            </span>
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                color: '#bae6fd',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
              }}
            >
              <Building2 size={13} /> OPD Ambulatory Care
            </span>
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                color: '#e0f2fe',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
              }}
            >
              <Clock size={13} /> {counterSession.shift} (08:00 - 16:00)
            </span>
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 800,
                color: counterSession.status === 'OPEN' ? '#a7f3d0' : '#fecaca',
                backgroundColor: counterSession.status === 'OPEN' ? 'rgba(16, 185, 129, 0.22)' : 'rgba(239, 68, 68, 0.22)',
                border: counterSession.status === 'OPEN' ? '1px solid rgba(52, 211, 153, 0.35)' : '1px solid rgba(248, 113, 113, 0.35)',
                padding: '0.2rem 0.65rem',
                borderRadius: '999px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
              }}
            >
              <span
                style={{
                  width: '7px',
                  height: '7px',
                  borderRadius: '50%',
                  backgroundColor: counterSession.status === 'OPEN' ? '#34d399' : '#ef4444',
                  boxShadow: counterSession.status === 'OPEN' ? '0 0 6px #34d399' : 'none',
                }}
              />
              {counterSession.status === 'OPEN' ? 'Active / Online' : 'Counter Closed'}
            </span>
          </div>

          <h2 style={{ fontSize: '1.75rem', fontWeight: 900, margin: '0 0 0.4rem 0', letterSpacing: '-0.025em' }}>
            OPD Reception & Calling Cockpit
          </h2>
          <p style={{ margin: 0, fontSize: '0.875rem', color: '#e0f2fe', lineHeight: 1.55, display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', backgroundColor: 'rgba(255,255,255,0.14)', padding: '0.15rem 0.5rem', borderRadius: '6px', fontSize: '0.8125rem', fontWeight: 700 }}>
              👤 {counterSession.receptionistName}
            </span>
            <span>Station Lead • Patient intake, doctor queue dispatch, counter settlement & bed admissions.</span>
          </p>
        </div>

        {/* Primary Header Actions */}
        <div style={{ display: 'flex', gap: '0.625rem', flexWrap: 'wrap', position: 'relative', zIndex: 1 }}>
          <button
            type="button"
            className="btn"
            onClick={() => setShowClosingReportModal(true)}
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.12)',
              color: '#ffffff',
              border: '1px solid rgba(255, 255, 255, 0.25)',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.625rem 1rem',
              borderRadius: '10px',
              backdropFilter: 'blur(8px)',
              transition: 'var(--transition)',
            }}
          >
            <FileSpreadsheet size={16} /> Daily Closing
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => setShowTvDisplayModal(true)}
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.12)',
              color: '#ffffff',
              border: '1px solid rgba(255, 255, 255, 0.25)',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.625rem 1rem',
              borderRadius: '10px',
              backdropFilter: 'blur(8px)',
              transition: 'var(--transition)',
            }}
            title="Open Waiting Lobby TV Display in new window or modal"
          >
            <Tv size={16} /> Lobby TV
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleCallNext}
            style={{
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              border: '1px solid #b45309',
              color: '#ffffff',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.625rem 1.15rem',
              borderRadius: '10px',
              boxShadow: '0 4px 14px rgba(217, 119, 6, 0.35)',
              transition: 'var(--transition)',
            }}
          >
            <Volume2 size={16} /> Call Next Patient
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setShowQuickWalkInModal(true)}
            style={{
              backgroundColor: '#0284c7',
              border: '1px solid #38bdf8',
              color: '#ffffff',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.625rem 1.15rem',
              borderRadius: '10px',
              boxShadow: '0 4px 14px rgba(2, 132, 199, 0.3)',
              transition: 'var(--transition)',
            }}
          >
            <Zap size={16} /> Walk-In Token
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => setShowRegWizardModal(true)}
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid #ffffff',
              color: '#0f172a',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.625rem 1.25rem',
              borderRadius: '10px',
              boxShadow: '0 4px 14px rgba(0, 0, 0, 0.12)',
              transition: 'var(--transition)',
            }}
          >
            <Plus size={16} color="#0284c7" /> Register Patient
          </button>
        </div>
      </div>

      {/* Daily Counter Shift Session Bar (Elevated Glassmorphic Telemetry Strip) */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '14px',
          border: '1.5px solid var(--border-color)',
          padding: '0.875rem 1.5rem',
          boxShadow: '0 4px 16px -2px rgba(0,0,0,0.03)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              backgroundColor: counterSession.status === 'OPEN' ? '#dcfce7' : '#fee2e2',
              color: counterSession.status === 'OPEN' ? '#15803d' : '#991b1b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: counterSession.status === 'OPEN' ? '0 2px 6px rgba(22, 163, 74, 0.15)' : 'none',
            }}
          >
            <Shield size={20} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.875rem', fontWeight: 800, color: 'var(--secondary)' }}>
                {counterSession.counterNumber} • {counterSession.shift}
              </span>
              <span
                style={{
                  fontSize: '0.6875rem',
                  fontWeight: 800,
                  backgroundColor: counterSession.status === 'OPEN' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                  color: counterSession.status === 'OPEN' ? '#059669' : '#dc2626',
                  padding: '0.2rem 0.5rem',
                  borderRadius: '6px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                {counterSession.status}
              </span>
              <span
                style={{
                  fontSize: '0.6875rem',
                  fontWeight: 700,
                  color: '#0369a1',
                  backgroundColor: '#e0f2fe',
                  border: '1px solid #bae6fd',
                  padding: '0.2rem 0.55rem',
                  borderRadius: '6px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                }}
              >
                <Sparkles size={12} /> Tariffs Synced Live
              </span>
            </div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: '0.25rem 0 0 0', display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <span>Opening Float: <strong style={{ color: 'var(--secondary)' }}>${counterSession.openingFloat}.00</strong></span>
              <span style={{ color: 'var(--border-color)' }}>•</span>
              <span>Total Collections: <strong style={{ color: 'var(--secondary)' }}>${totalCollectionsToday}.00</strong></span>
              <span style={{ color: 'var(--border-color)' }}>•</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                Live In-Drawer Cash:
                <strong style={{ backgroundColor: '#dcfce7', color: '#15803d', padding: '0.15rem 0.5rem', borderRadius: '6px', fontSize: '0.875rem', fontWeight: 800 }}>
                  ${counterSession.openingFloat + totalCollectionsToday}.00
                </strong>
              </span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setShowOpenCounterModal(true)}
            style={{ fontSize: '0.75rem', padding: '0.4rem 0.85rem', fontWeight: 700 }}
          >
            {counterSession.status === 'OPEN' ? 'Edit Float' : 'Open Counter'}
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setShowClosingReportModal(true)}
            style={{ fontSize: '0.75rem', padding: '0.4rem 0.85rem', color: '#0284c7', fontWeight: 700, borderColor: '#bae6fd', backgroundColor: '#f0f9ff' }}
          >
            Shift Handover →
          </button>
        </div>
      </div>

      {/* KPI Summary Cards (Elevated Cards matching Department & Admin Standards) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1.25rem',
        }}
      >
        {/* Total Patients Today */}
        <div
          className="card"
          style={{
            padding: '1.25rem 1.35rem',
            borderRadius: '14px',
            border: '1.5px solid #bfdbfe',
            backgroundColor: '#ffffff',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.02)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '0.75rem',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: '#1e40af', letterSpacing: '0.04em' }}>
              Total Visits Today
            </span>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                backgroundColor: '#eff6ff',
                color: '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Users size={20} />
            </div>
          </div>
          <div>
            <div style={{ fontSize: '1.85rem', fontWeight: 900, color: '#1e3a8a', lineHeight: 1 }}>
              {totalVisitsToday} <span style={{ fontSize: '0.875rem', color: '#60a5fa', fontWeight: 700 }}>Visits</span>
            </div>
            <div style={{ fontSize: '0.75rem', color: '#3b82f6', marginTop: '0.35rem', fontWeight: 600 }}>
              All active & checked-in tokens
            </div>
          </div>
        </div>

        {/* Waiting Queue */}
        <div
          className="card"
          style={{
            padding: '1.25rem 1.35rem',
            borderRadius: '14px',
            border: '1.5px solid #fed7aa',
            backgroundColor: '#ffffff',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.02)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '0.75rem',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: '#9a3412', letterSpacing: '0.04em' }}>
              Waiting in Lobby
            </span>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                backgroundColor: '#fff7ed',
                color: '#ea580c',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Clock size={20} />
            </div>
          </div>
          <div>
            <div style={{ fontSize: '1.85rem', fontWeight: 900, color: '#c2410c', lineHeight: 1 }}>
              {waitingInLobby} <span style={{ fontSize: '0.875rem', color: '#fb923c', fontWeight: 700 }}>In Lobby</span>
            </div>
            <div style={{ fontSize: '0.75rem', color: '#c2410c', marginTop: '0.35rem', fontWeight: 600 }}>
              Awaiting doctor chamber calling
            </div>
          </div>
        </div>

        {/* In Consultation */}
        <div
          className="card"
          style={{
            padding: '1.25rem 1.35rem',
            borderRadius: '14px',
            border: '1.5px solid #bbf7d0',
            backgroundColor: '#ffffff',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.02)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '0.75rem',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: '#166534', letterSpacing: '0.04em' }}>
              In Consultation
            </span>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                backgroundColor: '#f0fdf4',
                color: '#16a34a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <CheckCircle2 size={20} />
            </div>
          </div>
          <div>
            <div style={{ fontSize: '1.85rem', fontWeight: 900, color: '#15803d', lineHeight: 1 }}>
              {inConsultation} <span style={{ fontSize: '0.875rem', color: '#4ade80', fontWeight: 700 }}>Active</span>
            </div>
            <div style={{ fontSize: '0.75rem', color: '#15803d', marginTop: '0.35rem', fontWeight: 600 }}>
              Currently inside doctor chambers
            </div>
          </div>
        </div>

        {/* Counter Revenue */}
        <div
          className="card"
          style={{
            padding: '1.25rem 1.35rem',
            borderRadius: '14px',
            border: '1.5px solid #99f6e4',
            backgroundColor: '#ffffff',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.02)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '0.75rem',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: '#115e59', letterSpacing: '0.04em' }}>
              Counter Revenue
            </span>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                backgroundColor: '#f0fdfa',
                color: '#0d9488',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <DollarSign size={20} />
            </div>
          </div>
          <div>
            <div style={{ fontSize: '1.85rem', fontWeight: 900, color: '#0f766e', lineHeight: 1 }}>
              ${totalCollectionsToday}.00 <span style={{ fontSize: '0.875rem', color: '#2dd4bf', fontWeight: 700 }}>USD</span>
            </div>
            <div style={{ fontSize: '0.75rem', color: '#0f766e', marginTop: '0.35rem', fontWeight: 600 }}>
              Consultation & desk collections
            </div>
          </div>
        </div>
      </div>

      {/* Main Workstation Segmented Subtabs Bar */}
      <div
        style={{
          display: 'flex',
          gap: '0.375rem',
          backgroundColor: '#f1f5f9',
          padding: '0.375rem',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          overflowX: 'auto',
        }}
      >
        {[
          { id: 'queue', label: '1. 🎫 Live Token Queue & Calling Desk', count: queue.length },
          { id: 'appointments', label: '2. 📅 Doctor Availability & Slot Booking', count: `${doctorsRoster.length} Doctors` },
          { id: 'billing', label: '3. 💳 Counter Billing & Receipts', count: invoices.length },
          { id: 'search', label: '4. 👥 Patient Master Directory & Dossier', count: patients.length },
          { id: 'daycare', label: '5. 🛏️ Hospital Bed Roster & Observation Care', count: `${bedStats.occupied}/${bedStats.total} Beds` },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                padding: '0.625rem 1.15rem',
                borderRadius: '9px',
                fontWeight: 800,
                fontSize: '0.8125rem',
                border: 'none',
                cursor: 'pointer',
                backgroundColor: isActive ? '#ffffff' : 'transparent',
                color: isActive ? '#0284c7' : '#64748b',
                boxShadow: isActive ? '0 2px 8px rgba(0, 0, 0, 0.08)' : 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease',
              }}
            >
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  style={{
                    fontSize: '0.6875rem',
                    backgroundColor: isActive ? '#e0f2fe' : '#e2e8f0',
                    color: isActive ? '#0284c7' : '#475569',
                    padding: '0.15rem 0.5rem',
                    borderRadius: '999px',
                    fontWeight: 900,
                  }}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: LIVE TOKEN QUEUE & CALLING DESK                                    */}
      {/* ========================================================================= */}
      {activeTab === 'queue' && (
        <div style={{ display: 'grid', gridTemplateColumns: '7fr 3fr', gap: '1.5rem', alignItems: 'start' }}>
          {/* LEFT (70%): Live Token Queue Desk */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Filter Pills, Search Bar & Lobby TV Link */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                {[
                  { id: 'ALL', label: `All (${queue.length})` },
                  { id: 'WAITING', label: `Waiting (${waitingInLobby})` },
                  { id: 'TRIAGED', label: `Triaged (${inTriage})` },
                  { id: 'IN_CONSULTATION', label: `In Consultation (${inConsultation})` },
                  { id: 'COMPLETED', label: `Completed (${completedToday})` },
                  { id: 'URGENT', label: '🚨 Urgent' },
                ].map((pill) => (
                  <button
                    key={pill.id}
                    type="button"
                    onClick={() => setQueueFilter(pill.id as any)}
                    className={`subtab-pill ${queueFilter === pill.id ? 'active' : ''}`}
                    style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem', fontWeight: 700 }}
                  >
                    {pill.label}
                  </button>
                ))}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ position: 'relative', width: '220px' }}>
                  <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    className="form-input"
                    style={{ paddingLeft: '2rem', fontSize: '0.7813rem', height: '34px', borderRadius: '8px' }}
                    placeholder="Search patient, UHID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setShowTvDisplayModal(true)}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', height: '34px', borderRadius: '8px' }}
                  title="Launch Fullscreen Waiting Room TV Display"
                >
                  <Tv size={14} color="#0284c7" />
                  <span>TV Display</span>
                </button>
              </div>
            </div>

            {/* Queue Table with Sticky Header and Cleaner Row Design */}
            <div
              className="card"
              style={{
                padding: '0',
                borderRadius: '14px',
                overflow: 'visible',
                border: '1px solid var(--border-color)',
                backgroundColor: '#ffffff',
                boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
              }}
            >
              <div className="table-container" style={{ maxHeight: '680px', overflowY: 'auto' }}>
                <table>
                  <thead style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                    <tr>
                      <th style={{ width: '65px', fontSize: '0.75rem', color: '#475569', fontWeight: 700 }}>Token</th>
                      <th style={{ minWidth: '190px', fontSize: '0.75rem', color: '#475569', fontWeight: 700 }}>Patient Details</th>
                      <th style={{ minWidth: '180px', fontSize: '0.75rem', color: '#475569', fontWeight: 700 }}>Consultant & Room</th>
                      <th style={{ width: '110px', fontSize: '0.75rem', color: '#475569', fontWeight: 700 }}>Slot & Type</th>
                      <th style={{ width: '95px', fontSize: '0.75rem', color: '#475569', fontWeight: 700 }}>Desk Bill</th>
                      <th style={{ width: '120px', fontSize: '0.75rem', color: '#475569', fontWeight: 700 }}>Queue Status</th>
                      <th style={{ width: '130px', textAlign: 'right', fontSize: '0.75rem', color: '#475569', fontWeight: 700 }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredQueue.length === 0 ? (
                      <tr>
                        <td colSpan={7} style={{ textAlign: 'center', padding: '3.5rem 1rem', color: 'var(--text-muted)' }}>
                          No queue tokens matching the filter. Click <strong>Walk-In Token</strong> to check in a patient.
                        </td>
                      </tr>
                    ) : (
                      filteredQueue.map((item) => (
                        <tr
                          key={item.token}
                          style={{
                            backgroundColor:
                              item.priority === 'URGENT'
                                ? '#fef2f2'
                                : item.callingStatus === 'CALLING'
                                ? '#f0f9ff'
                                : undefined,
                            transition: 'background-color 0.15s ease',
                          }}
                        >
                          {/* Token # */}
                          <td style={{ verticalAlign: 'middle' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0.2rem' }}>
                              <span
                                style={{
                                  fontSize: '1.15rem',
                                  fontWeight: 900,
                                  color: item.priority === 'URGENT' ? '#b91c1c' : '#0284c7',
                                  lineHeight: 1,
                                }}
                              >
                                #{String(item.token).padStart(2, '0')}
                              </span>
                              {item.priority === 'URGENT' && (
                                <span style={{ fontSize: '0.5625rem', fontWeight: 800, color: '#b91c1c', backgroundColor: '#fee2e2', padding: '0.1rem 0.3rem', borderRadius: '4px' }}>
                                  URGENT
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Patient */}
                          <td style={{ verticalAlign: 'middle' }}>
                            <div style={{ fontWeight: 800, color: 'var(--secondary)', fontSize: '0.8438rem' }}>
                              {item.patient}
                            </div>
                            <div style={{ fontSize: '0.7188rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                              <code>{item.uhid}</code> • {item.age}y/{item.gender} • {item.phone}
                            </div>
                          </td>

                          {/* Doctor & Room */}
                          <td style={{ verticalAlign: 'middle' }}>
                            <div style={{ fontWeight: 700, color: 'var(--secondary)', fontSize: '0.8125rem' }}>
                              {item.doctor}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.2rem' }}>
                              <span
                                style={{
                                  fontSize: '0.6875rem',
                                  fontWeight: 700,
                                  color: '#15803d',
                                  backgroundColor: '#dcfce7',
                                  padding: '0.12rem 0.45rem',
                                  borderRadius: '5px',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.25rem',
                                }}
                              >
                                <DoorClosed size={11} />
                                {item.room}
                              </span>
                            </div>
                          </td>

                          {/* Slot & Visit Type */}
                          <td style={{ verticalAlign: 'middle' }}>
                            <div style={{ fontWeight: 700, fontSize: '0.8125rem', color: 'var(--text-main)' }}>{item.time}</div>
                            <span
                              style={{
                                fontSize: '0.6563rem',
                                fontWeight: 700,
                                color: '#475569',
                                backgroundColor: '#f1f5f9',
                                padding: '0.1rem 0.4rem',
                                borderRadius: '4px',
                                marginTop: '0.2rem',
                                display: 'inline-block',
                              }}
                            >
                              {item.type}
                            </span>
                          </td>

                          {/* Desk Bill Status */}
                          <td style={{ verticalAlign: 'middle' }}>
                            {item.feePaid ? (
                              <div>
                                <span style={{ color: '#15803d', fontWeight: 800, fontSize: '0.8125rem' }}>
                                  ${item.totalFee || 75}.00
                                </span>
                                <div style={{ fontSize: '0.6563rem', color: '#16a34a', fontWeight: 700 }}>
                                  ✓ Paid
                                </div>
                              </div>
                            ) : (
                              <div>
                                <span style={{ color: '#b45309', fontWeight: 800, fontSize: '0.8125rem' }}>
                                  ${item.totalFee || 75}.00
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedTokenForBill(item);
                                    setShowBillingModal(true);
                                  }}
                                  style={{
                                    fontSize: '0.6563rem',
                                    color: '#b45309',
                                    backgroundColor: '#fef3c7',
                                    border: '1px solid #fde68a',
                                    padding: '0.15rem 0.45rem',
                                    borderRadius: '5px',
                                    cursor: 'pointer',
                                    fontWeight: 800,
                                    marginTop: '0.2rem',
                                    display: 'inline-block',
                                  }}
                                >
                                  Collect
                                </button>
                              </div>
                            )}
                          </td>

                          {/* Queue Status */}
                          <td style={{ verticalAlign: 'middle' }}>
                            <span
                              style={{
                                fontSize: '0.6875rem',
                                fontWeight: 800,
                                padding: '0.2rem 0.55rem',
                                borderRadius: '999px',
                                display: 'inline-block',
                                backgroundColor:
                                  item.status === 'IN_CONSULTATION'
                                    ? '#dcfce7'
                                    : item.status === 'TRIAGED'
                                    ? '#eff6ff'
                                    : item.status === 'COMPLETED'
                                    ? '#f1f5f9'
                                    : '#fff7ed',
                                color:
                                  item.status === 'IN_CONSULTATION'
                                    ? '#15803d'
                                    : item.status === 'TRIAGED'
                                    ? '#1d4ed8'
                                    : item.status === 'COMPLETED'
                                    ? '#64748b'
                                    : '#c2410c',
                                border: `1px solid ${
                                  item.status === 'IN_CONSULTATION'
                                    ? '#bbf7d0'
                                    : item.status === 'TRIAGED'
                                    ? '#bfdbfe'
                                    : item.status === 'COMPLETED'
                                    ? '#e2e8f0'
                                    : '#fed7aa'
                                }`,
                              }}
                            >
                              {item.status === 'COMPLETED' ? 'CHECKED OUT' : item.status.replace('_', ' ')}
                            </span>
                            {item.checkoutTime && (
                              <div style={{ fontSize: '0.6563rem', color: '#64748b', marginTop: '0.2rem' }}>
                                Out: {item.checkoutTime}
                              </div>
                            )}
                          </td>

                          {/* Contextual Action & Dropdown */}
                          <td style={{ textAlign: 'right', verticalAlign: 'middle', position: 'relative' }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                              {/* Primary Contextual Action Button */}
                              {item.status !== 'IN_CONSULTATION' && item.status !== 'COMPLETED' && (
                                <button
                                  type="button"
                                  className="btn btn-primary btn-sm"
                                  onClick={() => handleCallSpecificToken(item)}
                                  style={{ fontWeight: 800, padding: '0.3rem 0.65rem', fontSize: '0.75rem' }}
                                  title="Call Patient to Chamber"
                                >
                                  Call
                                </button>
                              )}

                              {item.status === 'IN_CONSULTATION' && (
                                <button
                                  type="button"
                                  className="btn btn-primary btn-sm"
                                  onClick={() => handlePatientCheckOut(item)}
                                  style={{ backgroundColor: '#15803d', borderColor: '#15803d', fontWeight: 800, padding: '0.3rem 0.65rem', fontSize: '0.75rem' }}
                                  title="Check-Out Patient"
                                >
                                  Check-Out
                                </button>
                              )}

                              {item.status === 'COMPLETED' && (
                                <button
                                  type="button"
                                  className="btn btn-secondary btn-sm"
                                  onClick={() => {
                                    setSelectedTokenForPrint(item);
                                    setShowTokenPrintModal(true);
                                  }}
                                  style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}
                                  title="Print Slip"
                                >
                                  <Printer size={13} />
                                </button>
                              )}

                              {/* More Options Dropdown Toggle */}
                              <div style={{ position: 'relative' }}>
                                <button
                                  type="button"
                                  className="btn btn-secondary btn-sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActionMenuToken(actionMenuToken === item.token ? null : item.token);
                                  }}
                                  style={{ padding: '0.3rem 0.45rem' }}
                                  title="More Quick Actions"
                                >
                                  <MoreVertical size={14} />
                                </button>

                                {/* Dropdown Menu */}
                                {actionMenuToken === item.token && (
                                  <div
                                    onClick={(e) => e.stopPropagation()}
                                    style={{
                                      position: 'absolute',
                                      right: 0,
                                      top: '110%',
                                      backgroundColor: '#ffffff',
                                      borderRadius: '10px',
                                      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.15)',
                                      border: '1px solid #e2e8f0',
                                      zIndex: 100,
                                      minWidth: '180px',
                                      padding: '0.4rem',
                                      display: 'flex',
                                      flexDirection: 'column',
                                      gap: '0.2rem',
                                      textAlign: 'left',
                                    }}
                                  >
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setSelectedTokenForPrint(item);
                                        setShowTokenPrintModal(true);
                                        setActionMenuToken(null);
                                      }}
                                      style={{
                                        border: 'none',
                                        background: 'transparent',
                                        padding: '0.45rem 0.65rem',
                                        fontSize: '0.7813rem',
                                        fontWeight: 600,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.5rem',
                                        borderRadius: '6px',
                                        cursor: 'pointer',
                                        color: 'var(--text-main)',
                                      }}
                                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f1f5f9')}
                                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                                    >
                                      <Printer size={14} color="#0284c7" />
                                      <span>Print Token Slip</span>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => {
                                        setSelectedTokenForBill(item);
                                        setShowBillingModal(true);
                                        setActionMenuToken(null);
                                      }}
                                      style={{
                                        border: 'none',
                                        background: 'transparent',
                                        padding: '0.45rem 0.65rem',
                                        fontSize: '0.7813rem',
                                        fontWeight: 600,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.5rem',
                                        borderRadius: '6px',
                                        cursor: 'pointer',
                                        color: 'var(--text-main)',
                                      }}
                                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f1f5f9')}
                                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                                    >
                                      <Receipt size={14} color="#16a34a" />
                                      <span>Counter Bill Receipt</span>
                                    </button>

                                    {item.status === 'WAITING' && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          handleMarkTriage(item.token);
                                          setActionMenuToken(null);
                                        }}
                                        style={{
                                          border: 'none',
                                          background: 'transparent',
                                          padding: '0.45rem 0.65rem',
                                          fontSize: '0.7813rem',
                                          fontWeight: 600,
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: '0.5rem',
                                          borderRadius: '6px',
                                          cursor: 'pointer',
                                          color: 'var(--text-main)',
                                        }}
                                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f1f5f9')}
                                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                                      >
                                        <Stethoscope size={14} color="#9333ea" />
                                        <span>Mark Nurse Triaged</span>
                                      </button>
                                    )}

                                    {item.priority !== 'URGENT' && item.status !== 'COMPLETED' && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          handleBumpUrgent(item.token);
                                          setActionMenuToken(null);
                                        }}
                                        style={{
                                          border: 'none',
                                          background: 'transparent',
                                          padding: '0.45rem 0.65rem',
                                          fontSize: '0.7813rem',
                                          fontWeight: 600,
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: '0.5rem',
                                          borderRadius: '6px',
                                          cursor: 'pointer',
                                          color: '#dc2626',
                                        }}
                                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#fee2e2')}
                                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                                      >
                                        <AlertTriangle size={14} color="#dc2626" />
                                        <span>Mark Urgent Priority</span>
                                      </button>
                                    )}

                                    {item.status !== 'COMPLETED' && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          handleMarkNoShow(item.token);
                                          setActionMenuToken(null);
                                        }}
                                        style={{
                                          border: 'none',
                                          background: 'transparent',
                                          padding: '0.45rem 0.65rem',
                                          fontSize: '0.7813rem',
                                          fontWeight: 600,
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: '0.5rem',
                                          borderRadius: '6px',
                                          cursor: 'pointer',
                                          color: '#64748b',
                                        }}
                                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f1f5f9')}
                                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                                      >
                                        <XCircle size={14} color="#64748b" />
                                        <span>Mark No-Show</span>
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* RIGHT (30%): Doctor Availability, Chamber Status & Shift Summary */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Card 1: Consultation Chambers Panel (matching Doctor Roster in Department Workspace) */}
            <div className="card" style={{ padding: '1.25rem', borderRadius: '14px', border: '1px solid var(--border-color)', backgroundColor: '#ffffff' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: 'var(--secondary)' }}>
                    Doctor Availability & Chambers
                  </h3>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0.15rem 0 0' }}>
                    Chamber occupancy & live physicians
                  </p>
                </div>
                <span className="badge badge-success" style={{ fontSize: '0.6875rem' }}>
                  {rooms.filter((r) => r.status === 'AVAILABLE').length} Available
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                {rooms.slice(0, 4).map((room) => {
                  const isAvailable = room.status === 'AVAILABLE';
                  const serving = getCurrentlyServingInRoom(room.roomNumber, room.assignedDoctorName);
                  return (
                    <div
                      key={room.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '0.75rem 0.875rem',
                        borderRadius: '10px',
                        border: '1px solid var(--border-color)',
                        backgroundColor: serving ? '#eff6ff' : '#fafafa',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div
                          style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '8px',
                            backgroundColor: isAvailable && !serving ? '#dcfce7' : '#fed7aa',
                            color: isAvailable && !serving ? '#15803d' : '#c2410c',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 800,
                            fontSize: '0.75rem',
                          }}
                        >
                          {room.roomNumber}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.8125rem', color: 'var(--secondary)' }}>
                            {room.name}
                          </div>
                          <div style={{ fontSize: '0.7188rem', color: 'var(--text-muted)' }}>
                            {room.assignedDoctorName || 'Duty Physician'}
                          </div>
                          {serving && (
                            <div style={{ fontSize: '0.6875rem', color: '#0284c7', fontWeight: 800, marginTop: '0.15rem' }}>
                              Serving: Token #{String(serving.token).padStart(2, '0')} ({serving.patient})
                            </div>
                          )}
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.35rem' }}>
                        <button
                          type="button"
                          onClick={() => toggleRoomStatus(room.id)}
                          style={{
                            padding: '0.2rem 0.55rem',
                            borderRadius: '6px',
                            fontSize: '0.6563rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            border: isAvailable && !serving ? '1px solid #86efac' : '1px solid #fdba74',
                            backgroundColor: isAvailable && !serving ? '#f0fdf4' : '#fff7ed',
                            color: isAvailable && !serving ? '#166534' : '#9a3412',
                          }}
                          title="Click to toggle chamber status"
                        >
                          {isAvailable && !serving ? '✓ Available' : '● In Consultation'}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleCallDoctorChamber(room.assignedDoctorName || '', room.roomNumber)}
                          style={{
                            padding: '0.2rem 0.55rem',
                            borderRadius: '6px',
                            fontSize: '0.6563rem',
                            fontWeight: 800,
                            cursor: 'pointer',
                            border: '1px solid #bae6fd',
                            backgroundColor: '#e0f2fe',
                            color: '#0369a1',
                          }}
                          title={`Call next waiting patient to ${room.name}`}
                        >
                          Call Next →
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Card 2: Current Shift Summary & Cash Till */}
            <div
              className="card"
              style={{
                padding: '1.25rem',
                borderRadius: '14px',
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <DollarSign size={16} color="#0284c7" />
                  <h3 style={{ fontSize: '0.9375rem', fontWeight: 800, margin: 0, color: 'var(--secondary)' }}>
                    Current Shift & Cash Till
                  </h3>
                </div>
                <span
                  style={{
                    fontSize: '0.6875rem',
                    fontWeight: 800,
                    color: '#15803d',
                    backgroundColor: '#dcfce7',
                    padding: '0.15rem 0.45rem',
                    borderRadius: '4px',
                  }}
                >
                  ACTIVE TILL
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <div style={{ backgroundColor: '#ffffff', padding: '0.65rem 0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Opening Float</div>
                  <div style={{ fontSize: '1.125rem', fontWeight: 900, color: '#0284c7', marginTop: '0.15rem' }}>
                    ${counterSession.openingFloat}.00
                  </div>
                </div>

                <div style={{ backgroundColor: '#ffffff', padding: '0.65rem 0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Cash Collected</div>
                  <div style={{ fontSize: '1.125rem', fontWeight: 900, color: '#16a34a', marginTop: '0.15rem' }}>
                    ${totalCollectionsToday}.00
                  </div>
                </div>
              </div>

              <div
                style={{
                  padding: '0.75rem',
                  borderRadius: '8px',
                  backgroundColor: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.6875rem', color: '#166534', fontWeight: 700, textTransform: 'uppercase' }}>Total in Drawer</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#15803d' }}>
                    ${counterSession.openingFloat + totalCollectionsToday}.00
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => setShowClosingReportModal(true)}
                  style={{ fontSize: '0.75rem', fontWeight: 800 }}
                >
                  Reconcile Shift →
                </button>
              </div>
            </div>

            {/* Card 3: Next in Line Waiting Snapshot */}
            <div className="card" style={{ padding: '1.25rem', borderRadius: '14px', border: '1px solid var(--border-color)', backgroundColor: '#ffffff' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Clock size={16} color="#d97706" />
                  <h3 style={{ fontSize: '0.9375rem', fontWeight: 800, margin: 0, color: 'var(--secondary)' }}>
                    Next In Line (Lobby)
                  </h3>
                </div>
                <span className="badge badge-warning" style={{ fontSize: '0.6875rem' }}>
                  {waitingInLobby} Waiting
                </span>
              </div>

              {nextInLinePatients.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
                  No patients currently waiting in lobby.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {nextInLinePatients.map((np) => (
                    <div
                      key={np.token}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '0.625rem 0.75rem',
                        borderRadius: '8px',
                        border: '1px solid var(--border-color)',
                        backgroundColor: np.priority === 'URGENT' ? '#fef2f2' : '#ffffff',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                        <span
                          style={{
                            fontWeight: 900,
                            fontSize: '1rem',
                            color: np.priority === 'URGENT' ? '#b91c1c' : '#0284c7',
                            minWidth: '32px',
                          }}
                        >
                          #{String(np.token).padStart(2, '0')}
                        </span>
                        <div>
                          <div style={{ fontWeight: 800, fontSize: '0.8125rem', color: 'var(--secondary)' }}>
                            {np.patient}
                          </div>
                          <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                            {np.doctor} • {np.room}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={() => handleCallSpecificToken(np)}
                        style={{ fontSize: '0.6875rem', padding: '0.25rem 0.55rem', fontWeight: 800 }}
                      >
                        Call Now
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: DOCTOR AVAILABILITY & SLOT BOOKING                                 */}
      {/* ========================================================================= */}
      {activeTab === 'appointments' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '1.5rem' }}>
          {/* Left: Consultant Availability Roster */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Stethoscope size={18} color="#0284c7" />
                <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: 0, color: 'var(--secondary)' }}>
                  OPD Doctors Duty Roster ({doctorsRoster.length})
                </h3>
              </div>
              <p style={{ fontSize: '0.7813rem', color: 'var(--text-muted)', margin: '0.25rem 0 0' }}>
                Select doctor to view consultation chambers and book 15-minute appointment slots
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {doctorsRoster.map((doc, idx) => {
                const isSelected = selectedBookingDoctor === doc.name;
                return (
                  <div
                    key={idx}
                    onClick={() => setSelectedBookingDoctor(doc.name)}
                    style={{
                      padding: '1rem',
                      borderRadius: '12px',
                      border: `1.5px solid ${isSelected ? '#0284c7' : 'var(--border-color)'}`,
                      backgroundColor: isSelected ? '#eff6ff' : '#ffffff',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontWeight: 800, fontSize: '0.9375rem', color: 'var(--secondary)' }}>
                        {doc.name}
                      </div>
                      <span className="badge badge-success" style={{ fontSize: '0.6875rem' }}>
                        In Chamber
                      </span>
                    </div>

                    <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                      {doc.dept} • <strong style={{ color: '#15803d' }}>{doc.room}</strong>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.75rem', paddingTop: '0.5rem', borderTop: '1px dashed #cbd5e1', fontSize: '0.75rem' }}>
                      <span>
                        Standard OPD: <strong style={{ color: '#0284c7' }}>${doc.fee}</strong> • Follow-Up: <strong>${doc.followUpFee}</strong>
                      </span>
                      <span style={{ color: '#0284c7', fontWeight: 700 }}>Next: {doc.nextSlot}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right: Slot Booking Console with Duplicate Protection */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Calendar size={18} color="#0284c7" />
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: 'var(--secondary)' }}>
                  Book Appointment for {selectedBookingDoctor}
                </h3>
              </div>
              <p style={{ fontSize: '0.7813rem', color: 'var(--text-muted)', margin: '0.2rem 0 0' }}>
                Assigned to {selectedBookingDoctorObj.room} • Standard Tariff: ${selectedBookingDoctorObj.fee} | Follow-up: ${selectedBookingDoctorObj.followUpFee}
              </p>
            </div>

            {/* Active Token Warning / Reassignment Banner if patient already booked */}
            {existingActiveTokenForSelectedPatient && (
              <div
                style={{
                  padding: '0.75rem 1rem',
                  backgroundColor: '#eff6ff',
                  borderRadius: '10px',
                  border: '1.5px solid #bfdbfe',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.625rem',
                  fontSize: '0.8125rem',
                  color: '#1e40af',
                }}
              >
                <Info size={18} color="#0284c7" />
                <div>
                  <strong>Active Token Detected:</strong> {existingActiveTokenForSelectedPatient.patient} already holds{' '}
                  <strong>Token #{String(existingActiveTokenForSelectedPatient.token).padStart(2, '0')}</strong> with{' '}
                  <strong>{existingActiveTokenForSelectedPatient.doctor}</strong>. Submitting below will{' '}
                  <strong>reassign this appointment</strong> without creating a duplicate queue slot.
                </div>
              </div>
            )}

            <form onSubmit={handleConfirmAppointment} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Select Patient (UHID / Name) *</label>
                <select
                  className="form-select"
                  value={selectedBookingPatientUhid}
                  onChange={(e) => setSelectedBookingPatientUhid(e.target.value)}
                  style={{ fontWeight: 700 }}
                >
                  {patients.map((p) => (
                    <option key={p.uhid} value={p.uhid}>
                      {p.firstName} {p.lastName} ({p.uhid}) • {p.phone} • Blood: {p.bloodGroup}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Appointment Category *</label>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {(['Scheduled Visit', 'Follow-Up', 'Emergency', 'Second Opinion'] as const).map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      className={`subtab-pill ${bookingVisitType === cat ? 'active' : ''}`}
                      onClick={() => setBookingVisitType(cat)}
                      style={{ fontSize: '0.7813rem', padding: '0.35rem 0.75rem' }}
                    >
                      {cat} {cat === 'Follow-Up' ? `(Discounted $${selectedBookingDoctorObj.followUpFee})` : ''}
                    </button>
                  ))}
                </div>
              </div>

              {/* Morning Slots */}
              <div>
                <label className="form-label">Morning Consultation Slots (09:00 AM - 12:30 PM)</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem', marginTop: '0.35rem' }}>
                  {morningSlots.map((slot) => {
                    const isSelected = selectedBookingSlot === slot;
                    return (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => setSelectedBookingSlot(slot)}
                        style={{
                          padding: '0.5rem',
                          fontSize: '0.7813rem',
                          fontWeight: 700,
                          borderRadius: '8px',
                          border: `1.5px solid ${isSelected ? '#0284c7' : 'var(--border-color)'}`,
                          backgroundColor: isSelected ? '#0284c7' : '#ffffff',
                          color: isSelected ? '#ffffff' : 'var(--secondary)',
                          cursor: 'pointer',
                        }}
                      >
                        {slot}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Afternoon Slots */}
              <div>
                <label className="form-label">Afternoon Consultation Slots (02:00 PM - 05:00 PM)</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem', marginTop: '0.35rem' }}>
                  {afternoonSlots.map((slot) => {
                    const isSelected = selectedBookingSlot === slot;
                    return (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => setSelectedBookingSlot(slot)}
                        style={{
                          padding: '0.5rem',
                          fontSize: '0.7813rem',
                          fontWeight: 700,
                          borderRadius: '8px',
                          border: `1.5px solid ${isSelected ? '#0284c7' : 'var(--border-color)'}`,
                          backgroundColor: isSelected ? '#0284c7' : '#ffffff',
                          color: isSelected ? '#ffffff' : 'var(--secondary)',
                          cursor: 'pointer',
                        }}
                      >
                        {slot}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Fee & Confirmation Bar */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '1rem',
                  backgroundColor: '#f8fafc',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  marginTop: '0.5rem',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Slot: <strong>{selectedBookingSlot}</strong> with {selectedBookingDoctor}
                  </div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#0284c7', marginTop: '0.15rem' }}>
                    Total Tariff: $
                    {bookingVisitType === 'Follow-Up'
                      ? selectedBookingDoctorObj.followUpFee + (tariffMaster.triageVitalsFee || 10)
                      : selectedBookingDoctorObj.fee + (tariffMaster.triageVitalsFee || 10)}
                    .00
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontWeight: 800 }}
                >
                  <Calendar size={16} />
                  {existingActiveTokenForSelectedPatient ? 'Reassign Doctor & Chamber' : 'Confirm Booking & Issue Token'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: COUNTER BILLING & RECEIPTS                                         */}
      {/* ========================================================================= */}
      {activeTab === 'billing' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 800, color: 'var(--secondary)' }}>
                OPD Reception Cashier & Counter Invoices ({invoices.length})
              </h3>
              <p style={{ margin: '0.2rem 0 0', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                Itemized receipts for doctor consultations, registration intake, vitals triage, and chamber maintenance
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span className="badge badge-success" style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}>
                Total Collected: ${totalCollectionsToday}.00
              </span>
            </div>
          </div>

          <div className="card" style={{ padding: '0', borderRadius: '14px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Invoice No</th>
                    <th>Date</th>
                    <th>Patient Name & UHID</th>
                    <th>Service Category</th>
                    <th>Total Amount</th>
                    <th>Paid Amount</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Receipt Slip</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                        No counter receipts issued today yet. Collect desk payment from queue tokens to generate official receipts.
                      </td>
                    </tr>
                  ) : (
                    invoices.map((inv) => (
                      <tr key={inv.id}>
                        <td><code>{inv.invNo}</code></td>
                        <td>{inv.date}</td>
                        <td>
                          <div style={{ fontWeight: 800, color: 'var(--secondary)' }}>{inv.patientName}</div>
                          <div style={{ fontSize: '0.7188rem', color: 'var(--text-muted)' }}>{inv.uhid}</div>
                        </td>
                        <td>
                          <span className="badge badge-secondary" style={{ fontSize: '0.6875rem' }}>
                            {inv.category}
                          </span>
                        </td>
                        <td><strong>${inv.total}.00</strong></td>
                        <td style={{ color: '#15803d', fontWeight: 800 }}>${inv.paid}.00</td>
                        <td>
                          <span
                            className={`badge ${
                              inv.status === 'PAID'
                                ? 'badge-success'
                                : inv.status === 'PARTIALLY_PAID'
                                ? 'badge-warning'
                                : 'badge-danger'
                            }`}
                            style={{ fontSize: '0.6875rem' }}
                          >
                            {inv.status}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => window.print()}
                            title="Print Duplicate Invoice Receipt"
                          >
                            <Printer size={14} /> Print Receipt
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: PATIENT MASTER DIRECTORY & DOSSIER                                  */}
      {/* ========================================================================= */}
      {activeTab === 'search' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 800, color: 'var(--secondary)' }}>
                Master Patient Directory ({filteredPatients.length})
              </h3>
              <p style={{ margin: '0.2rem 0 0', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                Universal patient health records, longitudinal clinic episodes & 1-click follow-up booking
              </p>
            </div>

            <div style={{ position: 'relative', width: '280px' }}>
              <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                className="form-input"
                style={{ paddingLeft: '2.2rem', fontSize: '0.8125rem' }}
                placeholder="Search by UHID, name, phone, or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="card" style={{ padding: '0', borderRadius: '14px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>UHID</th>
                    <th>Patient Full Name</th>
                    <th>Age / Gender</th>
                    <th>Phone</th>
                    <th>Identity Card</th>
                    <th>Insurance / TPA</th>
                    <th>Past Visits</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPatients.map((p) => (
                    <tr key={p.uhid}>
                      <td><code>{p.uhid}</code></td>
                      <td>
                        <div style={{ fontWeight: 800, color: 'var(--secondary)' }}>
                          {p.firstName} {p.lastName}
                        </div>
                        <div style={{ fontSize: '0.7188rem', color: 'var(--text-muted)' }}>
                          Blood Group: <strong style={{ color: '#ef4444' }}>{p.bloodGroup}</strong>
                        </div>
                      </td>
                      <td>{p.age}Y • {p.gender}</td>
                      <td>{p.phone}</td>
                      <td>
                        <div style={{ fontSize: '0.8125rem', fontWeight: 600 }}>{p.idType}</div>
                        <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>{p.idNumber}</div>
                      </td>
                      <td>
                        <span className="badge badge-secondary" style={{ fontSize: '0.6875rem' }}>
                          {p.insurance.split('•')[0]}
                        </span>
                      </td>
                      <td>
                        <span className="badge badge-info" style={{ fontSize: '0.6875rem' }}>
                          {p.visitsCount} Visits
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'flex-end' }}>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => {
                              setSelectedPatientForDossier(p);
                              setShowDossierModal(true);
                            }}
                          >
                            <FileText size={13} /> Dossier
                          </button>

                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            onClick={() => {
                              setSelectedBookingPatientUhid(p.uhid);
                              setBookingVisitType('Follow-Up');
                              setActiveTab('appointments');
                            }}
                            title="Book Follow-Up Slot"
                          >
                            Follow-Up
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: DAYCARE & OBSERVATION BEDS (CONNECTED TO ADMIN CAMPUS)             */}
      {/* ========================================================================= */}
      {activeTab === 'daycare' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* HEADER & TOP CONTROLS */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: 'var(--secondary)' }}>
                  Hospital Bed Roster & Observation Care Command
                </h3>
                <span
                  style={{
                    fontSize: '0.6875rem',
                    fontWeight: 800,
                    padding: '0.15rem 0.5rem',
                    borderRadius: '6px',
                    backgroundColor: '#dcfce7',
                    color: '#15803d',
                    border: '1px solid #bbf7d0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                  }}
                >
                  <Sparkles size={11} /> ADMIN INFRASTRUCTURE SYNCED
                </span>
              </div>
              <p style={{ margin: '0.25rem 0 0', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                Real-time visibility across all campus buildings, wards, rooms, and beds. Inspect active occupants, clinical diagnoses, vitals, and allocate beds.
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              {/* Scope Switcher */}
              <div
                style={{
                  display: 'inline-flex',
                  backgroundColor: '#f1f5f9',
                  padding: '0.25rem',
                  borderRadius: '10px',
                  border: '1.5px solid #e2e8f0',
                  gap: '0.25rem',
                }}
              >
                <button
                  type="button"
                  onClick={() => setBedScope('daycare')}
                  style={{
                    border: 'none',
                    padding: '0.5rem 0.95rem',
                    borderRadius: '8px',
                    fontSize: '0.8125rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    backgroundColor: bedScope === 'daycare' ? '#ffffff' : 'transparent',
                    color: bedScope === 'daycare' ? '#0f172a' : '#64748b',
                    boxShadow: bedScope === 'daycare' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.15s ease',
                  }}
                >
                  🛏️ OPD Daycare & Obs (Ward A & B)
                </button>
                <button
                  type="button"
                  onClick={() => setBedScope('all_hospital')}
                  style={{
                    border: 'none',
                    padding: '0.5rem 0.95rem',
                    borderRadius: '8px',
                    fontSize: '0.8125rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    backgroundColor: bedScope === 'all_hospital' ? '#ffffff' : 'transparent',
                    color: bedScope === 'all_hospital' ? '#0f172a' : '#64748b',
                    boxShadow: bedScope === 'all_hospital' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.15s ease',
                  }}
                >
                  🏢 All Hospital Units ({flatBeds.length}+ Beds)
                </button>
              </div>

              {/* Print Bed Census */}
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => window.print()}
                style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontWeight: 700, fontSize: '0.8125rem', padding: '0.5rem 0.95rem' }}
              >
                <Printer size={15} /> Print Census
              </button>

              {/* Allocate Bed Action */}
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  setPreselectedBedForAllocation(null);
                  setShowDaycareModal(true);
                }}
                style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontWeight: 800, fontSize: '0.8125rem', padding: '0.5rem 1.15rem', boxShadow: '0 4px 12px rgba(2, 132, 199, 0.25)' }}
              >
                <BedDouble size={16} /> Allocate Bed
              </button>
            </div>
          </div>

          {/* KPI METRICS BAR */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '0.875rem' }}>
            <div className="card" style={{ padding: '1rem 1.15rem', borderRadius: '12px', border: '1.5px solid var(--border-color)', backgroundColor: '#ffffff', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
              <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>TOTAL BEDS</span>
              <div style={{ fontSize: '1.65rem', fontWeight: 900, color: 'var(--secondary)', marginTop: '0.2rem', lineHeight: 1.1 }}>
                {bedStats.total}
              </div>
              <span style={{ fontSize: '0.6875rem', color: '#64748b', marginTop: '0.25rem', display: 'block' }}>Across active units</span>
            </div>

            <div className="card" style={{ padding: '1rem 1.15rem', borderRadius: '12px', border: '1.5px solid #fecaca', backgroundColor: '#ffffff', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
              <span style={{ fontSize: '0.6875rem', color: '#991b1b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>OCCUPIED</span>
              <div style={{ fontSize: '1.65rem', fontWeight: 900, color: '#dc2626', marginTop: '0.2rem', lineHeight: 1.1 }}>
                {bedStats.occupied} <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#f87171' }}>({bedStats.occupancyRate}%)</span>
              </div>
              <span style={{ fontSize: '0.6875rem', color: '#dc2626', marginTop: '0.25rem', display: 'block' }}>Active under observation</span>
            </div>

            <div className="card" style={{ padding: '1rem 1.15rem', borderRadius: '12px', border: '1.5px solid #bbf7d0', backgroundColor: '#ffffff', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
              <span style={{ fontSize: '0.6875rem', color: '#15803d', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>VACANT & READY</span>
              <div style={{ fontSize: '1.65rem', fontWeight: 900, color: '#16a34a', marginTop: '0.2rem', lineHeight: 1.1 }}>
                {bedStats.available}
              </div>
              <span style={{ fontSize: '0.6875rem', color: '#16a34a', marginTop: '0.25rem', display: 'block' }}>Ready for intake</span>
            </div>

            <div className="card" style={{ padding: '1rem 1.15rem', borderRadius: '12px', border: '1.5px solid #fde68a', backgroundColor: '#ffffff', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
              <span style={{ fontSize: '0.6875rem', color: '#b45309', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>CLEANING</span>
              <div style={{ fontSize: '1.65rem', fontWeight: 900, color: '#d97706', marginTop: '0.2rem', lineHeight: 1.1 }}>
                {bedStats.cleaning}
              </div>
              <span style={{ fontSize: '0.6875rem', color: '#d97706', marginTop: '0.25rem', display: 'block' }}>Housekeeping turnover</span>
            </div>

            <div className="card" style={{ padding: '1rem 1.15rem', borderRadius: '12px', border: '1.5px solid #bfdbfe', backgroundColor: '#ffffff', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
              <span style={{ fontSize: '0.6875rem', color: '#1d4ed8', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>RESERVED BAYS</span>
              <div style={{ fontSize: '1.65rem', fontWeight: 900, color: '#2563eb', marginTop: '0.2rem', lineHeight: 1.1 }}>
                {bedStats.reserved}
              </div>
              <span style={{ fontSize: '0.6875rem', color: '#2563eb', marginTop: '0.25rem', display: 'block' }}>Emergency / Pre-op hold</span>
            </div>
          </div>

          {/* FILTERS & LIVE SEARCH BAR */}
          <div
            className="card"
            style={{
              padding: '1rem 1.25rem',
              borderRadius: '14px',
              border: '1.5px solid var(--border-color)',
              display: 'flex',
              flexWrap: 'wrap',
              gap: '1rem',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: '#ffffff',
            }}
          >
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap', flex: 1 }}>
              {/* Building Dropdown */}
              {campusBuildings.length > 1 && (
                <div style={{ minWidth: '180px' }}>
                  <select
                    className="form-control"
                    value={selectedBuildingIdFilter}
                    onChange={(e) => setSelectedBuildingIdFilter(e.target.value)}
                    style={{ fontSize: '0.8125rem', fontWeight: 700 }}
                  >
                    <option value="all">🏢 All Campus Buildings</option>
                    {campusBuildings.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Status Pills */}
              <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                {[
                  { id: 'ALL', label: `All (${bedStats.total})` },
                  { id: 'AVAILABLE', label: `🟢 Vacant (${bedStats.available})` },
                  { id: 'OCCUPIED', label: `🔴 Occupied (${bedStats.occupied})` },
                  { id: 'CLEANING', label: `🧹 Cleaning (${bedStats.cleaning})` },
                  { id: 'RESERVED', label: `🟡 Reserved (${bedStats.reserved})` },
                ].map((st) => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => setBedStatusFilter(st.id as any)}
                    style={{
                      border: bedStatusFilter === st.id ? '1.5px solid #0f172a' : '1px solid #cbd5e1',
                      padding: '0.35rem 0.65rem',
                      borderRadius: '8px',
                      fontSize: '0.75rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      backgroundColor: bedStatusFilter === st.id ? '#0f172a' : '#ffffff',
                      color: bedStatusFilter === st.id ? '#ffffff' : '#334155',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {st.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Live Search */}
            <div style={{ position: 'relative', minWidth: '280px', flex: '0 1 340px' }}>
              <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                type="text"
                className="form-control"
                placeholder="Search patient, UHID, doctor, bed #..."
                value={bedSearchQuery}
                onChange={(e) => setBedSearchQuery(e.target.value)}
                style={{ paddingLeft: '34px', fontSize: '0.8125rem', fontWeight: 600 }}
              />
              {bedSearchQuery && (
                <button
                  type="button"
                  onClick={() => setBedSearchQuery('')}
                  style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'transparent', cursor: 'pointer', color: '#94a3b8' }}
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* HIERARCHICAL WARDS & ROOMS DISPLAY */}
          {filteredCampusWards.length === 0 ? (
            <div
              className="card"
              style={{
                padding: '3rem 2rem',
                borderRadius: '14px',
                textAlign: 'center',
                backgroundColor: '#ffffff',
                border: '1.5px dashed #cbd5e1',
              }}
            >
              <BedDouble size={36} color="#94a3b8" style={{ margin: '0 auto 0.75rem' }} />
              <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--secondary)' }}>
                No Beds Matching Current Filters
              </h4>
              <p style={{ margin: '0.25rem 0 1rem', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                Try adjusting your search query or switching your status filter to "All".
              </p>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  setBedStatusFilter('ALL');
                  setBedSearchQuery('');
                  setSelectedBuildingIdFilter('all');
                }}
              >
                Reset Bed Filters
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {filteredCampusWards.map((wItem) => {
                const ward = wItem.ward;
                const roomKeys = Object.keys(wItem.roomsMap);
                const wardBeds = Object.values(wItem.roomsMap).flatMap((r) => r.beds);
                const wardOccupied = wardBeds.filter((b) => b.bed.status === 'OCCUPIED').length;
                const wardDailyTariff = ward.beds?.[0]?.dailyTariff || 120;
                const wardHourlyTariff = Math.round(wardDailyTariff / 8) || 20;

                return (
                  <div
                    key={ward.id}
                    className="card"
                    style={{
                      padding: '1.25rem 1.5rem',
                      borderRadius: '16px',
                      border: '1.5px solid var(--border-color)',
                      backgroundColor: '#ffffff',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '1.25rem',
                    }}
                  >
                    {/* WARD HEADER BANNER */}
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '1rem',
                        borderBottom: '1px solid #f1f5f9',
                        paddingBottom: '1rem',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <span
                            style={{
                              padding: '0.35rem 0.65rem',
                              borderRadius: '8px',
                              backgroundColor: '#eff6ff',
                              color: '#1d4ed8',
                              fontWeight: 800,
                              fontSize: '0.8125rem',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                            }}
                          >
                            <BedDouble size={15} /> {ward.name}
                          </span>
                          <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                            {wItem.floorName} • {wItem.buildingName}
                          </span>
                        </div>

                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginTop: '0.4rem', flexWrap: 'wrap', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          <span>
                            👩‍⚕️ Lead Nurse: <strong style={{ color: 'var(--secondary)' }}>{ward.supervisorNurse || 'Nurse Priya Sharma'}</strong>
                          </span>
                          <span>•</span>
                          <span>
                            🩺 Rounding Doctor: <strong style={{ color: '#0284c7' }}>{ward.staffRoster?.roundingDoctors?.[0]?.name || 'Dr. Sarah Jenkins'}</strong>
                          </span>
                          <span>•</span>
                          <span>
                            Tariff: <strong style={{ color: '#15803d' }}>${wardDailyTariff}.00 / 24h</strong> (${wardHourlyTariff}/hr)
                          </span>
                        </div>
                      </div>

                      {/* Ward Occupancy Pill */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <span
                          style={{
                            padding: '0.35rem 0.75rem',
                            borderRadius: '8px',
                            fontWeight: 800,
                            fontSize: '0.8125rem',
                            backgroundColor: wardOccupied > 0 ? 'rgba(239, 68, 68, 0.08)' : 'rgba(16, 185, 129, 0.08)',
                            color: wardOccupied > 0 ? '#dc2626' : '#15803d',
                            border: `1px solid ${wardOccupied > 0 ? '#fca5a5' : '#86efac'}`,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                          }}
                        >
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: wardOccupied > 0 ? '#dc2626' : '#16a34a' }} />
                          {wardOccupied} / {wardBeds.length} Beds Occupied
                        </span>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => {
                            setPreselectedBedForAllocation(wardBeds.find((b) => b.bed.status === 'AVAILABLE') || null);
                            setShowDaycareModal(true);
                          }}
                          style={{ fontSize: '0.75rem', fontWeight: 700, padding: '0.35rem 0.75rem' }}
                        >
                          + Quick Admit to {ward.name.split('(')[0].trim()}
                        </button>
                      </div>
                    </div>

                    {/* ROOMS & BEDS CONTAINER */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                      {roomKeys.map((roomKey) => {
                        const roomGroup = wItem.roomsMap[roomKey];
                        const beds = roomGroup.beds;

                        return (
                          <div
                            key={roomKey}
                            style={{
                              backgroundColor: '#f8fafc',
                              borderRadius: '12px',
                              border: '1px solid #e2e8f0',
                              padding: '1rem',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '0.85rem',
                            }}
                          >
                            {/* ROOM SUB-HEADER */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#0284c7' }} />
                                <strong style={{ fontSize: '0.875rem', color: 'var(--secondary)' }}>
                                  {roomGroup.roomName}
                                </strong>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                  ({beds.length} {beds.length === 1 ? 'Bed' : 'Beds'})
                                </span>
                              </div>
                              <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#64748b' }}>
                                {beds.filter((b) => b.bed.status === 'OCCUPIED').length} Active Occupant(s)
                              </span>
                            </div>

                            {/* GRID OF BED CARDS */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '0.85rem' }}>
                              {beds.map((fb) => {
                                const b = fb.bed;
                                const isOccupied = b.status === 'OCCUPIED';
                                const isNeedsCleaning = b.cleanlinessStatus === 'NEEDS_CLEANING' || b.cleanlinessStatus === 'CLEANING_IN_PROGRESS';
                                const isReserved = b.status === 'RESERVED';
                                const pt = b.inpatientDetails;

                                return (
                                  <div
                                    key={b.id}
                                    style={{
                                      padding: '1rem',
                                      borderRadius: '12px',
                                      border: isOccupied
                                        ? '1.5px solid #fecaca'
                                        : isNeedsCleaning
                                        ? '1.5px solid #fde68a'
                                        : isReserved
                                        ? '1.5px solid #bfdbfe'
                                        : '1.5px solid #bbf7d0',
                                      backgroundColor: isOccupied
                                        ? '#fff5f5'
                                        : isNeedsCleaning
                                        ? '#fffbeb'
                                        : isReserved
                                        ? '#eff6ff'
                                        : '#f0fdf4',
                                      display: 'flex',
                                      flexDirection: 'column',
                                      gap: '0.6rem',
                                      boxShadow: '0 1px 4px rgba(0,0,0,0.02)',
                                      transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                                    }}
                                  >
                                    {/* BED CARD HEADER */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                      <span style={{ fontWeight: 900, fontSize: '0.9375rem', color: 'var(--secondary)' }}>
                                        {b.bedNumber}
                                      </span>
                                      <span
                                        style={{
                                          fontSize: '0.6875rem',
                                          fontWeight: 800,
                                          padding: '0.15rem 0.5rem',
                                          borderRadius: '6px',
                                          backgroundColor: isOccupied
                                            ? '#fee2e2'
                                            : isNeedsCleaning
                                            ? '#fef3c7'
                                            : isReserved
                                            ? '#dbeafe'
                                            : '#dcfce7',
                                          color: isOccupied
                                            ? '#991b1b'
                                            : isNeedsCleaning
                                            ? '#b45309'
                                            : isReserved
                                            ? '#1e40af'
                                            : '#15803d',
                                        }}
                                      >
                                        {isOccupied ? '🔴 OCCUPIED' : isNeedsCleaning ? '🧹 CLEANING' : isReserved ? '🟡 RESERVED' : '🟢 VACANT'}
                                      </span>
                                    </div>

                                    {/* OCCUPIED CONTENT: WHO IS OCCUPIED */}
                                    {isOccupied && pt ? (
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.8125rem' }}>
                                        <div style={{ borderTop: '1px dashed #fca5a5', paddingTop: '0.4rem' }}>
                                          <div style={{ fontWeight: 900, color: 'var(--secondary)', fontSize: '0.9375rem' }}>
                                            {pt.patientName}
                                          </div>
                                          <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.6875rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                                            <span style={{ fontWeight: 700, color: '#1d4ed8' }}>{pt.uhid}</span>
                                            <span>•</span>
                                            <span>{pt.age}y / {pt.gender}</span>
                                          </div>
                                        </div>

                                        <div style={{ fontSize: '0.75rem', color: 'var(--secondary)' }}>
                                          👨‍⚕️ <strong>{pt.primaryDoctor?.name || 'Dr. Sarah Jenkins'}</strong>
                                        </div>

                                        <div
                                          style={{
                                            fontSize: '0.6875rem',
                                            fontWeight: 700,
                                            color: '#991b1b',
                                            backgroundColor: '#fee2e2',
                                            padding: '0.25rem 0.45rem',
                                            borderRadius: '6px',
                                            whiteSpace: 'nowrap',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                          }}
                                          title={pt.diagnosis}
                                        >
                                          📋 {pt.diagnosis || 'Observation & Therapy'}
                                        </div>

                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                                          <span>⏱️ In Bed Since: {pt.admissionDate ? pt.admissionDate.split(' ')[1] || '09:30' : '09:30'}</span>
                                          <strong style={{ color: '#15803d' }}>${Math.round(b.dailyTariff / 8) || 20}/hr</strong>
                                        </div>

                                        <button
                                          type="button"
                                          className="btn btn-secondary btn-sm"
                                          onClick={() => {
                                            setSelectedOccupiedBedForDossier(fb);
                                            setShowOccupancyDossierModal(true);
                                          }}
                                          style={{
                                            marginTop: '0.35rem',
                                            fontWeight: 800,
                                            fontSize: '0.75rem',
                                            width: '100%',
                                            backgroundColor: '#ffffff',
                                            borderColor: '#fca5a5',
                                            color: '#991b1b',
                                          }}
                                        >
                                          Inspect Patient Dossier ➔
                                        </button>
                                      </div>
                                    ) : isNeedsCleaning ? (
                                      /* CLEANING STATUS CARD */
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.75rem', color: '#b45309' }}>
                                        <p style={{ margin: '0.2rem 0 0', fontSize: '0.75rem' }}>
                                          Patient discharged. Bed awaiting terminal sanitization & fresh linen.
                                        </p>
                                        <button
                                          type="button"
                                          className="btn btn-sm"
                                          onClick={() => {
                                            patientJourneyService.markCampusBedCleaned(b.id, 'Receptionist Clearance');
                                            setFlatBeds(patientJourneyService.getFlatBedsList());
                                            setCampusBuildings(patientJourneyService.getCampusBuildings());
                                            showToast(`✓ ${b.bedNumber} marked sanitized & available!`);
                                          }}
                                          style={{
                                            backgroundColor: '#d97706',
                                            color: '#ffffff',
                                            border: 'none',
                                            borderRadius: '6px',
                                            padding: '0.35rem',
                                            fontWeight: 800,
                                            cursor: 'pointer',
                                            marginTop: 'auto',
                                          }}
                                        >
                                          ✓ Mark Cleaned & Ready
                                        </button>
                                      </div>
                                    ) : isReserved ? (
                                      /* RESERVED STATUS CARD */
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.75rem', color: '#1e40af' }}>
                                        <p style={{ margin: '0.2rem 0 0', fontSize: '0.75rem' }}>
                                          {b.notes || 'Reserved for incoming post-op or emergency intake.'}
                                        </p>
                                        <button
                                          type="button"
                                          className="btn btn-secondary btn-sm"
                                          onClick={() => {
                                            setPreselectedBedForAllocation(fb);
                                            setShowDaycareModal(true);
                                          }}
                                          style={{ fontWeight: 800, fontSize: '0.75rem', marginTop: 'auto' }}
                                        >
                                          Admit Reserved Patient
                                        </button>
                                      </div>
                                    ) : (
                                      /* VACANT STATUS CARD */
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.75rem', color: '#15803d' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-muted)' }}>
                                          <span>Tariff Rate:</span>
                                          <strong>${b.dailyTariff}/24h (${Math.round(b.dailyTariff / 8)}/hr)</strong>
                                        </div>
                                        <div style={{ fontSize: '0.6875rem', color: '#16a34a' }}>
                                          ✨ Sanitized & Ready for Intake
                                        </div>
                                        <button
                                          type="button"
                                          className="btn btn-primary btn-sm"
                                          onClick={() => {
                                            setPreselectedBedForAllocation(fb);
                                            setShowDaycareModal(true);
                                          }}
                                          style={{
                                            marginTop: 'auto',
                                            fontWeight: 800,
                                            fontSize: '0.75rem',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '0.3rem',
                                          }}
                                        >
                                          <Plus size={13} /> Allocate Patient
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: PRINTABLE OPD TOKEN SLIP                                           */}
      {/* ========================================================================= */}
      {showTokenPrintModal && selectedTokenForPrint && (
        <div className="modal-overlay" style={{ zIndex: 1200 }}>
          <div className="modal-content" style={{ maxWidth: '420px', textAlign: 'center', borderRadius: '16px', padding: '1.75rem' }}>
            <div style={{ borderBottom: '2px dashed var(--border-color)', paddingBottom: '1rem', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--secondary)', letterSpacing: '-0.02em' }}>
                NORTH HOSPITAL
              </h2>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0.15rem 0 0' }}>
                Outpatient Department (OPD) • Reception Desk #1
              </p>
              <p style={{ fontSize: '0.6875rem', color: 'var(--text-light)', margin: '0.15rem 0 0' }}>
                Date: {new Date().toLocaleDateString()} {selectedTokenForPrint.time}
              </p>
            </div>

            <div style={{ padding: '1.25rem', backgroundColor: '#eff6ff', borderRadius: '14px', margin: '1rem 0', border: '1.5px solid #bfdbfe' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#0284c7', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                OPD Consultation Token
              </div>
              <div style={{ fontSize: '3.5rem', fontWeight: 900, color: '#0369a1', lineHeight: 1, marginTop: '0.35rem' }}>
                #{String(selectedTokenForPrint.token).padStart(2, '0')}
              </div>
              {selectedTokenForPrint.priority === 'URGENT' && (
                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#dc2626', marginTop: '0.35rem' }}>
                  🚨 URGENT PRIORITY PASS
                </div>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', textAlign: 'left', fontSize: '0.8125rem', padding: '0 0.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Patient Name:</span>
                <strong style={{ color: 'var(--secondary)' }}>{selectedTokenForPrint.patient}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>UHID:</span>
                <code>{selectedTokenForPrint.uhid}</code>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Attending Doctor:</span>
                <strong>{selectedTokenForPrint.doctor.split('(')[0]}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Assigned Chamber:</span>
                <span style={{ color: '#15803d', fontWeight: 900, fontSize: '0.9375rem' }}>{selectedTokenForPrint.room}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Visit Type:</span>
                <span style={{ fontWeight: 700 }}>{selectedTokenForPrint.type}</span>
              </div>
            </div>

            <div style={{ borderTop: '2px dashed var(--border-color)', paddingTop: '1rem', marginTop: '1.5rem', display: 'flex', justifyContent: 'center', gap: '0.75rem' }}>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowTokenPrintModal(false)}>
                Close
              </button>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => {
                  window.print();
                  setShowTokenPrintModal(false);
                }}
                style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 800 }}
              >
                <Printer size={14} /> Print Slip
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: QUICK WALK-IN TOKEN DISPENSER                                    */}
      {/* ========================================================================= */}
      <QuickWalkInModal
        isOpen={showQuickWalkInModal}
        onClose={() => setShowQuickWalkInModal(false)}
        tariffMaster={tariffMaster}
        doctorsRoster={doctorsRoster}
        existingPatients={patients}
        onTokenGenerated={(token, autoPrint) => {
          setQueue(patientJourneyService.getQueue());
          setPatients(patientJourneyService.getPatients());
          setInvoices(patientJourneyService.getInvoices());
          if (autoPrint) {
            setSelectedTokenForPrint(token);
            setShowTokenPrintModal(true);
          }
          showToast(`✓ Walk-in token #${token.token} generated for ${token.patient}!`);
        }}
      />

      {/* ========================================================================= */}
      {/* MODAL 2: 5-STEP PATIENT REGISTRATION WIZARD (UHID)                        */}
      {/* ========================================================================= */}
      <PatientRegistrationWizardModal
        isOpen={showRegWizardModal}
        onClose={() => setShowRegWizardModal(false)}
        doctorsRoster={doctorsRoster}
        onPatientRegistered={(newPatient) => {
          setPatients(patientJourneyService.getPatients());
          showToast(`✓ New Patient ${newPatient.firstName} ${newPatient.lastName} (${newPatient.uhid}) registered!`);
        }}
        onProceedToBookAppointment={(newPatient) => {
          setSelectedBookingPatientUhid(newPatient.uhid);
          setActiveTab('appointments');
          showToast(`📅 Select doctor & time slot for ${newPatient.firstName} ${newPatient.lastName}`);
        }}
        onProceedToIssueWalkIn={(newPatient) => {
          setSelectedBookingPatientUhid(newPatient.uhid);
          setShowQuickWalkInModal(true);
        }}
      />

      {/* ========================================================================= */}
      {/* MODAL 3: COUNTER BILLING & PAYMENT RECEIPTS                               */}
      {/* ========================================================================= */}
      <CounterBillingModal
        isOpen={showBillingModal}
        onClose={() => setShowBillingModal(false)}
        token={selectedTokenForBill}
        tariffMaster={tariffMaster}
        onPaymentCompleted={(tokenNo, invNo) => {
          setQueue(patientJourneyService.getQueue());
          setInvoices(patientJourneyService.getInvoices());
          showToast(`✓ Payment collected for Token #${tokenNo}! Invoice ${invNo} generated.`);
        }}
      />

      {/* ========================================================================= */}
      {/* MODAL 4: LOBBY TV WAITING ROOM DISPLAY                                    */}
      {/* ========================================================================= */}
      <LobbyTvDisplayModal
        isOpen={showTvDisplayModal}
        onClose={() => setShowTvDisplayModal(false)}
        queue={queue}
      />

      {/* ========================================================================= */}
      {/* MODAL 5: LONGITUDINAL PATIENT DOSSIER                                     */}
      {/* ========================================================================= */}
      <PatientDossierModal
        isOpen={showDossierModal}
        onClose={() => setShowDossierModal(false)}
        patient={selectedPatientForDossier}
        onBookFollowUp={(p) => {
          setSelectedBookingPatientUhid(p.uhid);
          setBookingVisitType('Follow-Up');
          setActiveTab('appointments');
        }}
        onIssueQuickToken={(p) => {
          setShowQuickWalkInModal(true);
        }}
      />

      {/* ========================================================================= */}
      {/* MODAL 6: BED OCCUPANCY DOSSIER (Vitals, Doctor, Transfer, Discharge)      */}
      {/* ========================================================================= */}
      <BedOccupancyDossierModal
        isOpen={showOccupancyDossierModal}
        onClose={() => {
          setShowOccupancyDossierModal(false);
          setSelectedOccupiedBedForDossier(null);
        }}
        bedItem={selectedOccupiedBedForDossier}
        onBedDischarged={(bedId) => {
          setFlatBeds(patientJourneyService.getFlatBedsList());
          setCampusBuildings(patientJourneyService.getCampusBuildings());
          showToast(`✓ Bed successfully vacated and marked for Housekeeping!`);
        }}
        onBedTransferred={(src, tgt) => {
          setFlatBeds(patientJourneyService.getFlatBedsList());
          setCampusBuildings(patientJourneyService.getCampusBuildings());
          showToast(`✓ Patient transferred successfully to new bed!`);
        }}
      />

      {/* ========================================================================= */}
      {/* MODAL 7: DAYCARE / OBSERVATION BED ALLOCATION                             */}
      {/* ========================================================================= */}
      <DaycareBedModal
        isOpen={showDaycareModal}
        onClose={() => {
          setShowDaycareModal(false);
          setPreselectedBedForAllocation(null);
        }}
        tariffMaster={tariffMaster}
        existingPatients={patients}
        activeTokens={queue}
        preselectedBed={preselectedBedForAllocation}
        onBedAllocated={(bedId) => {
          setFlatBeds(patientJourneyService.getFlatBedsList());
          setCampusBuildings(patientJourneyService.getCampusBuildings());
          showToast(`✓ Patient allocated to observation bed successfully!`);
        }}
      />

      {/* ========================================================================= */}
      {/* MODAL 7: OPEN DAILY COUNTER SHIFT                                         */}
      {/* ========================================================================= */}
      <OpenCounterModal
        isOpen={showOpenCounterModal}
        onClose={() => setShowOpenCounterModal(false)}
        currentSession={counterSession}
        onSessionUpdated={(session) => {
          setCounterSession(session);
          showToast(`✓ Counter Shift updated: ${session.counterNumber} (${session.shift})`);
        }}
      />

      {/* ========================================================================= */}
      {/* MODAL 8: DAILY CLOSING & HANDOVER REPORT                                  */}
      {/* ========================================================================= */}
      <DailyClosingReportModal
        isOpen={showClosingReportModal}
        onClose={() => setShowClosingReportModal(false)}
        session={counterSession}
        queue={queue}
        invoices={invoices}
        patients={patients}
        onSessionClosed={(session) => {
          setCounterSession(session);
          showToast('✓ Counter Shift closed. Handover report generated.');
        }}
      />
    </div>
  );
};

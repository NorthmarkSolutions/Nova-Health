import React, { useState, useEffect } from 'react';
import {
  Building2,
  Building,
  Layers,
  DoorClosed,
  BedDouble,
  SlidersHorizontal,
  Plus,
  Trash2,
  Edit2,
  ChevronDown,
  ChevronRight,
  CheckCircle,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Search,
  Activity,
  DollarSign,
  Shield,
  X,
  Clock,
  User,
} from 'lucide-react';

export interface BedNode {
  id: string;
  bedNumber: string;
  bedType: 'Standard Ward Bed' | 'Motorized ICU Ventilator' | 'Semi-Fowler' | 'Deluxe Suite' | 'Pediatric Crib' | 'Emergency Stretcher';
  dailyTariff: number;
  status: 'AVAILABLE' | 'OCCUPIED' | 'RESERVED' | 'MAINTENANCE';
  currentPatientName?: string;
  uhid?: string;
  notes?: string;
}

export interface RoomNode {
  id: string;
  roomNumber: string;
  roomType: 'Consultation Room' | 'Procedure Room' | 'Doctor Chamber' | 'Private Inpatient Room' | 'OT Suite' | 'Daycare Unit';
  capacity: number;
  departmentName?: string;
  status: 'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE';
}

export interface WardNode {
  id: string;
  name: string;
  wardType: 'General Ward' | 'ICU Ward' | 'NICU Ward' | 'Pediatric Ward' | 'Male Ward' | 'Female Ward' | 'Maternity Ward' | 'Isolation Ward' | 'VIP Suite Ward';
  supervisorNurse: string;
  nursingStation: string;
  departmentName?: string;
  beds: BedNode[];
}

export interface FloorNode {
  id: string;
  floorNumber: string;
  code: string;
  wing: string;
  accessZone: string;
  rooms: RoomNode[];
  wards: WardNode[];
}

export interface BuildingNode {
  id: string;
  code: string;
  name: string;
  buildingType: 'Clinical Inpatient Tower' | 'Emergency & Trauma Center' | 'Diagnostic & Oncology Pavilion' | 'Administration & Support';
  fireZone: string;
  utilities: string;
  floors: FloorNode[];
}

export const CampusInfrastructureSection: React.FC = () => {
  // Pre-seeded 240-bed campus template
  const defaultCampusTemplate: BuildingNode[] = [
    {
      id: 'bld-1',
      code: 'BLD-MAIN',
      name: 'Main Clinical Hospital Tower',
      buildingType: 'Clinical Inpatient Tower',
      fireZone: 'Zone A & B (Smoke Detectors + Wet Risers)',
      utilities: 'Dual Substation (500kVA DG Backup), Central O2 Manifold',
      floors: [
        {
          id: 'fl-1-0',
          floorNumber: 'Ground Floor (Level 0)',
          code: 'FL-0',
          wing: 'Public Reception & Ambulatory Care',
          accessZone: 'Public Open Access',
          rooms: [
            { id: 'rm-101', roomNumber: 'OPD-101', roomType: 'Consultation Room', capacity: 1, departmentName: 'General Medicine', status: 'AVAILABLE' },
            { id: 'rm-102', roomNumber: 'OPD-102', roomType: 'Consultation Room', capacity: 1, departmentName: 'Cardiology', status: 'OCCUPIED' },
            { id: 'rm-103', roomNumber: 'OPD-103', roomType: 'Consultation Room', capacity: 1, departmentName: 'Orthopedics', status: 'AVAILABLE' },
            { id: 'rm-104', roomNumber: 'TRIAGE-01', roomType: 'Procedure Room', capacity: 2, departmentName: 'Emergency & Trauma', status: 'AVAILABLE' },
          ],
          wards: [
            {
              id: 'wd-0-1',
              name: 'Emergency Observation Unit',
              wardType: 'General Ward',
              supervisorNurse: 'Sister Clara Oswald, RN',
              nursingStation: 'Station 0-A',
              departmentName: 'Emergency & Trauma (ER)',
              beds: [
                { id: 'b-0-1', bedNumber: 'ER-OBS-01', bedType: 'Emergency Stretcher', dailyTariff: 180, status: 'OCCUPIED', currentPatientName: 'James Sullivan', uhid: 'UHID-1049' },
                { id: 'b-0-2', bedNumber: 'ER-OBS-02', bedType: 'Emergency Stretcher', dailyTariff: 180, status: 'AVAILABLE' },
                { id: 'b-0-3', bedNumber: 'ER-OBS-03', bedType: 'Emergency Stretcher', dailyTariff: 180, status: 'AVAILABLE' },
                { id: 'b-0-4', bedNumber: 'ER-OBS-04', bedType: 'Emergency Stretcher', dailyTariff: 180, status: 'MAINTENANCE', notes: 'Hydraulic lever calibration' },
                { id: 'b-0-5', bedNumber: 'ER-OBS-05', bedType: 'Emergency Stretcher', dailyTariff: 180, status: 'AVAILABLE' },
                { id: 'b-0-6', bedNumber: 'ER-OBS-06', bedType: 'Emergency Stretcher', dailyTariff: 180, status: 'AVAILABLE' },
              ],
            },
          ],
        },
        {
          id: 'fl-1-1',
          floorNumber: 'First Floor (Level 1)',
          code: 'FL-1',
          wing: 'General Inpatient Wards (Male / Female)',
          accessZone: 'Authorized Patients & Relatives',
          rooms: [
            { id: 'rm-110', roomNumber: 'NURSE-STN-1A', roomType: 'Doctor Chamber', capacity: 4, departmentName: 'Inpatient Department (IPD)', status: 'OCCUPIED' },
            { id: 'rm-111', roomNumber: 'TREATMENT-1A', roomType: 'Procedure Room', capacity: 1, departmentName: 'Inpatient Department (IPD)', status: 'AVAILABLE' },
          ],
          wards: [
            {
              id: 'wd-1-1',
              name: 'Central Male Medical Inpatient Ward',
              wardType: 'Male Ward',
              supervisorNurse: 'Marcus Bell, BSN',
              nursingStation: 'Station 1-A',
              departmentName: 'Inpatient Department (IPD)',
              beds: Array.from({ length: 25 }, (_, i) => ({
                id: `b-male-${i + 1}`,
                bedNumber: `BED-M-${(i + 1).toString().padStart(2, '0')}`,
                bedType: 'Standard Ward Bed',
                dailyTariff: 150,
                status: i < 18 ? 'OCCUPIED' : i === 19 ? 'RESERVED' : 'AVAILABLE',
                currentPatientName: i < 18 ? `Patient M-${i + 1}` : undefined,
              })),
            },
            {
              id: 'wd-1-2',
              name: 'Central Female Medical Inpatient Ward',
              wardType: 'Female Ward',
              supervisorNurse: 'Elena Rostova, RN',
              nursingStation: 'Station 1-B',
              departmentName: 'Inpatient Department (IPD)',
              beds: Array.from({ length: 25 }, (_, i) => ({
                id: `b-fem-${i + 1}`,
                bedNumber: `BED-F-${(i + 1).toString().padStart(2, '0')}`,
                bedType: 'Standard Ward Bed',
                dailyTariff: 150,
                status: i < 16 ? 'OCCUPIED' : 'AVAILABLE',
                currentPatientName: i < 16 ? `Patient F-${i + 1}` : undefined,
              })),
            },
          ],
        },
        {
          id: 'fl-1-2',
          floorNumber: 'Second Floor (Level 2)',
          code: 'FL-2',
          wing: 'Critical Care & Surgical Suites',
          accessZone: 'Strict Sterile Surgical Zone',
          rooms: [
            { id: 'rm-201', roomNumber: 'OT-SUITE-01', roomType: 'OT Suite', capacity: 1, departmentName: 'Operation Theatre & Surgery (OT)', status: 'OCCUPIED' },
            { id: 'rm-202', roomNumber: 'OT-SUITE-02', roomType: 'OT Suite', capacity: 1, departmentName: 'Operation Theatre & Surgery (OT)', status: 'AVAILABLE' },
            { id: 'rm-203', roomNumber: 'PACU-RECOVERY', roomType: 'Procedure Room', capacity: 6, departmentName: 'Operation Theatre & Surgery (OT)', status: 'AVAILABLE' },
          ],
          wards: [
            {
              id: 'wd-2-1',
              name: 'Intensive Critical Care Unit (ICU)',
              wardType: 'ICU Ward',
              supervisorNurse: 'Sister Clara Oswald, RN',
              nursingStation: 'ICU Central Telemetry Console',
              departmentName: 'Intensive Critical Care (ICU)',
              beds: Array.from({ length: 24 }, (_, i) => ({
                id: `b-icu-${i + 1}`,
                bedNumber: `ICU-BED-${(i + 1).toString().padStart(2, '0')}`,
                bedType: 'Motorized ICU Ventilator',
                dailyTariff: 1200,
                status: i < 18 ? 'OCCUPIED' : i === 18 ? 'RESERVED' : 'AVAILABLE',
                currentPatientName: i < 18 ? `ICU Patient ${i + 1}` : undefined,
              })),
            },
            {
              id: 'wd-2-2',
              name: 'Neonatal Intensive Care Unit (NICU)',
              wardType: 'NICU Ward',
              supervisorNurse: 'Dr. Emily Thorne, MD',
              nursingStation: 'NICU Warmers Roster',
              departmentName: 'Neonatal ICU (NICU)',
              beds: Array.from({ length: 12 }, (_, i) => ({
                id: `b-nicu-${i + 1}`,
                bedNumber: `NICU-CRIB-${(i + 1).toString().padStart(2, '0')}`,
                bedType: 'Pediatric Crib',
                dailyTariff: 800,
                status: i < 8 ? 'OCCUPIED' : 'AVAILABLE',
                currentPatientName: i < 8 ? `Neonate ${i + 1}` : undefined,
              })),
            },
          ],
        },
        {
          id: 'fl-1-3',
          floorNumber: 'Third Floor (Level 3)',
          code: 'FL-3',
          wing: 'Semi-Private & Private Deluxe Suites',
          accessZone: 'Private Inpatient Wing',
          rooms: [
            { id: 'rm-301', roomNumber: 'SUITE-301', roomType: 'Private Inpatient Room', capacity: 1, departmentName: 'Inpatient Department (IPD)', status: 'OCCUPIED' },
            { id: 'rm-302', roomNumber: 'SUITE-302', roomType: 'Private Inpatient Room', capacity: 1, departmentName: 'Inpatient Department (IPD)', status: 'AVAILABLE' },
          ],
          wards: [
            {
              id: 'wd-3-1',
              name: 'Deluxe Inpatient Care Wing',
              wardType: 'VIP Suite Ward',
              supervisorNurse: 'Hannah Abbot, RN',
              nursingStation: 'Deluxe Concierge 3',
              departmentName: 'Inpatient Department (IPD)',
              beds: Array.from({ length: 18 }, (_, i) => ({
                id: `b-dlx-${i + 1}`,
                bedNumber: `DLX-${(i + 301).toString()}`,
                bedType: 'Deluxe Suite',
                dailyTariff: 450,
                status: i < 12 ? 'OCCUPIED' : 'AVAILABLE',
                currentPatientName: i < 12 ? `Deluxe Patient ${i + 1}` : undefined,
              })),
            },
          ],
        },
      ],
    },
    {
      id: 'bld-2',
      code: 'BLD-ER',
      name: 'Emergency & Trauma Pavilion (Red Block)',
      buildingType: 'Emergency & Trauma Center',
      fireZone: 'Zone E (Dedicated ER Suppression)',
      utilities: 'Dedicated UPS 100kVA + Central Medical Gas Pipeline',
      floors: [
        {
          id: 'fl-2-0',
          floorNumber: 'Ground Floor - Trauma Resuscitation',
          code: 'ER-FL-0',
          wing: 'Red Zone Resuscitation & Decontamination',
          accessZone: 'High Security Emergency Arrival',
          rooms: [
            { id: 'rm-er-1', roomNumber: 'TRAUMA-OT-1', roomType: 'OT Suite', capacity: 1, departmentName: 'Emergency & Trauma (ER)', status: 'AVAILABLE' },
            { id: 'rm-er-2', roomNumber: 'DECON-ROOM', roomType: 'Procedure Room', capacity: 2, departmentName: 'Emergency & Trauma (ER)', status: 'AVAILABLE' },
          ],
          wards: [
            {
              id: 'wd-er-1',
              name: 'Acute Trauma Resuscitation Ward',
              wardType: 'General Ward',
              supervisorNurse: 'Marcus Bell, BSN',
              nursingStation: 'Trauma Command',
              departmentName: 'Emergency & Trauma (ER)',
              beds: Array.from({ length: 12 }, (_, i) => ({
                id: `b-trauma-${i + 1}`,
                bedNumber: `RED-BAY-${(i + 1).toString().padStart(2, '0')}`,
                bedType: 'Motorized ICU Ventilator',
                dailyTariff: 600,
                status: i < 6 ? 'OCCUPIED' : 'AVAILABLE',
                currentPatientName: i < 6 ? `Trauma Patient ${i + 1}` : undefined,
              })),
            },
          ],
        },
      ],
    },
    {
      id: 'bld-3',
      code: 'BLD-DAYCARE',
      name: 'Ambulatory Daycare & Chemotherapy Center',
      buildingType: 'Diagnostic & Oncology Pavilion',
      fireZone: 'Zone C (Clean Agent FM200)',
      utilities: 'Chilled Water Loop & Isolated Clean Power',
      floors: [
        {
          id: 'fl-3-1',
          floorNumber: 'Level 1 - Infusion Lounge',
          code: 'DAY-FL-1',
          wing: 'Outpatient Infusion & Renal Dialysis',
          accessZone: 'Daycare Patients & Staff',
          rooms: [
            { id: 'rm-day-1', roomNumber: 'CONSULT-ONCO-1', roomType: 'Consultation Room', capacity: 1, departmentName: 'Comprehensive Cancer Center', status: 'AVAILABLE' },
          ],
          wards: [
            {
              id: 'wd-day-1',
              name: 'Daycare Chemotherapy & Dialysis Lounge',
              wardType: 'General Ward',
              supervisorNurse: 'Elena Rostova, RN',
              nursingStation: 'Infusion Station 1',
              departmentName: 'Comprehensive Cancer Center',
              beds: Array.from({ length: 20 }, (_, i) => ({
                id: `b-day-${i + 1}`,
                bedNumber: `INFUSION-RECLINER-${(i + 1).toString().padStart(2, '0')}`,
                bedType: 'Semi-Fowler',
                dailyTariff: 180,
                status: i < 14 ? 'OCCUPIED' : 'AVAILABLE',
                currentPatientName: i < 14 ? `Daycare Patient ${i + 1}` : undefined,
              })),
            },
          ],
        },
      ],
    },
  ];

  const [buildings, setBuildings] = useState<BuildingNode[]>(() => {
    const saved = localStorage.getItem('hms_hospital_campus_infrastructure');
    return saved ? JSON.parse(saved) : defaultCampusTemplate;
  });

  const [expandedBuildings, setExpandedBuildings] = useState<Record<string, boolean>>({
    'bld-1': true,
    'bld-2': false,
    'bld-3': false,
  });

  const [expandedFloors, setExpandedFloors] = useState<Record<string, boolean>>({
    'fl-1-0': true,
    'fl-1-1': false,
    'fl-1-2': false,
  });

  const [expandedWards, setExpandedWards] = useState<Record<string, boolean>>({
    'wd-0-1': true,
    'wd-1-1': false,
  });

  const [alertMsg, setAlertMsg] = useState<string | null>(null);

  // Modal States
  const [showAddBuildingModal, setShowAddBuildingModal] = useState(false);
  const [showAddFloorModal, setShowAddFloorModal] = useState<string | null>(null); // buildingId
  const [showAddWardModal, setShowAddWardModal] = useState<{ buildingId: string; floorId: string } | null>(null);
  const [showAddRoomModal, setShowAddRoomModal] = useState<{ buildingId: string; floorId: string } | null>(null);
  const [showAddBedModal, setShowAddBedModal] = useState<{ buildingId: string; floorId: string; wardId: string } | null>(null);

  // Form states
  const [buildingForm, setBuildingForm] = useState({ name: '', code: '', buildingType: 'Clinical Inpatient Tower', fireZone: '', utilities: '' });
  const [floorForm, setFloorForm] = useState({ floorNumber: '', code: '', wing: '', accessZone: 'Public Open Access' });
  const [wardForm, setWardForm] = useState({ name: '', wardType: 'General Ward', supervisorNurse: '', nursingStation: '', departmentName: 'Inpatient Department (IPD)' });
  const [roomForm, setRoomForm] = useState({ roomNumber: '', roomType: 'Consultation Room', capacity: 1, departmentName: 'General Medicine' });
  const [bedForm, setBedForm] = useState({ bedNumber: '', bedType: 'Standard Ward Bed', dailyTariff: 150, status: 'AVAILABLE' });

  useEffect(() => {
    localStorage.setItem('hms_hospital_campus_infrastructure', JSON.stringify(buildings));
  }, [buildings]);

  const showAlert = (msg: string) => {
    setAlertMsg(msg);
    setTimeout(() => setAlertMsg(null), 3500);
  };

  const toggleBuilding = (id: string) => {
    setExpandedBuildings(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleFloor = (id: string) => {
    setExpandedFloors(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleWard = (id: string) => {
    setExpandedWards(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Rollup calculations
  const totalFloors = buildings.reduce((acc, b) => acc + b.floors.length, 0);
  const totalRooms = buildings.reduce((acc, b) => acc + b.floors.reduce((facc, f) => facc + f.rooms.length, 0), 0);
  const totalWards = buildings.reduce((acc, b) => acc + b.floors.reduce((facc, f) => facc + f.wards.length, 0), 0);
  const totalBeds = buildings.reduce(
    (acc, b) => acc + b.floors.reduce((facc, f) => facc + f.wards.reduce((wacc, w) => wacc + w.beds.length, 0), 0),
    0
  );
  const occupiedBeds = buildings.reduce(
    (acc, b) =>
      acc +
      b.floors.reduce(
        (facc, f) => facc + f.wards.reduce((wacc, w) => wacc + w.beds.filter(bed => bed.status === 'OCCUPIED').length, 0),
        0
      ),
    0
  );
  const availableBeds = buildings.reduce(
    (acc, b) =>
      acc +
      b.floors.reduce(
        (facc, f) => facc + f.wards.reduce((wacc, w) => wacc + w.beds.filter(bed => bed.status === 'AVAILABLE').length, 0),
        0
      ),
    0
  );

  // Handlers for Adding Nodes
  const handleAddBuildingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!buildingForm.name || !buildingForm.code) return;
    const newBld: BuildingNode = {
      id: `bld-${Date.now()}`,
      code: buildingForm.code,
      name: buildingForm.name,
      buildingType: buildingForm.buildingType as any,
      fireZone: buildingForm.fireZone || 'Standard Zone Smoke Detectors',
      utilities: buildingForm.utilities || 'Hospital Backup Power & Gas',
      floors: [],
    };
    setBuildings([...buildings, newBld]);
    setExpandedBuildings(prev => ({ ...prev, [newBld.id]: true }));
    setShowAddBuildingModal(false);
    setBuildingForm({ name: '', code: '', buildingType: 'Clinical Inpatient Tower', fireZone: '', utilities: '' });
    showAlert(`Added new hospital building: ${newBld.name}`);
  };

  const handleAddFloorSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!showAddFloorModal || !floorForm.floorNumber) return;
    const newFloor: FloorNode = {
      id: `fl-${Date.now()}`,
      floorNumber: floorForm.floorNumber,
      code: floorForm.code || `FL-${Date.now().toString().slice(-2)}`,
      wing: floorForm.wing || 'Main Wing',
      accessZone: floorForm.accessZone,
      rooms: [],
      wards: [],
    };
    setBuildings(prev =>
      prev.map(b => (b.id === showAddFloorModal ? { ...b, floors: [...b.floors, newFloor] } : b))
    );
    setExpandedFloors(prev => ({ ...prev, [newFloor.id]: true }));
    setShowAddFloorModal(null);
    setFloorForm({ floorNumber: '', code: '', wing: '', accessZone: 'Public Open Access' });
    showAlert(`Added floor: ${newFloor.floorNumber}`);
  };

  const handleAddWardSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!showAddWardModal || !wardForm.name) return;
    const newWard: WardNode = {
      id: `wd-${Date.now()}`,
      name: wardForm.name,
      wardType: wardForm.wardType as any,
      supervisorNurse: wardForm.supervisorNurse || 'Staff Nurse On Duty',
      nursingStation: wardForm.nursingStation || 'Central Nursing Desk',
      departmentName: wardForm.departmentName,
      beds: [],
    };
    setBuildings(prev =>
      prev.map(b =>
        b.id === showAddWardModal.buildingId
          ? {
              ...b,
              floors: b.floors.map(f =>
                f.id === showAddWardModal.floorId ? { ...f, wards: [...f.wards, newWard] } : f
              ),
            }
          : b
      )
    );
    setExpandedWards(prev => ({ ...prev, [newWard.id]: true }));
    setShowAddWardModal(null);
    setWardForm({ name: '', wardType: 'General Ward', supervisorNurse: '', nursingStation: '', departmentName: 'Inpatient Department (IPD)' });
    showAlert(`Added ward: ${newWard.name}`);
  };

  const handleAddRoomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!showAddRoomModal || !roomForm.roomNumber) return;
    const newRoom: RoomNode = {
      id: `rm-${Date.now()}`,
      roomNumber: roomForm.roomNumber,
      roomType: roomForm.roomType as any,
      capacity: roomForm.capacity,
      departmentName: roomForm.departmentName,
      status: 'AVAILABLE',
    };
    setBuildings(prev =>
      prev.map(b =>
        b.id === showAddRoomModal.buildingId
          ? {
              ...b,
              floors: b.floors.map(f =>
                f.id === showAddRoomModal.floorId ? { ...f, rooms: [...f.rooms, newRoom] } : f
              ),
            }
          : b
      )
    );
    setShowAddRoomModal(null);
    setRoomForm({ roomNumber: '', roomType: 'Consultation Room', capacity: 1, departmentName: 'General Medicine' });
    showAlert(`Added room: ${newRoom.roomNumber}`);
  };

  const handleAddBedSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!showAddBedModal || !bedForm.bedNumber) return;
    const newBed: BedNode = {
      id: `bed-${Date.now()}`,
      bedNumber: bedForm.bedNumber,
      bedType: bedForm.bedType as any,
      dailyTariff: Number(bedForm.dailyTariff) || 150,
      status: bedForm.status as any,
    };
    setBuildings(prev =>
      prev.map(b =>
        b.id === showAddBedModal.buildingId
          ? {
              ...b,
              floors: b.floors.map(f =>
                f.id === showAddBedModal.floorId
                  ? {
                      ...f,
                      wards: f.wards.map(w =>
                        w.id === showAddBedModal.wardId ? { ...w, beds: [...w.beds, newBed] } : w
                      ),
                    }
                  : f
              ),
            }
          : b
      )
    );
    setShowAddBedModal(null);
    setBedForm({ bedNumber: '', bedType: 'Standard Ward Bed', dailyTariff: 150, status: 'AVAILABLE' });
    showAlert(`Added bed ${newBed.bedNumber} to ward.`);
  };

  const handleDeleteBuilding = (bldId: string) => {
    if (confirm('Are you sure you want to remove this building and all its nested floors/beds?')) {
      setBuildings(buildings.filter(b => b.id !== bldId));
      showAlert('Building removed.');
    }
  };

  const handleDeleteFloor = (bldId: string, floorId: string) => {
    setBuildings(prev =>
      prev.map(b =>
        b.id === bldId ? { ...b, floors: b.floors.filter(f => f.id !== floorId) } : b
      )
    );
    showAlert('Floor removed.');
  };

  const handleDeleteWard = (bldId: string, floorId: string, wardId: string) => {
    setBuildings(prev =>
      prev.map(b =>
        b.id === bldId
          ? {
              ...b,
              floors: b.floors.map(f =>
                f.id === floorId ? { ...f, wards: f.wards.filter(w => w.id !== wardId) } : f
              ),
            }
          : b
      )
    );
    showAlert('Ward removed.');
  };

  const handleDeleteBed = (bldId: string, floorId: string, wardId: string, bedId: string) => {
    setBuildings(prev =>
      prev.map(b =>
        b.id === bldId
          ? {
              ...b,
              floors: b.floors.map(f =>
                f.id === floorId
                  ? {
                      ...f,
                      wards: f.wards.map(w =>
                        w.id === wardId ? { ...w, beds: w.beds.filter(bed => bed.id !== bedId) } : w
                      ),
                    }
                  : f
              ),
            }
          : b
      )
    );
    showAlert('Bed removed.');
  };

  const handleToggleBedStatus = (bldId: string, floorId: string, wardId: string, bedId: string) => {
    setBuildings(prev =>
      prev.map(b =>
        b.id === bldId
          ? {
              ...b,
              floors: b.floors.map(f =>
                f.id === floorId
                  ? {
                      ...f,
                      wards: f.wards.map(w =>
                        w.id === wardId
                          ? {
                              ...w,
                              beds: w.beds.map(bed => {
                                if (bed.id === bedId) {
                                  const nextStatus: BedNode['status'] =
                                    bed.status === 'AVAILABLE' ? 'OCCUPIED' :
                                    bed.status === 'OCCUPIED' ? 'MAINTENANCE' : 'AVAILABLE';
                                  return { ...bed, status: nextStatus };
                                }
                                return bed;
                              }),
                            }
                          : w
                      ),
                    }
                  : f
              ),
            }
          : b
      )
    );
  };

  const getBedStatusBadge = (status: BedNode['status']) => {
    switch (status) {
      case 'AVAILABLE':
        return <span className="badge badge-success" style={{ fontSize: '0.6875rem', padding: '0.15rem 0.4rem' }}>AVAILABLE</span>;
      case 'OCCUPIED':
        return <span className="badge badge-info" style={{ fontSize: '0.6875rem', padding: '0.15rem 0.4rem' }}>OCCUPIED</span>;
      case 'RESERVED':
        return <span className="badge badge-warning" style={{ fontSize: '0.6875rem', padding: '0.15rem 0.4rem' }}>RESERVED</span>;
      case 'MAINTENANCE':
        return <span className="badge badge-danger" style={{ fontSize: '0.6875rem', padding: '0.15rem 0.4rem' }}>MAINTENANCE</span>;
    }
  };

  return (
    <div className="card" style={{ padding: '1.5rem' }}>
      {/* Top Banner & Summary Rollup Strip */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--secondary)', margin: 0 }}>
              2. Campus Physical Infrastructure Manager
            </h3>
            <span className="badge badge-info" style={{ textTransform: 'none', fontWeight: 700 }}>
              Single-Location Campus Tree
            </span>
          </div>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: '0.25rem 0 0' }}>
            Nested collapsible hierarchy: <strong>Building</strong> $\rightarrow$ <strong>Floors</strong> $\rightarrow$ <strong>Rooms & Wards</strong> $\rightarrow$ <strong>Beds</strong> with full inline CRUD operations.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => {
              setBuildings(defaultCampusTemplate);
              showAlert('Reloaded standard 240-Bed Enterprise Campus infrastructure template.');
            }}
            title="Reload 240-Bed Hospital Template"
          >
            <RotateCcw size={14} /> Load 240-Bed Campus Template
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => setShowAddBuildingModal(true)}
          >
            <Plus size={15} /> + Add Hospital Building
          </button>
        </div>
      </div>

      {alertMsg && (
        <div style={{ padding: '0.75rem 1rem', backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '8px', color: '#065f46', fontSize: '0.8125rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <CheckCircle size={16} /> {alertMsg}
        </div>
      )}

      {/* Campus Summary Rollup KPIs */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: '1rem',
          marginBottom: '1.5rem',
          padding: '1rem',
          backgroundColor: 'var(--bg-subtle)',
          borderRadius: '10px',
          border: '1px solid var(--border-color)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '8px', backgroundColor: '#e0f2fe', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Building size={20} />
          </div>
          <div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--secondary)' }}>{buildings.length}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Buildings</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '8px', backgroundColor: '#f3e8ff', color: '#7e22ce', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Layers size={20} />
          </div>
          <div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--secondary)' }}>{totalFloors}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Total Floors</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '8px', backgroundColor: '#fef3c7', color: '#b45309', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <DoorClosed size={20} />
          </div>
          <div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--secondary)' }}>{totalRooms}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Rooms / Chambers</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '8px', backgroundColor: '#ffe4e6', color: '#e11d48', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <BedDouble size={20} />
          </div>
          <div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--secondary)' }}>{totalWards}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Clinical Wards</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '8px', backgroundColor: '#ecfdf5', color: '#047857', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Activity size={20} />
          </div>
          <div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--secondary)' }}>
              {totalBeds} <span style={{ fontSize: '0.75rem', fontWeight: 500, color: '#047857' }}>({occupiedBeds} Occ / {availableBeds} Avail)</span>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Total Beds</div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* COLLAPSIBLE HIERARCHICAL TREE (BUILDING -> FLOOR -> WARD/ROOM -> BED) */}
      {/* ========================================================================= */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {buildings.map((bld) => {
          const isBldExpanded = !!expandedBuildings[bld.id];
          const bldBedCount = bld.floors.reduce(
            (acc, f) => acc + f.wards.reduce((wacc, w) => wacc + w.beds.length, 0),
            0
          );
          const bldRoomCount = bld.floors.reduce((acc, f) => acc + f.rooms.length, 0);

          return (
            <div
              key={bld.id}
              style={{
                border: '1px solid var(--border-color)',
                borderRadius: '10px',
                overflow: 'hidden',
                backgroundColor: '#ffffff',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              }}
            >
              {/* LEVEL 1: BUILDING HEADER */}
              <div
                style={{
                  padding: '1rem 1.25rem',
                  backgroundColor: '#f8fafc',
                  borderBottom: isBldExpanded ? '1px solid var(--border-color)' : 'none',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  cursor: 'pointer',
                  userSelect: 'none',
                }}
                onClick={() => toggleBuilding(bld.id)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <button
                    type="button"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}
                  >
                    {isBldExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                  </button>
                  <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: '#e0f2fe', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Building size={18} />
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <strong style={{ fontSize: '1rem', color: 'var(--secondary)' }}>{bld.name}</strong>
                      <code>{bld.code}</code>
                      <span className="badge badge-secondary" style={{ fontSize: '0.75rem' }}>{bld.buildingType}</span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                      {bld.floors.length} Floors • {bldRoomCount} Rooms • {bldBedCount} Total Beds • Fire Safety: {bld.fireZone}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }} onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setShowAddFloorModal(bld.id)}
                  >
                    <Plus size={13} /> + Add Floor
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleDeleteBuilding(bld.id)}
                    style={{ color: 'var(--danger)' }}
                    title="Delete Building"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>

              {/* LEVEL 2: FLOORS CONTAINER */}
              {isBldExpanded && (
                <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem', backgroundColor: '#fafbfc' }}>
                  {bld.floors.length === 0 ? (
                    <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)', backgroundColor: '#ffffff', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
                      No floors created in this building yet. Click <strong>+ Add Floor</strong> above to add Ground, 1st, or 2nd floor.
                    </div>
                  ) : (
                    bld.floors.map((floor) => {
                      const isFloorExpanded = !!expandedFloors[floor.id];
                      const floorBedCount = floor.wards.reduce((acc, w) => acc + w.beds.length, 0);

                      return (
                        <div
                          key={floor.id}
                          style={{
                            border: '1px solid #e2e8f0',
                            borderRadius: '8px',
                            backgroundColor: '#ffffff',
                            overflow: 'hidden',
                          }}
                        >
                          {/* FLOOR HEADER */}
                          <div
                            style={{
                              padding: '0.75rem 1rem',
                              backgroundColor: '#f1f5f9',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              cursor: 'pointer',
                            }}
                            onClick={() => toggleFloor(floor.id)}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                              <button
                                type="button"
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}
                              >
                                {isFloorExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                              </button>
                              <Layers size={16} color="var(--primary)" />
                              <strong style={{ fontSize: '0.875rem' }}>{floor.floorNumber}</strong>
                              <code>{floor.code}</code>
                              <span className="badge" style={{ backgroundColor: '#e2e8f0', color: '#334155', fontSize: '0.6875rem' }}>
                                {floor.wing}
                              </span>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                ({floor.wards.length} Wards • {floor.rooms.length} Rooms • {floorBedCount} Beds)
                              </span>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }} onClick={(e) => e.stopPropagation()}>
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}
                                onClick={() => setShowAddWardModal({ buildingId: bld.id, floorId: floor.id })}
                              >
                                <Plus size={12} /> Add Ward
                              </button>
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}
                                onClick={() => setShowAddRoomModal({ buildingId: bld.id, floorId: floor.id })}
                              >
                                <Plus size={12} /> Add Room
                              </button>
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                style={{ fontSize: '0.75rem', padding: '0.2rem 0.4rem', color: 'var(--danger)' }}
                                onClick={() => handleDeleteFloor(bld.id, floor.id)}
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>

                          {/* LEVEL 3: ROOMS & WARDS */}
                          {isFloorExpanded && (
                            <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                              {/* Clinical Wards List */}
                              <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                    CLINICAL WARDS & INPATIENT BEDS
                                  </span>
                                </div>

                                {floor.wards.length === 0 ? (
                                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', padding: '0.5rem', fontStyle: 'italic' }}>
                                    No wards configured on this floor yet.
                                  </div>
                                ) : (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    {floor.wards.map((ward) => {
                                      const isWardExpanded = !!expandedWards[ward.id];

                                      return (
                                        <div
                                          key={ward.id}
                                          style={{
                                            border: '1px solid #cbd5e1',
                                            borderRadius: '6px',
                                            backgroundColor: '#f8fafc',
                                            overflow: 'hidden',
                                          }}
                                        >
                                          <div
                                            style={{
                                              padding: '0.625rem 0.875rem',
                                              display: 'flex',
                                              justifyContent: 'space-between',
                                              alignItems: 'center',
                                              backgroundColor: '#ffffff',
                                              cursor: 'pointer',
                                              borderBottom: isWardExpanded ? '1px solid #e2e8f0' : 'none',
                                            }}
                                            onClick={() => toggleWard(ward.id)}
                                          >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                              <button type="button" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                                                {isWardExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                              </button>
                                              <BedDouble size={15} color="#0284c7" />
                                              <strong style={{ fontSize: '0.8125rem' }}>{ward.name}</strong>
                                              <span className="badge badge-info" style={{ fontSize: '0.6875rem' }}>{ward.wardType}</span>
                                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                Supervisor: {ward.supervisorNurse} • Total Beds: {ward.beds.length}
                                              </span>
                                            </div>

                                            <div style={{ display: 'flex', gap: '0.375rem' }} onClick={(e) => e.stopPropagation()}>
                                              <button
                                                type="button"
                                                className="btn btn-secondary btn-sm"
                                                style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}
                                                onClick={() => setShowAddBedModal({ buildingId: bld.id, floorId: floor.id, wardId: ward.id })}
                                              >
                                                <Plus size={11} /> Add Bed
                                              </button>
                                              <button
                                                type="button"
                                                className="btn btn-secondary btn-sm"
                                                style={{ fontSize: '0.75rem', padding: '0.2rem 0.4rem', color: 'var(--danger)' }}
                                                onClick={() => handleDeleteWard(bld.id, floor.id, ward.id)}
                                              >
                                                <Trash2 size={11} />
                                              </button>
                                            </div>
                                          </div>

                                          {/* LEVEL 4: BEDS TILES GRID */}
                                          {isWardExpanded && (
                                            <div style={{ padding: '0.75rem', backgroundColor: '#f8fafc' }}>
                                              {ward.beds.length === 0 ? (
                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', padding: '0.5rem' }}>
                                                  No beds in this ward. Click <strong>+ Add Bed</strong> to insert hospital beds.
                                                </div>
                                              ) : (
                                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.625rem' }}>
                                                  {ward.beds.map((bed) => (
                                                    <div
                                                      key={bed.id}
                                                      style={{
                                                        padding: '0.5rem 0.75rem',
                                                        backgroundColor: '#ffffff',
                                                        borderRadius: '6px',
                                                        border: '1px solid #e2e8f0',
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        gap: '0.25rem',
                                                      }}
                                                    >
                                                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <strong style={{ fontSize: '0.8125rem', color: 'var(--secondary)' }}>{bed.bedNumber}</strong>
                                                        {getBedStatusBadge(bed.status)}
                                                      </div>
                                                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                                        {bed.bedType}
                                                      </div>
                                                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.25rem', paddingTop: '0.25rem', borderTop: '1px dashed #e2e8f0' }}>
                                                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#047857' }}>${bed.dailyTariff}/day</span>
                                                        <div style={{ display: 'flex', gap: '0.25rem' }}>
                                                          <button
                                                            type="button"
                                                            style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '0.6875rem', color: '#0284c7', padding: '0.1rem 0.25rem' }}
                                                            onClick={() => handleToggleBedStatus(bld.id, floor.id, ward.id, bed.id)}
                                                            title="Toggle Status"
                                                          >
                                                            Toggle
                                                          </button>
                                                          <button
                                                            type="button"
                                                            style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--danger)', padding: '0.1rem' }}
                                                            onClick={() => handleDeleteBed(bld.id, floor.id, ward.id, bed.id)}
                                                          >
                                                            <Trash2 size={11} />
                                                          </button>
                                                        </div>
                                                      </div>
                                                    </div>
                                                  ))}
                                                </div>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>

                              {/* Floor Rooms & Chambers */}
                              <div style={{ marginTop: '0.5rem' }}>
                                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                  ROOMS, CHAMBERS & PROCEDURE SUITES
                                </span>

                                {floor.rooms.length === 0 ? (
                                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', padding: '0.5rem', fontStyle: 'italic' }}>
                                    No consultation chambers or procedure rooms added to this floor yet.
                                  </div>
                                ) : (
                                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.625rem', marginTop: '0.35rem' }}>
                                    {floor.rooms.map((room) => (
                                      <div
                                        key={room.id}
                                        style={{
                                          padding: '0.625rem 0.75rem',
                                          backgroundColor: '#ffffff',
                                          borderRadius: '6px',
                                          border: '1px solid #e2e8f0',
                                        }}
                                      >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                            <DoorClosed size={14} color="var(--primary)" />
                                            <strong style={{ fontSize: '0.8125rem' }}>{room.roomNumber}</strong>
                                          </div>
                                          <span className="badge badge-secondary" style={{ fontSize: '0.6875rem' }}>{room.roomType}</span>
                                        </div>
                                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                                          Dept: {room.departmentName || 'General'}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: ADD BUILDING */}
      {/* ========================================================================= */}
      {showAddBuildingModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '1rem' }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', width: '100%', maxWidth: '480px', padding: '1.5rem', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>Add Hospital Building</h4>
              <button onClick={() => setShowAddBuildingModal(false)} style={{ border: 'none', background: 'none', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <form onSubmit={handleAddBuildingSubmit}>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label">Building Name</label>
                <input
                  className="form-input"
                  value={buildingForm.name}
                  onChange={(e) => setBuildingForm({ ...buildingForm, name: e.target.value })}
                  placeholder="e.g. Surgical & Super Specialty Tower"
                  required
                />
              </div>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label">Building Code</label>
                <input
                  className="form-input"
                  value={buildingForm.code}
                  onChange={(e) => setBuildingForm({ ...buildingForm, code: e.target.value })}
                  placeholder="e.g. BLD-SURG"
                  required
                />
              </div>
              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label className="form-label">Building Classification</label>
                <select
                  className="form-select"
                  value={buildingForm.buildingType}
                  onChange={(e) => setBuildingForm({ ...buildingForm, buildingType: e.target.value as any })}
                >
                  <option value="Clinical Inpatient Tower">Clinical Inpatient Tower</option>
                  <option value="Emergency & Trauma Center">Emergency & Trauma Center</option>
                  <option value="Diagnostic & Oncology Pavilion">Diagnostic & Oncology Pavilion</option>
                  <option value="Administration & Support">Administration & Support</option>
                </select>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddBuildingModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary"><Building size={14} /> Create Building</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: ADD FLOOR */}
      {/* ========================================================================= */}
      {showAddFloorModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '1rem' }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', width: '100%', maxWidth: '460px', padding: '1.5rem', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>Add Floor to Building</h4>
              <button onClick={() => setShowAddFloorModal(null)} style={{ border: 'none', background: 'none', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <form onSubmit={handleAddFloorSubmit}>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label">Floor Number / Name</label>
                <input
                  className="form-input"
                  value={floorForm.floorNumber}
                  onChange={(e) => setFloorForm({ ...floorForm, floorNumber: e.target.value })}
                  placeholder="e.g. Floor 4 (Orthopedic & Neuro Wing)"
                  required
                />
              </div>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label">Floor Code</label>
                <input
                  className="form-input"
                  value={floorForm.code}
                  onChange={(e) => setFloorForm({ ...floorForm, code: e.target.value })}
                  placeholder="e.g. FL-4"
                  required
                />
              </div>
              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label className="form-label">Wing / Description</label>
                <input
                  className="form-input"
                  value={floorForm.wing}
                  onChange={(e) => setFloorForm({ ...floorForm, wing: e.target.value })}
                  placeholder="e.g. South Surgical Wing"
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddFloorModal(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary"><Layers size={14} /> Add Floor</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: ADD WARD */}
      {/* ========================================================================= */}
      {showAddWardModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '1rem' }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', width: '100%', maxWidth: '480px', padding: '1.5rem', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>Add Clinical Inpatient Ward</h4>
              <button onClick={() => setShowAddWardModal(null)} style={{ border: 'none', background: 'none', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <form onSubmit={handleAddWardSubmit}>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label">Ward Name</label>
                <input
                  className="form-input"
                  value={wardForm.name}
                  onChange={(e) => setWardForm({ ...wardForm, name: e.target.value })}
                  placeholder="e.g. Pediatric Intensive Care Ward"
                  required
                />
              </div>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label">Ward Type</label>
                <select
                  className="form-select"
                  value={wardForm.wardType}
                  onChange={(e) => setWardForm({ ...wardForm, wardType: e.target.value as any })}
                >
                  <option value="General Ward">General Ward</option>
                  <option value="ICU Ward">ICU Ward</option>
                  <option value="Male Ward">Male Ward</option>
                  <option value="Female Ward">Female Ward</option>
                  <option value="Maternity Ward">Maternity Ward</option>
                  <option value="Isolation Ward">Isolation Ward</option>
                  <option value="VIP Suite Ward">VIP Suite Ward</option>
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label className="form-label">In-Charge Supervisor Nurse</label>
                <input
                  className="form-input"
                  value={wardForm.supervisorNurse}
                  onChange={(e) => setWardForm({ ...wardForm, supervisorNurse: e.target.value })}
                  placeholder="e.g. Sister Elena Rostova, RN"
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddWardModal(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary"><BedDouble size={14} /> Add Ward</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: ADD ROOM */}
      {/* ========================================================================= */}
      {showAddRoomModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '1rem' }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', width: '100%', maxWidth: '460px', padding: '1.5rem', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>Add Room / Consultation Chamber</h4>
              <button onClick={() => setShowAddRoomModal(null)} style={{ border: 'none', background: 'none', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <form onSubmit={handleAddRoomSubmit}>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label">Room / Chamber Number</label>
                <input
                  className="form-input"
                  value={roomForm.roomNumber}
                  onChange={(e) => setRoomForm({ ...roomForm, roomNumber: e.target.value })}
                  placeholder="e.g. OPD-105"
                  required
                />
              </div>
              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label className="form-label">Room Type</label>
                <select
                  className="form-select"
                  value={roomForm.roomType}
                  onChange={(e) => setRoomForm({ ...roomForm, roomType: e.target.value as any })}
                >
                  <option value="Consultation Room">Consultation Room</option>
                  <option value="Procedure Room">Procedure Room</option>
                  <option value="Doctor Chamber">Doctor Chamber</option>
                  <option value="Private Inpatient Room">Private Inpatient Room</option>
                  <option value="OT Suite">OT Suite</option>
                  <option value="Daycare Unit">Daycare Unit</option>
                </select>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddRoomModal(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary"><DoorClosed size={14} /> Add Room</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: ADD BED */}
      {/* ========================================================================= */}
      {showAddBedModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '1rem' }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', width: '100%', maxWidth: '460px', padding: '1.5rem', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>Add Bed to Ward</h4>
              <button onClick={() => setShowAddBedModal(null)} style={{ border: 'none', background: 'none', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <form onSubmit={handleAddBedSubmit}>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label">Bed Number / Code</label>
                <input
                  className="form-input"
                  value={bedForm.bedNumber}
                  onChange={(e) => setBedForm({ ...bedForm, bedNumber: e.target.value })}
                  placeholder="e.g. BED-M-26"
                  required
                />
              </div>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label">Bed Classification Type</label>
                <select
                  className="form-select"
                  value={bedForm.bedType}
                  onChange={(e) => setBedForm({ ...bedForm, bedType: e.target.value as any })}
                >
                  <option value="Standard Ward Bed">Standard Ward Bed</option>
                  <option value="Motorized ICU Ventilator">Motorized ICU Ventilator</option>
                  <option value="Semi-Fowler">Semi-Fowler Bed</option>
                  <option value="Deluxe Suite">Deluxe Suite Bed</option>
                  <option value="Pediatric Crib">Pediatric Crib</option>
                  <option value="Emergency Stretcher">Emergency Stretcher</option>
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label className="form-label">Daily Tariff ($)</label>
                <input
                  type="number"
                  className="form-input"
                  value={bedForm.dailyTariff}
                  onChange={(e) => setBedForm({ ...bedForm, dailyTariff: Number(e.target.value) || 0 })}
                  required
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddBedModal(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary"><BedDouble size={14} /> Add Bed</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

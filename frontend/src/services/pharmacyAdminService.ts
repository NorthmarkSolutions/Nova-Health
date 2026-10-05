import api from './api';

export interface PharmacyAdminMetrics {
  kpis: {
    rx_volume: number;
    rx_breakdown: { opd: number; ipd: number; otc: number };
    dispensed_today: number;
    dispensed_pct_received: number;
    inventory_health_pct: number;
    stockouts_count: number;
    staff_on_duty: number;
    avg_turnaround_mins: number;
    revenue_today_inr: string;
    revenue_otc_inr: string;
  };
  hourly_activity: {
    scope: string;
    hours: string[];
    bars: Array<{ hour: string; value: number | string; height: string; color: string; is_live: boolean }>;
    stats: {
      received: number;
      peak_hour: string;
      avg_per_hour: number;
      forecast_today: number | string;
    };
  };
  alerts: Array<{
    id: string;
    type: 'red' | 'amber' | 'blue' | 'gray';
    icon: string;
    title: string;
    subtitle: string;
    time: string;
    link_tab: string;
  }>;
  inventory_segments: Array<{
    label: string;
    count: number;
    color: string;
    width_pct: string;
    pct_formatted: string;
  }>;
  inventory_stats: {
    stock_value: string;
    pending_grns: number;
    turnover_30d: string;
  };
  staff_performance: Array<{
    id: string;
    initials: string;
    name: string;
    role: string;
    done: number;
    target: number;
    progress_pct: number;
    bar_color: string;
    tat: string;
  }>;
  recent_activity_feed: Array<{
    time: string;
    icon: string;
    title: string;
    subtitle: string;
    badge: { text: string; bg: string; fg: string; bd: string };
  }>;
}

export interface PharmacyStaffMember {
  id: string;
  name: string;
  role: string;
  area: string;
  shift: string;
  status: 'On duty' | 'On break' | 'Off shift';
  done: number;
  target: number;
  tat: string;
  ovr: number;
  cd: number;
  recent: string[];
}

export interface PharmacyDutyShift {
  id: string;
  slot: string;
  day: string;
  area: string;
  service_point_code: string;
  staff: string[];
  need: number;
  status: 'Covered' | 'Understaffed' | 'Open';
  notes?: string;
}

export interface PharmacyThroughputPoint {
  id: string;
  name: string;
  type: string;
  lead: string;
  queue: number;
  tat: string;
  sla: string;
  today: number;
  status: 'Normal' | 'Busy' | 'Night gap';
}

export interface PharmacyInventoryHealthException {
  id?: string;
  name: string;
  cat: string;
  stock: number;
  par: number;
  issue: string;
  impact: string;
  c: 'red' | 'amber';
}

export interface PharmacyControlledDrugMonitorItem {
  code: string;
  name: string;
  sched: string;
  open: number;
  rec: number;
  ret: number;
  iss: number;
  bal: number;
  shelf: number;
  last: string;
  wit: string;
}

export interface PharmacySupplierPerformance {
  name: string;
  cat: string;
  po: string;
  lead: string;
  ontime: number;
  status: 'Awaiting approval' | 'Approved' | 'No open PO' | 'Dispatched';
  po_id?: string;
}

export interface PharmacyGovernanceAuditEntry {
  id: string;
  time: string;
  user: string;
  act: string;
  ent: string;
  sev: 'Override' | 'Controlled' | 'Discrepancy' | 'Adjustment' | 'Refund' | 'Info';
  ip: string;
  det: string;
}

export interface PharmacyGovernancePolicy {
  key: string;
  name: string;
  scope: string;
  value: boolean | string;
  by: string;
  description: string;
}

export interface PharmacyAdminReport {
  id: string;
  name: string;
  period: string;
  owner: string;
  gen: string;
  fmt: string;
  status: 'Ready' | 'Due today';
  kv: Array<[string, string | number]>;
}

export const pharmacyAdminService = {
  getAdminMetrics: async (activityScope: string = 'All'): Promise<PharmacyAdminMetrics> => {
    const res = await api.get('/pharmacy/admin/analytics/', {
      params: { activity_scope: activityScope }
    });
    const d = res.data || {};

    let kpiObj: PharmacyAdminMetrics['kpis'] = {
      rx_volume: 214,
      rx_breakdown: { opd: 142, ipd: 58, otc: 14 },
      dispensed_today: 168,
      dispensed_pct_received: 79,
      inventory_health_pct: 86,
      stockouts_count: 2,
      staff_on_duty: 4,
      avg_turnaround_mins: 6.8,
      revenue_today_inr: '₹1.84L',
      revenue_otc_inr: 'OTC ₹13.6K',
    };

    if (d.kpi_summary) {
      kpiObj = {
        rx_volume: Number(d.kpi_summary.rx_volume) || 214,
        rx_breakdown: {
          opd: Number(d.kpi_summary.rx_breakdown?.opd) || 142,
          ipd: Number(d.kpi_summary.rx_breakdown?.ipd) || 58,
          otc: Number(d.kpi_summary.rx_breakdown?.otc) || 14,
        },
        dispensed_today: Number(d.kpi_summary.dispensed_today) || 168,
        dispensed_pct_received: Number(d.kpi_summary.dispensed_pct_received) || 79,
        inventory_health_pct: Number(d.kpi_summary.inventory_health_pct) || 86,
        stockouts_count: Number(d.kpi_summary.stockouts_count) || 2,
        staff_on_duty: Number(d.kpi_summary.staff_on_duty) || 4,
        avg_turnaround_mins: Number(d.kpi_summary.avg_turnaround_mins) || 6.8,
        revenue_today_inr: String(d.kpi_summary.revenue_today_inr || '₹1.84L'),
        revenue_otc_inr: String(d.kpi_summary.revenue_otc_inr || 'OTC ₹13.6K'),
      };
    } else if (Array.isArray(d.kpis)) {
      const rxKpi = d.kpis.find((k: any) => k.label?.includes('Prescription volume')) || d.kpis[0];
      const dispKpi = d.kpis.find((k: any) => k.label?.includes('Dispensed today')) || d.kpis[1];
      const invKpi = d.kpis.find((k: any) => k.label?.includes('Inventory health')) || d.kpis[2];
      const staffKpi = d.kpis.find((k: any) => k.label?.includes('Staff productivity')) || d.kpis[3];
      const revKpi = d.kpis.find((k: any) => k.label?.includes('Revenue')) || d.kpis[4];

      let opd = 142, ipd = 58, otc = 14;
      if (typeof rxKpi?.unit === 'string') {
        const opdMatch = rxKpi.unit.match(/OPD\s+(\d+)/i);
        const ipdMatch = rxKpi.unit.match(/IPD\s+(\d+)/i);
        const otcMatch = rxKpi.unit.match(/OTC\s+(\d+)/i);
        if (opdMatch) opd = parseInt(opdMatch[1], 10);
        if (ipdMatch) ipd = parseInt(ipdMatch[1], 10);
        if (otcMatch) otc = parseInt(otcMatch[1], 10);
      }

      kpiObj = {
        rx_volume: Number(rxKpi?.value) || 214,
        rx_breakdown: { opd, ipd, otc },
        dispensed_today: Number(dispKpi?.value) || 168,
        dispensed_pct_received: parseInt(dispKpi?.tag?.text || '79', 10) || 79,
        inventory_health_pct: parseInt(String(invKpi?.value) || '86', 10) || 86,
        stockouts_count: parseInt(invKpi?.tag?.text || '2', 10) || 2,
        staff_on_duty: parseInt(staffKpi?.tag?.text || '4', 10) || 4,
        avg_turnaround_mins: parseFloat(String(staffKpi?.value) || '6.8') || 6.8,
        revenue_today_inr: String(revKpi?.value || '₹1.84L'),
        revenue_otc_inr: String(revKpi?.tag?.text || 'OTC ₹13.6K'),
      };
    } else if (d.kpis && typeof d.kpis === 'object') {
      kpiObj = {
        ...kpiObj,
        ...d.kpis,
        rx_breakdown: {
          opd: d.kpis.rx_breakdown?.opd ?? 142,
          ipd: d.kpis.rx_breakdown?.ipd ?? 58,
          otc: d.kpis.rx_breakdown?.otc ?? 14,
        }
      };
    }

    const rawBars = d.bars || d.hourly_activity?.bars || [];
    const bars = rawBars.map((b: any) => ({
      hour: b.l || b.hour || '08:00',
      value: b.v !== undefined ? b.v : (b.value !== undefined ? b.value : 0),
      height: b.h || b.height || '40px',
      color: b.c || b.color || '#2563eb',
      is_live: b.isLive ?? b.is_live ?? true
    }));

    const statsMap: Record<string, any> = {};
    if (Array.isArray(d.act_stats)) {
      d.act_stats.forEach((s: any) => {
        if (s.k && s.v !== undefined) statsMap[s.k.toLowerCase()] = s.v;
      });
    }

    const hourlyActivity = {
      scope: d.scope || d.hourly_activity?.scope || activityScope,
      hours: d.hourly_activity?.hours || ['07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00'],
      bars: bars.length > 0 ? bars : [
        { hour: '07:00', value: 8, height: '24px', color: '#2563eb', is_live: true },
        { hour: '08:00', value: 24, height: '72px', color: '#2563eb', is_live: true },
        { hour: '09:00', value: 38, height: '114px', color: '#2563eb', is_live: true },
        { hour: '10:00', value: 44, height: '130px', color: '#2563eb', is_live: true },
        { hour: '11:00', value: '~40', height: '120px', color: '#dbeafe', is_live: false },
        { hour: '12:00', value: '~32', height: '96px', color: '#dbeafe', is_live: false },
        { hour: '13:00', value: '~18', height: '54px', color: '#dbeafe', is_live: false },
        { hour: '14:00', value: '~10', height: '30px', color: '#dbeafe', is_live: false }
      ],
      stats: {
        received: parseInt(statsMap['received'] || d.hourly_activity?.stats?.received || '114', 10) || 114,
        peak_hour: statsMap['peak hour'] || d.hourly_activity?.stats?.peak_hour || '10:00',
        avg_per_hour: parseInt(statsMap['avg / hour'] || d.hourly_activity?.stats?.avg_per_hour || '28', 10) || 28,
        forecast_today: statsMap['forecast today'] || d.hourly_activity?.stats?.forecast_today || 214
      }
    };

    const alerts = (d.alerts || []).map((a: any, i: number) => ({
      id: String(a.id || i + 1),
      type: a.c === 'red' ? 'red' : a.c === 'amber' ? 'amber' : a.c === 'blue' ? 'blue' : (a.type || 'gray'),
      icon: a.icon || 'CircleAlert',
      title: a.t || a.title || '',
      subtitle: a.s || a.subtitle || '',
      time: a.time || '10:00',
      link_tab: a.targetTab || a.link_tab || 'overview'
    }));

    const inventory_segments = (d.inv_seg || d.inventory_segments || []).map((s: any) => ({
      label: s.label || '',
      count: s.n ?? s.count ?? 0,
      color: s.c || s.color || '#16a34a',
      width_pct: s.w || s.width_pct || '25%',
      pct_formatted: s.pct || s.pct_formatted || '25%'
    }));

    const invStatsMap: Record<string, any> = {};
    if (Array.isArray(d.inv_stats)) {
      d.inv_stats.forEach((s: any) => {
        if (s.k && s.v !== undefined) invStatsMap[s.k.toLowerCase()] = s.v;
      });
    }
    const inventory_stats = {
      stock_value: invStatsMap['stock value'] || d.inventory_stats?.stock_value || '₹6.2L',
      pending_grns: parseInt(invStatsMap['pending grns'] || d.inventory_stats?.pending_grns || '2', 10) || 2,
      turnover_30d: invStatsMap['turnover (30 d)'] || d.inventory_stats?.turnover_30d || '2.4×'
    };

    const staff_performance = (d.perf || d.staff_performance || []).map((p: any, i: number) => {
      let done = 40, target = 60;
      if (typeof p.done === 'string') {
        const parts = p.done.split('/');
        if (parts.length === 2) {
          done = parseInt(parts[0].trim(), 10) || done;
          target = parseInt(parts[1].trim(), 10) || target;
        }
      } else if (typeof p.done === 'number') {
        done = p.done;
        target = p.target || target;
      }
      return {
        id: String(p.id || i + 1),
        initials: p.ini || p.initials || 'PH',
        name: p.name || 'Staff',
        role: p.role || 'Pharmacist',
        done,
        target,
        progress_pct: parseInt(p.w || p.progress_pct || '70', 10) || 70,
        bar_color: p.c || p.bar_color || '#16a34a',
        tat: p.tat || '6.5 min avg'
      };
    });

    const recent_activity_feed = (d.feed || d.recent_activity_feed || []).map((f: any) => ({
      time: f.time || '',
      icon: f.icon || 'FileText',
      title: f.t || f.title || '',
      subtitle: f.s || f.subtitle || '',
      badge: {
        text: f.b?.text || f.badge?.text || 'Info',
        bg: f.b?.bg || f.badge?.bg || '#f3f4f6',
        fg: f.b?.fg || f.badge?.fg || '#374151',
        bd: f.b?.bd || f.badge?.bd || '#e5e7eb'
      }
    }));

    return {
      kpis: kpiObj,
      hourly_activity: hourlyActivity,
      alerts: alerts.length > 0 ? alerts : undefined,
      inventory_segments: inventory_segments.length > 0 ? inventory_segments : undefined,
      inventory_stats,
      staff_performance: staff_performance.length > 0 ? staff_performance : undefined,
      recent_activity_feed: recent_activity_feed.length > 0 ? recent_activity_feed : undefined
    } as PharmacyAdminMetrics;
  },

  getStaffRoster: async (): Promise<PharmacyStaffMember[]> => {
    const res = await api.get('/pharmacy/admin/staff/');
    return res.data;
  },

  addOrUpdateStaff: async (payload: Partial<PharmacyStaffMember> & Record<string, any>): Promise<PharmacyStaffMember> => {
    const res = await api.post('/pharmacy/admin/staff/', payload);
    return res.data;
  },

  getDutySchedules: async (): Promise<PharmacyDutyShift[]> => {
    const res = await api.get('/pharmacy/admin/shifts/');
    return res.data;
  },

  updateShiftAssignment: async (payload: {
    schedule_id: string;
    staff: string[];
    notes?: string;
    status?: string;
  }): Promise<{ message: string; schedule: PharmacyDutyShift }> => {
    const res = await api.post('/pharmacy/admin/shifts/', payload);
    return res.data;
  },

  getThroughputPoints: async (): Promise<PharmacyThroughputPoint[]> => {
    const res = await api.get('/pharmacy/admin/operations/');
    return res.data;
  },

  getInventoryHealth: async (): Promise<PharmacyInventoryHealthException[]> => {
    const res = await api.get('/pharmacy/admin/inventory-health/');
    return res.data;
  },

  getControlledDrugMonitoring: async (): Promise<PharmacyControlledDrugMonitorItem[]> => {
    const res = await api.get('/pharmacy/admin/controlled-drug-monitor/');
    return res.data;
  },

  getSuppliersPerformance: async (): Promise<PharmacySupplierPerformance[]> => {
    const res = await api.get('/pharmacy/admin/suppliers/');
    return res.data;
  },

  getAuditLogs: async (params?: { filter?: string; search?: string }): Promise<PharmacyGovernanceAuditEntry[]> => {
    const res = await api.get('/pharmacy/admin/audit-logs/', { params });
    return res.data;
  },

  getSettings: async (): Promise<PharmacyGovernancePolicy[]> => {
    const res = await api.get('/pharmacy/admin/settings/');
    return res.data;
  },

  updateSettings: async (settings: Record<string, any>): Promise<{ message: string; settings: PharmacyGovernancePolicy[] }> => {
    const res = await api.post('/pharmacy/admin/settings/', { settings });
    return res.data;
  },

  getReports: async (): Promise<PharmacyAdminReport[]> => {
    const res = await api.get('/pharmacy/admin/reports/');
    return res.data;
  },

  reviewPurchaseRequest: async (
    prId: string,
    action: 'APPROVE' | 'REJECT',
    notes?: string
  ): Promise<{ message: string }> => {
    const res = await api.post(`/pharmacy/purchase-requests/${prId}/review/`, { action, notes });
    return res.data;
  },

  dispatchPurchaseOrder: async (poId: string, notes?: string): Promise<{ message: string }> => {
    const res = await api.post(`/pharmacy/purchase-orders/${poId}/issue/`, { notes });
    return res.data;
  },

  updateMedicinePricing: async (
    medicineId: string,
    payload: { unit_price: number; cost_price?: number; reason?: string }
  ): Promise<{ message: string }> => {
    const res = await api.post(`/pharmacy/medicines/${medicineId}/update_pricing/`, payload);
    return res.data;
  }
};

export default pharmacyAdminService;

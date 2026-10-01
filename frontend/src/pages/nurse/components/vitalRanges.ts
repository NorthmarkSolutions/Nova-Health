/**
 * Adult Clinical Vital Signs Thresholds & Flag Evaluation
 * Note: confirm thresholds with clinical lead
 */

export type VitalFlagLevel = 'normal' | 'warning' | 'critical';

export interface VitalFlagResult {
  level: VitalFlagLevel;
  label: string; // "Low", "High", "Critical"
}

// Adult ranges config object (§ Requirement C.2)
// confirm thresholds with clinical lead
export const ADULT_VITAL_RANGES = {
  spo2: {
    criticalLow: 90, // < 90
    warningLow: 94,  // < 94
  },
  temp: {
    warningLow: 96.8,    // < 96.8 F
    warningHigh: 100.4,  // >= 100.4 F
    criticalHigh: 103.0, // >= 103.0 F
  },
  pulse: {
    criticalLow: 50,  // < 50
    warningLow: 60,   // < 60
    warningHigh: 100, // > 100
    criticalHigh: 120,// > 120
  },
  respiratoryRate: {
    criticalLow: 8,   // < 8
    warningLow: 12,   // < 12
    warningHigh: 20,  // > 20
    criticalHigh: 24, // > 24
  },
  rbs: {
    criticalLow: 70,  // < 70
    warningHigh: 200, // > 200
  },
} as const;

export type VitalFieldKey = keyof typeof ADULT_VITAL_RANGES;

/**
 * Returns 'normal' | 'warning' | 'critical' | null
 * (null if empty or age < 12).
 * confirm thresholds with clinical lead
 */
export function getFlag(
  field: string,
  value: string | number | undefined | null,
  age?: number | string
): 'normal' | 'warning' | 'critical' | null {
  if (value === undefined || value === null) return null;
  const str = String(value).trim();
  if (!str) return null;
  const numVal = parseFloat(str);
  if (isNaN(numVal)) return null;

  // Hide flags for children (age under 12)
  if (age !== undefined && age !== null) {
    const numAge = Number(age);
    if (!isNaN(numAge) && numAge < 12) {
      return null;
    }
  }

  const normField = field.toLowerCase().replace(/[^a-z0-9]/g, '');
  switch (normField) {
    case 'spo2': {
      if (numVal < ADULT_VITAL_RANGES.spo2.criticalLow) return 'critical';
      if (numVal < ADULT_VITAL_RANGES.spo2.warningLow) return 'warning';
      return 'normal';
    }
    case 'temp':
    case 'temperature': {
      if (numVal >= ADULT_VITAL_RANGES.temp.criticalHigh) return 'critical';
      if (numVal >= ADULT_VITAL_RANGES.temp.warningHigh) return 'warning';
      if (numVal < ADULT_VITAL_RANGES.temp.warningLow) return 'warning';
      return 'normal';
    }
    case 'pulse':
    case 'heartrate':
    case 'hr': {
      if (numVal > ADULT_VITAL_RANGES.pulse.criticalHigh || numVal < ADULT_VITAL_RANGES.pulse.criticalLow) {
        return 'critical';
      }
      if (numVal > ADULT_VITAL_RANGES.pulse.warningHigh || numVal < ADULT_VITAL_RANGES.pulse.warningLow) {
        return 'warning';
      }
      return 'normal';
    }
    case 'respiratoryrate':
    case 'resprate':
    case 'rr': {
      if (numVal > ADULT_VITAL_RANGES.respiratoryRate.criticalHigh || numVal < ADULT_VITAL_RANGES.respiratoryRate.criticalLow) {
        return 'critical';
      }
      if (numVal > ADULT_VITAL_RANGES.respiratoryRate.warningHigh || numVal < ADULT_VITAL_RANGES.respiratoryRate.warningLow) {
        return 'warning';
      }
      return 'normal';
    }
    case 'rbs':
    case 'randomsugar':
    case 'sugar':
    case 'bloodsugar': {
      if (numVal < ADULT_VITAL_RANGES.rbs.criticalLow) return 'critical';
      if (numVal > ADULT_VITAL_RANGES.rbs.warningHigh) return 'warning';
      return 'normal';
    }
    default:
      return null;
  }
}

/**
 * Returns formatted label ("Low", "High", "Critical") and level for display
 */
export function getVitalFlagDetails(
  field: string,
  value: string | number | undefined | null,
  age?: number | string
): VitalFlagResult | null {
  const level = getFlag(field, value, age);
  if (!level || level === 'normal') return null;

  const numVal = parseFloat(String(value).trim());
  const normField = field.toLowerCase().replace(/[^a-z0-9]/g, '');

  if (normField === 'spo2') {
    return { level, label: level === 'critical' ? 'Critical' : 'Low' };
  }
  if (normField === 'temp' || normField === 'temperature') {
    if (numVal < ADULT_VITAL_RANGES.temp.warningLow) return { level, label: 'Low' };
    return { level, label: level === 'critical' ? 'Critical' : 'High' };
  }
  if (normField === 'pulse' || normField === 'heartrate' || normField === 'hr') {
    if (numVal < ADULT_VITAL_RANGES.pulse.warningLow) return { level, label: level === 'critical' ? 'Critical' : 'Low' };
    return { level, label: level === 'critical' ? 'Critical' : 'High' };
  }
  if (normField === 'respiratoryrate' || normField === 'resprate' || normField === 'rr') {
    if (numVal < ADULT_VITAL_RANGES.respiratoryRate.warningLow) return { level, label: level === 'critical' ? 'Critical' : 'Low' };
    return { level, label: level === 'critical' ? 'Critical' : 'High' };
  }
  if (normField === 'rbs' || normField === 'randomsugar' || normField === 'sugar' || normField === 'bloodsugar') {
    if (numVal < ADULT_VITAL_RANGES.rbs.criticalLow) return { level, label: 'Critical' };
    return { level, label: 'High' };
  }
  return { level, label: level === 'critical' ? 'Critical' : 'High' };
}

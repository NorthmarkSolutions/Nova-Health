// Status badge for the Accounts Executive views.
import React from 'react';
import { HmsBadge } from '../../../components/hms';
import { statusLabel, statusTone } from './executiveHelpers';

export const StatusBadge: React.FC<{ status?: string }> = ({ status }) => <HmsBadge tone={statusTone(status)}>{statusLabel(status)}</HmsBadge>;

// Accounts Manager · one action footer + dialog for every decision on the page.
// Actions that need a comment, a choice or risk acknowledgements open the dialog; the rest run straight away.
import React, { useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { HmsButton, HmsDetailFooter, HmsField, HmsModal, HmsNotice, HmsToggle, INPUT, TEXTAREA, HMS } from '../../../components/hms';
import { apiError } from '../executive/executiveData';
import { humanize } from '../executive/executiveData';

export interface MgrAction {
  key: string;
  label: string;
  variant?: 'primary' | 'secondary' | 'danger';
  icon?: LucideIcon;
  /** 'required' = at least 5 characters (server rule for return / reject / forward / hold / escalate). */
  comment?: 'required' | 'optional';
  commentHint?: string;
  select?: { label: string; options: string[]; current?: string };
  /** Critical risk flags the server needs acknowledged before approving. */
  acks?: string[];
  /** One confirmation statement the user must switch on (sent to the server as ack). */
  confirm?: string;
  /** A date or free-text value instead of a choice (e.g. new close date, owner name). */
  field?: { label: string; type: 'date' | 'text'; placeholder?: string };
  /** Returns the toast text. Throws on server refusal. */
  run: (comment: string, value: string, acks: string[]) => Promise<string | void>;
}

interface Draft {
  action: MgrAction;
  comment: string;
  value: string;
  acks: string[];
  confirmed: boolean;
  error?: string;
}

export const MgrActionFooter: React.FC<{
  actions: MgrAction[];
  notify: (m: string, tone?: 'success' | 'error') => void;
  reload: () => Promise<void>;
  note?: React.ReactNode;
}> = ({ actions, notify, reload, note }) => {
  const [busy, setBusy] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);

  const exec = async (a: MgrAction, comment: string, value: string, acks: string[]) => {
    setBusy(a.key);
    try {
      const msg = await a.run(comment, value, acks);
      notify(msg || `${a.label} done`);
      setDraft(null);
      await reload();
    } catch (e) {
      const m = apiError(e, `Could not ${a.label.toLowerCase()}`);
      setDraft((d) => (d ? { ...d, error: m } : d));
      notify(m, 'error');
    } finally {
      setBusy(null);
    }
  };

  const start = (a: MgrAction) => {
    if (!a.comment && !a.select && !a.acks?.length && !a.confirm && !a.field) exec(a, '', '', []);
    else setDraft({ action: a, comment: '', value: '', acks: [], confirmed: false });
  };

  const save = () => {
    if (!draft) return;
    const a = draft.action;
    if (a.select && !draft.value) return setDraft({ ...draft, error: `Choose ${a.select.label.toLowerCase()}.` });
    if (a.field && !draft.value.trim()) return setDraft({ ...draft, error: `Enter ${a.field.label.toLowerCase()}.` });
    if (a.confirm && !draft.confirmed) return setDraft({ ...draft, error: 'Switch on the confirmation first.' });
    const missing = (a.acks || []).filter((f) => !draft.acks.includes(f));
    if (missing.length) return setDraft({ ...draft, error: `Confirm you checked: ${missing.map(humanize).join(', ')}.` });
    if (a.comment === 'required' && draft.comment.trim().length < 5) return setDraft({ ...draft, error: 'Write at least 5 characters — the comment travels with your decision.' });
    exec(a, draft.comment.trim(), draft.value.trim(), a.confirm ? ['confirmed', ...draft.acks] : draft.acks);
  };

  if (!actions.length && !note) return null;
  const [first, ...rest] = actions;
  return (
    <>
      <HmsDetailFooter>
        {note && <div style={{ fontSize: '13px', color: HMS.textSecondary, width: '100%' }}>{note}</div>}
        {first && (
          <HmsButton variant={first.variant || 'primary'} block icon={first.icon} disabled={!!busy} onClick={() => start(first)}>
            {busy === first.key ? 'Saving…' : first.label}
          </HmsButton>
        )}
        {rest.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(rest.length, 3)}, minmax(0, 1fr))`, gap: '10px', width: '100%' }}>
            {rest.map((a) => (
              <HmsButton key={a.key} variant={a.variant || 'secondary'} block icon={a.icon} disabled={!!busy} onClick={() => start(a)}>
                {busy === a.key ? 'Saving…' : a.label}
              </HmsButton>
            ))}
          </div>
        )}
      </HmsDetailFooter>
      {draft && (
        <HmsModal
          title={draft.action.label}
          onClose={() => setDraft(null)}
          busy={!!busy}
          footer={
            <>
              <HmsButton onClick={() => setDraft(null)} disabled={!!busy}>
                Cancel
              </HmsButton>
              <HmsButton variant={draft.action.variant === 'danger' ? 'danger' : 'primary'} icon={draft.action.icon} onClick={save} disabled={!!busy}>
                {busy ? 'Saving…' : draft.action.label}
              </HmsButton>
            </>
          }
        >
          {draft.error && <HmsNotice tone="red">{draft.error}</HmsNotice>}
          {draft.action.select && (
            <HmsField label={draft.action.select.label} required>
              <select style={INPUT} value={draft.value} onChange={(e) => setDraft({ ...draft, value: e.target.value, error: undefined })}>
                <option value="">{draft.action.select.current ? `Current: ${draft.action.select.current}` : 'Choose…'}</option>
                {draft.action.select.options.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </HmsField>
          )}
          {draft.action.field && (
            <HmsField label={draft.action.field.label} required>
              <input
                type={draft.action.field.type}
                style={INPUT}
                value={draft.value}
                placeholder={draft.action.field.placeholder}
                onChange={(e) => setDraft({ ...draft, value: e.target.value, error: undefined })}
              />
            </HmsField>
          )}
          {draft.action.confirm && (
            <HmsToggle showLabel checked={draft.confirmed} onChange={(v) => setDraft({ ...draft, confirmed: v, error: undefined })} label={draft.action.confirm} />
          )}
          {(draft.action.acks || []).map((f) => (
            <HmsToggle
              key={f}
              showLabel
              checked={draft.acks.includes(f)}
              onChange={(v) => setDraft({ ...draft, acks: v ? [...draft.acks, f] : draft.acks.filter((x) => x !== f), error: undefined })}
              label={`I have checked: ${humanize(f)}`}
            />
          ))}
          {draft.action.comment && (
            <HmsField label="Comment" required={draft.action.comment === 'required'} hint={draft.action.commentHint}>
              <textarea style={TEXTAREA} value={draft.comment} onChange={(e) => setDraft({ ...draft, comment: e.target.value, error: undefined })} />
            </HmsField>
          )}
        </HmsModal>
      )}
    </>
  );
};

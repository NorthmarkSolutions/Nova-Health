// Lab Admin · Reagents & stock — reorder levels, expiry and purchase requests.
// Delivered purchase requests add to the stock on hand.
import React, { useState } from 'react';
import { Package, Plus, ShoppingCart, Check, X, Truck } from 'lucide-react';
import {
  HmsMasterDetail,
  HmsListRow,
  HmsBadge,
  HmsButton,
  HmsDetailHeader,
  HmsStatStrip,
  HmsDetailBody,
  HmsSection,
  HmsRow,
  HmsNotice,
  HmsEmpty,
  HmsModal,
  HmsField,
  INPUT,
  HMS,
  HmsTone,
} from '../../../components/hms';
import { LabAdminStore, LabStockItem, LabPurchaseRequest, stockState, daysUntil, fmtDate, fmtShort, fmtStamp, inr } from '../data/labAdminStore';
import { LabAdminViewProps } from './labAdminUi';

const OPEN: LabPurchaseRequest['status'][] = ['Awaiting approval', 'Awaiting Finance', 'Ordered'];
const PR_TONE: Record<LabPurchaseRequest['status'], HmsTone> = {
  'Awaiting approval': 'amber',
  'Awaiting Finance': 'amber',
  Ordered: 'blue',
  Delivered: 'green',
  Rejected: 'red',
};

type StockDraft = Omit<LabStockItem, 'id'> & { error?: string };

export const LabAdminStockView: React.FC<LabAdminViewProps> = ({ data, by, notify, newSignal, initialFilter }) => {
  const { state } = data;
  const { stock, purchases } = state;
  const [search, setSearch] = useState('');
  const [pill, setPill] = useState(initialFilter || 'all');
  const [selected, setSelected] = useState<string | null>(null);
  const [prDraft, setPrDraft] = useState<{ stockId: string; qty: string; estCost: string; error?: string } | null>(null);
  const [itemDraft, setItemDraft] = useState<StockDraft | null>(null);

  const newItem = (): StockDraft => ({ name: '', category: 'Reagent', unit: 'tests', onHand: 0, reorderAt: 0, maxLevel: 0, expiry: '', lot: '', supplier: '' });
  // Alt+N from the shell opens "Add item"
  const [seenSignal, setSeenSignal] = useState(newSignal);
  if (newSignal !== seenSignal) {
    setSeenSignal(newSignal);
    if (newSignal > 0) setItemDraft(newItem());
  }

  const openPrFor = (id: string) => purchases.filter((p) => p.stockId === id && OPEN.includes(p.status));
  const filters: Record<string, (i: LabStockItem) => boolean> = {
    all: () => true,
    reorder: (i) => i.onHand <= i.reorderAt,
    expiring: (i) => {
      const d = daysUntil(i.expiry);
      return d !== null && d <= 30;
    },
    onorder: (i) => openPrFor(i.id).length > 0,
    Reagent: (i) => i.category === 'Reagent',
    Consumable: (i) => i.category === 'Consumable',
  };
  const q = search.trim().toLowerCase();
  const rank = { 'Below reorder': 0, Expired: 0, 'Expiring soon': 1, 'In stock': 2 } as const;
  const visible = stock
    .filter((i) => filters[pill](i) && (!q || [i.name, i.category, i.lot || '', i.supplier || ''].some((v) => v.toLowerCase().includes(q))))
    .sort((a, b) => rank[stockState(a).label] - rank[stockState(b).label] || a.name.localeCompare(b.name));

  const pills = [
    { key: 'all', label: 'All', count: stock.length },
    { key: 'reorder', label: 'Below reorder', count: stock.filter(filters.reorder).length, tone: 'red' as const },
    { key: 'expiring', label: 'Expiring ≤30 d', count: stock.filter(filters.expiring).length, tone: 'amber' as const },
    { key: 'onorder', label: 'On order', count: stock.filter(filters.onorder).length },
    { key: 'Reagent', label: 'Reagents', count: stock.filter(filters.Reagent).length },
    { key: 'Consumable', label: 'Consumables', count: stock.filter(filters.Consumable).length },
  ];

  const rows: HmsListRow[] = visible.map((i) => {
    const st = stockState(i);
    const open = openPrFor(i.id);
    return {
      key: i.id,
      title: i.name,
      badge: <HmsBadge tone={st.tone}>{st.label}</HmsBadge>,
      sub: `${i.category}${i.lot ? ` · lot ${i.lot}` : ''}${i.expiry ? ` · exp ${fmtShort(i.expiry)}` : ''}`,
      metaLeft: `${i.onHand.toLocaleString('en-IN')} ${i.unit} on hand`,
      metaRight: open.length ? <span style={{ color: HMS.primaryStrong, fontWeight: 600 }}>{open[0].code} · {open[0].status}</span> : `Reorder at ${i.reorderAt.toLocaleString('en-IN')}`,
      progress: { pct: i.maxLevel ? (i.onHand / i.maxLevel) * 100 : 0, doneLabel: 'At max level', tone: i.onHand <= i.reorderAt ? 'red' : 'blue' },
    };
  });

  const act = (pr: LabPurchaseRequest, status: LabPurchaseRequest['status'], message: string) => {
    LabAdminStore.setPurchaseStatus(pr.id, status, by);
    notify(message);
  };

  const renderDetail = (key: string | null) => {
    const i = stock.find((x) => x.id === key);
    if (!i) return <HmsEmpty>Select a stock item to see levels and purchase requests.</HmsEmpty>;
    const st = stockState(i);
    const d = daysUntil(i.expiry);
    const prs = purchases.filter((p) => p.stockId === i.id);
    const open = prs.filter((p) => OPEN.includes(p.status));
    return (
      <>
        <HmsDetailHeader
          icon={Package}
          title={i.name}
          badge={<HmsBadge tone={st.tone}>{st.label}</HmsBadge>}
          subtitle={`${i.category}${i.supplier ? ` · ${i.supplier}` : ''}${i.lot ? ` · lot ${i.lot}` : ''}`}
          actions={
            <HmsButton variant={i.onHand <= i.reorderAt ? 'primary' : 'secondary'} icon={ShoppingCart} onClick={() => setPrDraft({ stockId: i.id, qty: String(Math.max(0, i.maxLevel - i.onHand)), estCost: '' })}>
              Raise purchase request
            </HmsButton>
          }
        />
        <HmsStatStrip
          items={[
            { label: 'On hand', value: `${i.onHand.toLocaleString('en-IN')} ${i.unit}`, tone: i.onHand <= i.reorderAt ? 'red' : 'default' },
            { label: 'Reorder at', value: i.reorderAt.toLocaleString('en-IN'), note: `Max ${i.maxLevel.toLocaleString('en-IN')}` },
            { label: 'Expiry', value: i.expiry ? fmtShort(i.expiry) : '—', note: d === null ? 'No expiry' : d < 0 ? 'Expired' : `${d} days left`, tone: d !== null && d < 0 ? 'red' : d !== null && d <= 30 ? 'amber' : 'default' },
            { label: 'On order', value: open.reduce((n, p) => n + p.qty, 0).toLocaleString('en-IN'), note: open.length ? `${open.length} open request${open.length === 1 ? '' : 's'}` : 'Nothing open' },
          ]}
        />
        <HmsDetailBody>
          {i.onHand <= i.reorderAt && open.length === 0 && <HmsNotice tone="red">Below reorder level and nothing on order. Raise a purchase request.</HmsNotice>}
          {d !== null && d < 0 && <HmsNotice tone="red">Lot {i.lot || ''} expired on {fmtDate(i.expiry)}. Remove from the bench.</HmsNotice>}

          <HmsSection title="Purchase requests">
            {prs.length === 0 ? (
              <div style={{ padding: '12px 14px', fontSize: '13px', color: HMS.textSecondary }}>No purchase requests for this item.</div>
            ) : (
              prs.map((p, idx) => (
                <HmsRow
                  key={p.id}
                  last={idx === prs.length - 1}
                  label={`${p.code} · ${p.qty.toLocaleString('en-IN')} ${p.unit} · ${inr(p.estCost)}`}
                  hint={`Raised ${fmtStamp(p.raisedAt)} by ${p.raisedBy}${p.decidedAt ? ` · updated ${fmtStamp(p.decidedAt)}` : ''}${p.status === 'Awaiting Finance' ? ' · over ₹50,000 needs Finance approval' : ''}`}
                  value={
                    p.status === 'Awaiting approval' ? (
                      <span style={{ display: 'flex', gap: '8px' }}>
                        <HmsButton size="sm" variant="danger" icon={X} onClick={() => act(p, 'Rejected', `${p.code} rejected.`)}>
                          Reject
                        </HmsButton>
                        <HmsButton size="sm" variant="primary" icon={Check} onClick={() => act(p, 'Ordered', `${p.code} approved and ordered.`)}>
                          Approve
                        </HmsButton>
                      </span>
                    ) : p.status === 'Ordered' ? (
                      <HmsButton size="sm" icon={Truck} onClick={() => act(p, 'Delivered', `${p.code} received · ${p.qty} ${p.unit} added to stock.`)}>
                        Mark delivered
                      </HmsButton>
                    ) : (
                      <HmsBadge tone={PR_TONE[p.status]}>{p.status}</HmsBadge>
                    )
                  }
                />
              ))
            )}
          </HmsSection>

          <HmsSection title="Item details">
            <HmsRow label="Category" value={i.category} />
            <HmsRow label="Unit" value={i.unit} />
            <HmsRow label="Supplier" value={i.supplier || '—'} />
            <HmsRow label="Current lot" value={i.lot || '—'} last />
          </HmsSection>
        </HmsDetailBody>
      </>
    );
  };

  const savePr = () => {
    if (!prDraft) return;
    const item = stock.find((s) => s.id === prDraft.stockId);
    const qty = Number(prDraft.qty);
    const cost = Number(prDraft.estCost);
    if (!item || !(qty > 0) || !(cost > 0)) {
      setPrDraft({ ...prDraft, error: 'Enter a quantity and an estimated cost above zero.' });
      return;
    }
    const code = LabAdminStore.raisePurchase({ stockId: item.id, item: item.name, qty, unit: item.unit, estCost: cost }, by);
    notify(`${code} raised for ${item.name}${cost > 50000 ? ' · sent to Finance for approval' : ''}.`);
    setPrDraft(null);
  };

  const saveItem = () => {
    if (!itemDraft) return;
    const { error: _e, ...item } = itemDraft;
    if (!item.name.trim() || !item.unit.trim() || item.maxLevel <= 0 || item.reorderAt < 0 || item.reorderAt >= item.maxLevel) {
      setItemDraft({ ...itemDraft, error: 'Name, unit and a reorder level below the max level are required.' });
      return;
    }
    const id = `stk-${Date.now()}`;
    LabAdminStore.addStockItem({ ...item, id, name: item.name.trim(), expiry: item.expiry || undefined }, by);
    setSelected(id);
    notify(`${item.name.trim()} added to lab stock.`);
    setItemDraft(null);
  };

  const num = (v: string) => (v === '' ? 0 : Math.max(0, Number(v) || 0));

  return (
    <>
      <HmsMasterDetail
        listId="lab-stock"
        title="Reagents & stock"
        description="Reagents, consumables and calibrators. Low and expiring stock first; the bar shows level against the max."
        total={stock.length}
        rows={rows}
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Search item, lot or supplier"
        pills={pills}
        activePill={pill}
        onPill={setPill}
        selectedKey={selected}
        onSelect={setSelected}
        primaryLabel="raise purchase request"
        onPrimary={(id) => {
          const i = stock.find((x) => x.id === id);
          if (i) setPrDraft({ stockId: i.id, qty: String(Math.max(0, i.maxLevel - i.onHand)), estCost: '' });
        }}
        headerAction={
          <HmsButton variant="primary" icon={Plus} onClick={() => setItemDraft(newItem())} title="Add stock item (Alt+N)" aria-keyshortcuts="Alt+N">
            Add item
          </HmsButton>
        }
        detailLabel="Stock item"
        renderDetail={renderDetail}
      />

      {prDraft && (
        <HmsModal
          title="Raise purchase request"
          description={stock.find((s) => s.id === prDraft.stockId)?.name}
          onClose={() => setPrDraft(null)}
          footer={
            <>
              <HmsButton onClick={() => setPrDraft(null)}>Cancel</HmsButton>
              <HmsButton variant="primary" icon={ShoppingCart} onClick={savePr}>
                Raise request
              </HmsButton>
            </>
          }
        >
          {prDraft.error && <HmsNotice tone="red">{prDraft.error}</HmsNotice>}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <HmsField label={`Quantity (${stock.find((s) => s.id === prDraft.stockId)?.unit})`} required hint="Prefilled to reach the max level.">
              <input type="number" min={1} style={INPUT} value={prDraft.qty} onChange={(e) => setPrDraft({ ...prDraft, qty: e.target.value, error: undefined })} />
            </HmsField>
            <HmsField label="Estimated cost (₹)" required hint="Over ₹50,000 goes to Finance.">
              <input type="number" min={1} style={INPUT} value={prDraft.estCost} onChange={(e) => setPrDraft({ ...prDraft, estCost: e.target.value, error: undefined })} />
            </HmsField>
          </div>
        </HmsModal>
      )}

      {itemDraft && (
        <HmsModal
          title="Add stock item"
          onClose={() => setItemDraft(null)}
          width={620}
          footer={
            <>
              <HmsButton onClick={() => setItemDraft(null)}>Cancel</HmsButton>
              <HmsButton variant="primary" icon={Plus} onClick={saveItem}>
                Add item
              </HmsButton>
            </>
          }
        >
          {itemDraft.error && <HmsNotice tone="red">{itemDraft.error}</HmsNotice>}
          <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '12px' }}>
            <HmsField label="Item name" required>
              <input style={INPUT} value={itemDraft.name} onChange={(e) => setItemDraft({ ...itemDraft, name: e.target.value, error: undefined })} />
            </HmsField>
            <HmsField label="Category">
              <select style={INPUT} value={itemDraft.category} onChange={(e) => setItemDraft({ ...itemDraft, category: e.target.value as LabStockItem['category'] })}>
                <option>Reagent</option>
                <option>Consumable</option>
                <option>Calibrator</option>
              </select>
            </HmsField>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '12px' }}>
            <HmsField label="Unit" required>
              <input style={INPUT} value={itemDraft.unit} onChange={(e) => setItemDraft({ ...itemDraft, unit: e.target.value })} />
            </HmsField>
            <HmsField label="On hand">
              <input type="number" min={0} style={INPUT} value={itemDraft.onHand} onChange={(e) => setItemDraft({ ...itemDraft, onHand: num(e.target.value) })} />
            </HmsField>
            <HmsField label="Reorder at" required>
              <input type="number" min={0} style={INPUT} value={itemDraft.reorderAt} onChange={(e) => setItemDraft({ ...itemDraft, reorderAt: num(e.target.value), error: undefined })} />
            </HmsField>
            <HmsField label="Max level" required>
              <input type="number" min={1} style={INPUT} value={itemDraft.maxLevel} onChange={(e) => setItemDraft({ ...itemDraft, maxLevel: num(e.target.value), error: undefined })} />
            </HmsField>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '12px' }}>
            <HmsField label="Expiry">
              <input type="date" style={INPUT} value={itemDraft.expiry || ''} onChange={(e) => setItemDraft({ ...itemDraft, expiry: e.target.value })} />
            </HmsField>
            <HmsField label="Lot">
              <input style={INPUT} value={itemDraft.lot || ''} onChange={(e) => setItemDraft({ ...itemDraft, lot: e.target.value })} />
            </HmsField>
            <HmsField label="Supplier">
              <input style={INPUT} value={itemDraft.supplier || ''} onChange={(e) => setItemDraft({ ...itemDraft, supplier: e.target.value })} />
            </HmsField>
          </div>
        </HmsModal>
      )}
    </>
  );
};

export default LabAdminStockView;

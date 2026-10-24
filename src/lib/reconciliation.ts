// Energy reconciliation engine: pure, deterministic calculations comparing inverter data,
// official meter readings and supplier bills. AI may explain these results, never produce them.

export type Source = 'inverter' | 'meter';
export type Origin = 'simulated' | 'manual' | 'csv' | 'api' | 'upload';
export type Basis = 'measured' | 'calculated' | 'estimated' | 'missing';
export type ReconStatus = 'Reconciled' | 'Minor Difference' | 'Investigation Needed' | 'Missing Data';
export type Confidence = 'high' | 'medium' | 'low';
export type CompensationMode = 'quantity' | 'financial' | 'none';

export interface Measurement {
  id?: string;
  siteId: string;
  source: Source;
  periodStart: string;
  periodEnd: string;
  pvKwh: number | null;
  importKwh: number | null;
  exportKwh: number | null;
  batteryChargeKwh: number | null;
  batteryDischargeKwh: number | null;
  consumptionKwh: number | null;
  boundary: 'ac' | 'dc';
  batteryCoupling: 'none' | 'ac' | 'dc' | null;
  accuracyPct: number;
  timezone: string;
  syncedAt: string | null;
  origin: Origin;
}

export interface Bill {
  id?: string;
  siteId: string;
  periodStart: string;
  periodEnd: string;
  supplier: string;
  meterId: string;
  openingImport: number | null;
  closingImport: number | null;
  openingExport: number | null;
  closingExport: number | null;
  importKwh: number | null;
  exportKwh: number | null;
  energyPrice: number | null;
  networkCharges: number | null;
  taxes: number | null;
  exportCompensation: number | null;
  carriedCreditIn: number;
  carriedCreditOut: number | null;
  totalRon: number | null;
  compensationMode: CompensationMode;
  readingType: 'actual' | 'estimated';
  origin: Origin;
  documentPath: string | null;
}

export interface Tolerances {
  /** Smallest difference (kWh) ever treated as significant. */
  minKwh: number;
  /** Used when a measurement does not state its own accuracy. */
  inverterAccuracyPct: number;
  meterAccuracyPct: number;
  /** Bills should repeat meter quantities; allow rounding only. */
  billKwh: number;
  /** Inverter conversion efficiency used only for DC-coupled systems (estimate). */
  dcEfficiencyPct: number;
}
export const DEFAULT_TOLERANCES: Tolerances = { minKwh: 2, inverterAccuracyPct: 3, meterAccuracyPct: 1, billKwh: 1, dcEfficiencyPct: 96 };

export interface FlowValue { kwh: number | null; basis: Basis; source: string }
export interface Flows {
  pv: FlowValue;
  direct: FlowValue;
  batteryCharge: FlowValue;
  batteryDischarge: FlowValue;
  gridExport: FlowValue;
  gridImport: FlowValue;
  losses: FlowValue;
  consumption: FlowValue;
  billed: FlowValue;
}

export interface Comparison {
  id: string;
  label: string;
  a: { label: string; kwh: number };
  b: { label: string; kwh: number };
  diffKwh: number; // b - a
  diffPct: number;
  toleranceKwh: number;
  ratio: number; // |diff| / tolerance
  kind: 'technical' | 'billing' | 'balance';
}

export interface Explanation { id: string; title: string; detail: string; confidence: Confidence; kind: 'normal' | 'check' }

export interface Settlement {
  mode: CompensationMode;
  importKwh: number;
  exportKwh: number;
  eligibleKwh: number;
  compensatedKwh: number;
  remainingCreditKwh: number;
  energyCostRon: number;
  financialSettlementRon: number;
  networkRon: number;
  taxesRon: number;
  finalBillRon: number;
}

export interface ReconResult {
  periodStart: string;
  periodEnd: string;
  status: ReconStatus;
  complete: boolean;
  missing: string[];
  flows: Flows;
  selfConsumptionPct: number | null;
  unexplained: { kwh: number; pct: number; toleranceKwh: number } | null;
  comparisons: Comparison[];
  explanations: Explanation[];
  settlement: Settlement | null;
  billTotalDiffRon: number | null;
  simulated: boolean;
}

const r1 = (n: number) => Math.round(n * 10) / 10;
const pct = (part: number, whole: number) => (whole === 0 ? 0 : (part / whole) * 100);
const has = (n: number | null | undefined): n is number => typeof n === 'number' && Number.isFinite(n);
const samePeriod = (a: { periodStart: string; periodEnd: string }, b: { periodStart: string; periodEnd: string }) =>
  a.periodStart === b.periodStart && a.periodEnd === b.periodEnd;

/** Romanian prosumer settlement. Mechanism and prices come from the contract; nothing is assumed per prosumer. */
export function prosumerSettlement(i: {
  mode: CompensationMode; importKwh: number; exportKwh: number; carryInKwh?: number;
  priceRon: number; exportPriceRon?: number; networkRon?: number; taxesRon?: number;
}): Settlement {
  const carry = i.carryInKwh ?? 0;
  const networkRon = i.networkRon ?? 0;
  const taxesRon = i.taxesRon ?? 0;
  if (i.mode === 'quantity') {
    const eligibleKwh = i.exportKwh + carry;
    const compensatedKwh = Math.min(eligibleKwh, i.importKwh);
    const energyCostRon = (i.importKwh - compensatedKwh) * i.priceRon;
    return { mode: i.mode, importKwh: i.importKwh, exportKwh: i.exportKwh, eligibleKwh, compensatedKwh, remainingCreditKwh: eligibleKwh - compensatedKwh,
      energyCostRon, financialSettlementRon: 0, networkRon, taxesRon, finalBillRon: energyCostRon + networkRon + taxesRon };
  }
  const energyCostRon = i.importKwh * i.priceRon;
  const financialSettlementRon = i.mode === 'financial' ? i.exportKwh * (i.exportPriceRon ?? 0) : 0;
  return { mode: i.mode, importKwh: i.importKwh, exportKwh: i.exportKwh, eligibleKwh: i.mode === 'financial' ? i.exportKwh : 0, compensatedKwh: 0, remainingCreditKwh: 0,
    energyCostRon, financialSettlementRon, networkRon, taxesRon, finalBillRon: energyCostRon + networkRon + taxesRon - financialSettlementRon };
}

function compare(id: string, label: string, kind: Comparison['kind'], a: { label: string; kwh: number }, b: { label: string; kwh: number }, toleranceKwh: number): Comparison {
  const diffKwh = r1(b.kwh - a.kwh);
  return { id, label, kind, a, b, diffKwh, diffPct: r1(pct(diffKwh, a.kwh || b.kwh)), toleranceKwh: r1(toleranceKwh), ratio: toleranceKwh > 0 ? Math.abs(diffKwh) / toleranceKwh : Math.abs(diffKwh) > 0 ? Infinity : 0 };
}

export function reconcile(input: {
  inverter?: Measurement | null; meter?: Measurement | null; bill?: Bill | null;
  hasBattery: boolean; tolerances?: Partial<Tolerances>; expectedTimezone?: string;
}): ReconResult {
  const t = { ...DEFAULT_TOLERANCES, ...input.tolerances };
  const { inverter, meter, bill } = input;
  const ref = meter ?? inverter ?? bill;
  const periodStart = ref?.periodStart ?? '';
  const periodEnd = ref?.periodEnd ?? '';
  const missing: string[] = [];
  const explanations: Explanation[] = [];
  const comparisons: Comparison[] = [];
  const tz = input.expectedTimezone ?? 'Europe/Bucharest';

  const inv = inverter && (!meter || samePeriod(inverter, meter)) ? inverter : null;
  const billOk = bill && (!meter || samePeriod(bill, meter)) ? bill : null;
  if (inverter && meter && !inv) explanations.push({ id: 'period-inverter', title: 'Different reporting periods', detail: `Inverter data covers ${inverter.periodStart} → ${inverter.periodEnd} but the meter covers ${meter.periodStart} → ${meter.periodEnd}. They are not compared.`, confidence: 'high', kind: 'check' });
  if (bill && meter && !billOk) explanations.push({ id: 'period-bill', title: 'Bill period differs from meter period', detail: `The bill covers ${bill.periodStart} → ${bill.periodEnd}; the meter period is ${meter.periodStart} → ${meter.periodEnd}. Quantities cannot be matched until periods align.`, confidence: 'high', kind: 'check' });

  if (!inverter) missing.push('Inverter production data');
  if (!meter) missing.push('Official meter readings');
  if (!bill) missing.push('Supplier bill');
  if (inv && !has(inv.pvKwh)) missing.push('Solar production value');
  if (inv && inv.boundary === 'dc' && inv.batteryCoupling !== 'dc') missing.push('AC-side production (inverter reports DC values only)');
  if (input.hasBattery && inv && (!has(inv.batteryChargeKwh) || !has(inv.batteryDischargeKwh))) missing.push('Battery charge/discharge measurements');

  // Grid flows: the official meter is authoritative; the inverter CT is a fallback.
  const gridImport: FlowValue = meter && has(meter.importKwh) ? { kwh: meter.importKwh, basis: 'measured', source: 'Official meter' }
    : inv && has(inv.importKwh) ? { kwh: inv.importKwh, basis: 'measured', source: 'Inverter CT' } : { kwh: null, basis: 'missing', source: '—' };
  const gridExport: FlowValue = meter && has(meter.exportKwh) ? { kwh: meter.exportKwh, basis: 'measured', source: 'Official meter' }
    : inv && has(inv.exportKwh) ? { kwh: inv.exportKwh, basis: 'measured', source: 'Inverter CT' } : { kwh: null, basis: 'missing', source: '—' };
  if (!has(gridImport.kwh) || !has(gridExport.kwh)) missing.push('Grid import/export');

  const pv: FlowValue = inv && has(inv.pvKwh) ? { kwh: inv.pvKwh, basis: 'measured', source: 'Inverter' } : { kwh: null, basis: 'missing', source: '—' };
  const charge = input.hasBattery ? (inv && has(inv.batteryChargeKwh) ? inv.batteryChargeKwh : null) : 0;
  const discharge = input.hasBattery ? (inv && has(inv.batteryDischargeKwh) ? inv.batteryDischargeKwh : null) : 0;
  const batteryCharge: FlowValue = { kwh: charge, basis: !input.hasBattery ? 'measured' : has(charge) ? 'measured' : 'missing', source: input.hasBattery ? 'Inverter / BMS' : 'No battery' };
  const batteryDischarge: FlowValue = { kwh: discharge, basis: batteryCharge.basis, source: batteryCharge.source };

  const complete = missing.filter(m => m !== 'Supplier bill').length === 0;
  let direct: FlowValue = { kwh: null, basis: 'missing', source: '—' };
  let consumption: FlowValue = { kwh: null, basis: 'missing', source: '—' };
  let losses: FlowValue = { kwh: 0, basis: 'estimated', source: 'Not applicable' };
  let unexplained: ReconResult['unexplained'] = null;

  if (complete && has(pv.kwh) && has(gridImport.kwh) && has(gridExport.kwh) && has(charge) && has(discharge)) {
    const dc = inv?.batteryCoupling === 'dc';
    let cons: number; let dir: number; let loss: number;
    if (dc) {
      // DC-coupled: battery flows sit behind the inverter; conversion losses are estimated.
      const eff = t.dcEfficiencyPct / 100;
      const acOut = (pv.kwh - charge + discharge) * eff;
      loss = (pv.kwh - charge + discharge) - acOut;
      cons = acOut + gridImport.kwh - gridExport.kwh;
      dir = Math.max(0, (pv.kwh - charge) * eff - gridExport.kwh);
      losses = { kwh: r1(loss), basis: 'estimated', source: `Conversion at ${t.dcEfficiencyPct}% efficiency` };
    } else {
      // AC-side balance: PV + import + discharge = consumption + export + charge (+ other losses, 0 here).
      cons = pv.kwh + gridImport.kwh + discharge - gridExport.kwh - charge;
      dir = pv.kwh - gridExport.kwh - charge;
      loss = Math.max(0, charge - discharge); // inside the battery; already outside the AC balance
      losses = { kwh: r1(loss), basis: 'estimated', source: charge > 0 ? 'Battery storage losses (charge − discharge)' : 'None measured' };
    }
    direct = { kwh: r1(Math.max(0, dir)), basis: 'calculated', source: 'Production − export − battery charge' };
    consumption = { kwh: r1(cons), basis: 'calculated', source: 'Energy balance' };
    if (inv && has(inv.consumptionKwh)) {
      const residual = r1(cons - inv.consumptionKwh);
      const tol = Math.max(t.minKwh, (inv.accuracyPct || t.inverterAccuracyPct) / 100 * inv.consumptionKwh + ((meter?.accuracyPct ?? t.meterAccuracyPct) / 100) * (gridImport.kwh + gridExport.kwh));
      unexplained = { kwh: residual, pct: r1(pct(Math.abs(residual), pv.kwh + gridImport.kwh + discharge)), toleranceKwh: r1(tol) };
      comparisons.push(compare('balance', 'Energy balance vs measured consumption', 'balance', { label: 'Inverter consumption', kwh: inv.consumptionKwh }, { label: 'Calculated consumption', kwh: r1(cons) }, tol));
    }
  }

  // Inverter CT vs official meter.
  if (inv && meter) {
    for (const k of ['exportKwh', 'importKwh'] as const) {
      const a = meter[k]; const b = inv[k];
      if (!has(a) || !has(b)) continue;
      const tol = Math.max(t.minKwh, ((meter.accuracyPct || t.meterAccuracyPct) + (inv.accuracyPct || t.inverterAccuracyPct)) / 100 * a);
      comparisons.push(compare(`inv-${k}`, `Inverter vs meter ${k === 'exportKwh' ? 'export' : 'import'}`, 'technical', { label: 'Official meter', kwh: a }, { label: 'Inverter', kwh: b }, tol));
    }
  }
  // Bill vs official meter.
  if (billOk && meter) {
    for (const k of ['exportKwh', 'importKwh'] as const) {
      const a = meter[k]; const b = billOk[k];
      if (!has(a) || !has(b)) continue;
      comparisons.push(compare(`bill-${k}`, `Bill vs meter ${k === 'exportKwh' ? 'export' : 'import'}`, 'billing', { label: 'Official meter', kwh: a }, { label: 'Supplier bill', kwh: b }, Math.max(t.billKwh, 0.0001)));
    }
  }

  // ---- Explanations ----
  if (has(pv.kwh) && has(gridExport.kwh) && pv.kwh - gridExport.kwh > 0) {
    explanations.push({ id: 'self', title: 'Solar self-consumption', detail: `${r1(pv.kwh - gridExport.kwh)} kWh of production was not exported. It was used on site${input.hasBattery ? ' or stored in the battery' : ''} — this is not missing energy.`, confidence: 'high', kind: 'normal' });
  }
  if (input.hasBattery && has(charge) && charge > 0) explanations.push({ id: 'battery', title: 'Battery charging and discharging', detail: `${r1(charge)} kWh charged and ${r1(discharge ?? 0)} kWh discharged. Battery energy is counted once on charge and once on discharge, never twice as production.`, confidence: 'high', kind: 'normal' });
  if (has(losses.kwh) && losses.kwh > 0) explanations.push({ id: 'losses', title: inv?.batteryCoupling === 'dc' ? 'DC/AC conversion losses' : 'Battery storage losses', detail: `About ${losses.kwh} kWh is estimated as conversion or storage losses. This is an estimate, not a measurement.`, confidence: 'medium', kind: 'normal' });
  const tzs = [inverter?.timezone, meter?.timezone].filter(Boolean);
  if (tzs.some(z => z !== tz)) explanations.push({ id: 'tz', title: 'Time-zone differences', detail: `A source reports in ${tzs.find(z => z !== tz)}; daily boundaries may shift energy between periods.`, confidence: 'medium', kind: 'check' });
  for (const m of [inverter, meter]) {
    if (!m) continue;
    const late = !m.syncedAt || (new Date(m.syncedAt).getTime() - new Date(`${m.periodEnd}T23:59:59Z`).getTime()) > 7 * 86400000;
    if (late) explanations.push({ id: `sync-${m.source}`, title: 'Missing or delayed measurements', detail: `${m.source === 'meter' ? 'Meter' : 'Inverter'} data was ${m.syncedAt ? 'synchronised more than 7 days after the period ended' : 'never synchronised'}; late data can be incomplete.`, confidence: 'medium', kind: 'check' });
  }
  for (const c of comparisons) {
    if (c.ratio <= 1) continue;
    if (c.kind === 'technical') {
      explanations.push(c.ratio <= 2
        ? { id: `acc-${c.id}`, title: 'Meter accuracy differences', detail: `${c.label}: ${c.diffKwh > 0 ? '+' : ''}${c.diffKwh} kWh (${c.diffPct}%). Slightly above combined accuracy (±${c.toleranceKwh} kWh); usually measurement tolerance.`, confidence: 'low', kind: 'check' }
        : { id: `ct-${c.id}`, title: 'Possible inverter or current-transformer configuration issue', detail: `${c.label}: ${c.diffKwh > 0 ? '+' : ''}${c.diffKwh} kWh (${c.diffPct}%), beyond the ±${c.toleranceKwh} kWh tolerance. Check CT placement/orientation and the inverter's meter settings.`, confidence: 'medium', kind: 'check' });
    }
    if (c.kind === 'billing') {
      if (billOk?.readingType === 'estimated') explanations.push({ id: `est-${c.id}`, title: 'Estimated rather than actual meter reading', detail: `The bill is based on an estimated reading; ${c.label.toLowerCase()} differs by ${Math.abs(c.diffKwh)} kWh. A later bill normally regularises this.`, confidence: 'high', kind: 'check' });
      else explanations.push({ id: `billq-${c.id}`, title: 'Billing quantity differs from the official meter', detail: `${c.label}: the bill shows ${c.b.kwh} kWh, the meter recorded ${c.a.kwh} kWh (${c.diffKwh > 0 ? '+' : ''}${c.diffKwh} kWh). Verify the reporting period, opening/closing readings and any adjustments on the invoice. This is not proof of a billing error.`, confidence: 'medium', kind: 'check' });
      if (billOk && billOk.carriedCreditIn > 0) explanations.push({ id: `carry-${c.id}`, title: 'Billing adjustments or carried-forward energy', detail: `${billOk.carriedCreditIn} kWh of credit was carried in from a previous period and may be netted on this invoice.`, confidence: 'medium', kind: 'check' });
    }
    if (c.kind === 'balance') explanations.push({ id: 'unexplained', title: 'Unexplained energy difference', detail: `${Math.abs(c.diffKwh)} kWh is not accounted for by the measurements (tolerance ±${c.toleranceKwh} kWh). Check for unmetered loads, data gaps or inverter configuration.`, confidence: c.ratio > 2 ? 'medium' : 'low', kind: 'check' });
  }

  // ---- Billing ----
  let settlement: Settlement | null = null;
  let billTotalDiffRon: number | null = null;
  if (billOk && has(billOk.importKwh) && has(billOk.exportKwh) && has(billOk.energyPrice)) {
    settlement = prosumerSettlement({ mode: billOk.compensationMode, importKwh: billOk.importKwh, exportKwh: billOk.exportKwh, carryInKwh: billOk.carriedCreditIn,
      priceRon: billOk.energyPrice, exportPriceRon: billOk.exportKwh > 0 && has(billOk.exportCompensation) ? billOk.exportCompensation / billOk.exportKwh : 0,
      networkRon: billOk.networkCharges ?? 0, taxesRon: billOk.taxes ?? 0 });
    if (has(billOk.totalRon)) billTotalDiffRon = Math.round((billOk.totalRon - settlement.finalBillRon) * 100) / 100;
    if (billTotalDiffRon !== null && Math.abs(billTotalDiffRon) > 1) explanations.push({ id: 'total', title: 'Bill total differs from recalculation', detail: `Recomputing the bill from its own quantities gives ${settlement.finalBillRon.toFixed(2)} RON; the bill states ${billOk.totalRon?.toFixed(2)} RON. Rounding, other fees or adjustments may explain it.`, confidence: 'low', kind: 'check' });
    if (billOk.compensationMode !== 'none' && billOk.exportKwh > 0 && !billOk.exportCompensation) explanations.push({ id: 'nocomp', title: 'Missing export compensation', detail: 'The bill lists exported energy but no compensation amount. Check the prosumer section of the invoice.', confidence: 'medium', kind: 'check' });
  }

  // ---- Status ----
  const worst = comparisons.filter(c => c.kind !== 'billing' || billOk?.readingType !== 'estimated').reduce((m, c) => Math.max(m, c.ratio), 0);
  const estimatedOnly = comparisons.some(c => c.kind === 'billing' && c.ratio > 1) && billOk?.readingType === 'estimated';
  const status: ReconStatus = !complete || !meter || !inverter ? 'Missing Data'
    : worst > 2 ? 'Investigation Needed'
    : worst > 1 || estimatedOnly ? 'Minor Difference' : 'Reconciled';
  if (!complete) explanations.unshift({ id: 'insufficient', title: 'Insufficient data for a complete reconciliation.', detail: `Missing: ${missing.join(', ')}.`, confidence: 'high', kind: 'check' });

  const billed: FlowValue = billOk && has(billOk.exportKwh) ? { kwh: billOk.exportKwh, basis: 'measured', source: `${billOk.supplier || 'Supplier'} bill (export)` } : { kwh: null, basis: 'missing', source: '—' };
  return {
    periodStart, periodEnd, status, complete, missing, comparisons, explanations, settlement, billTotalDiffRon, unexplained,
    flows: { pv, direct, batteryCharge, batteryDischarge, gridExport, gridImport, losses, consumption, billed },
    selfConsumptionPct: has(direct.kwh) && has(pv.kwh) && pv.kwh > 0 ? r1(pct(direct.kwh, pv.kwh)) : null,
    simulated: [inverter, meter, bill].some(x => x?.origin === 'simulated'),
  };
}

export interface PeriodKey { periodStart: string; periodEnd: string }
/** All periods for one site, newest first, each reconciled independently. */
export function reconcileHistory(siteId: string, measurements: Measurement[], bills: Bill[], hasBattery: boolean, tolerances?: Partial<Tolerances>) {
  const keys = new Map<string, PeriodKey>();
  for (const x of [...measurements.filter(m => m.siteId === siteId), ...bills.filter(b => b.siteId === siteId)]) keys.set(`${x.periodStart}|${x.periodEnd}`, { periodStart: x.periodStart, periodEnd: x.periodEnd });
  return [...keys.values()].sort((a, b) => b.periodStart.localeCompare(a.periodStart)).map(k => {
    const f = <T extends PeriodKey & { siteId: string }>(xs: T[], extra: (x: T) => boolean = () => true) => xs.find(x => x.siteId === siteId && samePeriod(x, k) && extra(x)) ?? null;
    const inverter = f(measurements, m => m.source === 'inverter');
    const meter = f(measurements, m => m.source === 'meter');
    const bill = f(bills);
    return { ...k, inverter, meter, bill, result: reconcile({ inverter, meter, bill, hasBattery, tolerances }) };
  });
}

/** A discrepancy is persistent when at least 2 of the last 3 periods need investigation. */
export function isPersistent(history: { result: ReconResult }[]) {
  return history.slice(0, 3).filter(h => h.result.status === 'Investigation Needed').length >= 2;
}

/** Notifications only for sufficient evidence; normal measurement differences stay silent. */
export function reconAlerts(siteName: string, history: { periodStart: string; result: ReconResult }[]) {
  const latest = history[0];
  if (!latest) return [];
  const month = new Date(`${latest.periodStart}T00:00:00Z`).toLocaleString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  const out: { key: string; priority: 'info' | 'warning'; title: string; body: string }[] = [];
  if (latest.result.complete) out.push({ key: `recon-ready-${siteName}-${latest.periodStart}`, priority: 'info', title: `Your ${month} energy reconciliation is ready`, body: `${siteName}: ${latest.result.status}.` });
  const billExport = latest.result.comparisons.find(c => c.id === 'bill-exportKwh');
  if (billExport && billExport.ratio > 2 && latest.bill?.readingType !== 'estimated') out.push({ key: `recon-bill-${siteName}-${latest.periodStart}`, priority: 'warning', title: 'Your supplier bill may require review', body: `${siteName}: the ${month} bill shows ${billExport.b.kwh} kWh exported, your official meter recorded ${billExport.a.kwh} kWh.` });
  if (isPersistent(history as { result: ReconResult }[]) && latest.result.comparisons.some(c => c.kind === 'technical' && c.ratio > 2)) out.push({ key: `recon-persist-${siteName}-${latest.periodStart}`, priority: 'warning', title: 'Persistent inverter–meter discrepancy', body: `${siteName}: inverter and meter readings have differed beyond tolerance in recent periods.` });
  return out;
}

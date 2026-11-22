import PageContainer from '@/components/layout/page-container';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';

export default async function TraceabilityPage() {
  const [mrs, pos, grns, invoices, creditNotes, transfers, sales, auditLogs] = await Promise.all([
    prisma.materialRequisition.findMany({
      include: { location: true, requestedBy: true, lines: true },
      orderBy: { postingDate: 'asc' }
    }),
    prisma.purchaseOrder.findMany({
      include: { supplier: true, deliverTo: true, lines: true },
      orderBy: { postingDate: 'asc' }
    }),
    prisma.goodsReceiptNote.findMany({
      include: { po: true, location: true, lines: true, amendedFrom: true },
      orderBy: { postingDate: 'asc' }
    }),
    prisma.supplierInvoice.findMany({
      include: { supplier: true, po: true, creditNotes: true },
      orderBy: { postingDate: 'asc' }
    }),
    prisma.creditNote.findMany({
      include: { supplier: true, invoice: true },
      orderBy: { postingDate: 'asc' }
    }),
    prisma.stockTransfer.findMany({
      include: { fromLocation: true, toLocation: true, lines: true },
      orderBy: { createdAt: 'asc' }
    }),
    prisma.salesInvoice.findMany({
      include: { location: true, lines: true, payments: true },
      orderBy: { postingDate: 'asc' }
    }),
    prisma.auditLog.findMany({ include: { user: true }, orderBy: { createdAt: 'asc' } })
  ]);

  // Construct chronological events timeline
  type TimelineEvent = {
    step: string;
    date: string;
    docNumber: string;
    docType: string;
    title: string;
    description: string;
    actor: string;
    status: string;
    statusColor: string;
    metrics: Array<{ label: string; value: string }>;
    href: string;
  };

  const events: TimelineEvent[] = [];

  // 1. Requisitions
  for (const mr of mrs) {
    const qty = mr.lines.reduce((s, l) => s + l.qtyRequested, 0);
    const fulfilled = mr.lines.reduce((s, l) => s + l.qtyFulfilled, 0);
    events.push({
      step: 'Step 1: Branch Requirement Raised',
      date: mr.postingDate.toISOString().slice(0, 10),
      docNumber: mr.docNumber,
      docType: 'Material Requisition',
      title: `${mr.location.name} requested ${qty} vials`,
      description: mr.notes ?? 'Branch stock request for cold-chain insulin replenishment',
      actor: `${mr.requestedBy.name} (${mr.requestedBy.role})`,
      status: mr.status,
      statusColor:
        mr.status === 'APPROVED'
          ? 'bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-300'
          : 'bg-blue-100 text-blue-800',
      metrics: [
        { label: 'Origin', value: mr.location.name },
        { label: 'Requested', value: `${qty} vials` },
        { label: 'Fulfilled', value: `${fulfilled} vials` }
      ],
      href: '/dashboard/requisitions'
    });
  }

  // 2. Purchase Orders
  for (const po of pos) {
    const qty = po.lines.reduce((s, l) => s + l.qtyOrdered, 0);
    const total = po.lines.reduce((s, l) => s + Number(l.unitCost) * l.qtyOrdered * 1.05, 0);
    events.push({
      step: 'Step 2: Formal Supplier Order Issued',
      date: po.postingDate.toISOString().slice(0, 10),
      docNumber: po.docNumber,
      docType: 'Purchase Order',
      title: `Order to ${po.supplier.name} for ${qty} vials`,
      description: `Delivery destination: ${po.deliverTo.name}. Fulfills approved requirement.`,
      actor: 'Purchase Manager (Central Procurement)',
      status: po.status,
      statusColor: 'bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-300',
      metrics: [
        { label: 'Supplier', value: po.supplier.name },
        { label: 'Ordered', value: `${qty} vials` },
        { label: 'Order Value', value: `₹${total.toLocaleString('en-IN')}` }
      ],
      href: '/dashboard/purchase-orders'
    });
  }

  // 3. GRNs
  for (const grn of grns) {
    const accepted = grn.lines.reduce((s, l) => s + l.qtyAccepted, 0);
    const rejected = grn.lines.reduce((s, l) => s + l.qtyRejected, 0);
    const short = grn.lines.reduce((s, l) => s + l.qtyShort, 0);

    const isReversed = grn.status === 'REVERSED';
    const isAmended = grn.amendedFromId !== null;

    events.push({
      step: isReversed
        ? 'Step 3: Initial Receiving Error Recorded'
        : isAmended
          ? 'Step 4: Reverse & Amend Correction Posted'
          : 'Step 3: Physical Goods Receipt Note',
      date: grn.postingDate.toISOString().slice(0, 10),
      docNumber: grn.docNumber,
      docType: 'Goods Receipt Note',
      title: isReversed
        ? `Mistaken Receipt (${grn.docNumber}) — Over-accepted 100 vials`
        : `Physical Receipt Verified against ${grn.po.docNumber}`,
      description: isReversed
        ? 'Store keeper mistakenly accepted 100 vials without recording cold-chain temperature breach.'
        : `Breakdown: ${accepted} Usable, ${rejected} Quarantine (temp breach >8°C), ${short} Short (challan mismatch).`,
      actor: 'Store Keeper (Central Warehouse)',
      status: grn.status,
      statusColor: isReversed
        ? 'bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300'
        : 'bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-300',
      metrics: [
        { label: 'Accepted (Usable)', value: `${accepted} vials` },
        { label: 'Damaged (Quar)', value: `${rejected} vials` },
        { label: 'Short (Missing)', value: `${short} vials` }
      ],
      href: '/dashboard/grn'
    });
  }

  // 4. Invoices & Credit Notes
  for (const inv of invoices) {
    events.push({
      step: 'Step 5: Supplier Settlement & Three-Way Match',
      date: inv.postingDate.toISOString().slice(0, 10),
      docNumber: inv.docNumber,
      docType: 'Supplier Invoice',
      title: `Invoice for ₹${Number(inv.invoicedAmount).toLocaleString('en-IN')} (PO: ${inv.po.docNumber})`,
      description: `Three-Way Match: Payable ₹${Number(inv.payableAmount).toLocaleString('en-IN')}, Disputed ₹${Number(inv.disputedAmount).toLocaleString('en-IN')} for 30 vials.`,
      actor: 'Accounts Officer (Finance)',
      status: inv.status,
      statusColor:
        inv.status === 'DISCREPANT'
          ? 'bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300'
          : 'bg-blue-100 text-blue-800',
      metrics: [
        { label: 'Invoiced', value: `₹${Number(inv.invoicedAmount).toLocaleString('en-IN')}` },
        { label: 'Payable', value: `₹${Number(inv.payableAmount).toLocaleString('en-IN')}` },
        { label: 'Disputed', value: `₹${Number(inv.disputedAmount).toLocaleString('en-IN')}` }
      ],
      href: '/dashboard/invoices'
    });
  }

  for (const cn of creditNotes) {
    events.push({
      step: 'Step 5.1: Supplier Credit Note Issued',
      date: cn.postingDate.toISOString().slice(0, 10),
      docNumber: cn.docNumber,
      docType: 'Credit Note',
      title: `Credit Note from ${cn.supplier.name} for ₹${Number(cn.creditAmount).toLocaleString('en-IN')}`,
      description: cn.reason ?? 'Credit issued for 20 damaged vials and 10 missing delivery vials.',
      actor: 'MediSupply Pharmaceuticals Pvt. Ltd. (Supplier)',
      status: 'APPROVED',
      statusColor: 'bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-300',
      metrics: [
        { label: 'Credit Amount', value: `₹${Number(cn.creditAmount).toLocaleString('en-IN')}` },
        { label: 'Vials Credited', value: `${cn.qtyReturned} vials` },
        { label: 'Invoice Ref', value: cn.invoice.docNumber }
      ],
      href: '/dashboard/credit-notes'
    });
  }

  // 5. Transfers
  for (const st of transfers) {
    const qty = st.lines.reduce((s, l) => s + l.qty, 0);
    events.push({
      step: 'Step 6: Inter-Branch Stock Transfer',
      date: (st.dispatchDate ?? st.createdAt).toISOString().slice(0, 10),
      docNumber: st.docNumber,
      docType: 'Stock Transfer',
      title: `${qty} vials transferred: ${st.fromLocation.name} → ${st.toLocation.name}`,
      description:
        'Cold-chain dispatch (In-Transit) followed by confirmed receipt at Branch A. Fulfills MR-0001 (30/100).',
      actor: 'Store Keeper (Dispatch) & Pharmacist (Receipt)',
      status: st.status,
      statusColor:
        st.status === 'RECEIVED'
          ? 'bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-300'
          : 'bg-blue-100 text-blue-800',
      metrics: [
        { label: 'From', value: st.fromLocation.name },
        { label: 'To', value: st.toLocation.name },
        { label: 'Quantity', value: `${qty} vials` }
      ],
      href: '/dashboard/transfers'
    });
  }

  // 6. Sales
  for (const s of sales) {
    const qty = s.lines.reduce((acc, l) => acc + l.qty, 0);
    const cogs = s.lines.reduce((acc, l) => acc + Number(l.cogs), 0);
    const totalPaid = s.payments.reduce((acc, p) => acc + Number(p.amount), 0);
    const paymentMethod = s.payments[0]?.method ?? 'Unknown';
    events.push({
      step: 'Step 7: Dispensing & FEFO Prescription Sale',
      date: s.postingDate.toISOString().slice(0, 10),
      docNumber: s.docNumber,
      docType: 'Sales Invoice',
      title: `Dispensed ${qty} vials at ${s.location.name} (FEFO batch IG-SEP26-01)`,
      description: s.notes ?? 'Valid prescription dispensing. COGS recognized at purchase cost.',
      actor: 'Pharmacist (Branch A)',
      status: s.status,
      statusColor: 'bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-300',
      metrics: [
        {
          label: 'Retail Value',
          value: `₹${totalPaid.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
        },
        { label: 'COGS', value: `₹${cogs.toLocaleString('en-IN')}` },
        { label: 'Payment', value: `${paymentMethod} (Paid)` }
      ],
      href: '/dashboard/sales'
    });
  }

  // Sort events chronologically: oldest first (Step 1 at top → Step 7 at bottom)
  events.sort((a, b) => a.date.localeCompare(b.date));

  return (
    <PageContainer
      pageTitle='Document Chain & Traceability'
      pageDescription='End-to-end audit trail: Requisition → PO → GRN (with reversal) → Settlement → Transfer → Dispensing — newest first'
    >
      <div className='relative pl-6 before:absolute before:left-2 before:top-3 before:bottom-3 before:w-0.5 before:bg-border space-y-6'>
        {events.map((ev, idx) => (
          <div
            key={idx}
            className='relative flex flex-col gap-2 rounded-xl border bg-card p-4 shadow-xs transition-hover hover:border-primary/40'
          >
            {/* Timeline bullet dot */}
            <div className='absolute -left-[27px] top-4.5 size-3 rounded-full border-2 border-background bg-primary ring-2 ring-border' />

            <div className='flex flex-wrap items-center justify-between gap-2 border-b pb-2'>
              <div className='flex items-center gap-2'>
                <span className='font-mono font-bold text-xs text-primary'>{ev.docNumber}</span>
                <span className='text-xs font-semibold text-muted-foreground uppercase tracking-wide'>
                  {ev.docType}
                </span>
                <span className='text-xs text-muted-foreground'>• {ev.step}</span>
              </div>
              <div className='flex items-center gap-2'>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-semibold ${ev.statusColor}`}
                >
                  {ev.status}
                </span>
                <span className='text-xs font-mono text-muted-foreground'>{ev.date}</span>
              </div>
            </div>

            <div className='space-y-1 pt-1'>
              <div className='font-semibold text-sm text-foreground'>{ev.title}</div>
              <p className='text-xs text-muted-foreground leading-relaxed'>{ev.description}</p>
              <div className='text-[11px] text-muted-foreground'>
                <strong>Acting Party:</strong> {ev.actor}
              </div>
            </div>

            {/* Metrics cards */}
            <div className='grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2'>
              {ev.metrics.map((m, mIdx) => (
                <div
                  key={mIdx}
                  className='rounded-lg bg-muted/40 border border-border/50 px-2.5 py-1.5 text-xs'
                >
                  <div className='text-[10px] text-muted-foreground font-medium uppercase'>
                    {m.label}
                  </div>
                  <div className='font-bold text-foreground mt-0.5'>{m.value}</div>
                </div>
              ))}
            </div>

            <div className='flex justify-end pt-1'>
              <Link
                href={ev.href}
                className='text-xs font-medium text-primary hover:underline flex items-center gap-1'
              >
                View Document in Module →
              </Link>
            </div>
          </div>
        ))}
      </div>
    </PageContainer>
  );
}

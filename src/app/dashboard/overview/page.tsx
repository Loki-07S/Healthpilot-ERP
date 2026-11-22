import PageContainer from '@/components/layout/page-container';
import { prisma } from '@/lib/prisma';

async function getPositionData() {
  const [locations, stockGroups, invoices, salesLines] = await Promise.all([
    prisma.location.findMany(),
    prisma.stockLedgerEntry.groupBy({
      by: ['locationId', 'stockStatus'],
      _sum: { qty: true }
    }),
    prisma.supplierInvoice.findMany({ select: { payableAmount: true, disputedAmount: true } }),
    prisma.salesInvoiceLine.findMany({ select: { qty: true, cogs: true } })
  ]);

  if (locations.length === 0) return null;

  const locMap = Object.fromEntries(locations.map((l) => [l.code, l.id]));

  const getSum = (locCode: string, status: string) => {
    const locId = locMap[locCode];
    const group = stockGroups.find((g) => g.locationId === locId && g.stockStatus === status);
    return Number(group?._sum.qty ?? 0);
  };

  const centralUsable = getSum('LOC-CENTRAL', 'USABLE');
  const centralQuarantine = getSum('LOC-CENTRAL', 'QUARANTINE');
  const centralInTransit = getSum('LOC-CENTRAL', 'IN_TRANSIT');
  const branchAUsable = getSum('LOC-BRA', 'USABLE');
  const branchBUsable = getSum('LOC-BRB', 'USABLE');
  const branchCUsable = getSum('LOC-BRC', 'USABLE');

  const payable = invoices.reduce((s, i) => s + Number(i.payableAmount), 0);
  const disputed = invoices.reduce((s, i) => s + Number(i.disputedAmount), 0);
  const cogs = salesLines.reduce((s, l) => s + Number(l.cogs), 0);
  const sold = salesLines.reduce((s, l) => s + l.qty, 0);

  return {
    centralUsable,
    centralQuarantine,
    centralInTransit,
    branchAUsable,
    branchBUsable,
    branchCUsable,
    payable,
    disputed,
    cogs,
    sold
  };
}

function StatCard({
  label,
  value,
  sub,
  color = 'default'
}: {
  label: string;
  value: string | number;
  sub?: string;
  color?: 'default' | 'green' | 'orange' | 'red' | 'blue';
}) {
  const colorMap = {
    default: 'border-border',
    green: 'border-green-500 bg-green-50 dark:bg-green-950/20',
    orange: 'border-orange-400 bg-orange-50 dark:bg-orange-950/20',
    red: 'border-red-500 bg-red-50 dark:bg-red-950/20',
    blue: 'border-blue-500 bg-blue-50 dark:bg-blue-950/20'
  };
  return (
    <div className={`rounded-xl border-2 p-4 ${colorMap[color]}`}>
      <div className='text-muted-foreground mb-1 text-xs font-medium uppercase tracking-wide'>
        {label}
      </div>
      <div className='text-2xl font-bold'>{value}</div>
      {sub && <div className='text-muted-foreground mt-1 text-xs'>{sub}</div>}
    </div>
  );
}

export default async function OverviewPage() {
  const pos = await getPositionData();

  return (
    <PageContainer
      pageTitle='Stock Position Dashboard'
      pageDescription='Insulin Glargine 100 IU/ml — live across all locations'
    >
      {!pos ? (
        <div className='text-muted-foreground'>Run seed first: npm run db:seed</div>
      ) : (
        <div className='space-y-6'>
          {/* Stock by location */}
          <section>
            <h2 className='mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground'>
              Stock by Location (Vials)
            </h2>
            <div className='grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6'>
              <StatCard label='Central · Usable' value={pos.centralUsable} color='green' />
              <StatCard label='Central · Quarantine' value={pos.centralQuarantine} color='orange' />
              <StatCard label='Central · In-Transit' value={pos.centralInTransit} color='blue' />
              <StatCard label='Branch A · Usable' value={pos.branchAUsable} />
              <StatCard label='Branch B · Usable' value={pos.branchBUsable} />
              <StatCard label='Branch C · Usable' value={pos.branchCUsable} />
            </div>
          </section>

          {/* Financials */}
          <section>
            <h2 className='mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground'>
              Financial Position (₹)
            </h2>
            <div className='grid grid-cols-2 gap-3 sm:grid-cols-4'>
              <StatCard
                label='Payable to Supplier'
                value={`₹${pos.payable.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`}
                color='green'
              />
              <StatCard
                label='Disputed Amount'
                value={`₹${pos.disputed.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`}
                color='red'
              />
              <StatCard
                label='COGS'
                value={`₹${pos.cogs.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`}
                color='blue'
              />
              <StatCard label='Vials Dispensed' value={pos.sold} sub='units sold' />
            </div>
          </section>

          {/* Quick links */}
          <section>
            <h2 className='mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground'>
              Document Flow
            </h2>
            <div className='flex flex-wrap gap-2 text-sm'>
              {[
                ['Traceability & Audit Chain', '/dashboard/traceability'],
                ['MR', '/dashboard/requisitions'],
                ['PO', '/dashboard/purchase-orders'],
                ['GRN', '/dashboard/grn'],
                ['Invoice', '/dashboard/invoices'],
                ['Credit Note', '/dashboard/credit-notes'],
                ['Transfer', '/dashboard/transfers'],
                ['Sales', '/dashboard/sales'],
                ['Ledger', '/dashboard/ledger']
              ].map(([label, href]) => (
                <a
                  key={label}
                  href={href}
                  className='rounded-md border px-3 py-1.5 font-medium hover:bg-accent transition-colors'
                >
                  {label}
                </a>
              ))}
            </div>
          </section>
        </div>
      )}
    </PageContainer>
  );
}

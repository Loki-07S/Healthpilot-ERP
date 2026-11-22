/**
 * POST /api/scenario/reset
 * Resets the entire transactional database back to the exact challenge specification baseline:
 *  - MR-0001 (Branch A 100), MR-0002 (Branch B 40), MR-0003 (Branch C 60)
 *  - PO-0001 (100 vials -> Central Warehouse)
 *  - GRN-0001 (Reversed) -> GRN-0002 (Amended: 70 Usable, 20 Quarantine, 10 Short)
 *  - SI-0001 (52,500 total, 36,750 payable, 15,750 disputed) + CN-0001 (15,750 credit)
 *  - ST-0001 (30 vials Central -> Branch A)
 *  - SAL-0001 (5 vials dispensed at Branch A, COGS ₹2,500)
 */
import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import path from 'path';

export async function POST(): Promise<NextResponse> {
  return new Promise<NextResponse>((resolve) => {
    const nodeExecutable = path.resolve(process.cwd(), '..', '.tools', 'node-v20.20.2', 'node.exe');
    const scriptPath = path.resolve(process.cwd(), 'scripts', 'execute-full-scenario.ts');
    const tsxCli = path.resolve(process.cwd(), 'node_modules', 'tsx', 'dist', 'cli.mjs');

    const cmd = `"${nodeExecutable}" "${tsxCli}" "${scriptPath}"`;

    exec(cmd, { cwd: process.cwd() }, (error, stdout, stderr) => {
      if (error) {
        console.error('Reset error:', stderr);
        resolve(NextResponse.json({ error: stderr || error.message }, { status: 500 }));
      } else {
        console.log('Reset stdout:', stdout);
        resolve(
          NextResponse.json({ message: 'Successfully reset to scenario baseline!', output: stdout })
        );
      }
    });
  });
}

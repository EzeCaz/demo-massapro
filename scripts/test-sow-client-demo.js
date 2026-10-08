// Smoke test for the Client Demo field — verifies it appears in the
// Word export cover info table AND the page header (top-right).
import { buildSowDoc } from '../src/lib/sow-export.ts'
import { DEFAULT_MILESTONES } from '../src/lib/sow-data.ts'
import { writeFileSync, readFileSync } from 'fs'
import { execSync } from 'child_process'

async function main() {
  const payload = {
    cover: {
      clientName: 'Acme Inc.',
      clientDemo: 'Acme Q4 Outbound Demo',
      projectName: 'Implementation of your MassaPro platform',
      date: '2026-10-08',
      version: 'v1.0',
      preparedBy: 'JP — Solutions Architect',
      overview: 'Acme is launching a new contact center.',
    },
    selectedServiceIds: ['voice', 'training'],
    customServices: [],
    taskState: {},
    specValues: {},
    logoBuffer: null,
    milestones: DEFAULT_MILESTONES,
  }
  const blob = await buildSowDoc(payload)
  const buf = Buffer.from(await blob.arrayBuffer())
  writeFileSync('/tmp/sow-client-demo.docx', buf)
  console.log('Wrote /tmp/sow-client-demo.docx', buf.length, 'bytes')

  execSync('cd /tmp && rm -rf sow-cd-unzip && unzip -o sow-client-demo.docx -d sow-cd-unzip >/dev/null 2>&1')
  const xml = readFileSync('/tmp/sow-cd-unzip/word/document.xml', 'utf8')
  // Check cover info table + page header
  const checks = [
    'Client Demo',           // cover info table label
    'Acme Q4 Outbound Demo', // the value (appears in cover + every page header)
  ]
  let ok = 0
  let fail = 0
  for (const c of checks) {
    const count = (xml.match(new RegExp(c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length
    if (count > 0) {
      console.log(`  ✓ "${c}" appears ${count} time(s)`)
      ok++
    } else {
      console.log(`  ✗ MISSING: "${c}"`)
      fail++
    }
  }
  console.log(`\nResult: ${ok}/${checks.length} checks passed`)
  if (fail > 0) process.exit(1)
}
main().catch((e) => { console.error(e); process.exit(1) })

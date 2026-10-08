// Smoke test for the SOW PDF export — uses tsx to import the route's
// dependencies, mocks a SOWSnapshot, and verifies the PDF builder
// doesn't runtime-error. The actual PDF is generated via an HTTP GET
// to the route in production; here we just verify the buildSowDoc
// equivalent (the Word version) still works after the redesign.
import { buildSowDoc } from '../src/lib/sow-export.ts'
import { DEFAULT_MILESTONES } from '../src/lib/sow-data.ts'
import { writeFileSync } from 'fs'

async function main() {
  const payload = {
    cover: {
      clientName: 'Acme Inc.',
      projectName: 'Implementation of your MassaPro platform',
      date: '2026-10-08',
      version: 'v1.0',
      preparedBy: 'JP — Solutions Architect',
      overview: 'Acme is launching a new contact center.',
    },
    selectedServiceIds: ['voice', 'whatsapp', 'sms', 'training'],
    customServices: [],
    taskState: { 'voice-1': { status: 'completed', owner: 'JP', notes: 'CLIs allocated' } },
    specValues: { 'voice-r-1': 'audio-files.zip' },
    logoBuffer: null,
    milestones: DEFAULT_MILESTONES,
  }
  const blob = await buildSowDoc(payload)
  const buf = Buffer.from(await blob.arrayBuffer())
  writeFileSync('/tmp/sow-test-v2.docx', buf)
  console.log('Wrote /tmp/sow-test-v2.docx', buf.length, 'bytes')

  // Verify it contains the new gradient banner elements
  // (look for the deeper Orchid hex 6B21A8)
  import('child_process').then(({ execSync }) => {
    execSync('cd /tmp && rm -rf sow-test-v2-unzip && unzip -o sow-test-v2.docx -d sow-test-v2-unzip >/dev/null 2>&1')
    const { readFileSync } = require('fs')
    const xml = readFileSync('/tmp/sow-test-v2-unzip/word/document.xml', 'utf8')
    const checks = [
      '6B21A8',       // ORCHID_DEEP (gradient top)
      '7E22CE',       // ORCHID_MID (gradient mid)
      'FAF5FF',       // LAVENDER_LIGHT (gradient bottom)
      'MassaPro',
      'Statement of Work',
      'Welcome to MassaPro',
      'Configuration',
      'Requirements',
      'Project Milestones',
      'Signatures',
    ]
    let ok = 0
    let fail = 0
    for (const c of checks) {
      if (xml.includes(c)) { console.log('  ✓ contains:', c); ok++ }
      else { console.log('  ✗ MISSING:', c); fail++ }
    }
    console.log(`\nResult: ${ok}/${checks.length} checks passed`)
    if (fail > 0) process.exit(1)
  })
}
main().catch((e) => { console.error(e); process.exit(1) })

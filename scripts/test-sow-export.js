// Smoke test for the SOW docx export — uses tsx to import the TS module,
// generates a .docx with mock data, and saves it to /tmp/sow-test.docx.
// Run with: npx tsx scripts/test-sow-export.js
import { buildSowDoc } from '../src/lib/sow-export.ts'
import { SERVICES, DEFAULT_MILESTONES } from '../src/lib/sow-data.ts'
import { writeFileSync, readFileSync } from 'fs'
import { execSync } from 'child_process'

async function main() {
  const selectedServiceIds = ['voice', 'whatsapp', 'sms', 'email', 'athena-agent', 'training']
  const customService = {
    id: 'custom-1',
    name: 'Custom Web Chat',
    description: 'Brand-new channel we want to track in the SOW.',
    tasks: [
      { id: 'ct1', title: 'Discover web chat requirements', description: '...', estimatedHours: 4, category: 'channel' },
    ],
    techSpecs: [
      { id: 'cs1', field: 'Snippet location', description: 'Where the chat snippet will be embedded.', example: 'www.client.com' },
    ],
  }

  const payload = {
    cover: {
      clientName: 'Acme Inc.',
      projectName: 'Implementation of your MassaPro platform',
      date: '2026-10-08',
      version: 'v1.0',
      preparedBy: 'JP — Solutions Architect',
      overview: 'Acme is launching a new contact center; this SOW covers the MassaPro implementation across Voice, WhatsApp, SMS, Email, AI Agent and Training.',
    },
    selectedServiceIds,
    customServices: [customService],
    taskState: {
      'voice-1': { status: 'completed', owner: 'JP', dueDate: '2026-10-15', notes: 'CLIs allocated' },
      'voice-2': { status: 'in-progress', owner: 'Maria', dueDate: '2026-10-22', notes: 'Training scheduled' },
    },
    specValues: {
      'voice-r-1': 'audio-files.zip provided',
    },
    logoBuffer: null,
    milestones: DEFAULT_MILESTONES,
  }

  const blob = await buildSowDoc(payload)
  const buf = Buffer.from(await blob.arrayBuffer())
  writeFileSync('/tmp/sow-test.docx', buf)
  console.log('Wrote /tmp/sow-test.docx', buf.length, 'bytes')

  // Verify the docx contains expected content via unzip + grep on document.xml
  execSync('cd /tmp && rm -rf sow-test-unzip && unzip -o sow-test.docx -d sow-test-unzip >/dev/null 2>&1')
  const xml = readFileSync('/tmp/sow-test-unzip/word/document.xml', 'utf8')
  const checks = [
    'MassaPro',
    'Statement of Work',
    'Acme Inc.',
    'Welcome to MassaPro',
    'Voice',
    'WhatsApp',
    'SMS',
    'Email',
    'Athena AI Agent',
    'Custom Web Chat',
    'Configuration',
    'Requirements',
    'Project Milestones',
    'Intro Call',
    'Go Live',
    'Signatures',
  ]
  let ok = 0
  let fail = 0
  for (const c of checks) {
    if (xml.includes(c)) {
      console.log('  ✓ contains:', c)
      ok++
    } else {
      console.log('  ✗ MISSING:', c)
      fail++
    }
  }
  console.log(`\nResult: ${ok}/${checks.length} checks passed`)
  if (fail > 0) {
    process.exit(1)
  }
}

main().catch((e) => { console.error(e); process.exit(1) })


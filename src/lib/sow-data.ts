// MassaPro SOW Builder — Service catalog and default tasks/specs.
//
// This module is the single source of truth for the SOW Builder UI:
//   - SERVICES defines all built-in channels/features that can be toggled
//   - Each service has a default set of tasks and tech-spec rows
//   - The Word export reads the same data structure
//
// Brand colors (from MassaPro Brand Book):
//   Orchid Purple  #9333EA   (primary accent, headers, buttons)
//   Pure White     #FFFFFF   (backgrounds, card fills)
//   Jet Black      #030712   (body text, primary text)
//   Soft Lavender  #F3E8FF   (subtle backgrounds, badges, hover states)
//
// All tasks are written as deliverables (Connex→MassaPro replacement applies
// at render time so the SOW is brand-clean by default).

export type ServiceCategory =
  | 'channel'        // inbound/outbound communication channels
  | 'voice'          // voice-specific features (IVR, dialer, queue)
  | 'infrastructure' // SIP, CRM, DB, reports
  | 'data'           // import/storage/archival
  | 'ops'            // ops, security, training

export interface ServiceTask {
  id: string
  title: string
  description: string
  estimatedHours: number
  category: ServiceCategory
  // subTasks are child items shown indented under the parent
  subTasks?: { id: string; title: string; description: string }[]
}

export interface TechSpecRow {
  id: string
  field: string
  description: string
  example?: string
}

export interface Service {
  id: string
  name: string
  category: ServiceCategory
  icon: string // lucide icon name (we map it in the component)
  description: string
  enabledByDefault?: boolean
  tasks: ServiceTask[]
  techSpecs: TechSpecRow[]
}

// ---------------------------------------------------------------------------
// Service catalog
// ---------------------------------------------------------------------------
export const SERVICES: Service[] = [
  // ---- CHANNELS ------------------------------------------------------------
  {
    id: 'voice',
    name: 'Voice (Inbound/Outbound)',
    category: 'channel',
    icon: 'Phone',
    description: 'Inbound and outbound voice calls with queue, routing and recording.',
    enabledByDefault: true,
    tasks: [
      {
        id: 'voice-1',
        title: 'Provision voice infrastructure',
        description:
          'Activate MassaPro voice tenants, allocate DID numbers, and verify call setup/teardown across primary and failover regions.',
        estimatedHours: 12,
        category: 'channel',
      },
      {
        id: 'voice-2',
        title: 'Configure inbound call routing',
        description:
          'Build skill-based routing rules, queue overflow logic, and business-hours / after-hours call flows.',
        estimatedHours: 16,
        category: 'channel',
        subTasks: [
          { id: 'voice-2a', title: 'Skills & queues', description: 'Define skills, queues and priority weights.' },
          { id: 'voice-2b', title: 'Hours of operation', description: 'Configure business hours per region/language.' },
          { id: 'voice-2c', title: 'Overflow handling', description: 'Set overflow to voicemail, callback, or backup queue.' },
        ],
      },
      {
        id: 'voice-3',
        title: 'Enable call recording & monitoring',
        description:
          'Activate recording with pause/resume, role-based playback access, and retention policy per compliance.',
        estimatedHours: 8,
        category: 'channel',
      },
      {
        id: 'voice-4',
        title: 'Voice users & permissions',
        description:
          'Onboard agents and supervisors, assign roles, configure softphone credentials and device profiles.',
        estimatedHours: 6,
        category: 'channel',
      },
    ],
    techSpecs: [
      { id: 'voice-spec-1', field: 'Languages to use', description: 'Languages for IVR and agent voice.', example: 'EN, ES, HE' },
      { id: 'voice-spec-2', field: 'Tel numbers', description: 'Numbers to port or whitelist.', example: '+1 555, +972 3, +44 20' },
      { id: 'voice-spec-3', field: 'Voice users count', description: 'Concurrent agent seats.', example: '25' },
      { id: 'voice-spec-4', field: 'Inbound calls/day', description: 'Current inbound volume.', example: '~1,500' },
    ],
  },
  {
    id: 'autodialer',
    name: 'Auto Dialer (Outbound Campaigns)',
    category: 'voice',
    icon: 'Zap',
    description: 'Predictive / progressive / preview dialer for outbound campaigns.',
    enabledByDefault: false,
    tasks: [
      {
        id: 'ad-1',
        title: 'Configure dialer campaign',
        description:
          'Build campaign with list source, calling window, pacing algorithm (predictive / progressive / preview), and dispositions.',
        estimatedHours: 10,
        category: 'voice',
      },
      {
        id: 'ad-2',
        title: 'Import lead lists',
        description:
          'Map lead CSV columns to MassaPro fields, dedupe by phone, set DNC scrub and timezone rules.',
        estimatedHours: 6,
        category: 'voice',
      },
      {
        id: 'ad-3',
        title: 'Skills & agent assignment',
        description: 'Assign agents to campaign skills, set concurrency and per-agent pacing limits.',
        estimatedHours: 4,
        category: 'voice',
      },
      {
        id: 'ad-4',
        title: 'Compliance & DNC',
        description: 'Apply DNC list, country-of-call rules, max attempts, quiet hours and abandoned-call thresholds.',
        estimatedHours: 8,
        category: 'voice',
      },
    ],
    techSpecs: [
      { id: 'ad-spec-1', field: 'Leads per day', description: 'Expected daily lead volume.', example: '5,000' },
      { id: 'ad-spec-2', field: 'Dialer type', description: 'Predictive / Progressive / Preview.', example: 'Predictive' },
      { id: 'ad-spec-3', field: 'Calling hours', description: 'Time window for outbound calls.', example: 'Mon–Fri 09:00–18:00 local' },
    ],
  },
  {
    id: 'ivr',
    name: 'IVR / Flow Builder',
    category: 'voice',
    icon: 'Workflow',
    description: 'Voice menus, DTMF/speech, smart routing, callbacks.',
    enabledByDefault: true,
    tasks: [
      {
        id: 'ivr-1',
        title: 'Design IVR flow',
        description: 'Map menus, options, language selection and self-service loops.',
        estimatedHours: 10,
        category: 'voice',
      },
      {
        id: 'ivr-2',
        title: 'Build speech / DTMF menus',
        description: 'Configure prompts, ASR grammar and DTMF mappings.',
        estimatedHours: 12,
        category: 'voice',
      },
      {
        id: 'ivr-3',
        title: 'Queue routing from IVR',
        description: 'Connect IVR endpoints to queues, voicemail and callback flows.',
        estimatedHours: 6,
        category: 'voice',
      },
    ],
    techSpecs: [
      { id: 'ivr-spec-1', field: 'Languages', description: 'IVR prompt languages.', example: 'EN, ES, HE' },
      { id: 'ivr-spec-2', field: 'ASR provider', description: 'Native or 3rd-party ASR.', example: 'MassaPro native' },
    ],
  },
  {
    id: 'ooh',
    name: 'Out-of-Hours Routing',
    category: 'voice',
    icon: 'Moon',
    description: 'After-hours, weekend and holiday routing strategy.',
    enabledByDefault: false,
    tasks: [
      {
        id: 'ooh-1',
        title: 'Define business hours per queue',
        description: 'Configure hours per region, language and queue.',
        estimatedHours: 4,
        category: 'voice',
      },
      {
        id: 'ooh-2',
        title: 'Configure after-hours flow',
        description: 'Send to voicemail, callback form, emergency on-call, or alternate queue.',
        estimatedHours: 6,
        category: 'voice',
      },
      {
        id: 'ooh-3',
        title: 'Holiday calendar',
        description: 'Import country / client holiday calendar and override rules.',
        estimatedHours: 4,
        category: 'voice',
      },
    ],
    techSpecs: [
      { id: 'ooh-spec-1', field: 'OOH strategy', description: 'Voicemail / callback / on-call.', example: 'Voicemail + callback' },
    ],
  },
  {
    id: 'inbound-queue',
    name: 'Inbound Voice Queue',
    category: 'voice',
    icon: 'ListOrdered',
    description: 'Skill-based inbound queue with waiting & priority logic.',
    enabledByDefault: true,
    tasks: [
      {
        id: 'iq-1',
        title: 'Define queues & skills',
        description: 'Create queues, assign skills, set service-level targets.',
        estimatedHours: 8,
        category: 'voice',
      },
      {
        id: 'iq-2',
        title: 'Waiting & priority',
        description: 'Set max wait, priority weights, queue position announcements and overflow.',
        estimatedHours: 6,
        category: 'voice',
      },
      {
        id: 'iq-3',
        title: 'Callback & estimated wait',
        description: 'Offer callback when wait exceeds threshold, announce EWT.',
        estimatedHours: 6,
        category: 'voice',
      },
    ],
    techSpecs: [
      { id: 'iq-spec-1', field: 'Service level target', description: 'Target answer rate.', example: '80% in 20s' },
      { id: 'iq-spec-2', field: 'Max wait (s)', description: 'Max acceptable wait before callback.', example: '60' },
    ],
  },
  // ---- DIGITAL CHANNELS -----------------------------------------------------
  {
    id: 'whatsapp',
    name: 'WhatsApp',
    category: 'channel',
    icon: 'MessageCircle',
    description: 'WhatsApp Business API integration with templates and agent inbox.',
    enabledByDefault: false,
    tasks: [
      {
        id: 'wa-1',
        title: 'Connect WhatsApp Business Account',
        description: 'WABA onboarding, phone number registration, message template approval.',
        estimatedHours: 8,
        category: 'channel',
      },
      {
        id: 'wa-2',
        title: 'Build WhatsApp flow',
        description: 'Map inbound message routing, agent assignment, bot handoff and template triggers.',
        estimatedHours: 10,
        category: 'channel',
      },
      {
        id: 'wa-3',
        title: 'Approve message templates',
        description: 'Submit and approve HSM templates for notifications and outbound.',
        estimatedHours: 4,
        category: 'channel',
      },
    ],
    techSpecs: [
      { id: 'wa-spec-1', field: 'WABA ID', description: 'WhatsApp Business Account ID.', example: '1234567890' },
      { id: 'wa-spec-2', field: 'Phone number', description: 'WhatsApp-registered number.', example: '+1 555 0100' },
      { id: 'wa-spec-3', field: 'Templates', description: 'List of approved templates.', example: 'order_status, appointment_reminder' },
    ],
  },
  {
    id: 'sms',
    name: 'SMS',
    category: 'channel',
    icon: 'Smartphone',
    description: 'Two-way SMS, campaign bulk send and keyword auto-responders.',
    enabledByDefault: false,
    tasks: [
      {
        id: 'sms-1',
        title: 'Provision SMS numbers',
        description: 'Allocate long-code / short-code / toll-free SMS numbers per country.',
        estimatedHours: 6,
        category: 'channel',
      },
      {
        id: 'sms-2',
        title: 'Configure SMS routing',
        description: 'Inbound keyword routing, agent inbox, outbound campaign send.',
        estimatedHours: 8,
        category: 'channel',
      },
      {
        id: 'sms-3',
        title: 'Compliance (10DLC / A2P)',
        description: 'Register campaigns, brand, and ensure carrier approval in US/CA.',
        estimatedHours: 6,
        category: 'channel',
      },
    ],
    techSpecs: [
      { id: 'sms-spec-1', field: 'Numbers', description: 'SMS-capable numbers.', example: '+1 555 0200' },
      { id: 'sms-spec-2', field: 'Daily volume', description: 'Outbound SMS per day.', example: '10,000' },
      { id: 'sms-spec-3', field: 'Countries', description: 'Destination countries.', example: 'US, CA, MX' },
    ],
  },
  {
    id: 'email',
    name: 'Email',
    category: 'channel',
    icon: 'Mail',
    description: 'Inbound email-to-ticket, outbound email campaigns.',
    enabledByDefault: false,
    tasks: [
      {
        id: 'em-1',
        title: 'Connect email account',
        description: 'IMAP/SMTP or OAuth connect to shared mailbox.',
        estimatedHours: 4,
        category: 'channel',
      },
      {
        id: 'em-2',
        title: 'Email routing & assignment',
        description: 'Parse inbound, route by subject/sender, assign to agent queues.',
        estimatedHours: 8,
        category: 'channel',
      },
      {
        id: 'em-3',
        title: 'Templates & signatures',
        description: 'Build outbound templates, signature blocks, disclaimers.',
        estimatedHours: 6,
        category: 'channel',
      },
    ],
    techSpecs: [
      { id: 'em-spec-1', field: 'Mailbox', description: 'Shared mailbox address.', example: 'support@client.com' },
      { id: 'em-spec-2', field: 'Protocol', description: 'IMAP / SMTP / OAuth.', example: 'OAuth (Microsoft 365)' },
    ],
  },
  {
    id: 'social',
    name: 'Facebook & Instagram',
    category: 'channel',
    icon: 'Share2',
    description: 'FB Messenger and Instagram DM unified inbox.',
    enabledByDefault: false,
    tasks: [
      {
        id: 'soc-1',
        title: 'Connect FB/IG pages',
        description: 'OAuth Meta Business, link pages and Instagram accounts.',
        estimatedHours: 6,
        category: 'channel',
      },
      {
        id: 'soc-2',
        title: 'Build DM routing',
        description: 'Inbound DM routing to agent inbox, comment auto-reply, bot handoff.',
        estimatedHours: 8,
        category: 'channel',
      },
    ],
    techSpecs: [
      { id: 'soc-spec-1', field: 'FB Page', description: 'Connected Facebook page name.', example: 'Acme Support' },
      { id: 'soc-spec-2', field: 'IG account', description: 'Connected Instagram handle.', example: '@acme.support' },
    ],
  },
  {
    id: 'ticketing',
    name: 'Ticketing',
    category: 'channel',
    icon: 'Ticket',
    description: 'Unified ticketing across channels with SLAs.',
    enabledByDefault: false,
    tasks: [
      {
        id: 'tk-1',
        title: 'Configure ticket categories',
        description: 'Build category / subcategory taxonomy, priority levels, SLA per category.',
        estimatedHours: 8,
        category: 'channel',
      },
      {
        id: 'tk-2',
        title: 'Build ticket forms',
        description: 'Custom fields, custom statuses, automations and triggers.',
        estimatedHours: 10,
        category: 'channel',
      },
      {
        id: 'tk-3',
        title: 'SLA & escalation',
        description: 'Set SLA timers, escalation rules and breach notifications.',
        estimatedHours: 6,
        category: 'channel',
      },
    ],
    techSpecs: [
      { id: 'tk-spec-1', field: 'Channels merged', description: 'Channels feeding the ticket queue.', example: 'Email, WhatsApp, Web' },
      { id: 'tk-spec-2', field: 'SLA tiers', description: 'SLA per priority.', example: 'P1: 1h, P2: 4h, P3: 24h' },
    ],
  },
  // ---- INFRASTRUCTURE -------------------------------------------------------
  {
    id: 'sip',
    name: 'SIP Trunk',
    category: 'infrastructure',
    icon: 'Network',
    description: 'SIP trunk to client PBX or carrier with failover.',
    enabledByDefault: false,
    tasks: [
      {
        id: 'sip-1',
        title: 'Provision SIP trunk',
        description: 'Configure trunk to client PBX/carrier, codecs, DTMF mode.',
        estimatedHours: 8,
        category: 'infrastructure',
      },
      {
        id: 'sip-2',
        title: 'Inbound routing per trunk',
        description: 'Map DIDs to internal destinations, set failover to backup trunk.',
        estimatedHours: 6,
        category: 'infrastructure',
      },
      {
        id: 'sip-3',
        title: 'SIP security',
        description: 'IP allowlist, TLS/SRTP, digest auth, toll-fraud protection.',
        estimatedHours: 6,
        category: 'infrastructure',
      },
    ],
    techSpecs: [
      { id: 'sip-spec-1', field: 'Provider', description: 'Carrier or PBX vendor.', example: 'Twilio SIP' },
      { id: 'sip-spec-2', field: 'Codecs', description: 'Audio codecs.', example: 'G.711u, G.729' },
      { id: 'sip-spec-3', field: 'DTMF', description: 'DTMF transport.', example: 'RFC2833' },
    ],
  },
  {
    id: 'crm',
    name: 'CRM / DB Integration',
    category: 'infrastructure',
    icon: 'Database',
    description: 'Bidirectional sync with CRM/DB (Salesforce, HubSpot, custom).',
    enabledByDefault: true,
    tasks: [
      {
        id: 'crm-1',
        title: 'CRM discovery & mapping',
        description: 'Identify CRM objects to sync, field mapping, write-back rules.',
        estimatedHours: 8,
        category: 'infrastructure',
      },
      {
        id: 'crm-2',
        title: 'Build integration',
        description: 'Use MassaPro connector or REST API to sync contacts, tickets, activities.',
        estimatedHours: 16,
        category: 'infrastructure',
      },
      {
        id: 'crm-3',
        title: 'Screen-pop & click-to-call',
        description: 'Agent screen-pop on inbound, click-to-call from CRM, activity logging.',
        estimatedHours: 10,
        category: 'infrastructure',
      },
    ],
    techSpecs: [
      { id: 'crm-spec-1', field: 'CRM platform', description: 'CRM system name.', example: 'Salesforce Service Cloud' },
      { id: 'crm-spec-2', field: 'Auth', description: 'Auth method.', example: 'OAuth 2.0' },
      { id: 'crm-spec-3', field: 'Sync direction', description: 'Bi-directional / one-way.', example: 'Bi-directional' },
    ],
  },
  {
    id: 'reports',
    name: 'Reports & Analytics',
    category: 'infrastructure',
    icon: 'BarChart3',
    description: 'Realtime dashboards, scheduled reports and custom KPIs.',
    enabledByDefault: true,
    tasks: [
      {
        id: 'rep-1',
        title: 'Define KPIs & report list',
        description: 'Workshop with stakeholder to agree on KPIs and report schedule.',
        estimatedHours: 6,
        category: 'infrastructure',
      },
      {
        id: 'rep-2',
        title: 'Build standard dashboards',
        description: 'Realtime wallboards, agent performance, queue health.',
        estimatedHours: 10,
        category: 'infrastructure',
      },
      {
        id: 'rep-3',
        title: 'Scheduled exports',
        description: 'CSV/PDF/email reports on daily / weekly / monthly cadence.',
        estimatedHours: 6,
        category: 'infrastructure',
      },
    ],
    techSpecs: [
      { id: 'rep-spec-1', field: 'KPIs', description: 'KPIs to track.', example: 'SL, AHT, FCR, CSAT' },
      { id: 'rep-spec-2', field: 'Cadence', description: 'Report cadence.', example: 'Daily, weekly, monthly' },
    ],
  },
  // ---- DATA -----------------------------------------------------------------
  {
    id: 'import',
    name: 'Initial Data Import',
    category: 'data',
    icon: 'Upload',
    description: 'Bulk import of leads, contacts, knowledge base and prompts.',
    enabledByDefault: false,
    tasks: [
      {
        id: 'imp-1',
        title: 'Data discovery & mapping',
        description: 'Identify source data, format, dedupe rules and target schema.',
        estimatedHours: 6,
        category: 'data',
      },
      {
        id: 'imp-2',
        title: 'Execute import',
        description: 'Run import in staging, validate, then promote to production.',
        estimatedHours: 8,
        category: 'data',
      },
      {
        id: 'imp-3',
        title: 'Validation sign-off',
        description: 'Stakeholder sign-off on imported records, rollback plan if needed.',
        estimatedHours: 4,
        category: 'data',
      },
    ],
    techSpecs: [
      { id: 'imp-spec-1', field: 'Source', description: 'Source of data.', example: 'CSV, Salesforce export' },
      { id: 'imp-spec-2', field: 'Volume', description: 'Approximate record count.', example: '50,000 contacts' },
    ],
  },
  {
    id: 'storage',
    name: 'Customer Data Storage',
    category: 'data',
    icon: 'HardDrive',
    description: 'Storage of PII, recordings and chat transcripts (retention & residency).',
    enabledByDefault: true,
    tasks: [
      {
        id: 'st-1',
        title: 'Define retention policy',
        description: 'Set retention for recordings, transcripts, PII per compliance.',
        estimatedHours: 4,
        category: 'data',
      },
      {
        id: 'st-2',
        title: 'Data residency',
        description: 'Choose storage region to meet GDPR/HIPAA/etc.',
        estimatedHours: 4,
        category: 'data',
      },
    ],
    techSpecs: [
      { id: 'st-spec-1', field: 'Region', description: 'Storage region.', example: 'EU-Frankfurt' },
      { id: 'st-spec-2', field: 'Retention', description: 'Retention period.', example: '12 months' },
    ],
  },
  // ---- OPS ------------------------------------------------------------------
  {
    id: 'security',
    name: 'Security & SSO',
    category: 'ops',
    icon: 'ShieldCheck',
    description: 'SSO, MFA, role-based access and audit logging.',
    enabledByDefault: true,
    tasks: [
      {
        id: 'sec-1',
        title: 'SSO integration',
        description: 'SAML / OIDC SSO with client IdP, group/role mapping.',
        estimatedHours: 10,
        category: 'ops',
      },
      {
        id: 'sec-2',
        title: 'Roles & permissions',
        description: 'Define role hierarchy, per-queue permissions, supervisor scope.',
        estimatedHours: 6,
        category: 'ops',
      },
      {
        id: 'sec-3',
        title: 'Audit logging',
        description: 'Enable audit log for admin actions, exports and access.',
        estimatedHours: 4,
        category: 'ops',
      },
    ],
    techSpecs: [
      { id: 'sec-spec-1', field: 'IdP', description: 'Identity provider.', example: 'Azure AD' },
      { id: 'sec-spec-2', field: 'MFA', description: 'MFA enforcement.', example: 'Required for admins' },
    ],
  },
  {
    id: 'training',
    name: 'Training & Handover',
    category: 'ops',
    icon: 'GraduationCap',
    description: 'Admin training, agent enablement and go-live support.',
    enabledByDefault: true,
    tasks: [
      {
        id: 'tr-1',
        title: 'Admin training',
        description: 'Two-day admin training covering configuration, monitoring, reporting.',
        estimatedHours: 16,
        category: 'ops',
      },
      {
        id: 'tr-2',
        title: 'Agent enablement',
        description: 'Agent quick-start guide, softphone training, QA calibration.',
        estimatedHours: 8,
        category: 'ops',
      },
      {
        id: 'tr-3',
        title: 'Go-live hypercare',
        description: 'Five business days of on-site/remote hypercare post go-live.',
        estimatedHours: 40,
        category: 'ops',
      },
    ],
    techSpecs: [
      { id: 'tr-spec-1', field: 'Trainees', description: 'Number of admins / agents trained.', example: '4 admins, 25 agents' },
    ],
  },
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export const CATEGORY_LABELS: Record<ServiceCategory, string> = {
  channel: 'Communication Channels',
  voice: 'Voice Features',
  infrastructure: 'Infrastructure',
  data: 'Data',
  ops: 'Operations',
}

// Apply brand-text replacement: Connex / ConnexAI → MassaPro / MassaProAI
// Used by the Word export and the on-screen preview.
export function brandClean(text: string): string {
  return text
    .replace(/\bConnexAI\b/gi, 'MassaProAI')
    .replace(/\bConnex\b/gi, 'MassaPro')
}

// Default task status values used by the UI
export type TaskStatus = 'pending' | 'in-progress' | 'completed' | 'blocked'
export const STATUS_LABELS: Record<TaskStatus, string> = {
  pending: 'Pending',
  'in-progress': 'In Progress',
  completed: 'Completed',
  blocked: 'Blocked',
}

// Brand color palette (single source for both UI and Word export)
export const BRAND = {
  orchidPurple: '9333EA', // #9333EA — primary accent
  pureWhite: 'FFFFFF',
  jetBlack: '030712',
  softLavender: 'F3E8FF',
}

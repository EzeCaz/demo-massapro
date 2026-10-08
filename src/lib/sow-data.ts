// MassaPro SOW Builder — Service catalog and default tasks/specs.
//
// This module is the single source of truth for the SOW Builder UI:
//   - SERVICES defines all built-in channels/features that can be toggled
//   - Each service has: intro paragraph, configuration bullets (tasks),
//     and requirements bullets (tech specs)
//   - The Word export reads the same data structure and lays it out in the
//     Connex-template format ("Your MassaPro Technical Services Engineer
//     will deploy X to <client>. Configuration: ... Requirements: ...")
//
// Content is taken from the original Connex/ConnexAI SOW template (uploaded
// as "Massapro- Statement of Work.pdf") and rebranded to MassaPro/MassaProAI
// per the brand book.
//
// Brand colors (from MassaPro Brand Book):
//   Orchid Purple  #9333EA   (primary accent, headers, buttons)
//   Pure White     #FFFFFF   (backgrounds, card fills)
//   Jet Black      #030712   (body text, primary text)
//   Soft Lavender  #F3E8FF   (subtle backgrounds, badges, hover states)

export type ServiceCategory =
  | 'channel'        // inbound/outbound communication channels
  | 'productivity'    // AI / quality / dashboard features
  | 'infrastructure'  // SIP, integrations
  | 'ops'             // training & support

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
  field: string         // short tag
  description: string   // full requirement text
  example?: string
}

export interface Service {
  id: string
  name: string
  category: ServiceCategory
  icon: string // lucide icon name (mapped in component)
  description: string    // tagline for selection card
  intro: string         // "Your MassaPro Technical Services Engineer will deploy X to <client>."
  enabledByDefault?: boolean
  tasks: ServiceTask[]      // Configuration bullets
  techSpecs: TechSpecRow[]  // Requirements bullets
}

// ---------------------------------------------------------------------------
// Service catalog — derived from the original Connex SOW template
// (upload/Massapro- Statement of Work.pdf) and rebranded Connex→MassaPro.
// ---------------------------------------------------------------------------
export const SERVICES: Service[] = [
  // ====== CHANNELS ========================================================
  {
    id: 'voice',
    name: 'Voice',
    category: 'channel',
    icon: 'Phone',
    description: 'Inbound and outbound voice with CLIs, WebRTC, SIP trunk and porting.',
    enabledByDefault: true,
    intro: 'Your MassaPro Technical Services Engineer will deploy Voice to <client name>.',
    tasks: [
      {
        id: 'voice-1',
        title: 'Provision CLIs for inbound and outbound dialling',
        description:
          'MassaPro will provide <client name> with <number> CLIs for inbound and outbound dialling. Upon request, additional CLIs can be provisioned by our carrier team if required.',
        estimatedHours: 6,
        category: 'channel',
        subTasks: [
          { id: 'voice-1a', title: '<Number of CLIs> x <area code> area code', description: 'Specific allocation per area code.' },
        ],
      },
      {
        id: 'voice-2',
        title: 'Train on creation of inbound and outbound campaigns',
        description:
          'Your Technical Services Engineer will provide training to enable the creation of inbound and outbound campaigns.',
        estimatedHours: 4,
        category: 'channel',
        subTasks: [
          { id: 'voice-2a', title: '<List campaign information>', description: 'Campaign names, dispositions, calling windows.' },
        ],
      },
      {
        id: 'voice-3',
        title: 'Configure WebRTC for agent audio via web browser',
        description: 'WebRTC will be configured to enable agent audio through a web browser.',
        estimatedHours: 4,
        category: 'channel',
      },
      {
        id: 'voice-4',
        title: 'Configure SIP trunk for inbound traffic',
        description:
          'A SIP trunk will be configured for the purpose of servicing inbound traffic via pointing of CLIs to MassaPro\'s IP address.',
        estimatedHours: 8,
        category: 'channel',
      },
      {
        id: 'voice-5',
        title: 'Port <amount of numbers> CLI numbers to MassaPro',
        description:
          '<client name> will port <amount of numbers> CLI numbers to MassaPro. The MassaPro Numbers team will contact <client name> to obtain additional information in order to initiate the porting process.',
        estimatedHours: 12,
        category: 'channel',
      },
      {
        id: 'voice-6',
        title: 'Set up traffic routing during porting process',
        description:
          'Whilst the porting process is underway, <client name> is to route traffic to MassaPro by one of the following methods (delete if not applicable):',
        estimatedHours: 4,
        category: 'channel',
        subTasks: [
          { id: 'voice-6a', title: 'Divert existing CLIs to a CLI provided by MassaPro', description: 'Simplest option — divert from current carrier.' },
          { id: 'voice-6b', title: 'Configure SIP trunk to point CLIs to MassaPro\'s IP address', description: 'If SIP trunk configured, MassaPro needs IP addresses from current voice platform to whitelist.' },
        ],
      },
    ],
    techSpecs: [
      { id: 'voice-r-1', field: 'Audio files', description: 'Audio files for hold music, welcome messages, IVR prompts and out of hours messages.' },
      { id: 'voice-r-2', field: 'CLI area code', description: 'Confirmation of the preferred CLI number area code(s).' },
      { id: 'voice-r-3', field: 'Numbers to port', description: 'A list of the numbers that are to be ported to MassaPro.' },
      { id: 'voice-r-4', field: 'Interaction credit', description: 'Sufficient interaction credit needs to be added to the account.' },
    ],
  },
  {
    id: 'sms',
    name: 'SMS',
    category: 'channel',
    icon: 'Smartphone',
    description: 'Dedicated SMS long numbers, two-way conversational or outbound.',
    enabledByDefault: false,
    intro: 'Your MassaPro Technical Services Engineer will deploy SMS to <client name>.',
    tasks: [
      {
        id: 'sms-1',
        title: 'Provision <number> dedicated SMS long number(s)',
        description: "MassaPro's carrier team will provision <number> dedicated SMS long number(s) for <client name>.",
        estimatedHours: 4,
        category: 'channel',
      },
      {
        id: 'sms-2',
        title: 'Set up out-of-hours and in-hours SMS messages',
        description: 'Your Technical Services Engineer will discuss the different SMS strategies and set up out of hours and in hours SMS messages during training.',
        estimatedHours: 4,
        category: 'channel',
      },
    ],
    techSpecs: [
      { id: 'sms-r-1', field: 'Canned response templates', description: 'Templates to be used for canned responses.' },
      { id: 'sms-r-2', field: 'Outbound or two-way', description: 'Confirmation of whether SMS needs to be outbound or two way conversational.' },
      { id: 'sms-r-3', field: 'Interaction credit', description: 'Sufficient interaction credit needs to be added to the account.' },
    ],
  },
  {
    id: 'email',
    name: 'Email',
    category: 'channel',
    icon: 'Mail',
    description: 'IMAP/SMTP integration with current mail servers + canned responses.',
    enabledByDefault: false,
    intro: 'Your MassaPro Technical Services Engineer will deploy Email to <client name>.',
    tasks: [
      {
        id: 'em-1',
        title: 'Integrate with current mail servers',
        description: "MassaPro will integrate with <client name>'s current mail servers to allow emails to be sent and received from the MassaPro platform.",
        estimatedHours: 6,
        category: 'channel',
      },
      {
        id: 'em-2',
        title: 'Set up auto and canned responses',
        description: 'Your Technical Services Engineer will assist with the setup and assignment of auto and canned responses as required.',
        estimatedHours: 4,
        category: 'channel',
      },
    ],
    techSpecs: [
      { id: 'em-r-1', field: 'Email credentials', description: 'Confirmation of the usernames and passwords for email accounts.' },
      { id: 'em-r-2', field: 'IMAP/SMTP addresses', description: 'Confirmation of address for both IMAP and SMTP connections.' },
      { id: 'em-r-3', field: 'IMAP/SMTP ports', description: 'Confirmation of relevant ports for IMAP and SMTP connectivity.' },
      { id: 'em-r-4', field: 'Test email account', description: 'An email account which will be used for testing purposes.' },
      { id: 'em-r-5', field: 'Canned response templates', description: 'Templates to be used for canned responses.' },
      { id: 'em-r-6', field: 'Admin portal access', description: 'Access and permissions to your admin portal for your email platform for the purpose of multi factor authentication e.g. your Azure directory.' },
    ],
  },
  {
    id: 'livechat',
    name: 'Live Chat',
    category: 'channel',
    icon: 'MessageSquare',
    description: 'Concurrent live chat on website with canned responses and SLA.',
    enabledByDefault: false,
    intro: 'Your MassaPro Technical Services Engineer will deploy Live Chat to <client name>.',
    tasks: [
      {
        id: 'lc-1',
        title: 'Configure Live Chat application and script',
        description:
          'The MassaPro Live Chat application will be configured and the associated script made available to <client name> for deployment on its website (https://www.<client name>.com).',
        estimatedHours: 6,
        category: 'channel',
      },
      {
        id: 'lc-2',
        title: 'Enable concurrent live chat servicing',
        description: 'MassaPro Live Chat enables configuration for a user to concurrently service multiple Live Chats.',
        estimatedHours: 2,
        category: 'channel',
      },
      {
        id: 'lc-3',
        title: 'Activate canned responses, routing and SLA',
        description: 'Canned responses, intelligent routing and SLA functionality are all available.',
        estimatedHours: 4,
        category: 'channel',
      },
    ],
    techSpecs: [
      { id: 'lc-r-1', field: 'Test website', description: 'Test website environment provided by <client name> which will be used for testing.' },
      { id: 'lc-r-2', field: 'Current workflow', description: "<client name>'s current Live Chat workflow." },
    ],
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp',
    category: 'channel',
    icon: 'MessageCircle',
    description: 'WhatsApp for Business API with two-way conversations and templates.',
    enabledByDefault: false,
    intro: 'Your MassaPro Technical Services Engineer will deploy WhatsApp to <client name>.',
    tasks: [
      {
        id: 'wa-1',
        title: 'Set up WhatsApp for Business API',
        description: 'The WhatsApp for Business API will be set up to enable two-way WhatsApp conversations.',
        estimatedHours: 6,
        category: 'channel',
      },
      {
        id: 'wa-2',
        title: 'Train on template creation and management',
        description: 'Your Technical Services Engineer will provide training on the creation and management of templates.',
        estimatedHours: 3,
        category: 'channel',
      },
      {
        id: 'wa-3',
        title: 'Provision new WhatsApp number',
        description: "The MassaPro carrier team will provision a new WhatsApp number for <client name> and assist with the number set up process.",
        estimatedHours: 4,
        category: 'channel',
      },
    ],
    techSpecs: [
      { id: 'wa-r-1', field: 'Verified Meta Business', description: 'Verified Meta Business account.' },
      { id: 'wa-r-2', field: 'Meta Business access', description: 'Provide admin access and permissions to verified Meta Business account.' },
      { id: 'wa-r-3', field: 'WhatsApp area code', description: 'Confirmation of the preferred WhatsApp number area code(s).' },
      { id: 'wa-r-4', field: 'Template messages', description: 'Template WhatsApp messages.' },
      { id: 'wa-r-5', field: 'Interaction credit', description: 'Sufficient interaction credit needs to be added to the account.' },
    ],
  },
  {
    id: 'facebook',
    name: 'Facebook',
    category: 'channel',
    icon: 'Share2',
    description: 'Facebook Page wall-post comments and Messenger messages.',
    enabledByDefault: false,
    intro: 'Your MassaPro Technical Services Engineer will deploy Facebook to <client name>.',
    tasks: [
      {
        id: 'fb-1',
        title: 'Link Facebook Page to MassaPro Social Service',
        description:
          '<client name> will link up a Facebook Page to the MassaPro Social Service application within the CXM platform. Once the account is connected, <client name> will have the ability to:',
        estimatedHours: 4,
        category: 'channel',
        subTasks: [
          { id: 'fb-1a', title: 'Respond to Facebook wall post comments', description: 'Reply to public comments on wall posts.' },
          { id: 'fb-1b', title: 'Send and receive Facebook Messenger messages', description: 'Two-way Messenger conversations.' },
        ],
      },
      {
        id: 'fb-2',
        title: 'Assist with Meta Business account setup',
        description: 'The Technical Services Engineer can assist <client name> in completing the setup of your Meta Business account if required.',
        estimatedHours: 3,
        category: 'channel',
      },
    ],
    techSpecs: [
      { id: 'fb-r-1', field: 'Verified Meta Business', description: 'Verified Meta Business account.' },
      { id: 'fb-r-2', field: 'Meta Business access', description: 'Provide admin access and permissions to verified Meta Business account.' },
      { id: 'fb-r-3', field: 'Facebook Business page', description: 'Facebook Business page.' },
      { id: 'fb-r-4', field: 'Interaction credit', description: 'Sufficient interaction credit needs to be added to the account.' },
    ],
  },
  {
    id: 'instagram',
    name: 'Instagram',
    category: 'channel',
    icon: 'Instagram',
    description: 'Instagram Business — direct messages and post comments.',
    enabledByDefault: false,
    intro: 'Your MassaPro Technical Services Engineer will deploy Instagram to <client name>.',
    tasks: [
      {
        id: 'ig-1',
        title: 'Link FB Page and Instagram page to MassaPro Social Service',
        description:
          '<client name> will link up a Facebook Business page and Instagram Business page to the MassaPro Social Service application within the CXM platform. Once the accounts are connected, <client name> will have the ability to perform the following actions:',
        estimatedHours: 4,
        category: 'channel',
        subTasks: [
          { id: 'ig-1a', title: 'Send Instagram direct messages', description: 'Two-way DM conversations.' },
          { id: 'ig-1b', title: 'Reply to comments on Instagram posts', description: 'Public-comment replies.' },
        ],
      },
    ],
    techSpecs: [
      { id: 'ig-r-1', field: 'Instagram Business account', description: 'MassaPro will provide <client name> with the ability to connect its Instagram Business account to the MassaPro system.' },
      { id: 'ig-r-2', field: 'Verified Meta Business', description: 'Verified Meta Business account.' },
      { id: 'ig-r-3', field: 'Meta Business access', description: 'Provide admin access and permissions to verified Meta Business account.' },
      { id: 'ig-r-4', field: 'Instagram Business page', description: 'Instagram Business page.' },
      { id: 'ig-r-5', field: 'Interaction credit', description: 'Sufficient interaction credit needs to be added to the account.' },
    ],
  },
  {
    id: 'twitter',
    name: 'X (Twitter)',
    category: 'channel',
    icon: 'Twitter',
    description: 'X (Twitter) integration (currently in preview).',
    enabledByDefault: false,
    intro: 'Your MassaPro Technical Services Engineer will deploy X (Twitter) to <client name>.',
    tasks: [
      {
        id: 'tw-1',
        title: 'Connect X (Twitter) account to MassaPro',
        description:
          'MassaPro will provide <client name> with the ability to connect its X (Twitter) account to the MassaPro system. The X (Twitter) functionality is not yet fully released on the MassaPro platform. As soon as this is released, the Technical Services Engineer can assist <client name> in completing the setup of the X (Twitter) functionality within the MassaPro system.',
        estimatedHours: 4,
        category: 'channel',
      },
    ],
    techSpecs: [
      { id: 'tw-r-1', field: 'X account', description: 'X (Twitter) account credentials.' },
    ],
  },
  // ====== PRODUCTIVITY / AI / QUALITY =====================================
  {
    id: 'dashboard',
    name: 'Dashboard Builder',
    category: 'productivity',
    icon: 'LayoutDashboard',
    description: 'Personalised dashboards with tiles for CXM data and metrics.',
    enabledByDefault: true,
    intro: 'Your MassaPro Technical Services Engineer will deploy Dashboard Builder to <client name>.',
    tasks: [
      {
        id: 'db-1',
        title: 'Configure Dashboard Builder',
        description: 'Dashboard Builder will allow the ability to create and build personalised dashboards that help present your CXM data.',
        estimatedHours: 6,
        category: 'productivity',
      },
      {
        id: 'db-2',
        title: 'Set up dashboard tiles and metrics',
        description:
          'Dashboards are made up of tiles, with each tile providing key metrics on CXM activity. This includes: Call data, User statistics, Interaction data, CNX1 Live data.',
        estimatedHours: 8,
        category: 'productivity',
      },
      {
        id: 'db-3',
        title: 'Configure presentation formats',
        description: '<client name> will be able to present these metrics in a variety of different formats, such as line graphs and pie charts.',
        estimatedHours: 4,
        category: 'productivity',
      },
    ],
    techSpecs: [
      { id: 'db-r-1', field: 'Current dashboard examples', description: 'Any examples of dashboards or wallboards currently used by <client name>.' },
    ],
  },
  {
    id: 'quality',
    name: 'Quality',
    category: 'productivity',
    icon: 'Award',
    description: 'Scorecards and Assessment Center for agent interaction quality.',
    enabledByDefault: false,
    intro: 'Your MassaPro Technical Services Engineer will deploy Quality to <client name>.',
    tasks: [
      {
        id: 'qa-1',
        title: 'Enable scorecard creation and management',
        description: 'MassaPro will provide ability to create and manage scorecards in the Quality module in order to measure the quality of agents\' interactions.',
        estimatedHours: 6,
        category: 'productivity',
      },
      {
        id: 'qa-2',
        title: 'Set up Assessment Center',
        description: 'The Assessment Center can be used to assess quality of statistics related to agent performance such as call scores and sentiment scores of agent calls.',
        estimatedHours: 6,
        category: 'productivity',
      },
      {
        id: 'qa-3',
        title: 'Set up users, teams and roles',
        description: 'Your Technical Services Engineer will also assist in the set up of users, teams and roles.',
        estimatedHours: 4,
        category: 'productivity',
      },
    ],
    techSpecs: [
      { id: 'qa-r-1', field: 'Example scorecards', description: 'Example scorecards.' },
      { id: 'qa-r-2', field: 'Current QM process', description: 'Information on the current Quality Management process.' },
    ],
  },
  {
    id: 'wfo',
    name: 'Quality Management (WFO)',
    category: 'productivity',
    icon: 'ClipboardCheck',
    description: 'Workforce-optimisation grade QM with Assessment Center.',
    enabledByDefault: false,
    intro: 'Your MassaPro Technical Services Engineer will deploy Quality Management (WFO) to <client name>.',
    tasks: [
      {
        id: 'wfo-1',
        title: 'Enable WFO scorecards',
        description: 'MassaPro will provide ability to create and manage scorecards in WFO in order to measure the quality of agents\' interactions.',
        estimatedHours: 6,
        category: 'productivity',
      },
      {
        id: 'wfo-2',
        title: 'Set up QM Assessment Center',
        description: 'The QM Assessment Center can be used to assess quality of statistics related to agent performance such as call scores and sentiment scores of agent calls.',
        estimatedHours: 6,
        category: 'productivity',
      },
      {
        id: 'wfo-3',
        title: 'Set up users, teams and roles',
        description: 'Your Technical Services Engineer will also assist in the set up of user, teams and roles.',
        estimatedHours: 4,
        category: 'productivity',
      },
    ],
    techSpecs: [
      { id: 'wfo-r-1', field: 'Example scorecards', description: 'Example scorecards.' },
      { id: 'wfo-r-2', field: 'Current QM process', description: 'Information on current Quality Management process.' },
    ],
  },
  {
    id: 'athena-agent',
    name: 'Athena AI Agent',
    category: 'productivity',
    icon: 'Bot',
    description: 'Conversational AI with custom journeys and trained LLM.',
    enabledByDefault: false,
    intro: 'Your MassaPro Technical Services Engineer will deploy AI Agent to <client name>.',
    tasks: [
      {
        id: 'aa-1',
        title: 'Enable conversational AI',
        description: 'AI Agent will allow <client name> to utilise conversational AI to converse with customers.',
        estimatedHours: 8,
        category: 'productivity',
      },
      {
        id: 'aa-2',
        title: 'Configure AI Agent Control Panel',
        description: "MassaPro's AI Agent Control Panel will allow users to build their own journeys and train personalised LLM on their own data.",
        estimatedHours: 10,
        category: 'productivity',
      },
      {
        id: 'aa-3',
        title: 'Set up users, roles and tracking',
        description: 'Your Technical Services Engineer will assist in the creation of Users, Roles and tracking data through AI Reporting.',
        estimatedHours: 4,
        category: 'productivity',
      },
      {
        id: 'aa-4',
        title: 'Train on journeys, training data and slot intents',
        description: 'Your Technical Services Engineer will also provide training on the creation of journeys, training data and managing slot intents.',
        estimatedHours: 6,
        category: 'productivity',
      },
    ],
    techSpecs: [
      { id: 'aa-r-1', field: 'Customer journeys', description: 'Documented customer journeys.' },
      { id: 'aa-r-2', field: 'Knowledge Base articles', description: 'Knowledge Base Articles for your organisation and processes.' },
    ],
  },
  {
    id: 'athena-tts',
    name: 'Athena AI Voice (TTS)',
    category: 'productivity',
    icon: 'Volume2',
    description: 'AI Text-to-Speech with custom voices to suit your brand.',
    enabledByDefault: false,
    intro: 'Your MassaPro Technical Services Engineer will deploy Athena AI Voice to <client name>.',
    tasks: [
      {
        id: 'tts-1',
        title: 'Enable Athena AI Voice (TTS)',
        description: 'AI Voice will allow <client name> to utilise AI Text-To-Speech to respond to customers in a variety of custom AI Voices.',
        estimatedHours: 6,
        category: 'productivity',
      },
      {
        id: 'tts-2',
        title: 'Configure AI Voice node',
        description: "MassaPro's AI Voice node allows responses to be created to respond to transcripts captured using Athena ASR. These responses can be personalised to create a voice to suit your brand.",
        estimatedHours: 6,
        category: 'productivity',
      },
    ],
    techSpecs: [
      { id: 'tts-r-1', field: 'TTS scenarios', description: 'Documented TTS Scenarios.' },
      { id: 'tts-r-2', field: 'Custom voice audio', description: 'Audio Files MassaPro can use to provide custom voices.' },
    ],
  },
  {
    id: 'athena-asr',
    name: 'Athena Speech Recognition (ASR)',
    category: 'productivity',
    icon: 'Mic',
    description: 'Automatic Speech Recognition feeding IVR menus.',
    enabledByDefault: false,
    intro: 'Your MassaPro Technical Services Engineer will deploy Athena ASR to <client name>.',
    tasks: [
      {
        id: 'asr-1',
        title: 'Enable Athena ASR',
        description: 'Automatic Speech Recognition (ASR) will allow <client name> to capture responses from customers as they speak.',
        estimatedHours: 6,
        category: 'productivity',
      },
      {
        id: 'asr-2',
        title: 'Build sophisticated IVR menus',
        description: "MassaPro's Athena ASR node allows these responses to be utilised to create sophisticated interactive voice response (IVR) menus.",
        estimatedHours: 8,
        category: 'productivity',
      },
    ],
    techSpecs: [
      { id: 'asr-r-1', field: 'IVR flows', description: 'Documented IVR flows.' },
      { id: 'asr-r-2', field: 'IVR audio files', description: 'Audio files for IVR prompts and out of hours messages.' },
    ],
  },
  // ====== INFRASTRUCTURE ==================================================
  {
    id: 'integration',
    name: 'Integration (Phase 2)',
    category: 'infrastructure',
    icon: 'Plug',
    description: 'Custom integration with a 3rd-party product (spec agreed upfront).',
    enabledByDefault: false,
    intro: '<client name> require MassaPro to integrate with <product>.',
    tasks: [
      {
        id: 'int-1',
        title: 'Agree integration specification',
        description: 'A full specification detailing the setup of the integration will be agreed between both parties before any development work begins.',
        estimatedHours: 12,
        category: 'infrastructure',
      },
      {
        id: 'int-2',
        title: 'Complete the integration',
        description: 'Once the specification is agreed, MassaPro will assist <client name> with completing the integration.',
        estimatedHours: 40,
        category: 'infrastructure',
      },
    ],
    techSpecs: [
      { id: 'int-r-1', field: 'Target product', description: 'The product to integrate with (e.g., Salesforce, Zendesk, custom CRM).' },
      { id: 'int-r-2', field: 'Auth method', description: 'API key / OAuth / SSO.' },
      { id: 'int-r-3', field: 'Data scope', description: 'Records / fields to sync.' },
    ],
  },
  // ====== OPERATIONS ======================================================
  {
    id: 'training',
    name: 'Training & Handover',
    category: 'ops',
    icon: 'GraduationCap',
    description: 'Remote training with Technical Services Engineer + Go-Live support.',
    enabledByDefault: true,
    intro: 'Your MassaPro Technical Services Engineer will deliver training and handover to <client name>.',
    tasks: [
      {
        id: 'tr-1',
        title: 'Remote training with Technical Services Engineer',
        description: 'Remote training with Technical Services Engineer.',
        estimatedHours: 8,
        category: 'ops',
      },
      {
        id: 'tr-2',
        title: 'Dedicated Technical Services Engineer support for Go-Live',
        description: 'Further dedicated Technical Services Engineer support for full Go-Live.',
        estimatedHours: 40,
        category: 'ops',
      },
    ],
    techSpecs: [
      { id: 'tr-r-1', field: 'Trainees', description: 'Number of admins / agents trained.' },
      { id: 'tr-r-2', field: 'Go-Live date', description: 'Target Go-Live date.' },
    ],
  },
]

// ---------------------------------------------------------------------------
// Project Milestones — default table from the Connex template
// ---------------------------------------------------------------------------
export interface MilestoneRow {
  id: string
  task: string
  targetDate: string
  status: string
}

export const DEFAULT_MILESTONES: MilestoneRow[] = [
  { id: 'm1', task: 'Intro Call', targetDate: 'XX/XX/2026', status: 'Complete' },
  { id: 'm2', task: 'Pre-Training Chat', targetDate: 'XX/XX/2026', status: 'Complete' },
  { id: 'm3', task: 'System Installation', targetDate: 'XX/XX/2026', status: 'Scheduled' },
  { id: 'm4', task: 'System Configuration', targetDate: 'Commencing XX/XX/2026', status: 'Scheduled' },
  { id: 'm5', task: 'System Training', targetDate: 'Commencing XX/XX/2026', status: 'Scheduled' },
  { id: 'm6', task: 'Project Check In Meetings', targetDate: 'Commencing XX/XX/2026', status: 'Scheduled' },
  { id: 'm7', task: 'Go Live', targetDate: 'To be Confirmed', status: 'Pending' },
]

// ---------------------------------------------------------------------------
// Infrastructure & Access Requirements — default from the Connex template
// ---------------------------------------------------------------------------
export const INFRA_REQUIREMENTS = {
  preDeployment: [
    'Interaction credit proforma and licence invoice need to be paid',
    'IP Address Whitelisting: Access to non-Public Access MassaPro servers is restricted by IP address, the head office IP address will be whitelisted for access.',
    'Remote agents who are not connecting to a non-Public Access server via the head office will require a VPN (to provide static IP address) and their IP address whitelisting before they are able to connect to any new servers.',
  ],
  hardware: [
    'Windows 10+',
    'i5 Processor',
    '8GB RAM',
    'USB headsets',
  ],
  internet: [
    '0.25Mbps per agent',
    'CAT5e+ Cabling',
    'Static IP',
  ],
}

// ---------------------------------------------------------------------------
// Support — default content from the Connex template
// ---------------------------------------------------------------------------
export const SUPPORT_SECTIONS = {
  intro: '24/7 Support',
  supportService: [
    'The MassaPro dedicated Support team are on hand 24/7 to assist you with any queries you may have, assistance you may need or issues you need resolving.',
    'You can contact your Support team via call, email and live chat.',
  ],
  supportPortal: [
    'Utilise our support portal to browse knowledge base articles (KBAs) which provide detailed information on how to get the most out of your MassaPro system.',
    'https://support.massapro.com/',
  ],
  ticketSubmission: [
    'When submitting tickets to the MassaPro Support team via email, we kindly ask if you could please do so using the following template. If you do not have all the required information, please just provide as much information as possible.',
    'Submitting tickets with this information will assist the Support team in troubleshooting and will speed up the investigation process.',
  ],
  ticketTemplate: [
    'Date:',
    'Time:',
    'Channel: (E.g. Voice, Live Chat, Email, WhatsApp)',
    'Campaign:',
    'Agent:',
    'Affected Node or Server:',
    'Description of issue/task:',
    'Replication Steps:',
    'Checks completed by the Customer:',
    'Screenshot of the issue if applicable:',
  ],
}

// ---------------------------------------------------------------------------
// Welcome — content from the Connex template cover page
// ---------------------------------------------------------------------------
export const WELCOME_PARAGRAPHS = {
  subtitle: 'A Technology Partnership',
  intro:
    'Omnichannel will reshape your organisation\'s day-to-day operations; from increasing your team\'s productivity to having the ability to customise business strategies to adapt to your customer needs.',
  body:
    'The MassaPro platform is a powerful tool that will provide a more in-depth insight and analysis of your customers\' requirements than ever before, enabling your teams to provide industry leading service and increase your customer satisfaction.',
  benefits: [
    'Introduce a highly personalised service by appointing an experienced Technical Services Engineer to manage all your training and onboarding requirements',
    'Drive compliance to meet your clients SLAs with performance and productivity monitoring features',
    'Reduce the time it takes per interaction with our productivity enhancing algorithms and technology',
    'Give your team greater peace of mind with full 24/7 support for every user',
    'More in-depth insight into your campaigns, teams and strategy; providing your management team with much more at just a glance',
  ],
  closing:
    'As market leaders in contact centre solutions, we understand how to positively shape every customer interaction experience by harnessing the right insights, expertise and technology. From the start of our partnership, we will work together to optimise feature usage and drive productivity, delivering success throughout your teams.',
  retention:
    'What\'s more, with a client retention rate of over 97%, we are renowned for exceptional service and the powerful technology we offer.',
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
export const CATEGORY_LABELS: Record<ServiceCategory, string> = {
  channel: 'Communication Channels',
  productivity: 'AI, Quality & Dashboards',
  infrastructure: 'Integrations',
  ops: 'Operations',
}

// Apply brand-text replacement: Connex / ConnexAI → MassaPro
// Used by the Word export and the on-screen preview.
export function brandClean(text: string): string {
  return text
    .replace(/\bConnexAI\b/gi, 'MassaPro')
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

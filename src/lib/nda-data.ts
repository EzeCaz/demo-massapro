// Mutual NDA template data — imported from the user's Google Doc.
//
// This file defines the editable fields and section structure of the
// Mutual Non-Disclosure and Non-Circumvention Agreement. The template
// uses placeholder variables (e.g., {{date}}, {{person}}, {{place}})
// that are replaced with the user's input at export time.

export interface NDACoverInfo {
  // Sinba party details (usually fixed, but editable)
  sinbaName: string
  sinbaEntityType: string
  sinbaRegistrationNumber: string
  sinbaAddress: string
  sinbaEmail: string

  // Recipient party details (editable)
  recipientName: string           // "Person" — the recipient's legal name
  recipientType: 'individual' | 'corporate'  // affects the entity description
  recipientIdOrPassport: string   // for individuals: ID/passport number
  recipientAddress: string        // "Place" — residence or principal address
  recipientEmail: string          // "Person" — email

  // Agreement metadata
  effectiveDate: string           // "Date" — the effective date
  sinbaSignatoryName: string       // "Roberto Singler"
  sinbaSignatoryTitle: string     // "CEO"
  sinbaSignatoryDate: string       // signing date for Sinba
  recipientSignatoryName: string  // "Person"
  recipientSignatoryTitle: string // title
  recipientSignatoryDate: string  // signing date for Recipient

  // Annex 1 — list of tech platforms/providers
  annexItems: string[]             // list of providers
}

export const DEFAULT_NDA_COVER: NDACoverInfo = {
  sinbaName: 'SINBA GROUP ISRAEL LTD.',
  sinbaEntityType: 'an Israeli company',
  sinbaRegistrationNumber: '516133139',
  sinbaAddress: 'Issac Bashevis Singer 2/21, Tel Aviv 6967016, Israel',
  sinbaEmail: 'eze@massapro.com',

  recipientName: '',
  recipientType: 'corporate',
  recipientIdOrPassport: '',
  recipientAddress: '',
  recipientEmail: '',

  effectiveDate: '',
  sinbaSignatoryName: 'Roberto Singler',
  sinbaSignatoryTitle: 'CEO',
  sinbaSignatoryDate: '',
  recipientSignatoryName: '',
  recipientSignatoryTitle: '',
  recipientSignatoryDate: '',

  annexItems: [
    'MassaPro – Agentic Conversational AI Platforms, Marketing Automation Tools, and Integrated Omni-channel Software Solutions.',
  ],
}

// The NDA body sections — each is a numbered section with a title and
// one or more paragraphs. Some paragraphs contain placeholder variables
// that are replaced at export time.
export interface NDASection {
  number: string
  title: string
  paragraphs: string[]
}

export const NDA_SECTIONS: NDASection[] = [
  {
    number: '1',
    title: 'CONFIDENTIAL INFORMATION',
    paragraphs: [
      '1.1 For the purposes of this Agreement, "Confidential Information" means all non-public information, in any form or medium (whether written, oral, visual, electronic, or digital), disclosed or made available by or on behalf of Sinba (or its brands and partner entities, including MassaPro) to the Recipient, whether before or after the Effective Date.',
      '1.2 Confidential Information includes, without limitation:',
      '• Technical & Product Assets: Data structure, data format, technology, source code, object code, software applications, know-how, inventions, discoveries, designs, processes, techniques, methods, performance characteristics, testing strategies, formulations, models, algorithms, architecture, and R&D work.',
      '• Commercial & Financial Assets: Business strategies, marketing plans, financial projections, pricing models, revenue sharing structures, client lists, customer data, trade secrets, and operational practices.',
      '• Platforms & Provider Network: The identities, contact details, contract terms, technical specifications, and commercial arrangements regarding Sinba\'s tech platforms, software, AI tools, infrastructure providers, partner brands, and represented solutions (collectively, the "Tech & Service Providers"), including but not limited to MassaPro, its AI platforms, and the specific providers listed in Annex 1 attached hereto (as updated from time to time).',
    ],
  },
  {
    number: '2',
    title: 'EXCLUSIONS FROM CONFIDENTIAL INFORMATION',
    paragraphs: [
      'Confidential Information shall not include any information that the Recipient can demonstrate by clear and convincing contemporaneous written records:',
      '(a) was already lawfully known to the Recipient prior to disclosure by Sinba, or concerns a Tech & Service Provider with whom the Recipient can demonstrate, through clear contemporaneous written documentation, that it had an active, pre-existing direct commercial or business relationship prior to being introduced to such provider by Sinba;',
      '(b) is or becomes publicly available through no act, omission, or breach of this Agreement by the Recipient or its representatives;',
      '(c) is lawfully obtained by the Recipient from a third party who is not bound by any duty of confidentiality to Sinba; or',
      '(d) was independently developed by the Recipient without any reliance on, reference to, or use of Sinba\'s Confidential Information.',
      'If the Recipient is legally compelled by court order, administrative subpoena, or applicable law to disclose any Confidential Information, the Recipient shall (i) provide Sinba with prompt written notice prior to disclosure (where legally permissible) so Sinba may seek a protective order, (ii) assert the confidential nature of the information to the requesting authority, and (iii) cooperate fully with Sinba to limit the scope of the required disclosure.',
    ],
  },
  {
    number: '3',
    title: 'NO LICENSE OR PROPRIETARY RIGHTS',
    paragraphs: [
      'The Recipient acknowledges and agrees that all Confidential Information remains the exclusive property of Sinba (or its respective partner brand/provider owners). Nothing in this Agreement shall be construed as granting the Recipient any license, title, ownership right, patent, copyright, trademark, or trade secret right in Sinba\'s Confidential Information, platforms, or services, either expressly or by implication, estoppel, or otherwise.',
    ],
  },
  {
    number: '4',
    title: 'CONFIDENTIALITY OBLIGATIONS & SAFEGUARDING',
    paragraphs: [
      '4.1 The Recipient shall hold all Confidential Information in strict confidence and protect it from unauthorized disclosure or access using at least the same degree of care it uses for its own highly sensitive confidential information, but in no event less than a reasonable standard of care.',
      '4.2 Except as expressly permitted in writing by Sinba, the Recipient shall not:',
      '(a) copy, duplicate, record, or reproduce any Confidential Information except as strictly required for the Purpose;',
      '(b) disclose, distribute, or provide access to Confidential Information to any third party; or',
      '(c) alter, modify, decompile, disassemble, reverse-engineer, or create derivative works based on any software, AI models, platforms, or tools provided by Sinba or its Tech & Service Providers.',
      '4.3 The Recipient may disclose Confidential Information only to its employees, officers, and legal/financial advisors who have a strict "need-to-know" for the Purpose and who are bound by written confidentiality obligations at least as restrictive as those contained herein. The Recipient shall remain fully liable for any breach of this Agreement by its representatives.',
    ],
  },
  {
    number: '5',
    title: 'NON-CIRCUMVENTION AND EXCLUSIVE PROCUREMENT',
    paragraphs: [
      '5.1 Acknowledgment: The Recipient acknowledges that Sinba operates as a solutions provider company that brings together, integrates, and represents an omni-channel ecosystem of technology, software, and service providers (including MassaPro and various underlying partner brands). The identity, technical integration, and commercial relationships between Sinba and its Tech & Service Providers constitute trade secrets and valuable proprietary assets belonging to Sinba.',
      '5.2 Prohibition on Direct or Indirect Engagement: During the term of this Agreement and for a period of three (3) years following its termination or expiration, the Recipient expressly agrees that it shall not, directly or indirectly (including through any affiliate, subsidiary, parent company, sister entity, partner, broker, agent, intermediary, or third party):',
      '(a) Contact, solicit, approach, negotiate with, or enter into any commercial or contractual relationship with any of Sinba\'s Tech & Service Providers, partner brands, AI providers, or software vendors disclosed by Sinba;',
      '(b) Procure, purchase, license, or receive any platforms, tools, software, or services provided by or through Sinba\'s Tech & Service Providers, other than directly through Sinba; or',
      '(c) Represent, resell, distribute, or act as an agent for any of the Tech & Service Providers or services introduced or disclosed by Sinba to the Recipient, or offer such services to the Recipient\'s clients or third-party partners other than through Sinba.',
      '5.3 Protection of Ecosystem: The restriction in Section 5.2 applies equally to the Recipient\'s internal business operations and to any offerings made by the Recipient to its clients, partners, or corporate affiliates.',
    ],
  },
  {
    number: '6',
    title: 'REMEDIES FOR BREACH',
    paragraphs: [
      '6.1 Irreparable Harm: The Parties agree that any unauthorized disclosure or use of Confidential Information, or any breach of the non-circumvention obligations under Section 5, will cause irreparable financial harm to Sinba for which monetary damages alone would be inadequate.',
      '6.2 Injunctive and Equitable Relief: In the event of any breach or threatened breach by the Recipient, Sinba shall be entitled to seek immediate preliminary and permanent injunctive relief, specific performance, and any other equitable remedies from any court of competent jurisdiction, without the necessity of posting a bond or proving actual monetary damages.',
      '6.3 Monetary Damages: Sinba shall further be entitled to seek all available legal remedies, including recovery of actual damages, lost profits, disgorgement of revenues/profits earned by the Recipient as a result of the breach, reasonable attorneys\' fees, and court costs incurred in enforcing this Agreement.',
    ],
  },
  {
    number: '7',
    title: 'RETURN OR DESTRUCTION OF MATERIALS',
    paragraphs: [
      'Upon expiration or termination of this Agreement, or upon Sinba\'s written request at any time, the Recipient shall immediately cease all use of the Confidential Information, and within seven (7) days, return to Sinba or destroy (and certify such destruction in writing signed by an officer) all documents, software, data, copies, and tangible materials containing or derived from Sinba\'s Confidential Information.',
    ],
  },
  {
    number: '8',
    title: 'DISCLAIMER / "AS IS"',
    paragraphs: [
      'All Confidential Information disclosed under this Agreement is provided on an "AS IS" basis. Sinba makes no representations or warranties, express or implied, regarding the accuracy, completeness, performance, or fitness for a particular purpose of the Confidential Information or technology provided.',
    ],
  },
  {
    number: '9',
    title: 'TERM AND TERMINATION',
    paragraphs: [
      '9.1 Term: This Agreement shall become effective on the Effective Date and shall remain in force for a period of seven (7) years from the date of the last disclosure of Confidential Information, unless terminated earlier by either Party providing thirty (30) days\' advance written notice.',
      '9.2 Survival: Notwithstanding the termination or expiration of this Agreement:',
      '(a) The non-circumvention obligations set forth in Section 5 shall survive for three (3) years following the date of termination/expiration.',
      '(b) The confidentiality and non-use obligations set forth herein shall survive for five (5) years following the date of termination/expiration (or indefinitely with respect to trade secrets).',
    ],
  },
  {
    number: '10',
    title: 'INDEPENDENT CONTRACTORS',
    paragraphs: [
      'The relationship between Sinba and the Recipient is strictly that of independent contractors. Nothing in this Agreement creates a partnership, joint venture, agency, franchise, or employment relationship between the Parties. Neither Party has the authority to bind or obligate the other without explicit prior written consent.',
    ],
  },
  {
    number: '11',
    title: 'GOVERNING LAW AND JURISDICTION',
    paragraphs: [
      'This Agreement shall be governed by, construed, and enforced in accordance with the internal laws of the State of Israel, without giving effect to its rules on conflict of laws. The competent courts located in Tel Aviv-Yafo, Israel, shall have sole and exclusive jurisdiction over any dispute, controversy, or claim arising out of or in connection with this Agreement.',
    ],
  },
  {
    number: '12',
    title: 'NOTICES',
    paragraphs: [
      'All notices, requests, demands, and other communications under this Agreement shall be in writing and deemed given: (i) upon personal delivery; (ii) five (5) days after posting via registered or certified mail; or (iii) one (1) business day after transmission via email (provided electronic transmission confirmation is obtained). Communications shall be sent to the physical and email addresses listed on the first page of this Agreement.',
    ],
  },
  {
    number: '13',
    title: 'MISCELLANEOUS',
    paragraphs: [
      '13.1 Assignment: The Recipient may not assign, transfer, or delegate its rights or obligations under this Agreement without Sinba\'s prior written consent. Sinba may assign this Agreement to an affiliate, parent, sister company, or successor entity.',
      '13.2 Severability: If any provision of this Agreement is held to be invalid, illegal, or unenforceable, the validity, legality, and enforceability of the remaining provisions shall not in any way be affected or impaired thereby, and the Parties shall negotiate in good faith to replace such provision with a valid, enforceable provision that reflects the original commercial intent.',
      '13.3 Entire Agreement & Amendments: This Agreement constitutes the entire agreement between the Parties concerning its subject matter and supersedes all prior agreements, representations, and communications. This Agreement may only be amended or modified by a written agreement signed by authorized representatives of both Parties.',
      '13.4 Counterparts & Signatures: This Agreement may be executed in counterparts, including electronic signatures (e.g., PDF, DocuSign), each of which shall be deemed an original and together shall constitute one and the same instrument.',
    ],
  },
]

// Recitals — the WHEREAS clauses
export const NDA_RECITALS: string[] = [
  'WHEREAS, Sinba is a comprehensive tech and commercial solutions provider company that consolidates, integrates, and represents cutting-edge platforms, software, technology, and service providers—including, without limitation, MassaPro and various other partner brands, AI tools, and software solutions—into a unified, global omni-channel solution for its clients, partners, and network;',
  'WHEREAS, in connection with discussions, evaluations, and negotiations regarding a potential commercial cooperation, partnership, or business arrangement between Sinba and the Recipient (the "Purpose"), Sinba may disclose to the Recipient certain proprietary and confidential information concerning Sinba\'s business, technology, platform architecture, underlying software providers, and commercial arrangements; and',
  'WHEREAS, the Parties wish to protect the confidentiality of such disclosed information and establish strict non-circumvention, non-solicitation, and exclusive engagement terms regarding Sinba\'s proprietary tools, platform providers, software, and partner brand networks.',
]

// Build the full intro paragraph with the user's cover info substituted.
// Returns the opening text that appears before the Recitals.
export function buildNdaIntro(cover: NDACoverInfo): string {
  const date = cover.effectiveDate || '[Effective Date]'
  const sinbaLine = `${cover.sinbaName}, ${cover.sinbaEntityType}, registration number ${cover.sinbaRegistrationNumber}, located at ${cover.sinbaAddress}, Email: ${cover.sinbaEmail} (hereinafter referred to as "Sinba");`

  let recipientLine: string
  if (cover.recipientType === 'individual') {
    recipientLine = `${cover.recipientName || '[Recipient Name]'}, holder of ID / Passport No. ${cover.recipientIdOrPassport || '[ID/Passport No.]'}, residing at ${cover.recipientAddress || '[Address]'}, Email: ${cover.recipientEmail || '[Email]'} (hereinafter referred to as the "Recipient").`
  } else {
    recipientLine = `${cover.recipientName || '[Recipient Company Name]'}, a company incorporated under the laws of ${cover.recipientAddress || '[Jurisdiction]'}, with registration number ${cover.recipientIdOrPassport || '[Registration No.]'}, having its principal address at ${cover.recipientAddress || '[Address]'}, Email: ${cover.recipientEmail || '[Email]'} (hereinafter referred to as the "Recipient").`
  }

  return `This MUTUAL NON-DISCLOSURE AND NON-CIRCUMVENTION AGREEMENT (the "Agreement") is entered into and made effective as of ${date} (the "Effective Date"), by and between:\n\n${sinbaLine}\n\nAND\n\n${recipientLine}\n\nSinba and the Recipient may hereinafter be referred to individually as a "Party" and collectively as the "Parties."`
}

// Build the signature block
export function buildNdaSignatures(cover: NDACoverInfo): { sinba: string[][]; recipient: string[][] } {
  return {
    sinba: [
      ['SINBA GROUP ISRAEL LTD.', ''],
      ['By:', cover.sinbaSignatoryName || '[Name]'],
      ['Name:', cover.sinbaSignatoryName || '[Name]'],
      ['Title:', cover.sinbaSignatoryTitle || '[Title]'],
      ['Date:', cover.sinbaSignatoryDate || '[Date]'],
    ],
    recipient: [
      ['RECIPIENT', ''],
      ['By:', cover.recipientSignatoryName || '[Name]'],
      ['Name:', cover.recipientSignatoryName || '[Name]'],
      ['Title:', cover.recipientSignatoryTitle || '[Title]'],
      ['Date:', cover.recipientSignatoryDate || '[Date]'],
    ],
  }
}

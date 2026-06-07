/**
 * CSV Parser Utility for MassaPro Bulk Import
 * Parses CSV files for scenarios, clients, and users
 */

export interface CSVRow {
  [key: string]: string
}

export interface ParseResult {
  headers: string[]
  rows: CSVRow[]
  totalRows: number
  errors: string[]
}

/**
 * Parse a CSV string into structured data
 * Handles quoted fields, escaped quotes, and various line endings
 */
export function parseCSV(csvText: string): ParseResult {
  const errors: string[] = []
  const lines = csvText.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')
  
  if (lines.length === 0) {
    return { headers: [], rows: [], totalRows: 0, errors: ['Empty CSV file'] }
  }

  // Parse header row
  const headers = parseCSVLine(lines[0]).map(h => h.trim().toLowerCase())
  
  if (headers.length === 0) {
    return { headers: [], rows: [], totalRows: 0, errors: ['No headers found in CSV'] }
  }

  // Parse data rows
  const rows: CSVRow[] = []
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue // Skip empty lines
    
    const values = parseCSVLine(line)
    const row: CSVRow = {}
    
    headers.forEach((header, idx) => {
      row[header] = values[idx]?.trim() || ''
    })
    
    rows.push(row)
  }

  return { headers, rows, totalRows: rows.length, errors }
}

/**
 * Parse a single CSV line, respecting quoted fields
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    
    if (inQuotes) {
      if (char === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          // Escaped quote
          current += '"'
          i++
        } else {
          // End of quoted field
          inQuotes = false
        }
      } else {
        current += char
      }
    } else {
      if (char === '"') {
        inQuotes = true
      } else if (char === ',') {
        result.push(current)
        current = ''
      } else {
        current += char
      }
    }
  }
  
  result.push(current)
  return result
}

// ========================
// Scenario CSV Mapping
// ========================

export interface ScenarioCSVRow {
  id?: string
  created_date?: string
  name: string
  overview?: string
  overview_es?: string
  overview_en?: string
  company_website_url?: string
  status?: string
  client_id?: string
  client_email?: string
  company_goals?: string
  company_goals_es?: string
  company_goals_en?: string
  ai_automations_required?: string
  ai_automations_required_es?: string
  ai_automations_required_en?: string
  demo_focus_areas?: string
  demo_focus_areas_es?: string
  demo_focus_areas_en?: string
  languages_voice?: string
  languages_text?: string
  scripts_flows?: string
  scripts_flows_es?: string
  scripts_flows_en?: string
  knowledge_base_text?: string
  knowledge_base_text_es?: string
  knowledge_base_text_en?: string
  faq_objection_handling?: string
  faq_objection_handling_es?: string
  faq_objection_handling_en?: string
  required_integrations?: string
  required_integrations_es?: string
  required_integrations_en?: string
  erp_crm_ccaas?: string
  erp_crm_ccaas_es?: string
  erp_crm_ccaas_en?: string
}

export function mapScenarioRow(row: CSVRow): ScenarioCSVRow {
  return {
    id: row.id || undefined,
    created_date: row.created_date || undefined,
    name: row.name || '',
    overview: row.overview || undefined,
    overview_es: row.overview_es || undefined,
    overview_en: row.overview_en || undefined,
    company_website_url: row.company_website_url || undefined,
    status: row.status || 'draft',
    client_id: row.client_id || undefined,
    client_email: row.client_email || undefined,
    company_goals: row.company_goals || undefined,
    company_goals_es: row.company_goals_es || undefined,
    company_goals_en: row.company_goals_en || undefined,
    ai_automations_required: row.ai_automations_required || undefined,
    ai_automations_required_es: row.ai_automations_required_es || undefined,
    ai_automations_required_en: row.ai_automations_required_en || undefined,
    demo_focus_areas: row.demo_focus_areas || undefined,
    demo_focus_areas_es: row.demo_focus_areas_es || undefined,
    demo_focus_areas_en: row.demo_focus_areas_en || undefined,
    languages_voice: row.languages_voice || undefined,
    languages_text: row.languages_text || undefined,
    scripts_flows: row.scripts_flows || undefined,
    scripts_flows_es: row.scripts_flows_es || undefined,
    scripts_flows_en: row.scripts_flows_en || undefined,
    knowledge_base_text: row.knowledge_base_text || undefined,
    knowledge_base_text_es: row.knowledge_base_text_es || undefined,
    knowledge_base_text_en: row.knowledge_base_text_en || undefined,
    faq_objection_handling: row.faq_objection_handling || undefined,
    faq_objection_handling_es: row.faq_objection_handling_es || undefined,
    faq_objection_handling_en: row.faq_objection_handling_en || undefined,
    required_integrations: row.required_integrations || undefined,
    required_integrations_es: row.required_integrations_es || undefined,
    required_integrations_en: row.required_integrations_en || undefined,
    erp_crm_ccaas: row.erp_crm_ccaas || undefined,
    erp_crm_ccaas_es: row.erp_crm_ccaas_es || undefined,
    erp_crm_ccaas_en: row.erp_crm_ccaas_en || undefined,
  }
}

// ========================
// Client CSV Mapping (maps to User model with role='user')
// ========================

export interface ClientCSVRow {
  id?: string
  created_date?: string
  name: string
  email: string
  company?: string
  password?: string
  status?: string
  scenario_count?: string
  wizard_completed?: string
}

export function mapClientRow(row: CSVRow): ClientCSVRow {
  return {
    id: row.id || undefined,
    created_date: row.created_date || undefined,
    name: row.name || row.full_name || '',
    email: row.email || '',
    company: row.company || undefined,
    password: row.password || undefined,
    status: row.status || undefined,
    scenario_count: row.scenario_count || undefined,
    wizard_completed: row.wizard_completed || undefined,
  }
}

// ========================
// User CSV Mapping (maps to User model with any role)
// ========================

export interface UserCSVRow {
  id?: string
  created_date?: string
  full_name: string
  email: string
  role: string
  company?: string
  password?: string
}

export function mapUserRow(row: CSVRow): UserCSVRow {
  return {
    id: row.id || undefined,
    created_date: row.created_date || undefined,
    full_name: row.full_name || row.name || '',
    email: row.email || '',
    role: row.role || 'user',
    company: row.company || undefined,
    password: row.password || undefined,
  }
}

// ========================
// CSV Template Generators
// ========================

export function generateScenarioCSVTemplate(): string {
  return `id,created_date,name,overview,overview_es,overview_en,company_website_url,status,client_id,client_email,company_goals,company_goals_es,company_goals_en,ai_automations_required,ai_automations_required_es,ai_automations_required_en,demo_focus_areas,demo_focus_areas_es,demo_focus_areas_en,languages_voice,languages_text,scripts_flows,scripts_flows_es,scripts_flows_en,knowledge_base_text,knowledge_base_text_es,knowledge_base_text_en,faq_objection_handling,faq_objection_handling_es,faq_objection_handling_en,required_integrations,required_integrations_es,required_integrations_en,erp_crm_ccaas,erp_crm_ccaas_es,erp_crm_ccaas_en
scenario1,2024-01-01T10:00:00Z,My First Scenario,This is an overview.,Esta es una descripción general.,This is an overview.,example.com,draft,,client@example.com,Increase revenue by 20%,Incrementar ingresos en 20%,Increase revenue by 20%,Chatbot + IVR,Chatbot + IVR,Chatbot + IVR,CRM integration,Integración CRM,CRM integration,English; Spanish,English; Spanish,Main flow here,Flujo principal aquí,Main flow here,KB content here,Contenido de KB aquí,KB content here,Handle pricing objections,Manejar objeciones de precios,Handle pricing objections,Salesforce; Zendesk,Salesforce; Zendesk,Salesforce; Zendesk,Salesforce CRM,Salesforce CRM,Salesforce CRM`
}

export function generateClientCSVTemplate(): string {
  return `id,created_date,name,email,company,password,status,scenario_count,wizard_completed
client1,2024-01-01T09:00:00Z,John Doe,john.doe@example.com,Example Corp,,active,5,true
client2,2024-01-04T14:00:00Z,Jane Smith,jane.smith@sample.org,Sample Co,,active,2,false`
}

export function generateUserCSVTemplate(): string {
  return `id,created_date,full_name,email,role,company,password
user1,2024-01-01T08:00:00Z,Admin User,admin@yourdomain.com,admin,Your Company,Admin2024!
user2,2024-01-02T09:30:00Z,Regular User,user@yourdomain.com,user,Another Co,User2024!`
}

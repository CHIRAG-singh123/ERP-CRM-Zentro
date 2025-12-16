import { logger } from '../utils/logger';

interface KnowledgeBase {
  questions: string[];
  answer: string;
  role?: 'admin' | 'employee' | 'customer';
  entities?: string[];
}

let adminKnowledge: KnowledgeBase[] | null = null;
let employeeKnowledge: KnowledgeBase[] | null = null;
let customerKnowledge: KnowledgeBase[] | null = null;
let allKnowledgeLoaded = false;

// Pre-load knowledge base files using Vite's import.meta.glob
const knowledgeBaseModules = import.meta.glob('../data/chatbot/*.txt', { 
  eager: true, 
  as: 'raw' 
}) as Record<string, string>;

// List of Hindu traditional greetings for better detection
const HINDU_GREETINGS = [
  'ram ram', 'jai shree ram', 'jay shree ram', 'jai shri ram', 'jay shri ram',
  'jai shree krishna', 'jay shree krishna', 'jai shri krishna', 'jay shri krishna',
  'radhe radhe', 'hare krishna', 'hare rama', 'hare ram', 'jai radhe', 'radhe krishna',
  'jay bhavani', 'jai bhavani', 'jay mataji', 'jai mataji', 'jai mata ji', 'jai mata di',
  'om namah shivay', 'om namah shivaya', 'om shanti', 'har har mahadev', 'mahadev',
  'jai ganesh', 'ganpati bappa morya', 'ganpati bappa', 'bappa morya',
  'namaste', 'namaskar', 'pranam', 'jai swaminarayan', 'swaminarayan',
  'jai hanuman', 'jay hanuman', 'jai bajrangbali', 'jai shani dev',
  'jai durga', 'jai ambe', 'jai amba', 'jai kalika', 'jai kaali',
  'jai shiv shankar', 'jai shankar', 'jai parvati', 'jai lakshmi', 'jai saraswati',
  'jai gurudev', 'jai saint', 'jai mahakal', 'mahakal'
];

// ERP phrase patterns for common queries (action + entity)
const ERP_PHRASE_PATTERNS = [
  'edit documents', 'upload document', 'download document', 'download file', 'view documents',
  'add employee', 'edit employee', 'employee performance', 'manage employees',
  'add lead', 'convert lead', 'lead pipeline', 'lead status',
  'create deal', 'deal stage', 'deal value', 'close deal',
  'create quote', 'send quote', 'approve quote',
  'create invoice', 'send invoice', 'pay invoice',
  'create task', 'assign task', 'task due date',
  'generate report', 'view report', 'export report',
  'upload attachment', 'download attachment',
  'create product', 'edit product', 'product catalog',
  'contact details', 'account details',
  'calendar event', 'schedule meeting',
  'admin settings', 'manage roles', 'manage permissions', 'manage teams',
  'notifications', 'socket', 'chat',
];

// Semantic action/entity patterns for ERP detection
const ERP_ENTITY_ACTION_PATTERNS = [
  { actions: ['edit', 'update', 'modify'], entities: ['document', 'documents', 'file', 'files'] },
  { actions: ['upload', 'attach'], entities: ['document', 'file', 'attachment'] },
  { actions: ['download', 'get'], entities: ['document', 'file', 'attachment'] },
  { actions: ['add', 'create'], entities: ['employee', 'employees', 'user', 'users', 'lead', 'leads', 'deal', 'deals', 'quote', 'invoice', 'task', 'product', 'contact', 'account'] },
  { actions: ['view', 'see', 'list'], entities: ['report', 'reports', 'dashboard', 'documents', 'leads', 'deals', 'invoices', 'quotes', 'tasks'] },
  { actions: ['assign'], entities: ['task', 'role', 'permission', 'team'] },
];

// Programming / technical detection
const PROGRAMMING_KEYWORDS = [
  // Languages
  'python', 'java', 'javascript', 'typescript', 'c++', 'c#', 'csharp', 'php', 'ruby',
  'go', 'golang', 'rust', 'swift', 'kotlin', 'dart', 'scala', 'r',
  'sql', 'mysql', 'postgres', 'postgresql', 'oracle', 'mongodb', 'nosql',

  // Web frameworks & libraries
  'react', 'reactjs', 'nextjs', 'next.js', 'angular', 'vue', 'svelte',
  'express', 'laravel', 'django', 'flask', 'fastapi', 'spring', 'spring boot',
  'rails', 'asp.net', '.net', 'dotnet', 'nodejs', 'node.js', 'node',

  // DevOps / Cloud
  'aws', 'azure', 'gcp', 'google cloud', 'cloud', 'docker', 'kubernetes', 'k8s',
  'container', 'containerization', 'ci', 'cd', 'cicd', 'jenkins', 'github actions',
  'terraform', 'ansible', 'nginx', 'apache',

  // Data formats / communication
  'json', 'xml', 'yaml', 'yml', 'csv', 'api', 'rest', 'rest api', 'graphql',
  'endpoint', 'websocket', 'socket', 'socket.io',

  // Core programming concepts
  'function', 'functions', 'method', 'methods', 'class', 'classes',
  'object', 'objects', 'variable', 'variables', 'array', 'list',
  'dictionary', 'map', 'set', 'loop', 'for loop', 'while loop',
  'syntax', 'code', 'coding', 'programming', 'algorithm', 'algorithms',
  'framework', 'library', 'package', 'module', 'script', 'compiler',
  'runtime', 'debug', 'exception', 'error', 'stacktrace',

  // CS concepts
  'interface', 'inheritance', 'polymorphism', 'encapsulation', 'oop',
  'functional programming', 'recursion', 'data structure', 'linked list',
  'tree', 'graph', 'sorting', 'searching', 'hashmap', 'queue', 'stack',

  // Tools
  'git', 'github', 'gitlab', 'bitbucket', 'vscode', 'ide',
  'npm', 'yarn', 'pnpm', 'maven', 'gradle',

  // AI / ML
  'machine learning', 'ai', 'ml', 'deep learning', 'neural network', 'llm', 'chatgpt',
  'nlp', 'tensorflow', 'pytorch'
];


// Negative indicators that suggest non-ERP topics
const NEGATIVE_INDICATORS = [
  'how to code', 'write code', 'programming', 'syntax', 'compile', 'debug',
  'algorithm', 'data structure', 'leetcode', 'hackerrank', 'hacker rank',
  'codeforces', 'codechef', 'competitive programming', 'stack overflow',
  'stackexchange', 'coding problem', 'runtime error', 'segmentation fault',
  'time complexity', 'space complexity'
];

// ERP-CRM domain keywords for topic detection (aligned to project modules)
const ERP_CRM_KEYWORDS = [
  // Users & roles
  'employee', 'employees', 'staff', 'admin', 'administrator', 'manager',
  'user', 'users', 'role', 'roles', 'permission', 'permissions', 'team', 'teams',

  // CRM objects
  'customer', 'customers', 'client', 'clients',
  'lead', 'leads', 'deal', 'deals', 'opportunity', 'opportunities',
  'contact', 'contacts', 'account', 'accounts', 'pipeline', 'sales pipeline',

  // Sales / finance
  'invoice', 'invoices', 'quote', 'quotes', 'estimate', 'billing',
  'payment', 'payments', 'transaction', 'receipt', 'receipts',
  'purchase order', 'po', 'vendor', 'vendors', 'supplier', 'suppliers',

  // Inventory
  'inventory', 'stock', 'stocks', 'warehouse', 'warehouses',
  'item', 'items', 'product', 'products', 'sku', 'lot', 'batch',

  // Support
  'ticket', 'tickets', 'support', 'helpdesk', 'sla', 'issue',

  // Analytics & dashboards
  'dashboard', 'report', 'reports', 'analytics', 'performance', 'audit',

  // System & configuration
  'settings', 'configuration', 'permission', 'api', 'integration',
  'document', 'documents', 'file', 'files', 'upload', 'download', 'notification', 'socket', 'chat', 'chatbot',

  // Operations (verbs)
  'manage', 'create', 'edit', 'delete', 'view', 'add', 'update',

  // Major ERP modules (aligned to routes/pages)
  'crm', 'erp', 'hrms', 'payroll', 'attendance', 'timesheet',
  'leave management', 'workflow', 'automation',
  'accounts', 'contacts', 'leads', 'deals', 'opportunities', 'quotes', 'invoices',
  'documents', 'reports', 'calendar', 'teams', 'roles', 'users', 'settings',

  // Manufacturing / finance accounting
  'bom', 'bill of materials', 'work order', 'production', 'manufacturing',
  'ledger', 'journal', 'balance sheet', 'profit and loss', 'p&l',
  'trial balance', 'tax', 'gst', 'vat', 'compliance'
];

// Entity keyword map for entity-aware matching
const ENTITY_KEYWORDS: Record<string, string[]> = {
  documents: ['document', 'documents', 'doc', 'docs', 'file', 'files'],
  contacts: ['contact', 'contacts', 'account', 'accounts', 'customer', 'customers'],
  chat: ['chat', 'chats', 'chatting', 'chating', 'message', 'messages', 'conversation', 'conversations'],
  employees: ['employee', 'employees', 'staff', 'team'],
  products: ['product', 'products', 'catalog', 'inventory'],
  leads: ['lead', 'leads'],
  deals: ['deal', 'deals', 'opportunity', 'opportunities'],
  tasks: ['task', 'tasks', 'todo', 'to-do'],
};


type QueryType = 'greeting' | 'erp' | 'general' | 'unclear';

interface ClassifiedQuery {
  type: QueryType;
  confidence: number; // 0-1
}

function isERPCRMRelated(query: string): boolean {
  const normalized = normalizeText(query);
  const words = normalized.split(' ').filter(Boolean);

  // Check for exact keyword presence
  const keywordHit = ERP_CRM_KEYWORDS.some((kw) =>
    normalized.includes(kw) || words.includes(kw)
  );

  if (keywordHit) return true;

  // Check for combined phrases
  const phraseHits = [
    'add employee', 'new employee', 'employee performance',
    'add customer', 'customer details', 'customer portal',
    'add lead', 'convert lead', 'lead pipeline',
    'create deal', 'deal stage', 'opportunity',
    'upload document', 'send invoice', 'create quote',
    'view dashboard', 'run report', 'audit log',
    'manage roles', 'user permissions', 'system settings',
    'edit documents', 'upload document', 'download document', 'download file', 'view documents',
    'admin edit documents', 'admin upload document', 'admin download document',
    'create invoice', 'send invoice', 'create quote', 'send quote',
    'create task', 'assign task', 'task due date',
    'calendar event', 'schedule meeting',
    'create product', 'edit product', 'product catalog',
    'contact details', 'account details',
  ];

  return phraseHits.some((phrase) => normalized.includes(phrase));
}

function isGreetingType(query: string): boolean {
  const normalized = normalizeText(query);
  const queryWords = normalized.split(' ').filter(w => w.length > 0);

  // Check if it matches any Hindu greeting
  for (const greeting of HINDU_GREETINGS) {
    const greetingWords = greeting.split(' ');
    // Check if all greeting words are present in query
    if (greetingWords.every(gw => queryWords.some(qw => qw.includes(gw) || gw.includes(qw)))) {
      return true;
    }
    // Also check exact match
    if (normalized === greeting || normalized.includes(greeting) || greeting.includes(normalized)) {
      return true;
    }
  }

  // Check for common greeting patterns
  const greetingPatterns = ['hello', 'hi', 'hey', 'greetings', 'namaste', 'namaskar'];
  return greetingPatterns.some(pattern => normalized.includes(pattern));
}

function containsAny(termList: string[], normalized: string): boolean {
  return termList.some((kw) => normalized.includes(kw));
}

export function classifyQueryWithConfidence(query: string): ClassifiedQuery {
  const normalized = normalizeText(query);

  if (isGreetingType(query)) return { type: 'greeting', confidence: 0.9 };

  // ERP phrase patterns
  if (ERP_PHRASE_PATTERNS.some((p) => normalized.includes(p))) {
    return { type: 'erp', confidence: 0.9 };
  }

  // Role/action/entity semantic patterns
  for (const pattern of ERP_ENTITY_ACTION_PATTERNS) {
    const actionHit = pattern.actions.some((a) => normalized.includes(a));
    const entityHit = pattern.entities.some((e) => normalized.includes(e));
    if (actionHit && entityHit) {
      return { type: 'erp', confidence: 0.85 };
    }
  }

  if (containsAny(NEGATIVE_INDICATORS, normalized)) {
    return { type: 'general', confidence: 0.9 };
  }

  if (containsAny(PROGRAMMING_KEYWORDS, normalized)) {
    return { type: 'general', confidence: 0.85 };
  }

  if (isERPCRMRelated(query)) {
    return { type: 'erp', confidence: 0.85 };
  }

  const wordCount = normalized.split(' ').filter(Boolean).length;
  if (wordCount <= 3) return { type: 'unclear', confidence: 0.4 };

  return { type: 'general', confidence: 0.6 };
}

/**
 * Load knowledge base from text file
 */
async function loadKnowledgeBaseFromFile(role: 'admin' | 'employee' | 'customer'): Promise<string> {
  try {
    // Try to get from pre-loaded modules first (Vite import.meta.glob)
    const fileName = `${role}-knowledge.txt`;
    const modulePath = `../data/chatbot/${fileName}`;
    
    if (knowledgeBaseModules[modulePath]) {
      logger.debug(`[ChatbotService] Loaded ${fileName} from pre-loaded modules`);
      return knowledgeBaseModules[modulePath];
    }
    
    // Fallback: try fetch
    const paths = [
      `/src/data/chatbot/${fileName}`,
      `/data/chatbot/${fileName}`,
    ];
    
    for (const path of paths) {
      try {
        const response = await fetch(path);
        if (response.ok) {
          const content = await response.text();
          if (content && content.trim().length > 0) {
            logger.debug(`[ChatbotService] Successfully loaded ${fileName} from ${path}`);
            return content;
          }
        }
      } catch (err) {
        // Try next path
        continue;
      }
    }
    
    logger.warn(`[ChatbotService] Could not load ${fileName} from any source`);
    return '';
  } catch (error) {
    logger.error(`[ChatbotService] Error loading ${role}-knowledge.txt:`, error);
    return '';
  }
}

/**
 * Load all knowledge bases
 */
async function loadAllKnowledgeBases(): Promise<void> {
  if (allKnowledgeLoaded) return;
  
  try {
    // Load all three knowledge bases in parallel
    const [adminContent, employeeContent, customerContent] = await Promise.all([
      loadKnowledgeBaseFromFile('admin'),
      loadKnowledgeBaseFromFile('employee'),
      loadKnowledgeBaseFromFile('customer'),
    ]);
    
    // Parse and cache each knowledge base
    if (adminContent) {
      adminKnowledge = attachEntities(parseKnowledgeBase(adminContent));
      adminKnowledge.forEach(entry => entry.role = 'admin');
    }
    
    if (employeeContent) {
      employeeKnowledge = attachEntities(parseKnowledgeBase(employeeContent));
      employeeKnowledge.forEach(entry => entry.role = 'employee');
    }
    
    if (customerContent) {
      customerKnowledge = attachEntities(parseKnowledgeBase(customerContent));
      customerKnowledge.forEach(entry => entry.role = 'customer');
    }
    
    allKnowledgeLoaded = true;
    logger.debug('[ChatbotService] All knowledge bases loaded successfully');
  } catch (error) {
    logger.error('[ChatbotService] Error loading knowledge bases:', error);
  }
}

/**
 * Get all knowledge bases combined
 */
async function getAllKnowledgeBases(): Promise<KnowledgeBase[]> {
  await loadAllKnowledgeBases();
  
  const allKnowledge: KnowledgeBase[] = [];
  
  if (adminKnowledge) allKnowledge.push(...adminKnowledge);
  if (employeeKnowledge) allKnowledge.push(...employeeKnowledge);
  if (customerKnowledge) allKnowledge.push(...customerKnowledge);
  
  return allKnowledge;
}

function parseKnowledgeBase(content: string): KnowledgeBase[] {
  const entries: KnowledgeBase[] = [];
  const lines = content.split('\n');
  
  let currentQ: string[] = [];
  let currentA = '';
  let isAnswer = false;
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    if (trimmed.startsWith('Q:')) {
      // Save previous entry if exists
      if (currentQ.length > 0 && currentA) {
        entries.push({
          questions: currentQ,
          answer: currentA.trim(),
        });
      }
      
      // Start new entry
      currentQ = [trimmed.substring(2).trim()];
      currentA = '';
      isAnswer = false;
    } else if (trimmed.startsWith('A:')) {
      currentA = trimmed.substring(2).trim();
      isAnswer = true;
    } else if (trimmed && isAnswer) {
      currentA += ' ' + trimmed;
    } else if (trimmed && !isAnswer && currentQ.length > 0) {
      // Additional question variations
      currentQ.push(trimmed);
    }
  }
  
  // Save last entry
  if (currentQ.length > 0 && currentA) {
    entries.push({
      questions: currentQ,
      answer: currentA.trim(),
    });
  }
  
  return entries;
}

/**
 * Extract entities from a piece of text using keyword buckets.
 */
function extractEntitiesFromText(text: string): string[] {
  const normalized = normalizeText(text);
  const found: string[] = [];

  Object.entries(ENTITY_KEYWORDS).forEach(([entity, keywords]) => {
    if (keywords.some((kw) => normalized.includes(kw))) {
      found.push(entity);
    }
  });

  return found;
}

/**
 * Attach derived entity tags to knowledge base entries for better matching.
 */
function attachEntities(entries: KnowledgeBase[]): KnowledgeBase[] {
  return entries.map((entry) => {
    const combined = [...entry.questions, entry.answer].join(' ');
    const entities = extractEntitiesFromText(combined);
    return { ...entry, entities };
  });
}

/**
 * Enhanced text normalization - handles case variations and special characters
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ') // Replace special chars with space
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
}

/**
 * Enhanced matching algorithm with better handling for greetings and variations
 */
function calculateMatchScore(
  query: string,
  questions: string[],
  isGreeting: boolean,
  isERP: boolean,
  wordCount: number
): number {
  const normalizedQuery = normalizeText(query);
  const queryWords = normalizedQuery.split(' ').filter(w => w.length > 0);
  
  let maxScore = 0;
  
  for (const question of questions) {
    const normalizedQ = normalizeText(question);
    const questionWords = normalizedQ.split(' ').filter(w => w.length > 0);
    
    // Exact phrase match (case-insensitive)
    if (normalizedQ === normalizedQuery) {
      maxScore = Math.max(maxScore, 100);
      continue;
    }
    
    // Partial phrase match (one contains the other)
    if (normalizedQ.includes(normalizedQuery) || normalizedQuery.includes(normalizedQ)) {
      maxScore = Math.max(maxScore, 95);
      continue;
    }
    
    // For greetings and short phrases, use more lenient matching
    const isShortQuery = queryWords.length <= 3 || isGreeting;
    
    if (isShortQuery) {
      // Check if all query words are present in question (in any order)
      const allWordsMatch = queryWords.every(qw => 
        questionWords.some(qw2 => qw2.includes(qw) || qw.includes(qw2))
      );
      
      if (allWordsMatch && queryWords.length > 0) {
        maxScore = Math.max(maxScore, 90);
        continue;
      }
    }
    
    // Word overlap score with stricter weighting
    let matchCount = 0;
    for (const word of queryWords) {
      if (word.length > 0) {
        const wordMatches = questionWords.some(qw => 
          qw.includes(word) || word.includes(qw) || qw === word
        );
        if (wordMatches) {
          matchCount++;
        }
      }
    }
    
    if (queryWords.length > 0) {
      let overlapScore = (matchCount / queryWords.length) * 100;

      // Penalty for common/short word overlap on long queries
      if (wordCount > 10 && overlapScore < 70) {
        overlapScore *= 0.5;
      }

      // Boost for ERP domain matches
      if (isERP && ERP_CRM_KEYWORDS.some((kw) => normalizedQ.includes(kw))) {
        overlapScore = Math.min(100, overlapScore + 15);
      }

      // Cap low overlaps to avoid weak matches
      const adjusted = overlapScore < 60 ? overlapScore * 0.6 : overlapScore;
      maxScore = Math.max(maxScore, adjusted);
    }
  }
  
  return maxScore;
}

/**
 * Check if query is about admin/employee features
 */
function isAdminEmployeeQuery(query: string): boolean {
  const normalized = normalizeText(query);
  const adminKeywords = ['admin', 'administrator', 'employee', 'staff', 'manage users', 'manage roles', 'permissions', 'audit', 'performance', 'internal', 'backend'];
  const employeeKeywords = ['employee', 'staff', 'my performance', 'employee dashboard', 'employee portal'];
  
  return adminKeywords.some(kw => normalized.includes(kw)) || 
         employeeKeywords.some(kw => normalized.includes(kw));
}

/**
 * Get knowledge base for a specific role
 */
async function getRoleKnowledgeBase(role: 'admin' | 'employee' | 'customer'): Promise<KnowledgeBase[]> {
  await loadAllKnowledgeBases();
  
  switch (role) {
    case 'admin':
      return adminKnowledge || [];
    case 'employee':
      return employeeKnowledge || [];
    case 'customer':
      return customerKnowledge || [];
    default:
      return customerKnowledge || [];
  }
}

/**
 * Enhanced findKnowledgeBaseAnswer - scans knowledge bases with role-based access control
 * Admin => checks admin-knowledge.txt only
 * Employee => checks employee-knowledge.txt only
 * Customer => checks customer-knowledge.txt only
 * Unauthenticated => checks customer-knowledge.txt only
 */
export async function findKnowledgeBaseAnswer(
  query: string,
  role: 'admin' | 'employee' | 'customer',
  isAuthenticated: boolean = true
): Promise<string | null> {
  try {
    // Step 1: For unauthenticated users, check if query is about admin/employee features
    if (!isAuthenticated && isAdminEmployeeQuery(query)) {
      logger.debug('[ChatbotService] Unauthenticated user asking about admin/employee features - refusing');
      return "I'm sorry, but I can only provide information about customer-facing features. For administrative or employee-related questions, please sign in with the appropriate account. You can use the 'Sign In' button in the top right corner to access those features.";
    }

    // Step 2: Classify question type with confidence
    const { type: queryType, confidence } = classifyQueryWithConfidence(query);
    const isGreeting = queryType === 'greeting';
    const isERP = queryType === 'erp';
    const wordCount = normalizeText(query).split(' ').filter(Boolean).length;
    const queryEntities = extractEntitiesFromText(query);

    // If general or unclear, and not greeting, skip KB to avoid wrong matches
    // This allows the API to handle general/programming questions
    if (!isGreeting && !isERP) {
      logger.debug(`[ChatbotService] Skipping KB lookup for general/unclear query (type: ${queryType}, confidence: ${confidence.toFixed(2)}) - will use API for response`);
      return null;
    }
    
    // Step 3: Load role-specific knowledge base
    // Admin => admin-knowledge.txt only
    // Employee => employee-knowledge.txt only
    // Customer => customer-knowledge.txt only
    // Unauthenticated => customer-knowledge.txt only
    const targetRole = !isAuthenticated ? 'customer' : role;
    const allKnowledge = await getRoleKnowledgeBase(targetRole);
    
    logger.debug(`[ChatbotService] Searching ${targetRole} knowledge base (${allKnowledge.length} entries) for role: ${role}, authenticated: ${isAuthenticated}`);
    
    if (allKnowledge.length === 0) {
      logger.warn(`[ChatbotService] No knowledge base entries found for role: ${targetRole}`);
      return null;
    }
    
    let bestMatch: KnowledgeBase | null = null;
    let bestScore = 0;
    
    // Thresholds adaptive by length and type
    let threshold: number;
    if (isGreeting) {
      threshold = 50;
    } else if (wordCount <= 3) {
      threshold = 50;
    } else if (wordCount <= 10) {
      threshold = 70;
    } else {
      threshold = 85;
    }
    
    // Step 4: Search through role-specific knowledge base
    for (const entry of allKnowledge) {
      const score = calculateMatchScore(query, entry.questions, isGreeting, isERP, wordCount);
      const entryEntities = entry.entities ?? [];
      const entityOverlap = queryEntities.filter((qe) => entryEntities.includes(qe));
      const hasEntitySignal = queryEntities.length > 0;
      const hasEntryEntities = entryEntities.length > 0;

      // If the user gave an entity hint but this entry doesn't share it, skip on very short queries
      if (hasEntitySignal && hasEntryEntities && entityOverlap.length === 0 && wordCount <= 4 && !isGreeting) {
        continue;
      }
      
      // Since we're already filtering by role, all entries match the role
      let adjustedScore = score;

      // Entity-aware scoring: boost matches that share entities, penalize mismatches
      if (hasEntitySignal) {
        if (entityOverlap.length > 0) {
          adjustedScore += 15;
        } else if (!isGreeting) {
          adjustedScore *= 0.75;
        }
      } else if (hasEntryEntities && wordCount <= 3 && !isGreeting) {
        // For very short queries without entity hints, slightly penalize heavily tagged entries to avoid wrong picks
        adjustedScore *= 0.9;
      }
      
      if (adjustedScore > bestScore && score >= threshold) {
        bestScore = adjustedScore;
        bestMatch = entry;
      }
    }
    
    if (bestMatch && bestScore >= threshold) {
      logger.debug(`[ChatbotService] Found match with score: ${bestScore.toFixed(2)} (role: ${targetRole}, isGreeting: ${isGreeting}, type: ${queryType}, classificationConfidence: ${confidence.toFixed(2)})`);
      return bestMatch.answer;
    }
    
    logger.debug(`[ChatbotService] No match found in ${targetRole} knowledge base (best score: ${bestScore.toFixed(2)}, threshold: ${threshold}, isGreeting: ${isGreeting}, type: ${queryType}, classificationConfidence: ${confidence.toFixed(2)})`);
    return null;
  } catch (error) {
    logger.error('[ChatbotService] Error finding answer:', error);
    return null;
  }
}

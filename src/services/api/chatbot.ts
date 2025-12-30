import { logger } from '../../utils/logger';
import type { OpenRouterRequest, OpenRouterResponse } from '../../types/chatbot';
import { getCachedResponse, cacheResponse } from './chatbotCache';
import { recordSuccess, recordFailure } from './chatbotMetrics';

// API keys and URLs (loaded from environment via Vite). Do NOT include secrets here.
const OPENROUTER_API_KEY = (import.meta as any).env?.VITE_OPENROUTER_API_KEY || '';
const OPENROUTER_API_URL = (import.meta as any).env?.VITE_OPENROUTER_API_URL || '';

const GOOGLE_AI_STUDIOS_API_KEY = (import.meta as any).env?.VITE_GOOGLE_AI_STUDIOS_API_KEY || '';
const GOOGLE_AI_STUDIOS_API_URL = (import.meta as any).env?.VITE_GOOGLE_AI_STUDIOS_API_URL || '';

const OPENAI_API_KEY = (import.meta as any).env?.VITE_OPENAI_API_KEY || '';
const OPENAI_API_URL = (import.meta as any).env?.VITE_OPENAI_API_URL || '';

const GROQ_API_KEY = (import.meta as any).env?.VITE_GROQ_API_KEY || '';
const GROQ_API_URL = (import.meta as any).env?.VITE_GROQ_API_URL || '';

const DEEPSEEK_API_KEY = (import.meta as any).env?.VITE_DEEPSEEK_API_KEY || '';
const DEEPSEEK_API_URL = (import.meta as any).env?.VITE_DEEPSEEK_API_URL || '';


type QueryContext = {
  classification?: string;
  confidence?: number;
  questionType?: string;
  wordCount?: number;
  isAuthenticated?: boolean;
};





// Free models to try sequentially for reliability
const FREE_MODELS = [
  'deepseek/deepseek-r1:free',
  'tng/deepseek-r1t2-chimera:free',
  'xiaomi/mimo-v2-flash:free',
  'mistralai/mistral-small-3.2-24b-instruct:free',
  'nvidia/nemotron-3-nano-30b-a3b:free',
  'z-ai/glm-4.5-air:free',
  'allenai/olmo-3.1-32b-think:free',
  'google/gemini-2.0-flash-exp:free',
  'meta-llama/llama-3.3-70b-instruct:free',
  'qwen/qwen-2.5-72b-instruct:free',
];

// Google AI Studios free models (sequential fallback)
const GOOGLE_AI_MODELS = [
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite-preview-02-05',
  'gemini-1.5-flash',
  'gemini-1.5-flash-8b',
  'gemini-1.5-pro',
];

// OpenAI models (cost-effective, may require credits)
const OPENAI_MODELS = [
  'gpt-4o-mini',  // Most cost-effective
  'gpt-4o',
  'o1-mini',
];

// Groq free models (sequential fallback)
const GROQ_MODELS = [
  'llama-3.3-70b-versatile',
  'llama-3.1-8b-instant',
  'mixtral-8x7b-32768',
  'gemma2-9b-it',
  'deepseek-r1-distill-llama-70b',
  'deepseek-r1-distill-qwen-32b',
];

// DeepSeek models (may require credits)
const DEEPSEEK_MODELS = [
  'deepseek-chat',  // V3
  'deepseek-reasoner',  // R1
];

/**
 * Call Google AI Studios API (internal function - tries models sequentially)
 */
async function callGoogleAIStudiosAPIInternal(
  modelIndex: number = 0,
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
  userRole?: string,
  context?: QueryContext
): Promise<string> {
  // Validate API key exists
  if (!GOOGLE_AI_STUDIOS_API_KEY || GOOGLE_AI_STUDIOS_API_KEY.trim() === '') {
    logger.error('[Chatbot] Google AI Studios API key is missing or empty');
    throw new Error('Google AI Studios API key is missing. Please configure the API key.');
  }

  // Check if we've exhausted all models
  if (modelIndex >= GOOGLE_AI_MODELS.length) {
    throw new Error('All Google AI Studios models have been exhausted');
  }

  const model = GOOGLE_AI_MODELS[modelIndex];
  const modelNumber = modelIndex + 1;
  const totalModels = GOOGLE_AI_MODELS.length;
  const startTime = Date.now();

  try {
    logger.debug(`[Chatbot] [Google AI Model ${modelNumber}/${totalModels}] Attempting model: ${model}`);

    // Convert messages to Google AI format
    const contents: any[] = [];
    let systemInstruction = buildSystemPrompt(userRole, context);

    for (const msg of messages) {
      if (msg.role === 'system') {
        systemInstruction = msg.content;
      } else if (msg.role === 'user') {
        contents.push({
          role: 'user',
          parts: [{ text: msg.content }],
        });
      } else if (msg.role === 'assistant') {
        contents.push({
          role: 'model',
          parts: [{ text: msg.content }],
        });
      }
    }

    const requestBody = {
      contents,
      systemInstruction: {
        parts: [{ text: systemInstruction }],
      },
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 500,
      },
    };

    // Construct URL with model name in path
    // Extract base URL (remove any existing model path)
    const baseUrl = GOOGLE_AI_STUDIOS_API_URL.replace(/\/models\/[^\/]+:generateContent$/, '') || 
                    'https://generativelanguage.googleapis.com/v1beta';
    const url = `${baseUrl}/models/${model}:generateContent?key=${GOOGLE_AI_STUDIOS_API_KEY}`;

    // Add timeout to fetch request
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        logger.warn(`[Chatbot] [Google AI Model ${modelNumber}/${totalModels}] Request timed out: ${model}`);
        // Try next model if available
        if (modelIndex + 1 < GOOGLE_AI_MODELS.length) {
          logger.debug(`[Chatbot] Trying next Google AI model (${modelIndex + 2}/${totalModels})`);
          return callGoogleAIStudiosAPIInternal(modelIndex + 1, messages, userRole, context);
        }
        throw new Error('Request timeout - Google AI Studios took too long to respond');
      } else if (fetchError instanceof TypeError && fetchError.message.includes('fetch')) {
        logger.warn(`[Chatbot] [Google AI Model ${modelNumber}/${totalModels}] Network error: ${model}`);
        // Try next model if available
        if (modelIndex + 1 < GOOGLE_AI_MODELS.length) {
          logger.debug(`[Chatbot] Trying next Google AI model (${modelIndex + 2}/${totalModels})`);
          return callGoogleAIStudiosAPIInternal(modelIndex + 1, messages, userRole, context);
        }
        throw new Error('Network error - please check your internet connection');
      } else {
        logger.warn(`[Chatbot] [Google AI Model ${modelNumber}/${totalModels}] Fetch error: ${model}`, fetchError);
        // Try next model if available
        if (modelIndex + 1 < GOOGLE_AI_MODELS.length) {
          logger.debug(`[Chatbot] Trying next Google AI model (${modelIndex + 2}/${totalModels})`);
          return callGoogleAIStudiosAPIInternal(modelIndex + 1, messages, userRole, context);
        }
        throw fetchError;
      }
    }

    if (!response.ok) {
      const errorText = await response.text();
      logger.warn(`[Chatbot] [Google AI Model ${modelNumber}/${totalModels}] API error (${response.status}): ${model} - ${errorText.substring(0, 100)}`);
      // Try next model if available
      if (modelIndex + 1 < GOOGLE_AI_MODELS.length) {
        logger.debug(`[Chatbot] Trying next Google AI model (${modelIndex + 2}/${totalModels})`);
        return callGoogleAIStudiosAPIInternal(modelIndex + 1, messages, userRole, context);
      }
      throw new Error(`Google AI Studios API request failed: ${response.status} - ${errorText.substring(0, 100)}`);
    }

    const data = await response.json();

    if (!data.candidates || data.candidates.length === 0) {
      logger.warn(`[Chatbot] [Google AI Model ${modelNumber}/${totalModels}] Empty response from: ${model}`);
      // Try next model if available
      if (modelIndex + 1 < GOOGLE_AI_MODELS.length) {
        logger.debug(`[Chatbot] Trying next Google AI model (${modelIndex + 2}/${totalModels})`);
        return callGoogleAIStudiosAPIInternal(modelIndex + 1, messages, userRole, context);
      }
      throw new Error('No response from Google AI Studios API');
    }

    const content = data.candidates[0].content.parts[0].text;
    const trimmedContent = content.trim();
    const latency = Date.now() - startTime;
    
    // Score response quality
    const userQuery = messages.find(m => m.role === 'user')?.content || '';
    const qualityScore = scoreResponseQuality(trimmedContent, userQuery, context?.classification);
    
    // Record metrics
    recordSuccess(model, 'google-ai', latency, context?.classification, qualityScore);
    
    logger.debug(`[Chatbot] [Google AI Model ${modelNumber}/${totalModels}] Successfully received response from: ${model} (latency: ${latency}ms, quality: ${qualityScore.toFixed(2)})`);
    
    // If quality is low and we have more models, try next model
    if (qualityScore < 0.4 && modelIndex + 1 < GOOGLE_AI_MODELS.length) {
      logger.warn(`[Chatbot] [Google AI Model ${modelNumber}/${totalModels}] Low quality response from ${model} (score: ${qualityScore.toFixed(2)}), trying next model`);
      try {
        return await callGoogleAIStudiosAPIInternal(modelIndex + 1, messages, userRole, context);
      } catch (retryError) {
        logger.warn(`[Chatbot] Next model also failed, returning response from ${model}`);
        return trimmedContent;
      }
    }
    
    return trimmedContent;
  } catch (error: any) {
    // Record failure
    recordFailure(model, 'google-ai', error?.message || 'Unknown error', context?.classification);
    
    // If this is our custom "exhausted" error, re-throw it
    if (error?.message?.includes('All Google AI Studios models have been exhausted')) {
      throw error;
    }
    
    logger.warn(`[Chatbot] [Google AI Model ${modelNumber}/${totalModels}] Error with model ${model}:`, error?.message || 'Unknown error');
    
    // Try next model if available
    if (modelIndex + 1 < GOOGLE_AI_MODELS.length) {
      logger.debug(`[Chatbot] Trying next Google AI model (${modelIndex + 2}/${totalModels})`);
      try {
        return await callGoogleAIStudiosAPIInternal(modelIndex + 1, messages, userRole, context);
      } catch (retryError) {
        // If retry also fails, throw original error
        throw error;
      }
    }
    
    // If all models failed, throw error
    throw error;
  }
}

/**
 * Call Google AI Studios API (wrapper for backward compatibility)
 * @deprecated Use callGoogleAIStudiosAPIInternal directly
 */
async function _callGoogleAIStudiosAPI(
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
  userRole?: string,
  context?: QueryContext
): Promise<string> {
  return callGoogleAIStudiosAPIInternal(0, messages, userRole, context);
}

/**
 * Build adaptive system prompt based on query characteristics
 */
function buildSystemPrompt(userRole?: string, context?: QueryContext) {
  const isAuthenticated = context?.isAuthenticated ?? true;
  const queryType = context?.classification || 'general';
  const wordCount = context?.wordCount || 0;
  const questionType = context?.questionType;
  
  // Adaptive prompt length based on query complexity
  const isSimpleQuery = queryType === 'greeting' || wordCount <= 5;
  const isComplexQuery = wordCount > 30 || queryType === 'general';
  
  // Role-specific knowledge base context
  let roleContext = '';
  if (userRole === 'admin') {
    roleContext = isSimpleQuery
      ? 'Admin access: employees, products, audit logs, settings.'
      : 'You have access to ADMIN knowledge base. You can answer questions about: managing employees, viewing employee performance, managing products, viewing audit logs, changing user roles, exporting data, system settings, permissions, and all administrative functions.';
  } else if (userRole === 'employee') {
    roleContext = isSimpleQuery
      ? 'Employee access: products, performance, contacts, chat.'
      : 'You have access to EMPLOYEE knowledge base. You can answer questions about: viewing products, creating/editing products, viewing your performance, managing users (customer accounts), uploading product images, setting prices, product categories, chatting with teammates, managing contacts, and employee-specific functions.';
  } else {
    roleContext = isSimpleQuery
      ? 'Customer access: products, dashboard, ratings.'
      : 'You have access to CUSTOMER knowledge base. You can answer questions about: viewing products, product details, searching products, viewing dashboard, product ratings, filtering products, navigating customer portal, and customer-facing features.';
  }

  const roleLine = userRole ? `The user role is ${userRole}. ${roleContext} Adjust your responses based on this role's permissions and knowledge base.` : '';
  
  // Adaptive classification line (only for complex queries)
  const classificationLine = !isSimpleQuery && context?.classification
    ? `Query classification: ${context.classification} (confidence ${(context.confidence ?? 0).toFixed(2)}).`
    : '';
    
  const questionTypeLine = !isSimpleQuery && questionType
    ? `Question type: ${questionType}.`
    : '';
    
  const lengthLine = !isSimpleQuery && context?.wordCount !== undefined
    ? `Approximate length: ${context.wordCount} words.`
    : '';

  // Access control instructions for unauthenticated users
  const accessControlLine = !isAuthenticated
    ? `IMPORTANT: The user is NOT authenticated. You can ONLY provide information from the CUSTOMER knowledge base about customer-facing features, products, and public information. If asked about admin features, employee features, internal operations, user management, permissions, roles, audit logs, employee performance, or any administrative functions, you MUST politely decline and suggest they sign in. Use this response template: "I'm sorry, but I can only provide information about customer-facing features. For administrative or employee-related questions, please sign in with the appropriate account using the 'Sign In' button in the top right corner."`
    : '';

  // Handle general/programming questions (adaptive detail)
  const generalQuestionHandling = context?.classification === 'general' || context?.classification === 'unclear'
    ? isComplexQuery
      ? 'IMPORTANT: This is a general or programming-related question. You should provide helpful, accurate answers even if the topic is not directly related to ERP-CRM. For programming questions, explain concepts clearly and provide examples when helpful. Be professional and informative. Use code examples when appropriate.'
      : 'This is a general question. Provide a clear, helpful answer.'
    : '';

  // Base prompt (adaptive length)
  const basePrompt = isSimpleQuery
    ? [
        'You are a helpful ERP-CRM assistant.',
        'Provide accurate, concise responses.',
        'Use bullets for multi-step answers.',
      ]
    : [
        'You are an intelligent, professional assistant for an ERP-CRM system.',
        'You have access to role-specific knowledge bases and should provide accurate, helpful responses.',
        'Be concise, accurate, and structured. Prefer bullets for multi-step answers.',
        'You can answer questions about ERP-CRM topics using your knowledge base, AND you can also answer general questions, programming questions, technical questions, and other topics professionally.',
        'For general or programming questions, provide clear, helpful explanations even if they are not ERP-CRM related.',
        'If the question is unrelated to ERP-CRM, still answer professionally and clearly with helpful information.',
        'Avoid guessing. If unsure, say so briefly and suggest next steps.',
        'Use the knowledge base context to provide accurate, role-appropriate answers when relevant.',
      ];

  return [
    ...basePrompt,
    generalQuestionHandling,
    accessControlLine,
    roleLine,
    classificationLine,
    questionTypeLine,
    lengthLine,
  ].filter(Boolean).join(' ');
}

/**
 * Score response quality (0-1)
 */
function scoreResponseQuality(response: string, query: string, queryType?: string): number {
  if (!response || response.trim().length === 0) {
    return 0;
  }

  let score = 0.5; // Base score

  // Length check
  const responseLength = response.trim().length;
  if (responseLength < 10) {
    score -= 0.3; // Too short
  } else if (responseLength > 2000) {
    score -= 0.2; // Too long (might be error)
  } else if (responseLength >= 50 && responseLength <= 500) {
    score += 0.1; // Good length
  }

  // Check for error indicators
  if (/\b(error|failed|unavailable|timeout|network|connection)\b/i.test(response)) {
    score -= 0.4;
  }

  // Check for helpful indicators
  if (/\b(here|steps|example|how to|you can|follow|instructions)\b/i.test(response)) {
    score += 0.2;
  }

  // Check if response seems to address the query (basic keyword overlap)
  const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 3);
  const responseLower = response.toLowerCase();
  const matchingWords = queryWords.filter(word => responseLower.includes(word));
  if (queryWords.length > 0) {
    const overlap = matchingWords.length / queryWords.length;
    score += overlap * 0.2;
  }

  // Cap between 0 and 1
  return Math.max(0, Math.min(1, score));
}

/**
 * Call OpenAI API (internal function - tries models sequentially)
 */
async function callOpenAIAPIInternal(
  modelIndex: number = 0,
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
  userRole?: string,
  context?: QueryContext
): Promise<string> {
  // Validate API key exists
  if (!OPENAI_API_KEY || OPENAI_API_KEY.trim() === '') {
    logger.error('[Chatbot] OpenAI API key is missing or empty');
    throw new Error('OpenAI API key is missing. Please configure the API key.');
  }

  // Check if we've exhausted all models
  if (modelIndex >= OPENAI_MODELS.length) {
    throw new Error('All OpenAI models have been exhausted');
  }

  const model = OPENAI_MODELS[modelIndex];
  const modelNumber = modelIndex + 1;
  const totalModels = OPENAI_MODELS.length;
  const startTime = Date.now();

  try {
    logger.debug(`[Chatbot] [OpenAI Model ${modelNumber}/${totalModels}] Attempting model: ${model}`);
    logger.debug(`[Chatbot] API URL: ${OPENAI_API_URL}`);

    const requestBody = {
      model,
      messages: [
        {
          role: 'system',
          content: buildSystemPrompt(userRole, context),
        },
        ...messages,
      ],
      temperature: 0.7,
      max_tokens: 500,
    };

    // Add timeout to fetch request
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    let response: Response;
    try {
      response = await fetch(OPENAI_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        logger.warn(`[Chatbot] [OpenAI Model ${modelNumber}/${totalModels}] Request timed out: ${model}`);
        // Try next model if available
        if (modelIndex + 1 < OPENAI_MODELS.length) {
          logger.debug(`[Chatbot] Trying next OpenAI model (${modelIndex + 2}/${totalModels})`);
          return callOpenAIAPIInternal(modelIndex + 1, messages, userRole, context);
        }
        throw new Error('Request timeout - OpenAI took too long to respond');
      } else if (fetchError instanceof TypeError && fetchError.message.includes('fetch')) {
        logger.warn(`[Chatbot] [OpenAI Model ${modelNumber}/${totalModels}] Network error: ${model}`);
        // Try next model if available
        if (modelIndex + 1 < OPENAI_MODELS.length) {
          logger.debug(`[Chatbot] Trying next OpenAI model (${modelIndex + 2}/${totalModels})`);
          return callOpenAIAPIInternal(modelIndex + 1, messages, userRole, context);
        }
        throw new Error('Network error - please check your internet connection');
      } else {
        logger.warn(`[Chatbot] [OpenAI Model ${modelNumber}/${totalModels}] Fetch error: ${model}`, fetchError);
        // Try next model if available
        if (modelIndex + 1 < OPENAI_MODELS.length) {
          logger.debug(`[Chatbot] Trying next OpenAI model (${modelIndex + 2}/${totalModels})`);
          return callOpenAIAPIInternal(modelIndex + 1, messages, userRole, context);
        }
        throw fetchError;
      }
    }

    if (!response.ok) {
      const errorText = await response.text();
      logger.warn(`[Chatbot] [OpenAI Model ${modelNumber}/${totalModels}] API error (${response.status}): ${model} - ${errorText.substring(0, 100)}`);
      // Try next model if available
      if (modelIndex + 1 < OPENAI_MODELS.length) {
        logger.debug(`[Chatbot] Trying next OpenAI model (${modelIndex + 2}/${totalModels})`);
        return callOpenAIAPIInternal(modelIndex + 1, messages, userRole, context);
      }
      throw new Error(`OpenAI API request failed: ${response.status} - ${errorText.substring(0, 100)}`);
    }

    const data: OpenRouterResponse = await response.json();

    if (!data.choices || data.choices.length === 0) {
      logger.warn(`[Chatbot] [OpenAI Model ${modelNumber}/${totalModels}] Empty response from: ${model}`);
      // Try next model if available
      if (modelIndex + 1 < OPENAI_MODELS.length) {
        logger.debug(`[Chatbot] Trying next OpenAI model (${modelIndex + 2}/${totalModels})`);
        return callOpenAIAPIInternal(modelIndex + 1, messages, userRole, context);
      }
      throw new Error('No response from OpenAI API');
    }

    const content = data.choices[0].message.content;
    const trimmedContent = content.trim();
    const latency = Date.now() - startTime;
    
    // Score response quality
    const userQuery = messages.find(m => m.role === 'user')?.content || '';
    const qualityScore = scoreResponseQuality(trimmedContent, userQuery, context?.classification);
    
    // Record metrics
    recordSuccess(model, 'openai', latency, context?.classification, qualityScore);
    
    logger.debug(`[Chatbot] [OpenAI Model ${modelNumber}/${totalModels}] Successfully received response from: ${model} (latency: ${latency}ms, quality: ${qualityScore.toFixed(2)})`);
    
    // If quality is low and we have more models, try next model
    if (qualityScore < 0.4 && modelIndex + 1 < OPENAI_MODELS.length) {
      logger.warn(`[Chatbot] [OpenAI Model ${modelNumber}/${totalModels}] Low quality response from ${model} (score: ${qualityScore.toFixed(2)}), trying next model`);
      try {
        return await callOpenAIAPIInternal(modelIndex + 1, messages, userRole, context);
      } catch (retryError) {
        logger.warn(`[Chatbot] Next model also failed, returning response from ${model}`);
        return trimmedContent;
      }
    }
    
    return trimmedContent;
  } catch (error: any) {
    // Record failure
    recordFailure(model, 'openai', error?.message || 'Unknown error', context?.classification);
    
    // If this is our custom "exhausted" error, re-throw it
    if (error?.message?.includes('All OpenAI models have been exhausted')) {
      throw error;
    }
    
    logger.warn(`[Chatbot] [OpenAI Model ${modelNumber}/${totalModels}] Error with model ${model}:`, error?.message || 'Unknown error');
    
    // Try next model if available
    if (modelIndex + 1 < OPENAI_MODELS.length) {
      logger.debug(`[Chatbot] Trying next OpenAI model (${modelIndex + 2}/${totalModels})`);
      try {
        return await callOpenAIAPIInternal(modelIndex + 1, messages, userRole, context);
      } catch (retryError) {
        // If retry also fails, throw original error
        throw error;
      }
    }
    
    // If all models failed, throw error
    throw error;
  }
}

/**
 * Call OpenAI API (wrapper for backward compatibility)
 * @deprecated Use callOpenAIAPIInternal directly
 */
async function _callOpenAIAPI(
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
  userRole?: string,
  context?: QueryContext
): Promise<string> {
  return callOpenAIAPIInternal(0, messages, userRole, context);
}

/**
 * Call Groq API (internal function - tries models sequentially)
 */
async function callGroqAPIInternal(
  modelIndex: number = 0,
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
  userRole?: string,
  context?: QueryContext
): Promise<string> {
  // Validate API key exists
  if (!GROQ_API_KEY || GROQ_API_KEY.trim() === '') {
    logger.error('[Chatbot] Groq API key is missing or empty');
    throw new Error('Groq API key is missing. Please configure the API key.');
  }

  // Check if we've exhausted all models
  if (modelIndex >= GROQ_MODELS.length) {
    throw new Error('All Groq models have been exhausted');
  }

  const model = GROQ_MODELS[modelIndex];
  const modelNumber = modelIndex + 1;
  const totalModels = GROQ_MODELS.length;
  const startTime = Date.now();

  try {
    logger.debug(`[Chatbot] [Groq Model ${modelNumber}/${totalModels}] Attempting model: ${model}`);
    logger.debug(`[Chatbot] API URL: ${GROQ_API_URL}`);

    const requestBody = {
      model,
      messages: [
        {
          role: 'system',
          content: buildSystemPrompt(userRole, context),
        },
        ...messages,
      ],
      temperature: 0.7,
      max_tokens: 500,
    };

    // Add timeout to fetch request
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    let response: Response;
    try {
      response = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GROQ_API_KEY}`,
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        logger.warn(`[Chatbot] [Groq Model ${modelNumber}/${totalModels}] Request timed out: ${model}`);
        // Try next model if available
        if (modelIndex + 1 < GROQ_MODELS.length) {
          logger.debug(`[Chatbot] Trying next Groq model (${modelIndex + 2}/${totalModels})`);
          return callGroqAPIInternal(modelIndex + 1, messages, userRole, context);
        }
        throw new Error('Request timeout - Groq took too long to respond');
      } else if (fetchError instanceof TypeError && fetchError.message.includes('fetch')) {
        logger.warn(`[Chatbot] [Groq Model ${modelNumber}/${totalModels}] Network error: ${model}`);
        // Try next model if available
        if (modelIndex + 1 < GROQ_MODELS.length) {
          logger.debug(`[Chatbot] Trying next Groq model (${modelIndex + 2}/${totalModels})`);
          return callGroqAPIInternal(modelIndex + 1, messages, userRole, context);
        }
        throw new Error('Network error - please check your internet connection');
      } else {
        logger.warn(`[Chatbot] [Groq Model ${modelNumber}/${totalModels}] Fetch error: ${model}`, fetchError);
        // Try next model if available
        if (modelIndex + 1 < GROQ_MODELS.length) {
          logger.debug(`[Chatbot] Trying next Groq model (${modelIndex + 2}/${totalModels})`);
          return callGroqAPIInternal(modelIndex + 1, messages, userRole, context);
        }
        throw fetchError;
      }
    }

    if (!response.ok) {
      const errorText = await response.text();
      logger.warn(`[Chatbot] [Groq Model ${modelNumber}/${totalModels}] API error (${response.status}): ${model} - ${errorText.substring(0, 100)}`);
      // Try next model if available
      if (modelIndex + 1 < GROQ_MODELS.length) {
        logger.debug(`[Chatbot] Trying next Groq model (${modelIndex + 2}/${totalModels})`);
        return callGroqAPIInternal(modelIndex + 1, messages, userRole, context);
      }
      throw new Error(`Groq API request failed: ${response.status} - ${errorText.substring(0, 100)}`);
    }

    const data: OpenRouterResponse = await response.json();

    if (!data.choices || data.choices.length === 0) {
      logger.warn(`[Chatbot] [Groq Model ${modelNumber}/${totalModels}] Empty response from: ${model}`);
      // Try next model if available
      if (modelIndex + 1 < GROQ_MODELS.length) {
        logger.debug(`[Chatbot] Trying next Groq model (${modelIndex + 2}/${totalModels})`);
        return callGroqAPIInternal(modelIndex + 1, messages, userRole, context);
      }
      throw new Error('No response from Groq API');
    }

    const content = data.choices[0].message.content;
    const trimmedContent = content.trim();
    const latency = Date.now() - startTime;
    
    // Score response quality
    const userQuery = messages.find(m => m.role === 'user')?.content || '';
    const qualityScore = scoreResponseQuality(trimmedContent, userQuery, context?.classification);
    
    // Record metrics
    recordSuccess(model, 'groq', latency, context?.classification, qualityScore);
    
    logger.debug(`[Chatbot] [Groq Model ${modelNumber}/${totalModels}] Successfully received response from: ${model} (latency: ${latency}ms, quality: ${qualityScore.toFixed(2)})`);
    
    // If quality is low and we have more models, try next model
    if (qualityScore < 0.4 && modelIndex + 1 < GROQ_MODELS.length) {
      logger.warn(`[Chatbot] [Groq Model ${modelNumber}/${totalModels}] Low quality response from ${model} (score: ${qualityScore.toFixed(2)}), trying next model`);
      try {
        return await callGroqAPIInternal(modelIndex + 1, messages, userRole, context);
      } catch (retryError) {
        logger.warn(`[Chatbot] Next model also failed, returning response from ${model}`);
        return trimmedContent;
      }
    }
    
    return trimmedContent;
  } catch (error: any) {
    // Record failure
    recordFailure(model, 'groq', error?.message || 'Unknown error', context?.classification);
    
    // If this is our custom "exhausted" error, re-throw it
    if (error?.message?.includes('All Groq models have been exhausted')) {
      throw error;
    }
    
    logger.warn(`[Chatbot] [Groq Model ${modelNumber}/${totalModels}] Error with model ${model}:`, error?.message || 'Unknown error');
    
    // Try next model if available
    if (modelIndex + 1 < GROQ_MODELS.length) {
      logger.debug(`[Chatbot] Trying next Groq model (${modelIndex + 2}/${totalModels})`);
      try {
        return await callGroqAPIInternal(modelIndex + 1, messages, userRole, context);
      } catch (retryError) {
        // If retry also fails, throw original error
        throw error;
      }
    }
    
    // If all models failed, throw error
    throw error;
  }
}

/**
 * Call Groq API (wrapper for backward compatibility)
 * @deprecated Use callGroqAPIInternal directly
 */
async function _callGroqAPI(
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
  userRole?: string,
  context?: QueryContext
): Promise<string> {
  return callGroqAPIInternal(0, messages, userRole, context);
}

/**
 * Call DeepSeek API (internal function - tries models sequentially)
 */
async function callDeepseekAPIInternal(
  modelIndex: number = 0,
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
  userRole?: string,
  context?: QueryContext
): Promise<string> {
  // Validate API key exists
  if (!DEEPSEEK_API_KEY || DEEPSEEK_API_KEY.trim() === '') {
    logger.error('[Chatbot] Deepseek API key is missing or empty');
    throw new Error('Deepseek API key is missing. Please configure the API key.');
  }

  // Check if we've exhausted all models
  if (modelIndex >= DEEPSEEK_MODELS.length) {
    throw new Error('All DeepSeek models have been exhausted');
  }

  const model = DEEPSEEK_MODELS[modelIndex];
  const modelNumber = modelIndex + 1;
  const totalModels = DEEPSEEK_MODELS.length;
  const startTime = Date.now();

  try {
    logger.debug(`[Chatbot] [DeepSeek Model ${modelNumber}/${totalModels}] Attempting model: ${model}`);
    logger.debug(`[Chatbot] API URL: ${DEEPSEEK_API_URL}`);

    const requestBody = {
      model,
      messages: [
        {
          role: 'system',
          content: buildSystemPrompt(userRole, context),
        },
        ...messages,
      ],
      temperature: 0.7,
      max_tokens: 500,
    };

    // Add timeout to fetch request
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    let response: Response;
    try {
      response = await fetch(DEEPSEEK_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        logger.warn(`[Chatbot] [DeepSeek Model ${modelNumber}/${totalModels}] Request timed out: ${model}`);
        // Try next model if available
        if (modelIndex + 1 < DEEPSEEK_MODELS.length) {
          logger.debug(`[Chatbot] Trying next DeepSeek model (${modelIndex + 2}/${totalModels})`);
          return callDeepseekAPIInternal(modelIndex + 1, messages, userRole, context);
        }
        throw new Error('Request timeout - Deepseek took too long to respond');
      } else if (fetchError instanceof TypeError && fetchError.message.includes('fetch')) {
        logger.warn(`[Chatbot] [DeepSeek Model ${modelNumber}/${totalModels}] Network error: ${model}`);
        // Try next model if available
        if (modelIndex + 1 < DEEPSEEK_MODELS.length) {
          logger.debug(`[Chatbot] Trying next DeepSeek model (${modelIndex + 2}/${totalModels})`);
          return callDeepseekAPIInternal(modelIndex + 1, messages, userRole, context);
        }
        throw new Error('Network error - please check your internet connection');
      } else {
        logger.warn(`[Chatbot] [DeepSeek Model ${modelNumber}/${totalModels}] Fetch error: ${model}`, fetchError);
        // Try next model if available
        if (modelIndex + 1 < DEEPSEEK_MODELS.length) {
          logger.debug(`[Chatbot] Trying next DeepSeek model (${modelIndex + 2}/${totalModels})`);
          return callDeepseekAPIInternal(modelIndex + 1, messages, userRole, context);
        }
        throw fetchError;
      }
    }

    if (!response.ok) {
      const errorText = await response.text();
      logger.warn(`[Chatbot] [DeepSeek Model ${modelNumber}/${totalModels}] API error (${response.status}): ${model} - ${errorText.substring(0, 100)}`);
      // Try next model if available
      if (modelIndex + 1 < DEEPSEEK_MODELS.length) {
        logger.debug(`[Chatbot] Trying next DeepSeek model (${modelIndex + 2}/${totalModels})`);
        return callDeepseekAPIInternal(modelIndex + 1, messages, userRole, context);
      }
      throw new Error(`Deepseek API request failed: ${response.status} - ${errorText.substring(0, 100)}`);
    }

    const data: OpenRouterResponse = await response.json();

    if (!data.choices || data.choices.length === 0) {
      logger.warn(`[Chatbot] [DeepSeek Model ${modelNumber}/${totalModels}] Empty response from: ${model}`);
      // Try next model if available
      if (modelIndex + 1 < DEEPSEEK_MODELS.length) {
        logger.debug(`[Chatbot] Trying next DeepSeek model (${modelIndex + 2}/${totalModels})`);
        return callDeepseekAPIInternal(modelIndex + 1, messages, userRole, context);
      }
      throw new Error('No response from Deepseek API');
    }

    const content = data.choices[0].message.content;
    const trimmedContent = content.trim();
    const latency = Date.now() - startTime;
    
    // Score response quality
    const userQuery = messages.find(m => m.role === 'user')?.content || '';
    const qualityScore = scoreResponseQuality(trimmedContent, userQuery, context?.classification);
    
    // Record metrics
    recordSuccess(model, 'deepseek', latency, context?.classification, qualityScore);
    
    logger.debug(`[Chatbot] [DeepSeek Model ${modelNumber}/${totalModels}] Successfully received response from: ${model} (latency: ${latency}ms, quality: ${qualityScore.toFixed(2)})`);
    
    // If quality is low and we have more models, try next model
    if (qualityScore < 0.4 && modelIndex + 1 < DEEPSEEK_MODELS.length) {
      logger.warn(`[Chatbot] [DeepSeek Model ${modelNumber}/${totalModels}] Low quality response from ${model} (score: ${qualityScore.toFixed(2)}), trying next model`);
      try {
        return await callDeepseekAPIInternal(modelIndex + 1, messages, userRole, context);
      } catch (retryError) {
        logger.warn(`[Chatbot] Next model also failed, returning response from ${model}`);
        return trimmedContent;
      }
    }
    
    return trimmedContent;
  } catch (error: any) {
    // Record failure
    recordFailure(model, 'deepseek', error?.message || 'Unknown error', context?.classification);
    
    // If this is our custom "exhausted" error, re-throw it
    if (error?.message?.includes('All DeepSeek models have been exhausted')) {
      throw error;
    }
    
    logger.warn(`[Chatbot] [DeepSeek Model ${modelNumber}/${totalModels}] Error with model ${model}:`, error?.message || 'Unknown error');
    
    // Try next model if available
    if (modelIndex + 1 < DEEPSEEK_MODELS.length) {
      logger.debug(`[Chatbot] Trying next DeepSeek model (${modelIndex + 2}/${totalModels})`);
      try {
        return await callDeepseekAPIInternal(modelIndex + 1, messages, userRole, context);
      } catch (retryError) {
        // If retry also fails, throw original error
        throw error;
      }
    }
    
    // If all models failed, throw error
    throw error;
  }
}

/**
 * Call DeepSeek API (wrapper for backward compatibility)
 * @deprecated Use callDeepseekAPIInternal directly
 */
async function _callDeepseekAPI(
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
  userRole?: string,
  context?: QueryContext
): Promise<string> {
  return callDeepseekAPIInternal(0, messages, userRole, context);
}

/**
 * Call OpenRouter API (internal function - used by orchestrator)
 * Tries models sequentially from FREE_MODELS array
 */
async function callOpenRouterAPIInternal(
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
  modelIndex: number = 0,
  userRole?: string,
  context?: QueryContext
): Promise<string> {
  // Validate API key exists
  if (!OPENROUTER_API_KEY || OPENROUTER_API_KEY.trim() === '') {
    logger.error('[Chatbot] OpenRouter API key is missing or empty');
    throw new Error('OpenRouter API key is missing. Please configure the API key.');
  }

  // Check if we've exhausted all models
  if (modelIndex >= FREE_MODELS.length) {
    throw new Error('All OpenRouter free models have been exhausted');
  }

  const model = FREE_MODELS[modelIndex];
  const modelNumber = modelIndex + 1;
  const totalModels = FREE_MODELS.length;
  const startTime = Date.now();
  
  const requestBody: OpenRouterRequest = {
    model,
    messages: [
      {
        role: 'system',
        content: buildSystemPrompt(userRole, context),
      },
      ...messages,
    ],
    temperature: 0.6,
    max_tokens: 500,
  };

  try {
    logger.debug(`[Chatbot] [OpenRouter Model ${modelNumber}/${totalModels}] Attempting model: ${model}`);
    logger.debug(`[Chatbot] API URL: ${OPENROUTER_API_URL}`);
    logger.debug(`[Chatbot] Request body preview: ${JSON.stringify(requestBody).substring(0, 200)}...`);

    // Add timeout to fetch request
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    let response: Response;
    try {
      response = await fetch(OPENROUTER_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'HTTP-Referer': window.location.origin,
          'X-Title': 'ERP-CRM Chatbot',
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        logger.warn(`[Chatbot] [OpenRouter Model ${modelNumber}/${totalModels}] Request timed out: ${model}`);
        // Try next model if available
        if (modelIndex + 1 < FREE_MODELS.length) {
          logger.debug(`[Chatbot] Trying next OpenRouter model (${modelIndex + 2}/${totalModels})`);
          return callOpenRouterAPIInternal(messages, modelIndex + 1, userRole, context);
        }
        throw new Error('Request timeout - API took too long to respond');
      } else if (fetchError instanceof TypeError && fetchError.message.includes('fetch')) {
        logger.warn(`[Chatbot] [OpenRouter Model ${modelNumber}/${totalModels}] Network error: ${model}`);
        // Try next model if available
        if (modelIndex + 1 < FREE_MODELS.length) {
          logger.debug(`[Chatbot] Trying next OpenRouter model (${modelIndex + 2}/${totalModels})`);
          return callOpenRouterAPIInternal(messages, modelIndex + 1, userRole, context);
        }
        throw new Error('Network error - please check your internet connection');
      } else {
        logger.warn(`[Chatbot] [OpenRouter Model ${modelNumber}/${totalModels}] Fetch error: ${model}`, fetchError);
        // Try next model if available
        if (modelIndex + 1 < FREE_MODELS.length) {
          logger.debug(`[Chatbot] Trying next OpenRouter model (${modelIndex + 2}/${totalModels})`);
          return callOpenRouterAPIInternal(messages, modelIndex + 1, userRole, context);
        }
        throw fetchError;
      }
    }

    if (!response.ok) {
      const errorText = await response.text();
      logger.warn(`[Chatbot] [OpenRouter Model ${modelNumber}/${totalModels}] API error (${response.status}): ${model} - ${errorText.substring(0, 100)}`);
      
      // Try next model if available
      if (modelIndex + 1 < FREE_MODELS.length) {
        logger.debug(`[Chatbot] Trying next OpenRouter model (${modelIndex + 2}/${totalModels})`);
        return callOpenRouterAPIInternal(messages, modelIndex + 1, userRole, context);
      }
      
      // If all OpenRouter models failed, throw error (orchestrator will handle fallback)
      throw new Error(`OpenRouter API request failed: ${response.status}`);
    }

    const data: OpenRouterResponse = await response.json();
    
    if (!data.choices || data.choices.length === 0) {
      logger.warn(`[Chatbot] [OpenRouter Model ${modelNumber}/${totalModels}] Empty response from: ${model}`);
      // Try next model if available
      if (modelIndex + 1 < FREE_MODELS.length) {
        logger.debug(`[Chatbot] Trying next OpenRouter model (${modelIndex + 2}/${totalModels})`);
        return callOpenRouterAPIInternal(messages, modelIndex + 1, userRole, context);
      }
      // If OpenRouter returns empty response, throw error (orchestrator will handle fallback)
      throw new Error('No response from OpenRouter API');
    }

    const content = data.choices[0].message.content;
    const trimmedContent = content.trim();
    const latency = Date.now() - startTime;
    
    // Score response quality
    const userQuery = messages.find(m => m.role === 'user')?.content || '';
    const qualityScore = scoreResponseQuality(trimmedContent, userQuery, context?.classification);
    
    // Record metrics
    recordSuccess(model, 'openrouter', latency, context?.classification, qualityScore);
    
    logger.debug(`[Chatbot] [OpenRouter Model ${modelNumber}/${totalModels}] Successfully received response from: ${model} (latency: ${latency}ms, quality: ${qualityScore.toFixed(2)})`);
    
    // If quality is low and we have more models, try next model
    if (qualityScore < 0.4 && modelIndex + 1 < FREE_MODELS.length) {
      logger.warn(`[Chatbot] [OpenRouter Model ${modelNumber}/${totalModels}] Low quality response from ${model} (score: ${qualityScore.toFixed(2)}), trying next model`);
      try {
        return await callOpenRouterAPIInternal(messages, modelIndex + 1, userRole, context);
      } catch (retryError) {
        // If next model fails, return the low-quality response (better than nothing)
        logger.warn(`[Chatbot] Next model also failed, returning response from ${model}`);
        return trimmedContent;
      }
    }
    
    return trimmedContent;
  } catch (error: any) {
    // Record failure
    recordFailure(model, 'openrouter', error?.message || 'Unknown error', context?.classification);
    
    // If this is our custom "exhausted" error, re-throw it
    if (error?.message?.includes('All OpenRouter free models have been exhausted')) {
      throw error;
    }
    
    logger.warn(`[Chatbot] [OpenRouter Model ${modelNumber}/${totalModels}] Error with model ${model}:`, error?.message || 'Unknown error');
    
    // Try next model if available
    if (modelIndex + 1 < FREE_MODELS.length) {
      logger.debug(`[Chatbot] Trying next OpenRouter model (${modelIndex + 2}/${totalModels})`);
      try {
        return await callOpenRouterAPIInternal(messages, modelIndex + 1, userRole, context);
      } catch (retryError) {
        // If retry also fails, throw original error (orchestrator will handle fallback)
        throw error;
      }
    }
    
    // If all models failed, throw error (orchestrator will handle fallback)
    throw error;
  }
}

/**
 * Optimize conversation history - keep only relevant messages
 */
function optimizeConversationHistory(
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
  maxMessages: number = 10
): Array<{ role: 'user' | 'assistant' | 'system'; content: string }> {
  // Always keep system messages
  const systemMessages = messages.filter(msg => msg.role === 'system');
  const nonSystemMessages = messages.filter(msg => msg.role !== 'system');
  
  // Keep last N non-system messages (default 10)
  const recentMessages = nonSystemMessages.slice(-maxMessages);
  
  // Combine: system messages + recent messages
  return [...systemMessages, ...recentMessages];
}

/**
 * Smart model selection based on query characteristics
 * Returns optimal tier strategy: 'fast', 'balanced', or 'powerful'
 */
function selectOptimalTierStrategy(
  _query: string,
  classification: { type: string; confidence: number },
  wordCount: number,
  questionType?: string
): 'fast' | 'balanced' | 'powerful' {
  // Greetings and simple queries -> fast models
  if (classification.type === 'greeting' || wordCount <= 5) {
    return 'fast';
  }

  // Complex queries (long, reasoning, technical) -> powerful models
  if (wordCount > 30 || 
      classification.type === 'general' ||
      questionType === 'why' || 
      questionType === 'how' && wordCount > 15) {
    return 'powerful';
  }

  // ERP queries -> balanced (good instruction following)
  if (classification.type === 'erp') {
    return 'balanced';
  }

  // Default to balanced
  return 'balanced';
}

/**
 * Get optimal models for parallel execution based on strategy
 */
function getOptimalModelsForStrategy(
  strategy: 'fast' | 'balanced' | 'powerful'
): Array<{ tier: string; modelIndex: number; priority: number }> {
  switch (strategy) {
    case 'fast':
      // Prioritize fastest models: Groq, Gemini Flash, OpenRouter fast models
      return [
        { tier: 'groq', modelIndex: 0, priority: 1 }, // llama-3.3-70b-versatile (very fast)
        { tier: 'google', modelIndex: 0, priority: 2 }, // gemini-2.0-flash (very fast)
        { tier: 'openrouter', modelIndex: 0, priority: 3 }, // First free model
      ];
    
    case 'powerful':
      // Prioritize most capable models: GPT-4o, DeepSeek Reasoner, larger models
      return [
        { tier: 'openai', modelIndex: 1, priority: 1 }, // gpt-4o (most capable)
        { tier: 'deepseek', modelIndex: 1, priority: 2 }, // deepseek-reasoner (reasoning)
        { tier: 'openrouter', modelIndex: 8, priority: 3 }, // meta-llama/llama-3.3-70b (large)
        { tier: 'google', modelIndex: 4, priority: 4 }, // gemini-1.5-pro (powerful)
      ];
    
    case 'balanced':
    default:
      // Balanced approach: mix of speed and capability
      return [
        { tier: 'openrouter', modelIndex: 0, priority: 1 }, // First free model
        { tier: 'google', modelIndex: 2, priority: 2 }, // gemini-1.5-flash (balanced)
        { tier: 'groq', modelIndex: 0, priority: 3 }, // Fast and capable
        { tier: 'openai', modelIndex: 0, priority: 4 }, // gpt-4o-mini (cost-effective)
      ];
  }
}

/**
 * Main API orchestrator with parallel execution and 5-tier fallback system
 * Uses race strategy: tries fastest models from each tier in parallel, falls back sequentially
 */
export async function callOpenRouterAPI(
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
  _retries?: number, // Kept for backward compatibility but unused
  userRole?: string,
  context?: QueryContext
): Promise<string> {
  // Check cache first
  const lastUserMessage = messages.filter(m => m.role === 'user').pop()?.content || '';
  if (lastUserMessage) {
    const cached = getCachedResponse(lastUserMessage, userRole, context);
    if (cached) {
      logger.debug('[Chatbot] Returning cached response');
      return cached;
    }
  }

  // Optimize conversation history before sending
  const optimizedMessages = optimizeConversationHistory(messages, 10);

  const errors: Array<{ api: string; error: string }> = [];
  const queryType = context?.classification || 'general';
  const wordCount = context?.wordCount || 0;
  const questionType = context?.questionType;

  // SMART MODEL SELECTION: Choose optimal strategy based on query
  const strategy = selectOptimalTierStrategy(
    lastUserMessage,
    { type: queryType, confidence: context?.confidence || 0.5 },
    wordCount,
    questionType
  );
  
  logger.debug(`[Chatbot] [Smart Selection] Query strategy: ${strategy} (type: ${queryType}, words: ${wordCount})`);

  // PARALLEL EXECUTION: Try optimal models based on strategy
  const optimalModels = getOptimalModelsForStrategy(strategy);
  const parallelPromises: Array<Promise<string>> = [];
  const promiseSources: string[] = [];

  // Add models based on strategy and availability
  for (const model of optimalModels) {
    try {
      switch (model.tier) {
        case 'openrouter':
          if (OPENROUTER_API_KEY) {
            parallelPromises.push(
              callOpenRouterAPIInternal(optimizedMessages, model.modelIndex, userRole, context)
                .catch(err => { throw { source: 'OpenRouter', error: err }; })
            );
            promiseSources.push(`OpenRouter-${model.modelIndex}`);
          }
          break;
        case 'google':
          if (GOOGLE_AI_STUDIOS_API_KEY && model.modelIndex < GOOGLE_AI_MODELS.length) {
            parallelPromises.push(
              callGoogleAIStudiosAPIInternal(model.modelIndex, optimizedMessages, userRole, context)
                .catch(err => { throw { source: 'Google AI', error: err }; })
            );
            promiseSources.push(`Google AI-${model.modelIndex}`);
          }
          break;
        case 'groq':
          if (GROQ_API_KEY && model.modelIndex < GROQ_MODELS.length) {
            parallelPromises.push(
              callGroqAPIInternal(model.modelIndex, optimizedMessages, userRole, context)
                .catch(err => { throw { source: 'Groq', error: err }; })
            );
            promiseSources.push(`Groq-${model.modelIndex}`);
          }
          break;
        case 'openai':
          if (OPENAI_API_KEY && model.modelIndex < OPENAI_MODELS.length) {
            parallelPromises.push(
              callOpenAIAPIInternal(model.modelIndex, optimizedMessages, userRole, context)
                .catch(err => { throw { source: 'OpenAI', error: err }; })
            );
            promiseSources.push(`OpenAI-${model.modelIndex}`);
          }
          break;
        case 'deepseek':
          if (DEEPSEEK_API_KEY && model.modelIndex < DEEPSEEK_MODELS.length) {
            parallelPromises.push(
              callDeepseekAPIInternal(model.modelIndex, optimizedMessages, userRole, context)
                .catch(err => { throw { source: 'DeepSeek', error: err }; })
            );
            promiseSources.push(`DeepSeek-${model.modelIndex}`);
          }
          break;
      }
    } catch (err) {
      // Skip if model index is out of bounds
      logger.debug(`[Chatbot] Skipping ${model.tier}-${model.modelIndex} (unavailable)`);
    }
  }

  // Fallback: If no optimal models available, use default fast models
  if (parallelPromises.length === 0) {
    logger.debug('[Chatbot] [Fallback] No optimal models available, using default fast models');
    if (OPENROUTER_API_KEY) {
      parallelPromises.push(
        callOpenRouterAPIInternal(optimizedMessages, 0, userRole, context)
          .catch(err => { throw { source: 'OpenRouter', error: err }; })
      );
      promiseSources.push('OpenRouter');
    }
    if (GOOGLE_AI_STUDIOS_API_KEY) {
      parallelPromises.push(
        callGoogleAIStudiosAPIInternal(0, optimizedMessages, userRole, context)
          .catch(err => { throw { source: 'Google AI', error: err }; })
      );
      promiseSources.push('Google AI');
    }
    if (GROQ_API_KEY) {
      parallelPromises.push(
        callGroqAPIInternal(0, optimizedMessages, userRole, context)
          .catch(err => { throw { source: 'Groq', error: err }; })
      );
      promiseSources.push('Groq');
    }
  }

  // Race: Return first successful response
  if (parallelPromises.length > 0) {
    try {
      const results = await Promise.allSettled(parallelPromises);
      
      // Find first successful result
      for (let i = 0; i < results.length; i++) {
        const result = results[i];
        if (result.status === 'fulfilled') {
          const response = result.value;
          logger.debug(`[Chatbot] [Parallel Race] ${promiseSources[i]} won the race!`);
          
          // Cache the response
          if (lastUserMessage) {
            cacheResponse(lastUserMessage, response, userRole, context, queryType);
          }
          
          return response;
        } else {
          const error = result.reason;
          if (error?.source) {
            errors.push({ api: error.source, error: error.error?.message || 'Unknown error' });
          }
        }
      }
    } catch (error: any) {
      logger.warn('[Chatbot] [Parallel Race] All parallel attempts failed, falling back to sequential');
    }
  }

  // FALLBACK: Sequential execution if parallel fails
  logger.debug('[Chatbot] [Fallback] Starting sequential fallback');

  // Tier 1: Try OpenRouter API (tries all 10 free models sequentially)
  try {
    logger.debug('[Chatbot] [Tier 1/5] Attempting OpenRouter API (will try all 10 free models sequentially)');
    const response = await callOpenRouterAPIInternal(optimizedMessages, 0, userRole, context);
    if (lastUserMessage) {
      cacheResponse(lastUserMessage, response, userRole, context, queryType);
    }
    return response;
  } catch (error: any) {
    const errorMsg = error?.message || 'Unknown error';
    errors.push({ api: 'OpenRouter', error: errorMsg });
    logger.warn(`[Chatbot] [Tier 1/5] OpenRouter failed after trying all ${FREE_MODELS.length} free models: ${errorMsg}`);
  }

  // Tier 2: Try Google AI Studios API (tries all 5 models sequentially)
  try {
    logger.debug('[Chatbot] [Tier 2/5] Attempting Google AI Studios API (will try all 5 models sequentially)');
    const response = await callGoogleAIStudiosAPIInternal(0, optimizedMessages, userRole, context);
    if (lastUserMessage) {
      cacheResponse(lastUserMessage, response, userRole, context, queryType);
    }
    return response;
  } catch (error: any) {
    const errorMsg = error?.message || 'Unknown error';
    errors.push({ api: 'Google AI Studios', error: errorMsg });
    logger.warn(`[Chatbot] [Tier 2/5] Google AI Studios failed after trying all ${GOOGLE_AI_MODELS.length} models: ${errorMsg}`);
  }

  // Tier 3: Try OpenAI API (tries all 3 models sequentially)
  try {
    logger.debug('[Chatbot] [Tier 3/5] Attempting OpenAI API (will try all 3 models sequentially)');
    const response = await callOpenAIAPIInternal(0, optimizedMessages, userRole, context);
    if (lastUserMessage) {
      cacheResponse(lastUserMessage, response, userRole, context, queryType);
    }
    return response;
  } catch (error: any) {
    const errorMsg = error?.message || 'Unknown error';
    errors.push({ api: 'OpenAI', error: errorMsg });
    logger.warn(`[Chatbot] [Tier 3/5] OpenAI failed after trying all ${OPENAI_MODELS.length} models: ${errorMsg}`);
  }

  // Tier 4: Try Groq API (tries all 6 models sequentially)
  try {
    logger.debug('[Chatbot] [Tier 4/5] Attempting Groq API (will try all 6 models sequentially)');
    const response = await callGroqAPIInternal(0, optimizedMessages, userRole, context);
    if (lastUserMessage) {
      cacheResponse(lastUserMessage, response, userRole, context, queryType);
    }
    return response;
  } catch (error: any) {
    const errorMsg = error?.message || 'Unknown error';
    errors.push({ api: 'Groq', error: errorMsg });
    logger.warn(`[Chatbot] [Tier 4/5] Groq failed after trying all ${GROQ_MODELS.length} models: ${errorMsg}`);
  }

  // Tier 5: Try Deepseek API (tries all 2 models sequentially)
  try {
    logger.debug('[Chatbot] [Tier 5/5] Attempting Deepseek API (will try all 2 models sequentially)');
    const response = await callDeepseekAPIInternal(0, optimizedMessages, userRole, context);
    if (lastUserMessage) {
      cacheResponse(lastUserMessage, response, userRole, context, queryType);
    }
    return response;
  } catch (error: any) {
    const errorMsg = error?.message || 'Unknown error';
    errors.push({ api: 'Deepseek', error: errorMsg });
    logger.warn(`[Chatbot] [Tier 5/5] Deepseek failed after trying all ${DEEPSEEK_MODELS.length} models: ${errorMsg}`);
  }
  
  // All APIs failed - log all errors and throw final error
  logger.error('[Chatbot] All 5 API tiers failed. Errors:', errors);
  throw new Error('All AI services are currently unavailable. Please check your internet connection and try again in a few moments. If the problem persists, please contact support.');
}

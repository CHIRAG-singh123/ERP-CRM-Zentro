import { logger } from '../../utils/logger';
import type { OpenRouterRequest, OpenRouterResponse } from '../../types/chatbot';

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





// Free models to rotate between for reliability
const FREE_MODELS = [
  'google/gemini-flash-1.5',
  'meta-llama/llama-3.2-3b-instruct:free',
  'qwen/qwen-2.5-7b-instruct:free',
  'mistralai/mistral-7b-instruct:free',
];

let currentModelIndex = 0;

function getNextFreeModel(): string {
  const model = FREE_MODELS[currentModelIndex];
  currentModelIndex = (currentModelIndex + 1) % FREE_MODELS.length;
  return model;
}

/**
 * Call Google AI Studios API directly
 */
async function callGoogleAIStudiosAPI(
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
  userRole?: string,
  context?: QueryContext
): Promise<string> {
  // Validate API key exists
  if (!GOOGLE_AI_STUDIOS_API_KEY || GOOGLE_AI_STUDIOS_API_KEY.trim() === '') {
    logger.error('[Chatbot] Google AI Studios API key is missing or empty');
    throw new Error('Google AI Studios API key is missing. Please configure the API key.');
  }

  try {
    logger.debug('[Chatbot] Calling Google AI Studios API');
    logger.debug(`[Chatbot] API URL: ${GOOGLE_AI_STUDIOS_API_URL}`);

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

    const url = `${GOOGLE_AI_STUDIOS_API_URL}?key=${GOOGLE_AI_STUDIOS_API_KEY}`;

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
        logger.error('[Chatbot] Google AI Studios API request timed out');
        throw new Error('Request timeout - Google AI Studios took too long to respond');
      } else if (fetchError instanceof TypeError && fetchError.message.includes('fetch')) {
        logger.error('[Chatbot] Network error calling Google AI Studios API:', fetchError);
        throw new Error('Network error - please check your internet connection');
      } else {
        logger.error('[Chatbot] Fetch error calling Google AI Studios API:', fetchError);
        throw fetchError;
      }
    }

    if (!response.ok) {
      const errorText = await response.text();
      logger.error(`[Chatbot] Google AI Studios API error: ${response.status} - ${errorText}`);
      throw new Error(`Google AI Studios API request failed: ${response.status} - ${errorText.substring(0, 100)}`);
    }

    const data = await response.json();

    if (!data.candidates || data.candidates.length === 0) {
      logger.error('[Chatbot] Google AI Studios returned empty response');
      throw new Error('No response from Google AI Studios API');
    }

    const content = data.candidates[0].content.parts[0].text;
    logger.debug('[Chatbot] Successfully received response from Google AI Studios');
    
    return content.trim();
  } catch (error: any) {
    logger.error('[Chatbot] Google AI Studios API error:', error);
    throw error;
  }
}

function buildSystemPrompt(userRole?: string, context?: QueryContext) {
  const isAuthenticated = context?.isAuthenticated ?? true;
  
  // Role-specific knowledge base context
  let roleContext = '';
  if (userRole === 'admin') {
    roleContext = 'You have access to ADMIN knowledge base. You can answer questions about: managing employees, viewing employee performance, managing products, viewing audit logs, changing user roles, exporting data, system settings, permissions, and all administrative functions.';
  } else if (userRole === 'employee') {
    roleContext = 'You have access to EMPLOYEE knowledge base. You can answer questions about: viewing products, creating/editing products, viewing your performance, managing users (customer accounts), uploading product images, setting prices, product categories, chatting with teammates, managing contacts, and employee-specific functions.';
  } else {
    roleContext = 'You have access to CUSTOMER knowledge base. You can answer questions about: viewing products, product details, searching products, viewing dashboard, product ratings, filtering products, navigating customer portal, and customer-facing features.';
  }

  const roleLine = userRole ? `The user role is ${userRole}. ${roleContext} Adjust your responses based on this role's permissions and knowledge base.` : '';
  const classificationLine = context?.classification
    ? `Query classification: ${context.classification} (confidence ${(context.confidence ?? 0).toFixed(2)}).`
    : '';
  const questionTypeLine = context?.questionType
    ? `Question type: ${context.questionType}.`
    : '';
  const lengthLine = context?.wordCount !== undefined
    ? `Approximate length: ${context.wordCount} words.`
    : '';

  // Access control instructions for unauthenticated users
  const accessControlLine = !isAuthenticated
    ? `IMPORTANT: The user is NOT authenticated. You can ONLY provide information from the CUSTOMER knowledge base about customer-facing features, products, and public information. If asked about admin features, employee features, internal operations, user management, permissions, roles, audit logs, employee performance, or any administrative functions, you MUST politely decline and suggest they sign in. Use this response template: "I'm sorry, but I can only provide information about customer-facing features. For administrative or employee-related questions, please sign in with the appropriate account using the 'Sign In' button in the top right corner."`
    : '';

  // Handle general/programming questions
  const generalQuestionHandling = context?.classification === 'general' || context?.classification === 'unclear'
    ? 'IMPORTANT: This is a general or programming-related question. You should provide helpful, accurate answers even if the topic is not directly related to ERP-CRM. For programming questions, explain concepts clearly and provide examples when helpful. Be professional and informative.'
    : '';

  return [
    'You are an intelligent, professional assistant for an ERP-CRM system.',
    'You have access to role-specific knowledge bases and should provide accurate, helpful responses.',
    'Be concise, accurate, and structured. Prefer bullets for multi-step answers.',
    'You can answer questions about ERP-CRM topics using your knowledge base, AND you can also answer general questions, programming questions, technical questions, and other topics professionally.',
    'For general or programming questions, provide clear, helpful explanations even if they are not ERP-CRM related.',
    'If the question is unrelated to ERP-CRM, still answer professionally and clearly with helpful information.',
    'Avoid guessing. If unsure, say so briefly and suggest next steps.',
    'Use the knowledge base context to provide accurate, role-appropriate answers when relevant.',
    generalQuestionHandling,
    accessControlLine,
    roleLine,
    classificationLine,
    questionTypeLine,
    lengthLine,
  ].filter(Boolean).join(' ');
}

/**
 * Call OpenAI API directly
 */
async function callOpenAIAPI(
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
  userRole?: string,
  context?: QueryContext
): Promise<string> {
  // Validate API key exists
  if (!OPENAI_API_KEY || OPENAI_API_KEY.trim() === '') {
    logger.error('[Chatbot] OpenAI API key is missing or empty');
    throw new Error('OpenAI API key is missing. Please configure the API key.');
  }

  try {
    logger.debug('[Chatbot] Calling OpenAI API');
    logger.debug(`[Chatbot] API URL: ${OPENAI_API_URL}`);

    const requestBody = {
      model: 'gpt-4o-mini', // Cost-efficient model
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
        logger.error('[Chatbot] OpenAI API request timed out');
        throw new Error('Request timeout - OpenAI took too long to respond');
      } else if (fetchError instanceof TypeError && fetchError.message.includes('fetch')) {
        logger.error('[Chatbot] Network error calling OpenAI API:', fetchError);
        throw new Error('Network error - please check your internet connection');
      } else {
        logger.error('[Chatbot] Fetch error calling OpenAI API:', fetchError);
        throw fetchError;
      }
    }

    if (!response.ok) {
      const errorText = await response.text();
      logger.error(`[Chatbot] OpenAI API error: ${response.status} - ${errorText}`);
      throw new Error(`OpenAI API request failed: ${response.status} - ${errorText.substring(0, 100)}`);
    }

    const data: OpenRouterResponse = await response.json();

    if (!data.choices || data.choices.length === 0) {
      logger.error('[Chatbot] OpenAI returned empty response');
      throw new Error('No response from OpenAI API');
    }

    const content = data.choices[0].message.content;
    logger.debug('[Chatbot] Successfully received response from OpenAI');
    
    return content.trim();
  } catch (error: any) {
    logger.error('[Chatbot] OpenAI API error:', error);
    throw error;
  }
}

/**
 * Call Groq API directly
 */
async function callGroqAPI(
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
  userRole?: string,
  context?: QueryContext
): Promise<string> {
  // Validate API key exists
  if (!GROQ_API_KEY || GROQ_API_KEY.trim() === '') {
    logger.error('[Chatbot] Groq API key is missing or empty');
    throw new Error('Groq API key is missing. Please configure the API key.');
  }

  try {
    logger.debug('[Chatbot] Calling Groq API');
    logger.debug(`[Chatbot] API URL: ${GROQ_API_URL}`);

    const requestBody = {
      model: 'llama-3.1-70b-versatile', // Fast and capable model
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
        logger.error('[Chatbot] Groq API request timed out');
        throw new Error('Request timeout - Groq took too long to respond');
      } else if (fetchError instanceof TypeError && fetchError.message.includes('fetch')) {
        logger.error('[Chatbot] Network error calling Groq API:', fetchError);
        throw new Error('Network error - please check your internet connection');
      } else {
        logger.error('[Chatbot] Fetch error calling Groq API:', fetchError);
        throw fetchError;
      }
    }

    if (!response.ok) {
      const errorText = await response.text();
      logger.error(`[Chatbot] Groq API error: ${response.status} - ${errorText}`);
      throw new Error(`Groq API request failed: ${response.status} - ${errorText.substring(0, 100)}`);
    }

    const data: OpenRouterResponse = await response.json();

    if (!data.choices || data.choices.length === 0) {
      logger.error('[Chatbot] Groq returned empty response');
      throw new Error('No response from Groq API');
    }

    const content = data.choices[0].message.content;
    logger.debug('[Chatbot] Successfully received response from Groq');
    
    return content.trim();
  } catch (error: any) {
    logger.error('[Chatbot] Groq API error:', error);
    throw error;
  }
}

/**
 * Call Deepseek API directly (5th fallback)
 */
async function callDeepseekAPI(
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }> ,
  userRole?: string,
  context?: QueryContext
): Promise<string> {
  // Validate API key exists
  if (!DEEPSEEK_API_KEY || DEEPSEEK_API_KEY.trim() === '') {
    logger.error('[Chatbot] Deepseek API key is missing or empty');
    throw new Error('Deepseek API key is missing. Please configure the API key.');
  }

  try {
    logger.debug('[Chatbot] Calling Deepseek API');
    logger.debug(`[Chatbot] API URL: ${DEEPSEEK_API_URL}`);

    const requestBody = {
      model: 'deepseek-chat-1',
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
        logger.error('[Chatbot] Deepseek API request timed out');
        throw new Error('Request timeout - Deepseek took too long to respond');
      } else if (fetchError instanceof TypeError && fetchError.message.includes('fetch')) {
        logger.error('[Chatbot] Network error calling Deepseek API:', fetchError);
        throw new Error('Network error - please check your internet connection');
      } else {
        logger.error('[Chatbot] Fetch error calling Deepseek API:', fetchError);
        throw fetchError;
      }
    }

    if (!response.ok) {
      const errorText = await response.text();
      logger.error(`[Chatbot] Deepseek API error: ${response.status} - ${errorText}`);
      throw new Error(`Deepseek API request failed: ${response.status} - ${errorText.substring(0, 100)}`);
    }

    const data: OpenRouterResponse = await response.json();

    if (!data.choices || data.choices.length === 0) {
      logger.error('[Chatbot] Deepseek returned empty response');
      throw new Error('No response from Deepseek API');
    }

    const content = data.choices[0].message.content;
    logger.debug('[Chatbot] Successfully received response from Deepseek');
    
    return content.trim();
  } catch (error: any) {
    logger.error('[Chatbot] Deepseek API error:', error);
    throw error;
  }
}

/**
 * Call OpenRouter API (internal function - used by orchestrator)
 */
async function callOpenRouterAPIInternal(
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
  retries = 2,
  userRole?: string,
  context?: QueryContext
): Promise<string> {
  // Validate API key exists
  if (!OPENROUTER_API_KEY || OPENROUTER_API_KEY.trim() === '') {
    logger.error('[Chatbot] OpenRouter API key is missing or empty');
    throw new Error('OpenRouter API key is missing. Please configure the API key.');
  }

  const model = getNextFreeModel();
  
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
    logger.debug(`[Chatbot] Calling OpenRouter API with model: ${model}`);
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
        logger.error('[Chatbot] OpenRouter API request timed out');
        throw new Error('Request timeout - API took too long to respond');
      } else if (fetchError instanceof TypeError && fetchError.message.includes('fetch')) {
        logger.error('[Chatbot] Network error calling OpenRouter API:', fetchError);
        throw new Error('Network error - please check your internet connection');
      } else {
        logger.error('[Chatbot] Fetch error calling OpenRouter API:', fetchError);
        throw fetchError;
      }
    }

    if (!response.ok) {
      const errorText = await response.text();
      logger.error(`[Chatbot] OpenRouter API error: ${response.status} - ${errorText}`);
      
      // Try next model if available
      if (retries > 0) {
        logger.debug(`[Chatbot] Retrying OpenRouter with different model (${retries} retries left)`);
        return callOpenRouterAPIInternal(messages, retries - 1, userRole, context);
      }
      
      // If all OpenRouter models failed, throw error (orchestrator will handle fallback)
      throw new Error(`OpenRouter API request failed: ${response.status}`);
    }

    const data: OpenRouterResponse = await response.json();
    
    if (!data.choices || data.choices.length === 0) {
      // If OpenRouter returns empty response, throw error (orchestrator will handle fallback)
      logger.error('[Chatbot] OpenRouter returned empty response');
      throw new Error('No response from OpenRouter API');
    }

    const content = data.choices[0].message.content;
    logger.debug(`[Chatbot] Successfully received response from OpenRouter (${model})`);
    
    return content.trim();
  } catch (error: any) {
    logger.error('[Chatbot] OpenRouter API error:', error);
    
    // Try next model if available
    if (retries > 0) {
      logger.debug(`[Chatbot] Retrying OpenRouter with different model (${retries} retries left)`);
      try {
        return await callOpenRouterAPIInternal(messages, retries - 1, userRole, context);
      } catch (retryError) {
        // If retry also fails, throw error (orchestrator will handle fallback)
        throw error;
      }
    }
    
    // If all retries failed, throw error (orchestrator will handle fallback)
    throw error;
  }
}

/**
 * Main API orchestrator with 5-tier fallback system
 * Tries: OpenRouter → Google AI Studios → OpenAI → Groq → Deepseek
 */
export async function callOpenRouterAPI(
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
  retries = 2,
  userRole?: string,
  context?: QueryContext
): Promise<string> {
  const errors: Array<{ api: string; error: string }> = [];

  // Tier 1: Try OpenRouter API
  try {
    logger.debug('[Chatbot] [Tier 1/4] Attempting OpenRouter API');
    return await callOpenRouterAPIInternal(messages, retries, userRole, context);
  } catch (error: any) {
    const errorMsg = error?.message || 'Unknown error';
    errors.push({ api: 'OpenRouter', error: errorMsg });
    logger.warn(`[Chatbot] [Tier 1/4] OpenRouter failed: ${errorMsg}`);
  }

  // Tier 2: Try Google AI Studios API
  try {
    logger.debug('[Chatbot] [Tier 2/4] Attempting Google AI Studios API');
    return await callGoogleAIStudiosAPI(messages, userRole, context);
  } catch (error: any) {
    const errorMsg = error?.message || 'Unknown error';
    errors.push({ api: 'Google AI Studios', error: errorMsg });
    logger.warn(`[Chatbot] [Tier 2/4] Google AI Studios failed: ${errorMsg}`);
  }

  // Tier 3: Try OpenAI API
  try {
    logger.debug('[Chatbot] [Tier 3/4] Attempting OpenAI API');
    return await callOpenAIAPI(messages, userRole, context);
  } catch (error: any) {
    const errorMsg = error?.message || 'Unknown error';
    errors.push({ api: 'OpenAI', error: errorMsg });
    logger.warn(`[Chatbot] [Tier 3/4] OpenAI failed: ${errorMsg}`);
  }

  // Tier 4: Try Groq API
  try {
    logger.debug('[Chatbot] [Tier 4/4] Attempting Groq API');
    return await callGroqAPI(messages, userRole, context);
  } catch (error: any) {
    const errorMsg = error?.message || 'Unknown error';
    errors.push({ api: 'Groq', error: errorMsg });
    logger.warn(`[Chatbot] [Tier 4/4] Groq failed: ${errorMsg}`);
  }

  // Tier 5: Try Deepseek API
  try {
    logger.debug('[Chatbot] [Tier 5/5] Attempting Deepseek API');
    return await callDeepseekAPI(messages, userRole, context);
  } catch (error: any) {
    const errorMsg = error?.message || 'Unknown error';
    errors.push({ api: 'Deepseek', error: errorMsg });
    logger.warn(`[Chatbot] [Tier 5/5] Deepseek failed: ${errorMsg}`);
  }
  // All APIs failed - log all errors and throw final error
  logger.error('[Chatbot] All 5 API tiers failed. Errors:', errors);
  throw new Error('All AI services are currently unavailable. Please check your internet connection and try again in a few moments. If the problem persists, please contact support.');
}


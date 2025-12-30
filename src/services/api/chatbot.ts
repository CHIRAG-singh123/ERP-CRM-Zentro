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
    logger.debug(`[Chatbot] [Google AI Model ${modelNumber}/${totalModels}] Successfully received response from: ${model}`);
    
    return content.trim();
  } catch (error: any) {
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
 */
async function callGoogleAIStudiosAPI(
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
  userRole?: string,
  context?: QueryContext
): Promise<string> {
  return callGoogleAIStudiosAPIInternal(0, messages, userRole, context);
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
    logger.debug(`[Chatbot] [OpenAI Model ${modelNumber}/${totalModels}] Successfully received response from: ${model}`);
    
    return content.trim();
  } catch (error: any) {
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
 */
async function callOpenAIAPI(
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
    logger.debug(`[Chatbot] [Groq Model ${modelNumber}/${totalModels}] Successfully received response from: ${model}`);
    
    return content.trim();
  } catch (error: any) {
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
 */
async function callGroqAPI(
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
    logger.debug(`[Chatbot] [DeepSeek Model ${modelNumber}/${totalModels}] Successfully received response from: ${model}`);
    
    return content.trim();
  } catch (error: any) {
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
 */
async function callDeepseekAPI(
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
    logger.debug(`[Chatbot] [OpenRouter Model ${modelNumber}/${totalModels}] Successfully received response from: ${model}`);
    
    return content.trim();
  } catch (error: any) {
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
 * Main API orchestrator with 5-tier fallback system
 * Tries: OpenRouter (10 free models sequentially) → Google AI Studios (5 models sequentially) → 
 *        OpenAI (3 models sequentially) → Groq (6 models sequentially) → Deepseek (2 models sequentially)
 */
export async function callOpenRouterAPI(
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
  _retries?: number, // Kept for backward compatibility but unused (all 10 models are tried sequentially)
  userRole?: string,
  context?: QueryContext
): Promise<string> {
  const errors: Array<{ api: string; error: string }> = [];

  // Tier 1: Try OpenRouter API (tries all 10 free models sequentially)
  try {
    logger.debug('[Chatbot] [Tier 1/5] Attempting OpenRouter API (will try all 10 free models sequentially)');
    return await callOpenRouterAPIInternal(messages, 0, userRole, context);
  } catch (error: any) {
    const errorMsg = error?.message || 'Unknown error';
    errors.push({ api: 'OpenRouter', error: errorMsg });
    logger.warn(`[Chatbot] [Tier 1/5] OpenRouter failed after trying all ${FREE_MODELS.length} free models: ${errorMsg}`);
  }

  // Tier 2: Try Google AI Studios API (tries all 5 models sequentially)
  try {
    logger.debug('[Chatbot] [Tier 2/5] Attempting Google AI Studios API (will try all 5 models sequentially)');
    return await callGoogleAIStudiosAPIInternal(0, messages, userRole, context);
  } catch (error: any) {
    const errorMsg = error?.message || 'Unknown error';
    errors.push({ api: 'Google AI Studios', error: errorMsg });
    logger.warn(`[Chatbot] [Tier 2/5] Google AI Studios failed after trying all ${GOOGLE_AI_MODELS.length} models: ${errorMsg}`);
  }

  // Tier 3: Try OpenAI API (tries all 3 models sequentially)
  try {
    logger.debug('[Chatbot] [Tier 3/5] Attempting OpenAI API (will try all 3 models sequentially)');
    return await callOpenAIAPIInternal(0, messages, userRole, context);
  } catch (error: any) {
    const errorMsg = error?.message || 'Unknown error';
    errors.push({ api: 'OpenAI', error: errorMsg });
    logger.warn(`[Chatbot] [Tier 3/5] OpenAI failed after trying all ${OPENAI_MODELS.length} models: ${errorMsg}`);
  }

  // Tier 4: Try Groq API (tries all 6 models sequentially)
  try {
    logger.debug('[Chatbot] [Tier 4/5] Attempting Groq API (will try all 6 models sequentially)');
    return await callGroqAPIInternal(0, messages, userRole, context);
  } catch (error: any) {
    const errorMsg = error?.message || 'Unknown error';
    errors.push({ api: 'Groq', error: errorMsg });
    logger.warn(`[Chatbot] [Tier 4/5] Groq failed after trying all ${GROQ_MODELS.length} models: ${errorMsg}`);
  }

  // Tier 5: Try Deepseek API (tries all 2 models sequentially)
  try {
    logger.debug('[Chatbot] [Tier 5/5] Attempting Deepseek API (will try all 2 models sequentially)');
    return await callDeepseekAPIInternal(0, messages, userRole, context);
  } catch (error: any) {
    const errorMsg = error?.message || 'Unknown error';
    errors.push({ api: 'Deepseek', error: errorMsg });
    logger.warn(`[Chatbot] [Tier 5/5] Deepseek failed after trying all ${DEEPSEEK_MODELS.length} models: ${errorMsg}`);
  }
  // All APIs failed - log all errors and throw final error
  logger.error('[Chatbot] All 5 API tiers failed. Errors:', errors);
  throw new Error('All AI services are currently unavailable. Please check your internet connection and try again in a few moments. If the problem persists, please contact support.');
}


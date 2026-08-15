import { GoogleGenerativeAI } from '@google/generative-ai';
import {
  GEMETRA_AI_MODEL,
  GEMETRA_APP_SNAPSHOT,
  buildGemetraSystemInstruction,
  buildGemetraUserContextBlock,
  formatPusdInfoReply,
  solanaTxExplorerUrl,
} from "./gemetraAiFacts";
import { fetchCryptoPrice, formatPriceResponse } from './priceService';
import { fixTypos } from './textProcessingService';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  console.warn('Gemini API key not found. AI features will use fallback responses.');
}

const genAI = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;

export interface AIContext {
  employees: any[];
  payments: any[];
  companyName: string;
}

// Advanced memory and thinking system
interface ConversationMemory {
  message: string;
  response: string;
  type: string;
  timestamp: Date;
  topics: string[];
  entities: string[];
  intent: string;
  context: any;
}

interface ThinkingContext {
  currentTopic: string;
  primaryCrypto: string;
  userIntent: string;
  conversationPhase: 'initial' | 'exploring' | 'deep_dive' | 'comparative';
  establishedFacts: { [key: string]: any };
  userPreferences: string[];
  recentQuestions: string[];
}

let conversationMemory: ConversationMemory[] = [];
let thinkingContext: ThinkingContext = {
  currentTopic: 'solana',
  primaryCrypto: 'solana',
  userIntent: 'general',
  conversationPhase: 'initial',
  establishedFacts: {},
  userPreferences: [],
  recentQuestions: []
};

const analyzeMessage = (message: string): { topics: string[], entities: string[], intent: string } => {
  
  const topics = [];
  const entities = [];
  
  // Topic detection - expanded for comprehensive company intelligence
  if (/(price|cost|value|worth)/i.test(message)) topics.push('pricing');
  if (/(ath|all.?time.?high|highest|peak)/i.test(message)) topics.push('ath');
  if (/(atl|all.?time.?low|lowest|bottom)/i.test(message)) topics.push('atl');
  // Narrow "foundation" so "who are our employees?" is not treated as protocol-founder trivia.
  if (
    /(founder|co-?founder)/i.test(message) ||
    /who (founded|started|created|runs) (the )?(company|protocol|solana|bitcoin|ethereum)/i.test(message)
  ) {
    topics.push('foundation');
  }
  if (/(market|cap|rank|volume)/i.test(message)) topics.push('market_data');
  if (/(analysis|technical|trend)/i.test(message)) topics.push('analysis');
  if (/(compare|vs|versus)/i.test(message)) topics.push('comparison');
  
  // Company intelligence topics
  if (/(employee|staff|worker|team)/i.test(message)) topics.push('employees');
  if (/(salary|wage|pay|compensation|income)/i.test(message)) topics.push('salary');
  if (/(highest|top|maximum|most)/i.test(message)) topics.push('highest');
  if (/(lowest|bottom|minimum|least)/i.test(message)) topics.push('lowest');
  if (/(newest|latest|recent|new)/i.test(message)) topics.push('newest');
  if (/(oldest|first|original)/i.test(message)) topics.push('oldest');
  if (/(total|count|number|how many)/i.test(message)) topics.push('count');
  if (/(overview|summary|breakdown|list)/i.test(message)) topics.push('overview');
  if (/(company|business|organization)/i.test(message)) topics.push('company');
  if (/(payroll|payment|budget)/i.test(message)) topics.push('payroll');
  if (/(department|division|team)/i.test(message)) topics.push('department');
  if (/(average|mean|typical)/i.test(message)) topics.push('average');
  if (/(increase|growth|rise|percentage)/i.test(message)) topics.push('growth');
  if (/(name|called|title)/i.test(message)) topics.push('name');
  if (/(does|do|business|industry)/i.test(message)) topics.push('business_type');
  
  /** Crypto / stablecoin ticker hints (includes legacy spellings mapped to pusd_info). */
  const cryptos =
    message.match(
      /(ethereum|eth|mnee|mnée|bitcoin|btc|cardano|ada|solana|sol|pusd|palm.?usd|palmusd|stablecoin|usd.?backed)/gi
    ) || [];
  entities.push(...cryptos.map((c) => c.toLowerCase().replace(/\s+/g, "")));

  if (
    /(pusd|palm\s*usd|palmusd|what.*pusd|tell.*pusd|explain.*pusd|\bpalm\b.*\busd\b)/i.test(message)
  ) {
    entities.push("pusd");
    topics.push("pusd_info");
  }
  if (
    /(mnee|mnée|what is mnee|tell.*mnee|explain.*mnee)/i.test(message)
  ) {
    entities.push("mnee");
    topics.push("pusd_info");
  }
  
  const people = message.match(/(founder|creator|ceo|vitalik|buterin)/gi) || [];
  entities.push(...people.map(p => p.toLowerCase()));
  
  const departments = message.match(/(engineering|marketing|sales|hr|finance|operations|design|product)/gi) || [];
  entities.push(...departments.map(d => d.toLowerCase()));
  
  // Intent detection - expanded
  let intent = 'general';
  if (/(what|whats|tell me)/i.test(message)) intent = 'question';
  if (/(how|explain|why)/i.test(message)) intent = 'explanation';
  if (/(compare|difference|vs)/i.test(message)) intent = 'comparison';
  if (/(founder|who|create)/i.test(message)) intent = 'knowledge';
  if (/(list|show|give me)/i.test(message)) intent = 'data_request';
  if (/(overview|summary)/i.test(message)) intent = 'summary';
  
  return { topics, entities, intent };
};

const updateThinkingContext = (message: string, analysis: any) => {
  if (analysis.entities.includes("bitcoin") || analysis.entities.includes("btc")) {
    thinkingContext.primaryCrypto = "bitcoin";
  } else if (analysis.entities.includes("ethereum") || analysis.entities.includes("eth")) {
    thinkingContext.primaryCrypto = "ethereum";
  } else if (
    analysis.entities.includes("solana") ||
    analysis.entities.includes("sol") ||
    analysis.entities.includes("pusd") ||
    analysis.entities.includes("mnee") ||
    analysis.topics.includes("ath") ||
    analysis.topics.includes("atl") ||
    analysis.topics.includes("pricing")
  ) {
    thinkingContext.primaryCrypto = "solana";
  }
  
  // Update topic
  if (analysis.topics.length > 0) {
    thinkingContext.currentTopic = analysis.topics[0];
  }
  
  // Update intent
  thinkingContext.userIntent = analysis.intent;
  
  // Update conversation phase
  const messageCount = conversationMemory.length;
  if (messageCount < 3) thinkingContext.conversationPhase = 'initial';
  else if (messageCount < 7) thinkingContext.conversationPhase = 'exploring';
  else thinkingContext.conversationPhase = 'deep_dive';
  
  // Track recent questions
  thinkingContext.recentQuestions.push(message);
  if (thinkingContext.recentQuestions.length > 5) {
    thinkingContext.recentQuestions = thinkingContext.recentQuestions.slice(-5);
  }
};

const addToMemory = (message: string, response: string, responseType: string) => {
  const analysis = analyzeMessage(message);
  
  conversationMemory.push({
    message,
    response,
    type: responseType,
    timestamp: new Date(),
    topics: analysis.topics,
    entities: analysis.entities,
    intent: analysis.intent,
    context: { ...thinkingContext }
  });
  
  // Keep last 20 exchanges for deep context
  if (conversationMemory.length > 20) {
    conversationMemory = conversationMemory.slice(-20);
  }
  
  updateThinkingContext(message, analysis);
};

const intelligentThinking = (message: string): { shouldAnswer: boolean, directAnswer?: string, reasoning: string } => {
  const analysis = analyzeMessage(message);
  
  console.log('🤔 AI Thinking:', {
    message,
    analysis,
    currentContext: thinkingContext,
    recentMemory: conversationMemory.slice(-3).map(m => ({ msg: m.message, topics: m.topics }))
  });
  
  // Intelligent reasoning based on context
  
  if (
    analysis.entities.includes("pusd") ||
    analysis.entities.includes("mnee") ||
    analysis.topics.includes("pusd_info") ||
    /^pusd$/i.test(message.trim()) ||
    /^palm\s*usd$/i.test(message.trim()) ||
    /^what.*palm\s*usd/i.test(message.trim()) ||
    /^what.*pusd/i.test(message.trim())
  ) {
    return {
      shouldAnswer: true,
      directAnswer: "pusd_info",
      reasoning: "User asking about Palm USD / USDT (or legacy MNEE wording) for this app.",
    };
  }

  const normalizeAthAtlAsset = (raw: string): string => {
    if (raw === "sol" || raw === "solana") return "solana";
    if (raw === "eth" || raw === "ethereum") return "ethereum";
    if (raw === "btc" || raw === "bitcoin") return "bitcoin";
    if (raw === "ada" || raw === "cardano") return "cardano";
    if (raw === "pusd" || raw === "mnee") return "palm-usd";
    return raw;
  };

  if (analysis.topics.includes("ath")) {
    let targetCrypto =
      analysis.entities.find((e) =>
        ["bitcoin", "ethereum", "eth", "mnee", "pusd", "cardano", "solana", "sol"].includes(e)
      ) || "solana";
    targetCrypto = normalizeAthAtlAsset(targetCrypto);
    thinkingContext.primaryCrypto = targetCrypto;
    return {
      shouldAnswer: true,
      directAnswer: "ath",
      reasoning: `ATH question; target ${targetCrypto}.`,
    };
  }

  if (analysis.topics.includes("atl")) {
    let targetCrypto =
      analysis.entities.find((e) =>
        ["bitcoin", "ethereum", "eth", "mnee", "pusd", "cardano", "solana", "sol"].includes(e)
      ) || "solana";
    targetCrypto = normalizeAthAtlAsset(targetCrypto);
    thinkingContext.primaryCrypto = targetCrypto;
    return {
      shouldAnswer: true,
      directAnswer: "atl",
      reasoning: `ATL question; target ${targetCrypto}.`,
    };
  }

  if (
    analysis.topics.includes("foundation") ||
    analysis.entities.includes("founder") ||
    /founder|co-?founder|who started|who created/i.test(message)
  ) {
    return {
      shouldAnswer: true,
      directAnswer: "founder",
      reasoning: "Founder / protocol origin question — disambiguate BOT Chain vs Ethereum vs USDT.",
    };
  }
  
  const pricePatterns = [
    /(current|what is|what's|tell me).*(price|pricing|cost|value).*(of|for)/i,
    /price.*(of|for).*(ethereum|eth|bitcoin|btc|mnee|pusd|palm\s*usd|cardano|solana|sol)/i,
    /(ethereum|eth|bitcoin|btc|mnee|pusd|palm\s*usd|cardano|solana|sol).*price/i,
    /how much.*(ethereum|eth|bitcoin|btc|mnee|pusd|palm\s*usd|cardano|solana|sol)/i,
  ];

  if (analysis.topics.includes("pricing") || pricePatterns.some((pattern) => pattern.test(message))) {
    let targetCrypto = analysis.entities.find((e) =>
      ["bitcoin", "ethereum", "eth", "mnee", "pusd", "palmusd", "cardano", "solana", "sol"].includes(e)
    );

    if (!targetCrypto) {
      const cryptoMatch = message.match(
        /(ethereum|eth|bitcoin|btc|mnee|pusd|palm\s*usd|cardano|solana|\bsol\b)/i
      );
      if (cryptoMatch) {
        targetCrypto = cryptoMatch[0].toLowerCase().replace(/\s+/g, "");
        if (targetCrypto === "eth") targetCrypto = "ethereum";
        if (targetCrypto === "sol") targetCrypto = "solana";
        if (targetCrypto === "palmusd" || targetCrypto === "palmusd") {
          targetCrypto = "pusd";
        }
      }
    }

    let resolved = targetCrypto || thinkingContext.primaryCrypto || "solana";
    if (resolved === "sol") resolved = "solana";
    if (resolved === "eth") resolved = "ethereum";
    thinkingContext.primaryCrypto =
      resolved === "pusd" || resolved === "mnee" ? "palm-usd" : resolved;

    console.log("💰 Price question detected:", {
      message,
      targetCrypto: thinkingContext.primaryCrypto,
      entities: analysis.entities,
      topics: analysis.topics,
    });

    return {
      shouldAnswer: true,
      directAnswer: "price",
      reasoning: `User asking about price. Target crypto: ${thinkingContext.primaryCrypto}`,
    };
  }
  
  // If we've been in a conversation and user asks vague questions, use context
  if (conversationMemory.length > 2 && analysis.intent === 'question') {
    const recentTopics = conversationMemory.slice(-3).flatMap(m => m.topics);
    if (recentTopics.includes('ath') || recentTopics.includes('atl') || recentTopics.includes('pricing')) {
      return {
        shouldAnswer: true,
        directAnswer: 'contextual',
        reasoning: `Based on conversation history, user likely wants ${thinkingContext.primaryCrypto} data.`
      };
    }
  }
  
  return {
    shouldAnswer: false,
    reasoning: 'Need more context or should use Gemini for complex response.'
  };
};

const buildGeminiUserTurnContext = (context: AIContext): string => {
  const employeeData =
    context.employees.length > 0
      ? context.employees
          .map(
            (emp) =>
              `- ${emp.name}: ${emp.designation} in ${emp.department}, Salary: $${emp.salary}`
          )
          .join("\n")
      : "- No employees in system yet";

  const paySlice = context.payments.slice(-30);
  const paymentData =
    paySlice.length > 0
      ? paySlice
          .map((payment) => {
            const emp =
              payment.employee_name ||
              context.employees.find((e) => e.id === payment.employee_id)?.name ||
              payment.employee_id ||
              "Employee";
            const tok = payment.token || "USDT";
            const when = payment.payment_date || payment.created_at || "N/A";
            return `- ${tok} ${payment.amount} → ${emp} (${payment.status}) @ ${when}`;
          })
          .join("\n")
      : "- No payments in context yet";

  const memoryContext = conversationMemory
    .slice(-5)
    .map(
      (m) =>
        `User: ${m.message} (Topics: ${m.topics.join(", ")}) -> AI: ${m.response.substring(0, 140)}…`
    )
    .join("\n");

  const thinkingSummary = [
    `Tracked focus asset: ${thinkingContext.primaryCrypto}`,
    `Conversation phase: ${thinkingContext.conversationPhase}`,
    `Recent intents: ${thinkingContext.recentQuestions.slice(-3).join(" | ") || "(none)"}`,
  ].join("\n");

  return buildGemetraUserContextBlock({
    companyName: context.companyName,
    employeeLines: employeeData,
    paymentLines: paymentData,
    memoryLines: memoryContext || "- (none)",
    thinkingSummary,
  });
};

const handleIntelligentQueries = async (message: string, context: AIContext): Promise<string | null> => {
  const thinking = intelligentThinking(message);
  
  console.log('🧠 Intelligent Analysis:', thinking);
  
  if (thinking.directAnswer === "pusd_info") {
    const pusdReply = formatPusdInfoReply();
    thinkingContext.establishedFacts["payroll_stablecoin"] = "USDT on BOT Chain";
    thinkingContext.primaryCrypto = "solana";
    addToMemory(message, pusdReply, "pusd_info");
    return pusdReply;
  }
  
  // Then check for company intelligence questions
  const companyResponse = handleCompanyIntelligence(message, context);
  if (companyResponse) {
    addToMemory(message, companyResponse, 'company_intelligence');
    return companyResponse;
  }
  
  if (!thinking.shouldAnswer) return null;
  
  try {
    switch (thinking.directAnswer) {
      case 'ath':
        const athCrypto = thinkingContext.primaryCrypto;
        const athData = await fetchCryptoPrice(athCrypto);
        if (athData?.ath) {
          const athDate = new Date(athData.athDate || '').toLocaleDateString();
          const distanceFromATH = athData.athChangePercentage || 0;
          
          const response = `📈 **${athCrypto.toUpperCase()} All-Time High**

🎯 **ATH:** $${athData.ath.toFixed(4)} (${athDate})
📍 **Current:** $${athData.price.toFixed(4)}
📉 **From ATH:** ${distanceFromATH.toFixed(1)}% below peak

${distanceFromATH > -50 ? '💡 Still within reasonable distance of peak levels!' : '🔍 Significant discount from peak - interesting for long-term perspective.'}`;

          thinkingContext.establishedFacts[`${athCrypto}_ath`] = athData.ath;
          addToMemory(message, response, 'ath_intelligent');
          return response;
        }
        break;
        
      case 'atl':
        const atlCrypto = thinkingContext.primaryCrypto;
        const atlData = await fetchCryptoPrice(atlCrypto);
        if (atlData?.atl) {
          const atlDate = new Date(atlData.atlDate || '').toLocaleDateString();
          const gainFromATL = atlData.atlChangePercentage || 0;
          
          const response = `📉 **${atlCrypto.toUpperCase()} All-Time Low**

🔻 **ATL:** $${atlData.atl.toFixed(6)} (${atlDate})
📍 **Current:** $${atlData.price.toFixed(4)}  
📈 **From ATL:** +${gainFromATL.toFixed(1)}% above bottom

🚀 Amazing ${gainFromATL.toFixed(0)}% recovery from the absolute lows!`;

          thinkingContext.establishedFacts[`${atlCrypto}_atl`] = atlData.atl;
          addToMemory(message, response, 'atl_intelligent');
          return response;
        }
        break;
        
      case "founder": {
        const founderResponse = `👤 **BOT Chain context (for Gemetra)**

For this product, the relevant protocol context is **BOT Chain**. Commonly cited BOT Chain builders include **Anatoly Yakovenko** and **Raj Gokal**.

If you meant Palm USD governance or issuer details, use official sources: ${GEMETRA_APP_SNAPSHOT.docs[0]}.

I can also answer product-grounded questions such as payroll totals, employee stats, recent payments, and VAT refund flow status.`;
        thinkingContext.establishedFacts["founder_disambiguated"] = "solana_only";
        addToMemory(message, founderResponse, "founder_intelligent");
        return founderResponse;
      }
        
      case "price": {
        const priceAnalysis = analyzeMessage(message);
        let requestedCrypto = priceAnalysis.entities.find((e) =>
          ["mnee", "pusd", "palmusd", "ethereum", "eth", "bitcoin", "btc", "cardano", "solana", "sol"].includes(
            e
          )
        );

        if (!requestedCrypto) {
          const cryptoMatch = message.match(
            /(ethereum|eth|bitcoin|btc|mnee|pusd|palm\s*usd|cardano|solana|\bsol\b)/i
          );
          if (cryptoMatch) {
            requestedCrypto = cryptoMatch[0].toLowerCase().replace(/\s+/g, "");
            if (requestedCrypto === "eth") requestedCrypto = "ethereum";
            if (requestedCrypto === "sol") requestedCrypto = "solana";
            if (requestedCrypto === "palmusd") requestedCrypto = "pusd";
          }
        }

        let inferred = requestedCrypto || thinkingContext.primaryCrypto || "solana";
        if (inferred === "palm-usd") inferred = "pusd";

        const coingeckoId =
          inferred === "pusd" || inferred === "mnee"
            ? "palm-usd"
            : inferred === "sol" || inferred === "solana"
              ? "solana"
              : inferred;

        console.log("💰 Fetching price for:", { inferred, coingeckoId, message });

        const priceData = await fetchCryptoPrice(coingeckoId);
        if (!priceData) break;

        let response: string;
        if (coingeckoId === "palm-usd") {
          const ch = priceData.change24h >= 0 ? "+" : "";
          response = `💵 **USDT (Palm USD)** — spot quote (aggregator)

• **USD:** ~$${priceData.price.toFixed(4)} (stablecoins hug $1; small drift is normal)
• **24h:** ${ch}${priceData.change24h.toFixed(3)}%

**In Gemetra (BOT Chain mainnet‑beta)**  
Mint: \`${GEMETRA_APP_SNAPSHOT.usdtAddress}\`  
Explorer: ${GEMETRA_APP_SNAPSHOT.explorers.token}`;
          thinkingContext.establishedFacts["pusd_reference_price"] = String(priceData.price);
        } else {
          response = formatPriceResponse(priceData, coingeckoId);
          thinkingContext.establishedFacts[`${coingeckoId}_price`] = priceData.price;
        }

        addToMemory(message, response, "price_intelligent");
        return response;
      }
    }
  } catch (error) {
    console.error('Error in intelligent query handling:', error);
  }
  
  return null;
};

const fallbackResponses = {
  greeting: [
    "Hello! I'm your Gemetra assistant. I can summarize your payroll/employee context, clarify how **BOT Chain + USDT (Palm USD)** payouts work here, fetch live spot prices where available, and keep answers grounded to your company data.",
    "Hi — I'm your in-app analyst for Gemetra. Ask about employees, payments, or VAT-style flows; I explain **BOT Chain** settlements via the **wallet adapter** (Phantom, Solflare, etc.) and **USDT** without guessing protocol stats.",
    "Hey! I can use your onboarded employees/recent payouts plus the product rails (**BOT Chain mainnet‑beta**, **USDT** or **SOL** payouts). What should we unpack?",
  ],
  clarification: [
    "I want to give you the most accurate information! Could you clarify which specific aspect you're interested in? 🤔",
    "I'd love to help! Just to make sure I understand correctly - which particular data point or cryptocurrency are you asking about? 📊",
    "Great question! To give you the perfect answer, could you specify which cryptocurrency or metric you're most interested in? 🎯"
  ],
  intelligent: [
    "I'm analyzing multiple data points to give you the most comprehensive answer. Let me break this down with real insights... 🧠",
    "Based on our conversation and current market conditions, here's what I'm seeing... 📈",
    "Interesting question! Let me provide some intelligent analysis on this... 🔍"
  ]
};

const getContextualFallback = (message: string): string => {
  const messageCount = conversationMemory.length;

  if (/(pusd|palm\s*usd|mnee|mnée)/i.test(message)) {
    return `${formatPusdInfoReply()}

*(Gemini is offline or unavailable — this is canned product context.)*`;
  }
  
  if (/(hi|hello|hey)/i.test(message)) {
    return fallbackResponses.greeting[Math.floor(Math.random() * fallbackResponses.greeting.length)];
  }
  
  if (messageCount > 3) {
    return fallbackResponses.intelligent[Math.floor(Math.random() * fallbackResponses.intelligent.length)];
  }
  
  return fallbackResponses.clarification[Math.floor(Math.random() * fallbackResponses.clarification.length)];
};

export const generateAIResponse = async (
  message: string, 
  context: AIContext
): Promise<string> => {
  console.log('🧠 Generating ultra-intelligent response for:', message);
  console.log('📊 Full context:', { 
    employees: context.employees.length, 
    payments: context.payments.length, 
    company: context.companyName,
    conversationMemory: conversationMemory.length,
    thinkingContext
  });

  // First, try deterministic handlers (company data, Palm USD FAQ, CoinGecko, etc.)
  const intelligentResponse = await handleIntelligentQueries(message, context);
  if (intelligentResponse) {
    console.log('🎯 Returning contextually intelligent response');
    return intelligentResponse;
  }
  
  // If no intelligent response, check company intelligence directly (before fallback)
  const companyResponse = handleCompanyIntelligence(message, context);
  if (companyResponse) {
    console.log('🏢 Returning company intelligence response');
    addToMemory(message, companyResponse, 'company_intelligence');
    return companyResponse;
  }

  // Fix typos in the message
  const correctedMessage = fixTypos(message);
  if (correctedMessage !== message) {
    console.log('✏️ Fixed typos:', message, '->', correctedMessage);
  }

  if (!genAI) {
    console.log('🔄 Using contextual fallback');
    const response = getContextualFallback(correctedMessage);
    addToMemory(correctedMessage, response, 'contextual_fallback');
    return response;
  }

  try {
    const model = genAI.getGenerativeModel({
      model: GEMETRA_AI_MODEL,
      systemInstruction: buildGemetraSystemInstruction(),
      generationConfig: {
        temperature: 0.5,
        topK: 40,
        topP: 0.92,
        maxOutputTokens: 4096,
      },
    });

    const userTurn = `${buildGeminiUserTurnContext(context)}

Question: ${correctedMessage}

Answer using the USER CONTEXT facts for anything about this company/payroll/VAT workflows. Prefer concise markdown. If clarification is absolutely required to avoid guessing, ask a single pinpoint question.`;

    console.log("🚀 Calling Gemini…");
    const result = await model.generateContent(userTurn);
    const response = await result.response;
    const text = response.text();
    
    console.log('✅ Ultra-intelligent response received:', text?.substring(0, 100) + '...');
    
    if (!text || text.trim().length === 0) {
      throw new Error('Empty response from AI');
    }
    
    addToMemory(correctedMessage, text.trim(), 'gemini_intelligent');
    return text.trim();
    
  } catch (error) {
    console.error('❌ AI service error:', error);
    console.log('🔄 Falling back to contextual response');
    
    const response = getContextualFallback(correctedMessage);
    addToMemory(correctedMessage, response, 'error_fallback');
    return response;
  }
};

export const generateCompanyInsights = (context: AIContext) => {
  const { employees, payments } = context;
  
  const totalPayroll = employees.reduce((sum, emp) => sum + emp.salary, 0);
  const avgSalary = employees.length > 0 ? totalPayroll / employees.length : 0;
  
  const departmentCounts: { [key: string]: number } = {};
  employees.forEach(emp => {
    departmentCounts[emp.department] = (departmentCounts[emp.department] || 0) + 1;
  });
  
  const completedPayments = payments.filter(p => p.status === 'completed');
  const totalPaid = completedPayments.reduce((sum, p) => sum + p.amount, 0);
  
  return {
    totalEmployees: employees.length,
    totalPayroll,
    avgSalary,
    departmentCounts,
    totalPaid,
    completedPayments: completedPayments.length,
    pendingPayments: payments.filter(p => p.status === 'pending').length
  };
};

const generateCompanyAnalytics = (context: AIContext) => {
  const { employees, payments, companyName } = context;
  
  if (employees.length === 0) {
    return {
      totalEmployees: 0,
      totalPayroll: 0,
      avgSalary: 0,
      highestPaid: null,
      lowestPaid: null,
      newestEmployee: null,
      oldestEmployee: null,
      departmentBreakdown: {},
      salaryRange: { min: 0, max: 0 },
      payrollGrowth: 0,
      totalPaid: 0,
      lastPayment: null,
      companyDescription: `${companyName} operates Gemetra on **BOT Chain** with **USDT (Palm USD)** or **SOL** payouts (BOT Chain Wallet Adapter–connected wallets; **SOL** for fees) for VAT + payroll workflows.`
    };
  }
  
  const totalPayroll = employees.reduce((sum, emp) => sum + (emp.salary || 0), 0);
  const avgSalary = totalPayroll / employees.length;
  
  const sortedBySalary = [...employees].sort((a, b) => (b.salary || 0) - (a.salary || 0));
  const highestPaid = sortedBySalary[0];
  const lowestPaid = sortedBySalary[sortedBySalary.length - 1];
  
  // Department breakdown
  const departmentBreakdown: { [key: string]: { count: number, totalSalary: number, avgSalary: number } } = {};
  employees.forEach(emp => {
    const dept = emp.department || 'Unassigned';
    if (!departmentBreakdown[dept]) {
      departmentBreakdown[dept] = { count: 0, totalSalary: 0, avgSalary: 0 };
    }
    departmentBreakdown[dept].count++;
    departmentBreakdown[dept].totalSalary += emp.salary || 0;
    departmentBreakdown[dept].avgSalary = departmentBreakdown[dept].totalSalary / departmentBreakdown[dept].count;
  });
  
  // Salary range
  const salaryRange = {
    min: Math.min(...employees.map(emp => emp.salary || 0)),
    max: Math.max(...employees.map(emp => emp.salary || 0))
  };
  
  // Payment analytics
  const completedPayments = payments.filter(p => p.status === 'completed');
  const totalPaid = completedPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const lastPayment = payments.length > 0 ? payments[payments.length - 1] : null;
  
  // Sort by hire date (assuming created_at or hire_date field)
  const sortedByDate = [...employees].sort((a, b) => {
    const dateA = new Date(a.created_at || a.hire_date || '1970-01-01');
    const dateB = new Date(b.created_at || b.hire_date || '1970-01-01');
    return dateB.getTime() - dateA.getTime();
  });
  
  const newestEmployee = sortedByDate[0];
  const oldestEmployee = sortedByDate[sortedByDate.length - 1];
  
  return {
    totalEmployees: employees.length,
    totalPayroll,
    avgSalary,
    highestPaid,
    lowestPaid,
    newestEmployee,
    oldestEmployee,
    departmentBreakdown,
    salaryRange,
    totalPaid,
    lastPayment,
    completedPayments: completedPayments.length,
    pendingPayments: payments.filter(p => p.status === 'pending').length,
    companyDescription: `${companyName} runs Gemetra — BOT Chain‑native payroll/refund tooling that denominates disbursements in **USDT** (or **SOL** when selected), keeps **SOL** for network fees, and connects through the **BOT Chain Wallet Adapter**.`
  };
};

type CompanyAnalytics = ReturnType<typeof generateCompanyAnalytics>;

function employeeDisplayName(
  context: AIContext,
  payment: { employee_id?: string; employee_name?: string },
): string {
  if (payment.employee_name) return payment.employee_name;
  const e = context.employees.find((emp) => emp.id === payment.employee_id);
  return e?.name || payment.employee_id || "Unknown";
}

/** High-priority answers: product help + grounded payroll data (before broad keyword branches). */
function tryGemetraDomainAnswer(
  message: string,
  context: AIContext,
  analytics: CompanyAnalytics,
): string | null {
  const m = message.trim();
  const G = GEMETRA_APP_SNAPSHOT;

  if (
    /how (do|can) i connect (my |a )?wallet/i.test(m) ||
    /where.*connect.*wallet/i.test(m) ||
    /^connect (my |the )?wallet/i.test(m)
  ) {
    return `### Connect your wallet

1. From the dashboard shell, use **Connect wallet** in the **header** or **sidebar** (or the wallet control on the landing hero when offered).
2. Choose a wallet in the **BOT Chain Wallet Adapter** modal (Phantom, Solflare, Ledger, etc.). If you configured \`VITE_WALLETCONNECT_PROJECT_ID\`, **WalletConnect** appears for mobile / QR flows.
3. Approve the connection in the wallet app or browser extension.
4. Use **BOT Chain mainnet‑beta** and keep a small **SOL** balance for network fees.

After you connect, **USDT** and **SOL** payouts are signed with that wallet in **Bulk transfer**, **VAT refund**, and **Scheduled payments** when you pick the token on each screen.`;
  }

  if (/scheduled payment|recurring payment|payment schedule|calendar.*schedul/i.test(m) && /how|what|explain|work/i.test(m)) {
    return `### How scheduled payments work

- Open **Scheduled payments** in the dashboard and create a **one-time** or **recurring** schedule (daily, weekly, bi-weekly, or monthly).
- Set **amount**, **employee**, **date** (and **end date** for recurring), and the **token** (**USDT** or **SOL**). Each run uses the token stored on that schedule.
- Optional **pre-approval**: set separate **spending caps per token** (USDT and SOL). While totals of due runs stay within those caps, the app can **auto-process** without asking you to sign again; otherwise you approve manually.
- A background check looks for **due** items and processes them when your wallet is connected and balances cover the payout plus **SOL** fees.

Use **Payments** / **Bulk transfer** for immediate batch sends outside the scheduler.`;
  }

  if (/\bspl tokens?\b|what (are|is) spl/i.test(m)) {
    return `### What are SPL tokens?

**SPL** (**BOT Chain Program Library**) tokens are fungible assets on BOT Chain (similar in role to ERC-20s on Ethereum), controlled by the SPL Token / Token-2022 programs.

In **Gemetra**, payroll and VAT payouts use:

- **USDT** — an SPL stablecoin (Palm USD) at mint \`${G.usdtAddress}\` (${G.tokenProgram}).
- **Native SOL** — not an SPL balance for transfers; the UI can still pay salaries/refunds in **SOL** using system transfers when you choose **SOL** as the payout token.

Every SPL transfer still consumes a small amount of **SOL** for rent and transaction fees.`;
  }

  if (/mainnet-?beta|what is solana mainnet/i.test(m)) {
    return `### BOT Chain **mainnet-beta**

**mainnet-beta** is BOT Chain’s primary production cluster: real **SOL** and real tokens (including **USDT** SPL) live here. Transaction fees are paid in **SOL**; amounts are final and show on explorers like Solscan.

Gemetra’s payout flows in this app are intended for **mainnet-beta** (see product snapshot: **${G.payrollChain}**). Use devnet/testnet only if you deliberately point RPC and wallets there — not the default shipped UX.`;
  }

  if (/(how (do|can) i|)send.*(token|pusd|sol).*solana/i.test(m) || /send tokens? on solana/i.test(m)) {
    return `### Sending tokens on BOT Chain (and in Gemetra)

**In general:** fund **SOL** for fees, hold the SPL mint you need (e.g. USDT), use a wallet that supports SPL, and submit a token transfer to the recipient’s **associated token account** (ATA) for that mint.

**In Gemetra:** you don’t paste raw instructions — use **Bulk transfer** or **VAT refund** with a connected wallet, pick **USDT** or **SOL**, preview totals, then **sign** the transaction your wallet presents. The app builds the correct SPL or native transfer for each recipient.`;
  }

  if (/(solana )?(transaction )?fees?|network fee|cost.*(payout|transfer).*solana/i.test(m)) {
    return `### BOT Chain fees for payouts

- Every transaction costs a small amount of **SOL** (typically a fraction of a cent to a few cents at normal congestion — exact lamports vary by instruction count and account writes).
- **SPL transfers** (e.g. **USDT**) include the same base fee plus slightly more work than a simple SOL transfer; still usually very small in USD terms.
- You cannot pay BOT Chain protocol fees in **USDT**; keep **SOL** in the signing wallet for all Gemetra sends.

Gemetra does not quote an exact fee ahead of time in the assistant — your wallet shows the final fee before you approve.`;
  }

  if (/payment methods?.*support|supported.*(payment|payout|currency|token)|what payment (options|methods)/i.test(m)) {
    return `### Payment methods supported in Gemetra

Settlements are **on-chain on BOT Chain** from your connected wallet:

- **USDT** (Palm USD) — SPL stablecoin, default for dollar-style amounts.
- **Native SOL** — optional payout asset where the UI offers a **token** toggle.

There is no card / bank rail inside the app; fiat would be off-ramped outside this product. VAT and payroll UIs let you choose **USDT** or **SOL** per flow or per schedule.`;
  }

  if (/how (do|can) i make a payment|how to pay (an |my )?employee|process (a |the )?payroll/i.test(m)) {
    return `### How to make a payment

1. **Connect** your BOT Chain wallet.
2. **Employees:** add or import people (CSV) under **Employees** if needed.
3. Open **Bulk transfer** (or single payment flows where available), select recipients and amounts, and choose **USDT** or **SOL**.
4. Review the **preview** modal, then **confirm** and **sign** in your wallet.
5. Wait for confirmation; the app records **status** and **transaction signature** when complete.

For future-dated runs, use **Scheduled payments** instead.`;
  }

  if (
    /what is a bulk payment|what('s| is) bulk (payment|transfer)|bulk payment(s)? (mean|work)|explain bulk (transfer|payment)/i.test(
      m,
    )
  ) {
    return `### What is a bulk payment?

In Gemetra, a **bulk payment** is a **batch payroll send** from the **Bulk transfer** screen:

- You pick **one or many employees**, amounts, and the **token** (**USDT** or **SOL**).
- The app shows a **preview** with totals, then asks your **BOT Chain wallet** to **sign** (often one transaction per recipient, depending on how the flow is built).
- After confirmation, each row is stored as a **payment** with **status** and optional **transaction signature** on **BOT Chain mainnet‑beta**.

It’s the opposite of paying people one-by-one manually off-platform: everything stays **in-app**, **wallet-signed**, and tied to your employee list.`;
  }

  if (
    /how many payments|payments (have been |were )(made|recorded|completed)|(number|count) of payments|payment count/i.test(m)
  ) {
    const all = context.payments.length;
    const completed = context.payments.filter((p) => p.status === "completed").length;
    const pending = context.payments.filter((p) => p.status === "pending").length;
    const failed = context.payments.filter((p) => p.status === "failed").length;
    return `### Payments recorded in this session

| Status | Count |
|--------|-------|
| **All** | **${all}** |
| Completed | ${completed} |
| Pending | ${pending} |
| Failed | ${failed} |

_These are rows stored for your connected wallet in this app (local session + Supabase when synced). Use **Payments** or **Bulk transfer** for the live table._`;
  }

  if (
    /(our |the )?total (monthly )?payroll( amount)?|monthly payroll (total|amount)/i.test(m) ||
    /what (is|'s) (our |the )?(total )?(monthly )?payroll/i.test(m) ||
    /how much is (our |the )?(company )?(total )?payroll/i.test(m) ||
    /total payroll amount/i.test(m)
  ) {
    if (analytics.totalEmployees === 0) {
      return "**Total monthly payroll:** **$0** — there are no employees with salaries on file yet. Add people under **Employees** (or import CSV).";
    }
    return `### Total monthly payroll — ${context.companyName}

**$${analytics.totalPayroll.toLocaleString()}** / month — sum of each employee’s **salary** field (**${analytics.totalEmployees}** people).

- **Average:** $${analytics.avgSalary.toLocaleString()}
- **Range:** $${analytics.salaryRange.min.toLocaleString()} – $${analytics.salaryRange.max.toLocaleString()}

This is your **payroll book** total, not the same as **on-chain “total amount paid”** (disbursements). Ask *“What is the total amount paid?”* for completed payment totals by token.`;
  }

  if (
    /employee details|details (about|for|on) (our |the )?(employees|staff|team)/i.test(m) ||
    /show (me )?(all )?employee (details|records|profiles|information)/i.test(m) ||
    /full (employee |staff )(list|roster|details)/i.test(m)
  ) {
    if (context.employees.length === 0) {
      return "There are **no employees** to show. Add people under **Employees** or import a CSV, then ask again.";
    }
    const blocks = context.employees
      .map((emp, i) => {
        const w = emp.wallet_address ? `\`${emp.wallet_address}\`` : "—";
        return `#### ${i + 1}. ${emp.name}

| Field | Value |
|--------|--------|
| **Email** | ${emp.email || "—"} |
| **Role** | ${emp.designation || "—"} |
| **Department** | ${emp.department || "Unassigned"} |
| **Monthly salary** | $${Number(emp.salary || 0).toLocaleString()} |
| **Wallet** | ${w} |
| **Status** | ${emp.status || "—"} |
| **Join date** | ${emp.join_date || "—"} |`;
      })
      .join("\n\n");
    return `### Employee details — ${context.companyName} (${context.employees.length})

${blocks}`;
  }

  if (
    /who (are|is) (our |the )?(employees|staff|team)/i.test(m) ||
    /list (all |our |the )?(employees|staff|team)/i.test(m) ||
    /^(our )?employees\??$/i.test(m) ||
    /tell me about (our |the )?(employees|staff|team)/i.test(m)
  ) {
    if (context.employees.length === 0) {
      return "There are **no employees** in your session yet. Add people under **Employees** (or import CSV) and ask again.";
    }
    const lines = context.employees
      .map(
        (emp, i) =>
          `${i + 1}. **${emp.name}** — ${emp.designation || "—"} · ${emp.department || "Unassigned"} · $${Number(emp.salary || 0).toLocaleString()}`,
      )
      .join("\n");
    return `### ${context.companyName} — employees (${context.employees.length})

${lines}`;
  }

  if (
    /which department.*(most|many|largest|biggest).*employees/i.test(m) ||
    /department.*(with )?(the )?most employees/i.test(m) ||
    /most employees.*which department/i.test(m)
  ) {
    const entries = Object.entries(analytics.departmentBreakdown);
    if (entries.length === 0) {
      return "There’s no department data yet — add employees with a **department** field, or import a CSV that includes departments.";
    }
    const sorted = entries.sort((a, b) => b[1].count - a[1].count);
    const [topDept, topData] = sorted[0];
    const ties = sorted.filter(([, d]) => d.count === topData.count).map(([name]) => name);
    const tieNote =
      ties.length > 1 ? `\n\n*It’s a tie between:* ${ties.map((t) => `**${t}**`).join(", ")}.` : "";
    return `### Department with the most employees

**${topDept}** — **${topData.count}** employees (avg salary **$${topData.avgSalary.toLocaleString()}**).${tieNote}`;
  }

  if (/total amount paid|how much.*paid|sum of (all )?payments|total (payout|disbursement)/i.test(m)) {
    const completed = context.payments.filter((p) => p.status === "completed");
    const byToken: Record<string, number> = {};
    for (const p of completed) {
      const t = String(p.token || "USDT").toUpperCase();
      byToken[t] = (byToken[t] || 0) + (Number(p.amount) || 0);
    }
    const lines = Object.entries(byToken)
      .map(([t, amt]) => `- **${t}:** ${amt.toLocaleString(undefined, { maximumFractionDigits: 6 })}`)
      .join("\n");
    return `### Total amount paid (completed)

- **All completed payments:** ${completed.length}  
- **Recorded total (numeric sum of \`amount\` by token):**

${lines || "_(no completed payments in this session yet)_"}

_Note: USDT rows are stored as dollar-style numbers; SOL rows are in SOL. Pending or failed rows are excluded._`;
  }

  if (/employee statistics|workforce stats|stats.*employees/i.test(m)) {
    if (analytics.totalEmployees === 0) {
      return "**Employee statistics:** no employees on file for this wallet session yet.";
    }
    const deptLines = Object.entries(analytics.departmentBreakdown)
      .map(
        ([dept, d]) =>
          `- **${dept}:** ${d.count} people · total payroll **$${d.totalSalary.toLocaleString()}** · avg **$${d.avgSalary.toLocaleString()}**`,
      )
      .join("\n");
    return `### Employee statistics — ${context.companyName}

- **Headcount:** ${analytics.totalEmployees}
- **Monthly payroll (sum of salaries):** $${analytics.totalPayroll.toLocaleString()}
- **Average salary:** $${analytics.avgSalary.toLocaleString()}
- **Salary range:** $${analytics.salaryRange.min.toLocaleString()} – $${analytics.salaryRange.max.toLocaleString()}
- **Completed payments (count):** ${analytics.completedPayments}

**By department**

${deptLines}`;
  }

  if (/(show|list|all).*(transaction|payment)s?|payment history|transaction history|past payments/i.test(m)) {
    if (context.payments.length === 0) {
      return "No **payments or transactions** are stored for this wallet session yet. After you send payroll or VAT payouts, they appear here and in **Payments**.";
    }
    const sorted = [...context.payments].sort((a, b) => {
      const ta = new Date(a.payment_date || a.created_at || 0).getTime();
      const tb = new Date(b.payment_date || b.created_at || 0).getTime();
      return tb - ta;
    });
    const cap = 45;
    const slice = sorted.slice(0, cap);
    const rows = slice
      .map((p) => {
        const who = employeeDisplayName(context, p);
        const when = (p.payment_date || p.created_at || "").toString().slice(0, 19).replace("T", " ");
        const tok = p.token || "USDT";
        const link = p.transaction_hash
          ? `[Solscan](${solanaTxExplorerUrl(p.transaction_hash)})`
          : "—";
        return `| ${when} | ${who} | ${p.amount} ${tok} | ${p.status} | ${link} |`;
      })
      .join("\n");
    const more =
      sorted.length > cap
        ? `\n\n_Showing **${cap}** of **${sorted.length}** rows. Open the **Payments** page for the full list._`
        : "";
    return `### Payment / transaction history

| When | Employee | Amount | Status | Explorer |
|------|----------|--------|--------|----------|
${rows}${more}`;
  }

  return null;
};

const handleCompanyIntelligence = (message: string, context: AIContext): string | null => {
  const analysis = analyzeMessage(message);
  const analytics = generateCompanyAnalytics(context);
  
  console.log('🏢 Company Intelligence Analysis:', { analysis, analytics });

  const domainHit = tryGemetraDomainAnswer(message, context, analytics);
  if (domainHit) return domainHit;
  
  // Basic conversational responses
  if (/(thank you|thanks|thx|appreciate|great|awesome|perfect|excellent)/i.test(message) && message.length < 50) {
    const responses = [
      "You're welcome! Need anything else on payroll/VAT workflows, BOT Chain, or Palm USD?",
      "Glad it helped — ask anytime about employee data, treasury ops, BOT Chain/USDT payouts, or wallet setup.",
      "My pleasure — I can revisit company metrics or explain how payouts flow on BOT Chain with USDT.",
      "You're welcome! I'm always ready to dive into your company data or provide market analysis."
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  }
  
  // Simple greetings
  if (/(^hi$|^hello$|^hey$|good morning|good afternoon|good evening)/i.test(message.trim())) {
    return "Hello! I'm your Gemetra assistant — **BOT Chain** settlements (**USDT** or **SOL**), wallet-adapter sign-in, VAT/payroll flows, plus your synced employee roster. What's the first priority?";
  }
  
  // Salary overview questions - catch various forms including "Employee salary breakdown"
  if (/overview.*(salary|salaries|pay|compensation)/i.test(message) || 
      /salary.*(overview|breakdown|summary)/i.test(message) ||
      /(salary|salaries).*(overview|breakdown|list)/i.test(message) ||
      /employee.*salary.*breakdown/i.test(message) ||
      /(breakdown|overview).*salary/i.test(message)) {
    
    const employeeList = context.employees
      .sort((a, b) => (b.salary || 0) - (a.salary || 0))
      .map((emp, index) => 
        `${index + 1}. **${emp.name}** - ${emp.designation} (${emp.department}) - $${emp.salary?.toLocaleString()}`
      )
      .join('\n');
    
    return `💰 **Salary Overview**

**Company Salary Stats:**
• Total Employees: ${analytics.totalEmployees}
• Total Monthly Payroll: $${analytics.totalPayroll.toLocaleString()}
• Average Salary: $${analytics.avgSalary.toLocaleString()}
• Salary Range: $${analytics.salaryRange.min.toLocaleString()} - $${analytics.salaryRange.max.toLocaleString()}
• Salary Spread: $${(analytics.salaryRange.max - analytics.salaryRange.min).toLocaleString()}

**Employee List (by salary):**
${employeeList}

**Department Salary Breakdown:**
${Object.entries(analytics.departmentBreakdown)
  .map(([dept, data]) => `• **${dept}**: ${data.count} employees, avg $${data.avgSalary.toLocaleString()}, total $${data.totalSalary.toLocaleString()}`)
  .join('\n')}

**Key Insights:**
• Highest earner makes ${((analytics.highestPaid?.salary || 0) / (analytics.lowestPaid?.salary || 1) * 100).toFixed(0)}% more than lowest earner
• ${Object.keys(analytics.departmentBreakdown).length} departments represented`;
  }
  
  // Company name questions
  if (analysis.topics.includes('name') || /what.*(company|business).*name/i.test(message)) {
    return `🏢 **Company Name:** ${context.companyName}

${analytics.companyDescription}

We currently have ${analytics.totalEmployees} employees logged and ${analytics.completedPayments} completed disbursements routed through BOT Chain‑native flows with USDT.`;
  }
  
  // Company overview - catch "company overview please" - CHECK THIS FIRST before other overview checks
  if (/company.*overview/i.test(message) ||
      /overview.*company/i.test(message) ||
      /company.*summary/i.test(message) ||
      (analysis.topics.includes('overview') && analysis.topics.includes('company'))) {
    return `# 🏢 **${context.companyName} - Company Overview**

${analytics.companyDescription}

## 📊 **Current Operations:**

- **${analytics.totalEmployees}** active employees
- **$${analytics.totalPayroll.toLocaleString()}** total monthly payroll
- **${analytics.completedPayments}** payments processed
- **${Object.keys(analytics.departmentBreakdown).length}** departments

## 🚀 **Key Services:**

- Blockchain-based payroll processing
- BOT Chain Wallet Adapter + employee payouts in **USDT** (or **SOL** when chosen)
- Secure & transparent salary distribution
- Real-time payment tracking
- Crypto payroll solutions

## 💰 **Payroll Statistics:**

- Average salary: $${analytics.avgSalary.toLocaleString()}
- Salary range: $${analytics.salaryRange.min.toLocaleString()} - $${analytics.salaryRange.max.toLocaleString()}
- Total paid: $${analytics.totalPaid.toLocaleString()}

## 📁 **Department Breakdown:**

${Object.entries(analytics.departmentBreakdown)
  .map(([dept, data]) => `• **${dept}**: ${data.count} employees, avg $${data.avgSalary.toLocaleString()}, total $${data.totalSalary.toLocaleString()}`)
  .join('\n')}`;
  }
  
  // What does the company do
  if (analysis.topics.includes('business_type') || /what.*(company|business).*(do|does)/i.test(message)) {
    return `# 🚀 What ${context.companyName} Does:

${analytics.companyDescription}

## Key Services:

- Blockchain-based payroll processing
- BOT Chain Wallet Adapter + employee payouts in **USDT** (or **SOL** when chosen)
- Secure & transparent salary distribution
- Real-time payment tracking
- Crypto payroll solutions

## Current Operations:

- ${analytics.totalEmployees} active employees
- $${analytics.totalPayroll.toLocaleString()} total monthly payroll
- ${analytics.completedPayments} payments processed
- ${Object.keys(analytics.departmentBreakdown).length} departments`;
  }
  
  // Employee count - catch "how many employees do we have"
  if ((analysis.topics.includes('count') && analysis.topics.includes('employees')) ||
      /how many.*(employee|staff|worker)/i.test(message) ||
      /(employee|staff|worker).*count/i.test(message)) {
    return `👥 **Employee Count:** ${analytics.totalEmployees} employees

**Department Breakdown:**
${Object.entries(analytics.departmentBreakdown)
  .map(([dept, data]) => `• ${dept}: ${data.count} employees (avg salary: $${data.avgSalary.toLocaleString()})`)
  .join('\n')}

**Payroll Overview:**
• Total monthly payroll: $${analytics.totalPayroll.toLocaleString()}
• Average salary: $${analytics.avgSalary.toLocaleString()}`;
  }
  
  // Highest paid employee - catch "who is our highest paid employee"
  if ((analysis.topics.includes('highest') && analysis.topics.includes('paid')) ||
      /who.*(highest|top).*(paid|earner|employee|salary)/i.test(message) ||
      /(highest|top).*(paid|earner|employee|salary)/i.test(message)) {
    if (!analytics.highestPaid) {
      return "I don't have information about employee salaries at the moment.";
    }
    
    return `# 💰 Highest Paid Employee: ${analytics.highestPaid.name}

## Position: ${analytics.highestPaid.designation}
## Department: ${analytics.highestPaid.department}
## Salary: $${analytics.highestPaid.salary?.toLocaleString()}
## Percentage of total payroll: ${((analytics.highestPaid.salary || 0) / analytics.totalPayroll * 100).toFixed(1)}%

This represents our top compensation tier, ${(((analytics.highestPaid.salary || 0) / analytics.avgSalary - 1) * 100).toFixed(0)}% above average salary.`;
  }
  
  // Lowest paid employee
  if ((analysis.topics.includes('lowest') && analysis.topics.includes('employees')) || 
      /lowest.*(paid|salary|employee)/i.test(message)) {
    if (!analytics.lowestPaid) {
      return "No employee data available yet.";
    }
    return `📊 **Lowest Paid Employee:** ${analytics.lowestPaid.name}

• **Position:** ${analytics.lowestPaid.designation}
• **Department:** ${analytics.lowestPaid.department}
• **Salary:** $${analytics.lowestPaid.salary?.toLocaleString()}
• **Percentage of total payroll:** ${((analytics.lowestPaid.salary / analytics.totalPayroll) * 100).toFixed(1)}%

This represents our entry-level compensation, ${((1 - analytics.lowestPaid.salary / analytics.avgSalary) * 100).toFixed(0)}% below average salary.`;
  }
  
  // Newest employee
  if (analysis.topics.includes('newest') && analysis.topics.includes('employees')) {
    if (!analytics.newestEmployee) {
      return "No employee data available yet.";
    }
    return `🆕 **Newest Employee:** ${analytics.newestEmployee.name}

• **Position:** ${analytics.newestEmployee.designation}
• **Department:** ${analytics.newestEmployee.department}
• **Salary:** $${analytics.newestEmployee.salary?.toLocaleString()}
• **Joined:** ${new Date(analytics.newestEmployee.created_at || analytics.newestEmployee.hire_date || '').toLocaleDateString()}

Welcome to our growing team! They're earning ${analytics.newestEmployee.salary > analytics.avgSalary ? 'above' : 'below'} average salary.`;
  }
  
  // Employee list/overview
  if ((analysis.topics.includes('overview') && analysis.topics.includes('employees')) || 
      /list.*(employee|staff)/i.test(message) ||
      /(employee|salary).*(breakdown|overview)/i.test(message)) {
    
    const employeeList = context.employees
      .sort((a, b) => (b.salary || 0) - (a.salary || 0))
      .map((emp, index) => 
        `${index + 1}. **${emp.name}** - ${emp.designation} (${emp.department}) - $${emp.salary?.toLocaleString()}`
      )
      .join('\n');
    
    return `👥 **Complete Employee Overview**

**Company Stats:**
• Total Employees: ${analytics.totalEmployees}
• Total Payroll: $${analytics.totalPayroll.toLocaleString()}/month
• Average Salary: $${analytics.avgSalary.toLocaleString()}
• Salary Range: $${analytics.salaryRange.min.toLocaleString()} - $${analytics.salaryRange.max.toLocaleString()}

**Employee List (by salary):**
${employeeList}

**Department Summary:**
${Object.entries(analytics.departmentBreakdown)
  .map(([dept, data]) => `• ${dept}: ${data.count} employees, $${data.totalSalary.toLocaleString()} total`)
  .join('\n')}`;
  }
  
  // Last payment info — keep patterns tight; never match every "payment" / payroll topic (that hijacked generic questions).
  if (
    /last.*(payment|paid|disbursement)/i.test(message) ||
    /when.*(last|recent).*(payment|paid)/i.test(message) ||
    /when.*was.*(the )?(last )?(payment|payout)/i.test(message) ||
    /most recent payment/i.test(message)
  ) {
    if (!analytics.lastPayment) {
      return "No payments have been made yet.";
    }
    const paymentDate = new Date(analytics.lastPayment.created_at || analytics.lastPayment.payment_date || '');
    
    // Calculate time ago
    const now = new Date();
    const diffMs = now.getTime() - paymentDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    let timeAgo = 'Just now';
    if (diffMins >= 1 && diffMins < 60) {
      timeAgo = `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    } else if (diffHours < 24) {
      timeAgo = `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else if (diffDays < 7) {
      timeAgo = `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    } else {
      timeAgo = `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) > 1 ? 's' : ''} ago`;
    }
    
    return `💳 **Last Payment Information:**

• **Amount:** $${analytics.lastPayment.amount?.toLocaleString()} ${analytics.lastPayment.token || "USDT"}
• **Employee:** ${analytics.lastPayment.employee_name || 'N/A'}
• **Date:** ${paymentDate.toLocaleDateString()} at ${paymentDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
• **Time Ago:** ${timeAgo}
• **Status:** ${analytics.lastPayment.status}
${analytics.lastPayment.transaction_hash ? `• **Signature:** [${analytics.lastPayment.transaction_hash.substring(0, 10)}…](${solanaTxExplorerUrl(analytics.lastPayment.transaction_hash)})` : ""}

**Payment Summary:**
• Total Payments Completed: ${analytics.completedPayments}
• Total Amount Paid: $${analytics.totalPaid.toLocaleString()}
• Pending Payments: ${analytics.pendingPayments}`;
  }
  
  // Average salary
  if (analysis.topics.includes('average') && analysis.topics.includes('salary')) {
    return `📊 **Average Salary Analysis:**

• **Company Average:** $${analytics.avgSalary.toLocaleString()}
• **Salary Range:** $${analytics.salaryRange.min.toLocaleString()} - $${analytics.salaryRange.max.toLocaleString()}
• **Spread:** $${(analytics.salaryRange.max - analytics.salaryRange.min).toLocaleString()}

**Department Averages:**
${Object.entries(analytics.departmentBreakdown)
  .map(([dept, data]) => `• ${dept}: $${data.avgSalary.toLocaleString()} (${data.count} employees)`)
  .join('\n')}`;
  }
  
  return null;
}; 
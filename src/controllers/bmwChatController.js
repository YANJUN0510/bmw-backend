const fetch = require('node-fetch');
const bmwSupabase = require('../config/bmw_supabase');
const { getEmbedding } = require('../lib/embeddings');

const BMW_BASE_SYSTEM_MESSAGE = `You are the AI assistant for Building Material Warehouse (BMW), a supplier of premium architectural building materials.

YOUR PRIMARY GOALS:
- Help users understand products in the BMW Collections.
- Recommend suitable materials/series based on the user's budget, preferences, and use case.
- Analyze any uploaded files (images, documents, PDFs) to understand user needs better.
- Keep answers SHORT and actionable. Prefer bullet points.
- LANGUAGE SUPPORT: If the user speaks Chinese, reply in Chinese. If the user speaks English, reply in English.

WHAT TO ASK (when info is missing):
- Intended application (facade / cladding / battens / interior / exterior / coastal area?)
- Budget range (AUD), project size, and preferred look (modern / minimal / warm / matte / metallic).
- Any constraints (fire rating, corrosion resistance, low maintenance, lead time).

RECOMMENDATION FORMAT (preferred):
- Use natural, conversational language. Do NOT use markdown formatting (no **, no headings with #, no '-' list markers).
- Always add clear line breaks and blank lines between sections so it reads well in a plain-text chat UI.
- For lists, use either numbered items like "1) ... 2) ..." or the bullet "•" (avoid leading '-' or '*').
- When recommending products, write naturally: "I'd recommend the GOODMAN sofa collection (IHS-019)" instead of "**GOODMAN (IHS-019)**".
- Include 2-4 options with product name, code, and why it fits the user's needs.
- DO NOT include image links or markdown image syntax in text (product cards will display images automatically).
- DO NOT include any URLs or links in your text responses. Product links will be handled automatically by the system.
- When mentioning products, simply state the product name and code (e.g., "GOODMAN sofa collection (IHS-019)") without any links.
- Add line breaks between different product recommendations for better readability.
- Keep the tone friendly and helpful, not robotic or overly formatted.
- Example good format:

Here's what I'd recommend for your interior project:

The GOODMAN sofa collection (IHS-019) would be perfect for your space. It's a luxury curved modular design that combines comfort with modern sophistication.

Let me know if you'd like to see other options!

FILE ANALYSIS:
- When users upload files, analyze the content and provide relevant recommendations.
- For images: describe what you see and suggest matching materials.
- For documents: extract key requirements and respond accordingly.

IMPORTANT RULES:
- Do NOT recommend products or include product codes for simple greetings (e.g. "hi", "hello", "你好") or small talk.
- Only recommend products (and include product codes) when the user explicitly asks for recommendations, or when the user provides enough requirements (use case/budget/style) to make a meaningful recommendation.
- If the user hasn't asked for recommendations yet, respond with a short friendly reply and ask 1-3 clarifying questions instead of listing products.
- Do NOT mention Solidoro. Do NOT use Solidoro product knowledge.
- Do NOT invent pricing or availability. If pricing/availability is unclear, advise the user to use the "Contact Us" button to get a quote.
- Use only the BMW product context provided below when referencing specific products/codes.`;

const MAX_CONTEXT_ITEMS = 12;
const MAX_USER_QUERY_LENGTH = 160;

const QUERY_SYNONYMS = [
  {
    pattern: /\bsmart mirror\b|智能镜/gi,
    variants: ['smart mirror', 'intelligent mirror', 'mirror'],
  },
];

function expandQueryVariants(query) {
  if (!query) return [];
  const variants = new Set([query]);
  QUERY_SYNONYMS.forEach(({ pattern, variants: mapped }) => {
    if (pattern.test(query)) {
      mapped.forEach((item) => variants.add(item));
    }
    pattern.lastIndex = 0;
  });
  return Array.from(variants).filter(Boolean);
}

function normalizeAssistantText(text) {
  if (!text) return '';

  let output = String(text).replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Ensure numbered items render on separate lines if the model replied in one paragraph.
  // Example: "... 1. Foo ... 2. Bar ..." -> line breaks between items.
  output = output.replace(/(\S)\s+(?=\d{1,2}\.\s+)/g, '$1\n\n');

  // Strip common markdown markers the UI doesn't render.
  output = output
    .replace(/^#{1,6}\s+/gm, '') // headings
    .replace(/\*\*(.+?)\*\*/g, '$1') // bold
    .replace(/__(.+?)__/g, '$1') // bold (alt)
    .replace(/\*(.+?)\*/g, '$1') // italic
    .replace(/`(.+?)`/g, '$1') // inline code
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '$1 ($2)'); // links

  // Remove localhost URLs from text (both markdown links and plain URLs)
  output = output
    .replace(/\[([^\]]+)\]\(https?:\/\/localhost[^\s)]*\)/gi, '$1') // Remove markdown links with localhost
    .replace(/https?:\/\/localhost[^\s)]*/gi, ''); // Remove plain localhost URLs

  // Clean up extra spaces on each line (but preserve newlines)
  output = output
    .split('\n')
    .map(line => line.replace(/[ \t]+/g, ' ').trim())
    .join('\n');

  // Convert unordered lists to a plain bullet character.
  output = output.replace(/^\s*[-*]\s+/gm, '• ');

  // Clean up excessive blank lines (but preserve intentional double newlines)
  output = output.replace(/\n{3,}/g, '\n\n').trim();

  return output;
}

function buildMaterialLine(material) {
  const parts = [];
  if (material.name) parts.push(material.name);
  if (material.code) parts.push(`(${material.code})`);
  const meta = [material.category, material.series].filter(Boolean).join(' / ');
  if (meta) parts.push(`- ${meta}`);
  const price = material.price ?? null;
  if (price !== null && price !== undefined && price !== '') {
    parts.push(`- Price: ${typeof price === 'number' ? `AUD ${price}` : price}`);
  }
  if (material.description) parts.push(`- ${String(material.description).replace(/\s+/g, ' ').trim()}`);
  
  return parts.join(' ');
}

function extractSearchQuery(messages) {
  const lastUser = [...messages].reverse().find((m) => m && m.role === 'user' && typeof m.content === 'string');
  const raw = (lastUser?.content || '').trim();
  return raw.slice(0, MAX_USER_QUERY_LENGTH);
}

function sanitizeForPostgrestLike(query) {
  if (!query) return '';
  try {
    return query
      .replace(/[^\p{L}\p{N}\s_-]+/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  } catch {
    return query
      .replace(/[\r\n,()]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
}

function extractCodeCandidate(query) {
  const match = query.match(/\b[A-Za-z]{1,6}[-_ ]?\d{2,6}\b/);
  return match ? match[0].replace(/[-_ ]/g, '').toUpperCase() : null;
}

async function fetchSemanticMaterialsForContext(query) {
  try {
    const embedding = await getEmbedding(query);
    if (!embedding) return [];

    const { data, error } = await bmwSupabase.rpc('match_building_materials', {
      query_embedding: embedding,
      match_count: MAX_CONTEXT_ITEMS,
    });

    if (error) {
      console.warn('[bmwChat] Semantic search failed:', error.message || error);
      return [];
    }

    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.warn('[bmwChat] Semantic search exception:', error);
    return [];
  }
}

async function fetchTopMaterialsForContext(query) {
  try {
    const codeCandidate = extractCodeCandidate(query);
    const buildBaseQuery = () =>
      bmwSupabase
        .from('building_material')
        .select('name, code, category, series, description, price, image, gallery, specs')
        .order('created_at', { ascending: false })
        .limit(MAX_CONTEXT_ITEMS);

    let { data, error } = { data: null, error: null };

    if (codeCandidate) {
      ({ data, error } = await buildBaseQuery().eq('code', codeCandidate));
    } else {
      const variants = expandQueryVariants(query);
      for (const variant of variants) {
        const sanitized = sanitizeForPostgrestLike(variant);
        if (!sanitized || sanitized.length < 2) {
          continue;
        }
        const escaped = sanitized.replace(/%/g, '\\%').replace(/_/g, '\\_');
        const pattern = `%${escaped}%`;
        ({ data, error } = await buildBaseQuery().or(
          [
            `name.ilike.${pattern}`,
            `code.ilike.${pattern}`,
            `category.ilike.${pattern}`,
            `series.ilike.${pattern}`,
            `description.ilike.${pattern}`,
          ].join(',')
        ));
        if (!error && Array.isArray(data) && data.length > 0) {
          break;
        }
      }
      if (!data) {
        ({ data, error } = await buildBaseQuery());
      }
    }

    if (error) {
      console.error('[bmwChat] Error fetching building_material context:', error);
      return [];
    }

    const rows = Array.isArray(data) ? data : [];
    if (rows.length > 0) {
      console.log('[bmwChat] Found', rows.length, 'materials from search query');
      return rows;
    }

    // Fallback: if the query is generic (or matches nothing), still provide some real items.
    // Create a NEW query builder instead of reusing the modified 'base' object
    console.log('[bmwChat] No matches found, using fallback query to fetch top materials');
    const { data: fallbackData, error: fallbackError } = await bmwSupabase
      .from('building_material')
      .select('name, code, category, series, description, price, image, gallery, specs')
      .order('created_at', { ascending: false })
      .limit(MAX_CONTEXT_ITEMS);
    if (fallbackError) {
      console.error('[bmwChat] Error fetching fallback building_material context:', fallbackError);
      // Return some sample data if database is empty or has errors
      return [
        {
          code: 'SM001',
          name: 'Steel Metal Panel',
          category: 'Cladding',
          series: 'Modern',
          description: 'High-quality steel metal panel for exterior cladding',
          price: 'AUD 150/sqm',
          image: 'https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=300&h=200&fit=crop&crop=center',
          gallery: []
        },
        {
          code: 'AL002', 
          name: 'Aluminum Composite Panel',
          category: 'Facade',
          series: 'Contemporary',
          description: 'Lightweight aluminum composite panel for modern facades',
          price: 'AUD 120/sqm',
          image: 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=300&h=200&fit=crop&crop=center',
          gallery: []
        }
      ];
    }
    const fallbackRows = Array.isArray(fallbackData) ? fallbackData : [];
    console.log('[bmwChat] Fallback query returned', fallbackRows.length, 'materials');
    return fallbackRows;
  } catch (err) {
    console.error('[bmwChat] Exception while building context:', err);
    return [];
  }
}

// Function to enhance AI response with structured product data
async function enhanceProductRecommendations(aiMessage, availableMaterials) {
  const products = [];
  // Only use FRONTEND_URL if it's a production URL (not localhost)
  const frontendUrl = process.env.FRONTEND_URL;
  const baseUrl = frontendUrl && !frontendUrl.includes('localhost') 
    ? frontendUrl 
    : null; // Don't generate links if using localhost
  
  console.log('Enhancing recommendations for AI message:', aiMessage.substring(0, 100) + '...');
  console.log('Available materials count:', availableMaterials.length);
  console.log('Frontend URL:', baseUrl || 'Not set (localhost filtered out)');
  
  // Look for product codes mentioned in the AI message
  availableMaterials.forEach(material => {
    if (material.code && aiMessage.toLowerCase().includes(material.code.toLowerCase())) {
      console.log('Found matching product by code:', material.code, material.name);
      products.push({
        code: material.code,
        name: material.name,
        category: material.category,
        series: material.series,
        description: material.description,
        price: material.price,
        imageUrl: material.image,
        galleryUrls: material.gallery || [],
        detailUrl: baseUrl ? `${baseUrl}/collections?product=${material.code}` : null,
        specs: material.specs
      });
    }
  });
  
  // Also look for product names mentioned in the AI message
  if (products.length === 0) {
    availableMaterials.forEach(material => {
      if (material.name && aiMessage.toLowerCase().includes(material.name.toLowerCase())) {
        console.log('Found matching product by name:', material.name);
        products.push({
          code: material.code,
          name: material.name,
          category: material.category,
          series: material.series,
          description: material.description,
          price: material.price,
          imageUrl: material.image,
          galleryUrls: material.gallery || [],
          detailUrl: baseUrl ? `${baseUrl}/collections?product=${material.code}` : null,
          specs: material.specs
        });
      }
    });
  }
  
  // Remove duplicates
  const uniqueProducts = products.filter((product, index, self) => 
    index === self.findIndex(p => p.code === product.code)
  );
  
  console.log('Final products to return:', uniqueProducts.length, uniqueProducts.map(p => p.code));
  
  return {
    text: aiMessage,
    products: uniqueProducts
  };
}

exports.handleBmwChat = async (req, res) => {
  try {
    const { messages } = req.body || {};
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      console.error('OPENAI_API_KEY is not set');
      return res.status(500).json({ status: 'error', message: 'AI service configuration error' });
    }

    if (!Array.isArray(messages)) {
      return res.status(400).json({ status: 'error', message: 'Invalid payload: messages must be an array' });
    }

    const query = extractSearchQuery(messages);
    const semanticMaterials = await fetchSemanticMaterialsForContext(query);
    const materials = semanticMaterials.length > 0
      ? semanticMaterials
      : await fetchTopMaterialsForContext(query);

    console.log('=== DEBUG: Database query results ===');
    console.log('Query:', query);
    console.log('Materials found:', materials.length);
    if (materials.length > 0) {
      console.log('Sample material:', JSON.stringify(materials[0], null, 2));
    }

    const contextLines = materials.length > 0 ? materials.map(buildMaterialLine).join('\n') : 'No relevant products found.';

    // Process messages and include file content
    const processedMessages = messages.map(msg => {
      let content = msg.content;
      
      // Add file content to message if attachments exist
      if (msg.attachments && msg.attachments.length > 0) {
        const fileInfo = msg.attachments.map(file => 
          `[Uploaded file: ${file.name} (${file.type})]\n${file.content}`
        ).join('\n\n');
        content = `${content}\n\n${fileInfo}`;
      }
      
      return {
        role: msg.role,
        content: content
      };
    });

    const systemContent = `${BMW_BASE_SYSTEM_MESSAGE}\n\nBMW COLLECTIONS (TOP ${MAX_CONTEXT_ITEMS} MATCHES):\n${contextLines}`;
    
    // If no materials found, add a note
    const finalSystemContent = materials.length === 0 ? 
      systemContent + '\n\nNote: Database appears to be empty. Please recommend general building materials and mention that specific product information can be provided through the "Contact Us" option.' :
      systemContent;

    const fullSystemMessage = {
      role: 'system',
      content: finalSystemContent,
    };

    const apiMessages = [fullSystemMessage, ...processedMessages];

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: apiMessages,
        temperature: 0.5,
        max_tokens: 1200,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API Error Response:', response.status, errorText);
      throw new Error(`OpenAI API Error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    if (data.error) {
      console.error('OpenAI API Error:', data.error);
      throw new Error(data.error.message);
    }

    const aiMessage = data.choices?.[0]?.message?.content || '';
    const normalizedAiMessage = normalizeAssistantText(aiMessage);
    
    // Try to find product recommendations in the message and enhance them
    const enhancedMessage = await enhanceProductRecommendations(aiMessage, materials);

    console.log('Final response - message length:', enhancedMessage.text.length);
    console.log('Final response - products count:', enhancedMessage.products.length);

    return res.json({
      status: 'success',
      message: normalizedAiMessage || enhancedMessage.text,
      products: enhancedMessage.products || []
    });
  } catch (error) {
    console.error('Error calling OpenAI (BMW):', error);
    return res.status(500).json({
      status: 'error',
      message:
        error.message ||
        "I apologize, but I'm having trouble connecting right now. Please try again later.",
    });
  }
};

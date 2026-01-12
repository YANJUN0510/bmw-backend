const fetch = require('node-fetch');
const bmwSupabase = require('../config/bmw_supabase');

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
- Use natural, conversational language. Avoid excessive markdown symbols like ** or -- which look artificial.
- Structure your response with proper line breaks and spacing for easy reading.
- When recommending products, write naturally: "I'd recommend the GOODMAN sofa collection (IHS-019)" instead of "**GOODMAN (IHS-019)**".
- Include 2-4 options with product name, code, and why it fits the user's needs.
- DO NOT include image links or markdown image syntax in text (product cards will display images automatically).
- For clickable product links, format as: "Check out the [GOODMAN Sofa Collection](http://localhost:5173/collections?product=IHS-019)" using product name + series/collection.
- Generate product links using this pattern: [ProductName SeriesName Collection](http://localhost:5173/collections?product=PRODUCT_CODE)
- Add line breaks between different product recommendations for better readability.
- Keep the tone friendly and helpful, not robotic or overly formatted.
- Example good format:

Here's what I'd recommend for your interior project:

The GOODMAN sofa collection (IHS-019) would be perfect for your space. It's a luxury curved modular design that combines comfort with modern sophistication.

You can explore more details in the [GOODMAN Sofa Collection](http://localhost:5173/collections?product=IHS-019).

Let me know if you'd like to see other options!

FILE ANALYSIS:
- When users upload files, analyze the content and provide relevant recommendations.
- For images: describe what you see and suggest matching materials.
- For documents: extract key requirements and respond accordingly.

IMPORTANT RULES:
- Do NOT mention Solidoro. Do NOT use Solidoro product knowledge.
- Do NOT invent pricing or availability. If pricing/availability is unclear, advise the user to use the "Contact Us" button to get a quote.
- Use only the BMW product context provided below when referencing specific products/codes.`;

const MAX_CONTEXT_ITEMS = 5;
const MAX_USER_QUERY_LENGTH = 160;

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

async function fetchTopMaterialsForContext(query) {
  try {
    const codeCandidate = extractCodeCandidate(query);

    const base = bmwSupabase
      .from('building_material')
      .select('name, code, category, series, description, price, image, gallery, specs')
      .order('created_at', { ascending: false })
      .limit(MAX_CONTEXT_ITEMS);

    let { data, error } = { data: null, error: null };

    if (codeCandidate) {
      ({ data, error } = await base.eq('code', codeCandidate));
    } else {
      const sanitized = sanitizeForPostgrestLike(query);
      if (sanitized && sanitized.length >= 2) {
        const escaped = sanitized.replace(/%/g, '\\%').replace(/_/g, '\\_');
        const pattern = `%${escaped}%`;
        ({ data, error } = await base.or(
          [
            `name.ilike.${pattern}`,
            `code.ilike.${pattern}`,
            `category.ilike.${pattern}`,
            `series.ilike.${pattern}`,
            `description.ilike.${pattern}`,
          ].join(',')
        ));
      } else {
        ({ data, error } = await base);
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
  const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  
  console.log('Enhancing recommendations for AI message:', aiMessage.substring(0, 100) + '...');
  console.log('Available materials count:', availableMaterials.length);
  
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
        detailUrl: `${baseUrl}/collections?product=${material.code}`,
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
          detailUrl: `${baseUrl}/collections?product=${material.code}`,
          specs: material.specs
        });
      }
    });
  }
  
  // If no products found by name/code match, always provide some available products
  if (products.length === 0 && availableMaterials.length > 0) {
    console.log('No direct matches found, adding available products for recommendation');
    // Add first few available products as general recommendations
    const recommendedProducts = availableMaterials.slice(0, Math.min(3, availableMaterials.length)).map(material => ({
      code: material.code,
      name: material.name,
      category: material.category,
      series: material.series,
      description: material.description,
      price: material.price,
      imageUrl: material.image,
      galleryUrls: material.gallery || [],
      detailUrl: `${baseUrl}/collections?product=${material.code}`,
      specs: material.specs
    }));
    products.push(...recommendedProducts);
    console.log('Added general recommendations:', recommendedProducts.map(p => p.code));
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
    const materials = await fetchTopMaterialsForContext(query);

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
    
    // Try to find product recommendations in the message and enhance them
    const enhancedMessage = await enhanceProductRecommendations(aiMessage, materials);

    console.log('Final response - message length:', enhancedMessage.text.length);
    console.log('Final response - products count:', enhancedMessage.products.length);

    return res.json({
      status: 'success',
      message: enhancedMessage.text,
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

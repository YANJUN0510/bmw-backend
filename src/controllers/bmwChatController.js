const fetch = require('node-fetch');
const bmwSupabase = require('../config/bmw_supabase');

const BMW_BASE_SYSTEM_MESSAGE = `You are the AI assistant for Building Material Warehouse (BMW), a supplier of premium architectural building materials.

YOUR PRIMARY GOALS:
- Help users understand products in the BMW Collections.
- Recommend suitable materials/series based on the user's budget, preferences, and use case.
- Keep answers SHORT and actionable. Prefer bullet points.
- LANGUAGE SUPPORT: If the user speaks Chinese, reply in Chinese. If the user speaks English, reply in English.

WHAT TO ASK (when info is missing):
- Intended application (facade / cladding / battens / interior / exterior / coastal area?)
- Budget range (AUD), project size, and preferred look (modern / minimal / warm / matte / metallic).
- Any constraints (fire rating, corrosion resistance, low maintenance, lead time).

RECOMMENDATION FORMAT (preferred):
- 2–4 options with: series/name, code(s) if relevant, why it fits, and a simple next step.

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
      .select('name, code, category, series, description, price')
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
    if (rows.length > 0) return rows;

    // Fallback: if the query is generic (or matches nothing), still provide some real items.
    const { data: fallbackData, error: fallbackError } = await base;
    if (fallbackError) {
      console.error('[bmwChat] Error fetching fallback building_material context:', fallbackError);
      return [];
    }
    return Array.isArray(fallbackData) ? fallbackData : [];
  } catch (err) {
    console.error('[bmwChat] Exception while building context:', err);
    return [];
  }
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

    const contextLines = materials.length > 0 ? materials.map(buildMaterialLine).join('\n') : 'No relevant products found.';

    const fullSystemMessage = {
      role: 'system',
      content: `${BMW_BASE_SYSTEM_MESSAGE}\n\nBMW COLLECTIONS (TOP ${MAX_CONTEXT_ITEMS} MATCHES):\n${contextLines}`,
    };

    const apiMessages = [fullSystemMessage, ...messages];

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

    return res.json({
      status: 'success',
      message: data.choices?.[0]?.message?.content || '',
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

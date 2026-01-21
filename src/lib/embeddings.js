const fetch = require('node-fetch');

const DEFAULT_MODEL = 'text-embedding-3-small';
const DEFAULT_DIMENSIONS = 1536;

function buildMaterialSearchText(material = {}) {
  const parts = [
    material.name,
    material.code,
    material.category,
    material.series,
    material.description,
  ]
    .map((value) => (value ? String(value).trim() : ''))
    .filter(Boolean);

  return parts.join('\n');
}

async function getEmbedding(text) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || !text) {
    return null;
  }

  const model = process.env.OPENAI_EMBEDDING_MODEL || DEFAULT_MODEL;

  try {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        input: text,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[embeddings] OpenAI error:', response.status, errorText);
      return null;
    }

    const data = await response.json();
    const embedding = data?.data?.[0]?.embedding;
    if (!Array.isArray(embedding) || embedding.length === 0) {
      return null;
    }

    return embedding;
  } catch (error) {
    console.error('[embeddings] Failed to generate embedding:', error);
    return null;
  }
}

module.exports = {
  DEFAULT_DIMENSIONS,
  DEFAULT_MODEL,
  buildMaterialSearchText,
  getEmbedding,
};

// 回填历史数据 embedding
// 在本地运行：
// cd bmw-backend
// node scripts/backfill-embeddings.js
// 确保本地环境里有：
// BMW_SUPABASE_URL
// BMW_SUPABASE_SERVICE_ROLE_KEY
// OPENAI_API_KEY
// 如果需要强制重算所有 embedding：
// EMBEDDING_FORCE=true 
// node scripts/backfill-embeddings.js


require('dotenv').config();
const supabase = require('../src/config/bmw_supabase');
const { buildMaterialSearchText, getEmbedding } = require('../src/lib/embeddings');

const BATCH_SIZE = 50;
const SLEEP_MS = 120;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function backfillEmbeddings() {
  let offset = 0;
  let processed = 0;
  const force = process.env.EMBEDDING_FORCE === 'true';

  while (true) {
    const { data, error } = await supabase
      .from('building_material')
      .select('code, name, category, series, description, embedding')
      .order('created_at', { ascending: false })
      .range(offset, offset + BATCH_SIZE - 1);

    if (error) {
      console.error('Failed to load materials:', error);
      break;
    }

    if (!data || data.length === 0) {
      break;
    }

    for (const row of data) {
      if (!force && row.embedding) {
        processed += 1;
        continue;
      }

      const searchText = buildMaterialSearchText(row);
      const embedding = await getEmbedding(searchText);
      if (!embedding) {
        console.warn(`Skipping ${row.code}: embedding generation failed.`);
        processed += 1;
        continue;
      }

      const { error: updateError } = await supabase
        .from('building_material')
        .update({ embedding })
        .eq('code', row.code);

      if (updateError) {
        console.error(`Failed to update embedding for ${row.code}:`, updateError);
      } else {
        console.log(`Updated embedding: ${row.code}`);
      }

      processed += 1;
      await sleep(SLEEP_MS);
    }

    offset += BATCH_SIZE;
  }

  console.log(`Backfill complete. Processed ${processed} rows.`);
}

backfillEmbeddings()
  .catch((error) => {
    console.error('Backfill failed:', error);
    process.exitCode = 1;
  });

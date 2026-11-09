import KnowledgeDoc from '../models/KnowledgeDoc.js';

// Keyword (text-index) retrieval. To upgrade to vector RAG, store embeddings on
// KnowledgeDoc and swap this for MongoDB Atlas Vector Search.
export async function searchKnowledge(query, limit = 3) {
  try {
    return await KnowledgeDoc.find(
      { $text: { $search: query } },
      { score: { $meta: 'textScore' }, title: 1, content: 1 }
    )
      .sort({ score: { $meta: 'textScore' } })
      .limit(limit)
      .lean();
  } catch {
    return [];
  }
}

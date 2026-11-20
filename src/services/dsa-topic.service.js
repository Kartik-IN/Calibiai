import { supabasePublic } from '../config/supabase-public.js';

const MAX_LIMIT = 100;
const TOPIC_FIELDS = 'name, slug, description';
const TOPIC_FIELDS_WITH_ID = 'id, name, slug, description';
const PROBLEM_FIELDS = 'title, slug, description, difficulty, leetcode_url';

const pagination = (page, limit, total) => ({
  page,
  limit,
  total,
  totalPages: total > 0 ? Math.ceil(total / limit) : 0,
});

export const getTopics = async ({ page = 1, limit = 20 } = {}, client = supabasePublic) => {
  if (!client) {
    return { success: false, message: 'Public database access is not configured' };
  }

  const { data, count, error } = await client
    .from('dsa_topics')
    .select(TOPIC_FIELDS, { count: 'exact' })
    .order('name', { ascending: true })
    .order('id', { ascending: true })
    .range((page - 1) * limit, page * limit - 1);

  if (error) {
    return { success: false, message: 'Unable to retrieve DSA topics' };
  }

  const total = count ?? 0;
  return {
    success: true,
    data: {
      topics: data ?? [],
      pagination: pagination(page, limit, total),
    },
  };
};

export const getTopicProblems = async (
  { slug, page = 1, limit = 20 },
  client = supabasePublic,
) => {
  if (!client) {
    return { success: false, message: 'Public database access is not configured' };
  }

  const topicResult = await client
    .from('dsa_topics')
    .select(TOPIC_FIELDS_WITH_ID)
    .eq('slug', slug)
    .maybeSingle();

  if (topicResult.error) {
    return { success: false, message: 'Unable to retrieve DSA topic' };
  }

  if (!topicResult.data) {
    return { success: false, notFound: true, message: 'DSA topic not found' };
  }

  const relationshipResult = await client
    .from('problem_topics')
    .select('problem_id')
    .eq('topic_id', topicResult.data.id);

  if (relationshipResult.error) {
    return { success: false, message: 'Unable to retrieve topic problems' };
  }

  const problemIds = (relationshipResult.data ?? []).map(row => row.problem_id);
  const topic = {
    name: topicResult.data.name,
    slug: topicResult.data.slug,
    description: topicResult.data.description,
  };

  if (problemIds.length === 0) {
    return {
      success: true,
      data: {
        topic,
        problems: [],
        pagination: pagination(page, limit, 0),
      },
    };
  }

  const problemResult = await client
    .from('dsa_problems')
    .select(PROBLEM_FIELDS, { count: 'exact' })
    .eq('is_published', true)
    .in('id', problemIds)
    .order('sort_order', { ascending: true })
    .order('id', { ascending: true })
    .range((page - 1) * limit, page * limit - 1);

  if (problemResult.error) {
    return { success: false, message: 'Unable to retrieve topic problems' };
  }

  const total = problemResult.count ?? 0;
  return {
    success: true,
    data: {
      topic,
      problems: problemResult.data ?? [],
      pagination: pagination(page, limit, total),
    },
  };
};

export { MAX_LIMIT, PROBLEM_FIELDS, TOPIC_FIELDS };

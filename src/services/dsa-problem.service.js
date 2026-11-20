import { supabasePublic, supabasePublicConfig } from '../config/supabase-public.js';

const MAX_LIMIT = 100;

export const getPublishedProblems = async ({ page = 1, limit = 20, difficulty } = {}, client = supabasePublic) => {
  if (!client) {
    return {
      success: false,
      message: 'Public database access is not configured',
    };
  }

  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = client
    .from('dsa_problems')
    .select('title, slug, description, difficulty, leetcode_url', { count: 'exact' })
    .eq('is_published', true)
    .order('sort_order', { ascending: true })
    .order('id', { ascending: true })
    .range(from, to);

  if (difficulty) {
    query = query.eq('difficulty', difficulty);
  }

  const { data, count, error } = await query;

  if (error) {
    return {
      success: false,
      message: 'Unable to retrieve DSA problems',
    };
  }

  const total = count ?? 0;

  return {
    success: true,
    data: {
      problems: data ?? [],
      pagination: {
        page,
        limit,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / limit),
      },
    },
  };
};

export { MAX_LIMIT };

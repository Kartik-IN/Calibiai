const PROBLEM_FIELDS = 'id, title, slug, difficulty';
const PROGRESS_FIELDS = 'status, created_at, updated_at';
const ALLOWED_STATUSES = new Set(['Attempted', 'Completed']);

const safeError = (message) => ({ success: false, message });

export const getStudentProgress = async (userId, client) => {
  if (!client) return safeError('Authenticated database access is not configured');

  const { data, error } = await client
    .from('user_problem_progress')
    .select(`${PROGRESS_FIELDS}, dsa_problems!inner(title, slug, difficulty)`)
    .eq('user_id', userId)
    .eq('dsa_problems.is_published', true)
    .order('updated_at', { ascending: false })
    .order('problem_id', { ascending: true });

  if (error) return safeError('Unable to retrieve student progress');

  return {
    success: true,
    data: {
      progress: (data ?? []).map(row => ({
        problem: row.dsa_problems,
        status: row.status,
        created_at: row.created_at,
        updated_at: row.updated_at,
      })),
    },
  };
};

const resolvePublishedProblem = async (slug, client) => {
  const result = await client
    .from('dsa_problems')
    .select(PROBLEM_FIELDS)
    .eq('slug', slug)
    .eq('is_published', true)
    .maybeSingle();

  if (result.error) return { error: safeError('Unable to retrieve DSA problem') };
  if (!result.data) return { notFound: true };
  return { problem: result.data };
};

export const getStudentProblemProgress = async (userId, slug, client) => {
  if (!client) return safeError('Authenticated database access is not configured');

  const resolved = await resolvePublishedProblem(slug, client);
  if (resolved.error) return resolved.error;
  if (resolved.notFound) return { success: false, notFound: true, message: 'DSA problem not found' };

  const result = await client
    .from('user_problem_progress')
    .select(PROGRESS_FIELDS)
    .eq('user_id', userId)
    .eq('problem_id', resolved.problem.id)
    .maybeSingle();

  if (result.error) return safeError('Unable to retrieve problem progress');

  return {
    success: true,
    data: {
      problem: {
        title: resolved.problem.title,
        slug: resolved.problem.slug,
        difficulty: resolved.problem.difficulty,
      },
      progress: result.data ?? { status: 'Not Started' },
    },
  };
};

export const upsertStudentProblemProgress = async (userId, slug, status, client) => {
  if (!client) return safeError('Authenticated database access is not configured');
  if (!ALLOWED_STATUSES.has(status)) {
    return { success: false, invalidStatus: true, message: 'Status must be Attempted or Completed' };
  }

  const resolved = await resolvePublishedProblem(slug, client);
  if (resolved.error) return resolved.error;
  if (resolved.notFound) return { success: false, notFound: true, message: 'DSA problem not found' };

  const result = await client
    .from('user_problem_progress')
    .upsert({ user_id: userId, problem_id: resolved.problem.id, status }, { onConflict: 'user_id,problem_id' })
    .select(PROGRESS_FIELDS)
    .single();

  if (result.error) return safeError('Unable to update problem progress');

  return {
    success: true,
    data: {
      problem: {
        title: resolved.problem.title,
        slug: resolved.problem.slug,
        difficulty: resolved.problem.difficulty,
      },
      progress: result.data,
    },
  };
};

export { ALLOWED_STATUSES, PROBLEM_FIELDS, PROGRESS_FIELDS };

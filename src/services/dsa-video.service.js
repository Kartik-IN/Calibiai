import { supabasePublic } from '../config/supabase-public.js';

const PROBLEM_FIELDS = 'id, title, slug';
const VIDEO_FIELDS = 'video_id, title, language, channel_name, sort_order';

export const getProblemVideos = async (slug, client = supabasePublic) => {
  if (!client) {
    return { success: false, message: 'Public database access is not configured' };
  }

  const problemResult = await client
    .from('dsa_problems')
    .select(PROBLEM_FIELDS)
    .eq('slug', slug)
    .eq('is_published', true)
    .maybeSingle();

  if (problemResult.error) {
    return { success: false, message: 'Unable to retrieve DSA problem' };
  }

  if (!problemResult.data) {
    return { success: false, notFound: true, message: 'DSA problem not found' };
  }

  const videoResult = await client
    .from('problem_videos')
    .select(VIDEO_FIELDS)
    .eq('problem_id', problemResult.data.id)
    .order('sort_order', { ascending: true })
    .order('id', { ascending: true });

  if (videoResult.error) {
    return { success: false, message: 'Unable to retrieve problem videos' };
  }

  return {
    success: true,
    data: {
      problem: {
        title: problemResult.data.title,
        slug: problemResult.data.slug,
      },
      videos: videoResult.data ?? [],
    },
  };
};

export { PROBLEM_FIELDS, VIDEO_FIELDS };

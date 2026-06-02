import { supabase } from '../lib/supabase';

const BASE_FIELDS = [
  'id',
  'name',
  'slug',
  'category',
  'subcategory',
  'address',
  'city_name',
  'latitude',
  'longitude',
  'rating',
  'owner_id',
  'is_verified',
  'is_claimed',
  'is_visible',
  'is_premium',
  'status',
  'source_type',
  'updated_at',
  'opening_hours',
  'has_job_openings'
].join(', ');

export const getNativeBusinessesInBounds = async ({
  south,
  west,
  north,
  east,
  category = null,
  subcategory = null,
  limit = 150
}) => {
  try {
    let query = supabase
      .from('businesses')
      .select(BASE_FIELDS)
      .eq('status', 'approved')
      .eq('is_visible', true)
      .gte('latitude', south)
      .lte('latitude', north)
      .gte('longitude', west)
      .lte('longitude', east)
      .order('is_verified', { ascending: false })
      .order('is_premium', { ascending: false })
      .order('updated_at', { ascending: false })
      .limit(limit);

    if (category) {
      query = query.eq('category', category);
    }

    if (subcategory) {
      query = query.eq('subcategory', subcategory);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching native businesses in bounds:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Exception fetching native businesses in bounds:', error);
    return [];
  }
};


import { supabase } from '../lib/supabase';

const cleanText = (value) => String(value || '').trim();

export const buildCommercialSpaceSlug = (title) => {
  const base = cleanText(title)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 72) || 'espacio-comercial';
  return `${base}-${crypto.randomUUID().slice(0, 8)}`;
};

export async function searchCommercialSpaces(filters = {}) {
  const { data, error } = await supabase.rpc('search_commercial_spaces', {
    p_query: cleanText(filters.query) || null,
    p_space_type: filters.spaceType || null,
    p_city: cleanText(filters.city) || null,
    p_max_monthly_rent: filters.maxMonthlyRent ? Number(filters.maxMonthlyRent) : null,
    p_user_lat: Number.isFinite(filters.latitude) ? filters.latitude : null,
    p_user_lng: Number.isFinite(filters.longitude) ? filters.longitude : null,
    p_limit: Math.min(Math.max(Number(filters.limit) || 24, 1), 50),
    p_offset: Math.max(Number(filters.offset) || 0, 0)
  });
  if (error) throw error;
  return data || [];
}

export async function getCommercialSpace(slug) {
  const { data, error } = await supabase.rpc('get_commercial_space', { p_slug: slug });
  if (error) throw error;
  return data?.[0] || null;
}

export async function createCommercialSpace(form, user) {
  if (!user?.id) throw new Error('Debes iniciar sesión para publicar un espacio.');

  const payload = {
    owner_id: user.id,
    slug: buildCommercialSpaceSlug(form.title),
    title: cleanText(form.title),
    description: cleanText(form.description),
    space_type: form.spaceType,
    status: form.submitForReview ? 'pending_review' : 'draft',
    public_location: cleanText(form.publicLocation),
    address_private: cleanText(form.addressPrivate),
    city: cleanText(form.city),
    state_region: cleanText(form.stateRegion) || null,
    country_code: cleanText(form.countryCode || 'MX').toUpperCase(),
    postal_code: cleanText(form.postalCode) || null,
    latitude: Number(form.latitude),
    longitude: Number(form.longitude),
    area_sqm: Number(form.areaSqm),
    monthly_rent: form.monthlyRent ? Number(form.monthlyRent) : null,
    currency: cleanText(form.currency || 'MXN').toUpperCase(),
    available_from: form.availableFrom || null,
    parking_spaces: Number(form.parkingSpaces) || 0,
    amenities: form.amenities || [],
    permitted_uses: cleanText(form.permittedUses)
      .split(',').map((item) => item.trim()).filter(Boolean).slice(0, 20),
    restrictions: cleanText(form.restrictions) || null,
    contact_name: cleanText(form.contactName),
    contact_email: cleanText(form.contactEmail || user.email),
    contact_phone: cleanText(form.contactPhone) || null,
    cover_image_url: cleanText(form.coverImageUrl) || null
  };

  const { data, error } = await supabase
    .from('commercial_spaces')
    .insert(payload)
    .select('id, slug, status')
    .single();
  if (error) throw error;
  return data;
}

export async function listMyCommercialSpaces(userId) {
  const { data, error } = await supabase
    .from('commercial_spaces')
    .select('id, slug, title, space_type, status, public_location, city, monthly_rent, currency, updated_at')
    .eq('owner_id', userId)
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function createCommercialSpaceInquiry(spaceId, user, values) {
  if (!user?.id) throw new Error('Debes iniciar sesión para contactar al anunciante.');
  const { data, error } = await supabase
    .from('commercial_space_inquiries')
    .insert({
      space_id: spaceId,
      requester_id: user.id,
      inquiry_type: values.inquiryType || 'information',
      message: cleanText(values.message),
      desired_start_date: values.desiredStartDate || null,
      budget_amount: values.budgetAmount ? Number(values.budgetAmount) : null,
      currency: cleanText(values.currency || 'MXN').toUpperCase()
    })
    .select('id, status, created_at')
    .single();
  if (error) throw error;
  return data;
}

export async function listIncomingCommercialSpaceInquiries(ownerId) {
  const { data, error } = await supabase
    .from('commercial_space_inquiries')
    .select('id, space_id, requester_email, requester_name, inquiry_type, message, desired_start_date, budget_amount, currency, status, created_at, commercial_spaces!inner(title, owner_id)')
    .eq('commercial_spaces.owner_id', ownerId)
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) throw error;
  return data || [];
}

export async function updateCommercialSpaceInquiryStatus(inquiryId, status) {
  const allowed = ['new', 'contacted', 'visit_scheduled', 'closed', 'spam'];
  if (!allowed.includes(status)) throw new Error('Estado de solicitud inválido.');
  const { data, error } = await supabase
    .from('commercial_space_inquiries')
    .update({ status })
    .eq('id', inquiryId)
    .select('id, status')
    .single();
  if (error) throw error;
  return data;
}

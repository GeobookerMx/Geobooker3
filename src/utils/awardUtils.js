const normalizeText = (value = '') =>
  String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const toArray = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === 'string') {
    return value
      .split(/[|,]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
};

const hasAnyToken = (tokens, candidates) =>
  candidates.some((candidate) => tokens.includes(normalizeText(candidate)));

export const getAwardMeta = (business = {}) => {
  const tags = [
    ...toArray(business.tags),
    ...toArray(business.active_badges),
    ...toArray(business.aliases),
    ...toArray(business.search_aliases),
    ...toArray(business.related_terms),
  ].map(normalizeText);

  const awardSource = normalizeText(business.award_source || business.award_name || '');
  const awardName = normalizeText(business.award_name || '');
  const cuisine = normalizeText(business.cuisine_or_service || business.subcategory || business.category || '');
  const businessType = normalizeText(business.business_type || business.category || '');
  const explicitStars = Number(
    business.award_level ??
    business.current_award_level ??
    business.michelin_stars ??
    business.stars ??
    0
  );

  const isMichelin =
    awardSource.includes('michelin') ||
    awardName.includes('michelin') ||
    hasAnyToken(tags, ['michelin', 'michelin_star', 'michelin_guide', 'estrella michelin']);

  const hasGreenAward =
    Boolean(business.green_award) ||
    hasAnyToken(tags, ['green_star', 'estrella_verde', 'michelin_green_star', 'sustainable']) ||
    awardName.includes('verde');

  const hasTastingMenu =
    Boolean(business.has_tasting_menu) ||
    hasAnyToken(tags, ['tasting_menu', 'chef_table', 'degustacion', 'menu degustacion']) ||
    cuisine.includes('tasting') ||
    cuisine.includes('degustacion');

  const isFineDining =
    isMichelin ||
    Boolean(business.is_fine_dining) ||
    hasAnyToken(tags, ['fine_dining', 'alta_cocina', 'chef_table']) ||
    cuisine.includes('fine dining') ||
    cuisine.includes('alta cocina') ||
    businessType.includes('fine dining');

  const isAwarded =
    isMichelin ||
    hasGreenAward ||
    Boolean(business.award_name) ||
    Boolean(business.award_source) ||
    hasAnyToken(tags, ['award', 'awarded', 'premiado', 'award_winner']);

  if (!isAwarded) {
    return null;
  }

  const awardYear = business.current_award_year || business.award_year || business.first_awarded_year || null;
  const verificationDate = business.last_verified_at || business.updated_at || null;
  const verificationStatus = business.verification_status || 'pending';
  const awardLevel = explicitStars > 0 ? explicitStars : (isMichelin ? 1 : 0);

  let recognitionLabel = 'Restaurante premiado';
  let shortLabel = 'Premiado';
  let pinType = 'gold_star';

  if (isMichelin && awardLevel >= 2) {
    recognitionLabel = `${awardLevel} Estrellas MICHELIN${awardYear ? ` ${awardYear}` : ''}`;
    shortLabel = `${awardLevel} estrellas`;
    pinType = 'gold_double_star';
  } else if (isMichelin) {
    recognitionLabel = `1 Estrella MICHELIN${awardYear ? ` ${awardYear}` : ''}`;
    shortLabel = 'Michelin';
    pinType = hasGreenAward ? 'gold_star_green_leaf' : 'gold_star';
  }

  if (!isMichelin && hasGreenAward) {
    recognitionLabel = `Estrella Verde${awardYear ? ` ${awardYear}` : ''}`;
    shortLabel = 'Verde';
    pinType = 'gold_star_green_leaf';
  }

  return {
    isAwarded,
    isMichelin,
    hasGreenAward,
    isFineDining,
    hasTastingMenu,
    awardYear,
    awardLevel,
    recognitionLabel,
    shortLabel,
    pinType,
    sourceLabel: business.award_source || (isMichelin ? 'MICHELIN Guide' : 'Geobooker Awards'),
    sourceUrl: business.source_url || null,
    verificationDate,
    verificationStatus,
    filterTags: [
      'awarded',
      ...(isMichelin ? ['michelin'] : []),
      ...(hasGreenAward ? ['green'] : []),
      ...(isFineDining ? ['fine_dining'] : []),
      ...(hasTastingMenu ? ['tasting_menu'] : []),
    ],
  };
};

export const isAwardedBusiness = (business) => Boolean(getAwardMeta(business));

export const matchesAwardFilter = (business, awardFilter = 'all') => {
  if (!awardFilter || awardFilter === 'all') return true;
  const meta = getAwardMeta(business);
  if (!meta) return false;

  switch (awardFilter) {
    case 'awarded':
      return meta.isAwarded;
    case 'michelin':
      return meta.isMichelin;
    case 'green':
      return meta.hasGreenAward;
    case 'fine_dining':
      return meta.isFineDining;
    case 'tasting_menu':
      return meta.hasTastingMenu;
    default:
      return meta.filterTags.includes(awardFilter);
  }
};

export const isAwardSearchQuery = (query = '') => {
  const normalized = normalizeText(query);
  return [
    'michelin',
    'estrella michelin',
    'estrella verde',
    'restaurante premiado',
    'fine dining',
    'alta cocina',
    'tasting menu',
    'menu degustacion',
  ].some((term) => normalized.includes(term));
};

export const getAwardSearchFilter = (query = '') => {
  const normalized = normalizeText(query);
  if (normalized.includes('verde')) return 'green';
  if (normalized.includes('tasting') || normalized.includes('degustacion')) return 'tasting_menu';
  if (normalized.includes('fine dining') || normalized.includes('alta cocina')) return 'fine_dining';
  if (normalized.includes('michelin')) return 'michelin';
  if (normalized.includes('premiado')) return 'awarded';
  return null;
};


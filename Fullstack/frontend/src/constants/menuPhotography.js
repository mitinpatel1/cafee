// Photographs extracted from the UI reference screenshot supplied by the user.
// These replace only the original generic *seed* photo URLs for matching dishes.
// A franchise owner's custom image always takes priority.
const screenshotPhotos = {
  'idli sambar': '/menu-reference/idli-sambar.webp',
  'masala dosa': '/menu-reference/masala-dosa.webp',
  'veg fried rice': '/menu-reference/veg-fried-rice.webp',
  'paneer butter masala': '/menu-reference/paneer-butter-masala.webp',
  'grilled veg sandwich': '/menu-reference/veg-sandwich.webp',
  'veg sandwich': '/menu-reference/veg-sandwich.webp',
  'french fries': '/menu-reference/french-fries.webp',
  'iced tea': '/menu-reference/iced-tea.webp',
  'chocolate brownie': '/menu-reference/chocolate-brownie.webp',
};

const originalSeedPhotoIds = [
  'photo-1525351484163-7529414344d8',
  'photo-1533089860892-a7c6f0a88666',
  'photo-1547592180-85f173990554',
  'photo-1512621776951-a57141f2eefd',
  'photo-1603894584373-5ac82b2ae398',
  'photo-1568901346375-23c9450c58cd',
  'photo-1573080496219-bb080dd4f877',
  'photo-1601050690597-df0568f70950',
  'photo-1511920170033-f8396924c348',
  'photo-1544145945-f90425340c7e',
  'photo-1509042239860-f550ce710b93',
];

export function menuPhoto(item) {
  const name = (item?.name || '').trim().toLowerCase();
  const originalImage = typeof item?.image === 'string' ? item.image : '';
  const isSeedPhoto = originalSeedPhotoIds.some(id => originalImage.includes(id));
  const localPhoto = screenshotPhotos[name];
  // Never override a franchise owner's custom product photography.
  if (localPhoto && (!originalImage || isSeedPhoto)) return localPhoto;
  return originalImage;
}

export const MENU_BANNER_IMAGE = '/menu-reference/menu-banner.webp';

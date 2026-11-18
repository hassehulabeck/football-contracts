import { OG_SIZE, renderSiteCard } from '@/lib/ogImage';
import { SITE_NAME } from '@/lib/site';

// The preview shown when someone shares any page that has no image of its own.
export const alt = `${SITE_NAME} — a free football prediction game`;
export const size = OG_SIZE;
export const contentType = 'image/png';

export default function Image() {
  return renderSiteCard();
}

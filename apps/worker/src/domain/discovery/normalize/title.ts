import { decodeEntities } from '@repo/db/parsing/sanitize';
import { foldAccents } from './text';

const NAV_TITLES = new Set([
  'sign out',
  'sign in',
  'sign up',
  'log in',
  'log out',
  'login',
  'logout',
  'register',
  'settings',
  'my profile',
  'profile',
  'my applications',
  'applications',
  'account security',
  'my account',
  'account',
  'dashboard',
  'privacy',
  'privacy policy',
  'terms',
  'terms of use',
  'terms and conditions',
  'cookies',
  'cookie policy',
  'legal',
  'imprint',
  'accessibility',
  'mentions legales',
  'mentions légales',
  'confidentialite',
  'confidentialité',
  'politique de confidentialite',
  'protection des donnees',
  'protection des données',
  'contact',
  'contact us',
  'nous contacter',
  'help',
  'support',
  'faq',
  'about',
  'about us',
  'a propos',
  'à propos',
  'newsletter',
  'home',
  'accueil',
  'blog',
  'news',
  'press',
  'presse',
  'skip to main content',
  'skip to content',
  'main menu',
  'menu',
  'navigation',
  'footer',
  'back to top',
  'load more',
  'show more',
  'view all',
  'see all',
  'view all jobs',
  'all jobs',
  'all openings',
  'search jobs',
  'job search',
  'careers',
  'carrieres',
  'carrières',
  'join us',
  'join our team',
  'work with us',
  'working at',
  'life at',
  'our culture',
  'culture',
  'benefits',
  'avantages',
  'diversity',
  'inclusion',
  'our values',
  'values',
  'leadership principles',
  'principes de leadership',
  'interview tips',
  'conseils pour reussir vos entretiens',
  'inclusive experiences',
  'accommodations',
  'amenagements',
  'aménagements',
  'military careers',
  'carrieres militaires',
  'verify status',
  'verifier le statut',
  'my candidature',
  'ma candidature',
  'candidature spontanee',
  'candidature spontanée',
  'talent community',
  'talent pool',
  'job alerts',
  'create alert',
  'apply',
  'apply now',
  'postuler',
  'en savoir plus',
  'learn more',
  'read more',
  'next',
  'previous',
  'page suivante',
  'linkedin',
  'twitter',
  'facebook',
  'instagram',
  'youtube',
  'github',
  'departments',
  'locations',
  'teams',
  'offices',
  'students',
  'internships',
  'graduates',
  'events',
  'faq candidats',
  'espace candidat',
]);

const NAV_PREFIXES =
  /^(?:sign\s|log\s|my\s|our\s|all\s|view\s|see\s|browse\s|search\s|back\s|go\s|skip\s|share\s|follow\s|subscribe\s|download\s|learn\s|read\s|discover\s|explore\s|why\s|how\s|what\s|meet\s|about\s|contact\s|privacy|cookie|terms|legal|mentions|conditions|politique)/i;

export const cleanTitle = (raw: string): string =>
  decodeEntities(raw)
    .replace(/\s+/g, ' ')
    .replace(/^[\s\-–—•|/,:]+/, '')
    .replace(/[\s\-–—•|/,:]+$/, '')
    .replace(/\b(new|nouveau|urgent|hot|featured)\s*!?$/i, '')
    .replace(/\(\s*\d+\s*\)$/, '')
    .trim();

export const isPlausibleTitle = (raw: string): boolean => {
  const title = cleanTitle(raw);
  if (title.length < 3 || title.length > 160) return false;
  if (!/\p{L}/u.test(title)) return false;

  const folded = foldAccents(title.toLowerCase()).replace(/\s+/g, ' ').trim();
  if (NAV_TITLES.has(folded)) return false;
  if (NAV_PREFIXES.test(folded) && folded.split(' ').length <= 4) return false;
  if (/[.!?]$/.test(title) && title.split(' ').length > 6) return false;
  if (title.split(/\s+/).length > 22) return false;
  if (/^\d+$/.test(title)) return false;
  if (/^(share|apply|postuler|voir|view|read)\b/i.test(folded)) return false;
  return true;
};

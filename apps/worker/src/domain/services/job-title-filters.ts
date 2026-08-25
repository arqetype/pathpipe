export const BLOCKED_TITLES = new Set([
  'sign out', 'sign in', 'settings', 'my profile', 'my applications',
  'account security', 'my account', 'logout', 'login', 'register',
  'privacy', 'terms', 'cookies', 'legal', 'mentions légales',
  'confidentialité', 'protection des données', 'contact', 'contact us',
  'help', 'faq', 'about', 'about us', 'newsletter', 'home', 'accueil',
  'skip to main content', 'skip to content', 'main menu', 'menu',
  'footer', 'back to top', 'load more', 'show more', 'view all',
  'carrières', 'careers', 'join our team', 'working at',
  'découvrez le travail chez', 'our culture', 'benefits', 'avantages',
  'horaire', 'schedule', 'salary', 'rémunération', 'équipes',
  'domain', 'domaine', 'leadership principles', 'principes de leadership',
  'conseils pour réussir vos entretiens', 'interview tips',
  'inclusive experiences', 'expériences inclusives',
  'aménagements', 'accommodations', 'military careers',
  'carrières militaires', 'newsletter', 'verify status',
  'vérifier le statut', 'my candidature', 'ma candidature',
]);

export const JOB_URL_PATTERNS = [
  /\/job/i, /\/jobs/i, /\/position/i, /\/positions/i,
  /\/career/i, /\/careers/i, /\/requisition/i,
  /\/opportunity/i, /\/opportunities/i, /\/opening/i, /\/openings/i,
  /\/posting/i, /\/postings/i, /\/listing/i, /\/listings/i,
  /job_id/i, /jobId/i, /gh_jid/i, /req/i, /\/[a-z]+-\d{4,}/,
];

import type { Metadata } from 'next';
import { PageHeader } from '@/components/marketing/page-header';
import { LegalBody, type LegalSection } from '@/components/marketing/legal';

// Drafted from what the codebase actually does. Have it reviewed before launch.
export const metadata: Metadata = {
  title: 'Cookies — pathpipe',
  description:
    'The cookies pathpipe sets, and the ones it only sets if you agree.',
};

const SECTIONS: LegalSection[] = [
  {
    title: 'Cookies that keep you signed in',
    body: [
      'When you sign in, pathpipe stores your session token in a cookie. It is HttpOnly, so no script on the page can read it, restricted to same-site navigation, and sent over HTTPS only in production. Without it, you would be signed out on every page load — there is no way to turn it off and keep an account.',
    ],
  },
  {
    title: 'The cookie that remembers your answer',
    body: [
      'Your choice in the consent banner is stored in a cookie called cookieConsent. It exists so the banner stops asking, and it carries nothing else.',
    ],
  },
  {
    title: 'Measurement, only if you accept',
    body: [
      'If you accept in the banner, product analytics are loaded to measure which parts of pathpipe are used and where people get stuck. Decline, and the analytics script is never loaded — not loaded-but-silent, not loaded.',
      'You can change your mind: clear your site data for pathpipe and the banner will ask again.',
    ],
  },
  {
    title: 'No advertising cookies',
    body: [
      'pathpipe sells nothing and advertises nothing, so there are no advertising, retargeting or cross-site tracking cookies to explain here.',
    ],
  },
];

export default function CookiesPage() {
  return (
    <>
      <PageHeader
        eyebrow="Legal"
        title="Cookies"
        intro="Three cookies, one of them optional. Here is what each one does."
      />
      <LegalBody updatedAt="21 September 2026" sections={SECTIONS} />
    </>
  );
}

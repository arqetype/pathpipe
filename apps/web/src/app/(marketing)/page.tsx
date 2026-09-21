import { Hero } from '@/components/marketing/hero';
import { Sources } from '@/components/marketing/sources';
import { Pillars } from '@/components/marketing/pillars';
import { Replaces } from '@/components/marketing/replaces';
import { FeaturesGrid } from '@/components/marketing/features-grid';
import { HowItWorks } from '@/components/marketing/how-it-works';
import { OpenSource } from '@/components/marketing/open-source';
import { Privacy } from '@/components/marketing/privacy';
import { Faq } from '@/components/marketing/faq';
import { Cta } from '@/components/marketing/cta';

export default function LandingPage() {
  return (
    <>
      <Hero />
      <Sources />
      <Pillars />
      <Replaces />
      <FeaturesGrid />
      <HowItWorks />
      <OpenSource />
      <Privacy />
      <Faq />
      <Cta />
    </>
  );
}

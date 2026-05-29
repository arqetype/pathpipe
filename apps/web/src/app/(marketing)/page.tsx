import { MarketingNavbar } from '@/components/marketing/navbar';
import { Hero } from '@/components/marketing/hero';
import { Footer } from '@/components/marketing/footer';

export default function LandingPage() {
  return (
    <>
      <MarketingNavbar />
      <main>
        <Hero />
      </main>
      <Footer />
    </>
  );
}

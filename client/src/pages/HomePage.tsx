import { Hero } from '../features/events/components/Hero';
import { EventsSection } from '../features/events/components/EventsSection';
import { HowItWorks } from '../shared/ui/HowItWorks';
import { FAQ } from '../shared/ui/FAQ';

export function HomePage() {
  return (
    <>
      <Hero />
      <EventsSection />
      <HowItWorks />
      <FAQ />
    </>
  );
}
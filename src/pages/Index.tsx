import { Navbar } from "@/components/Navbar";
import { HeroSection } from "@/components/HeroSection";
import { FeaturesSection } from "@/components/FeaturesSection";
import { HowItWorksSection } from "@/components/HowItWorksSection";
import { UseCasesSection } from "@/components/UseCasesSection";
import { TestimonialsSection } from "@/components/TestimonialsSection";
import { PricingSection } from "@/components/PricingSection";
import { FAQSection } from "@/components/FAQSection";
import { CTASection } from "@/components/CTASection";
import { Footer } from "@/components/Footer";
import { ScrollToTop } from "@/components/ScrollToTop";
import { PageTransition } from "@/components/PageTransition";

const Index = () => {
  return (
    <PageTransition>
      <div className="min-h-screen bg-background">
        <Navbar />
        <main>
          <HeroSection />
          <FeaturesSection />
          <HowItWorksSection />
          <UseCasesSection />
          <TestimonialsSection />
          <PricingSection />
          <FAQSection />
          <CTASection />
        </main>
        <Footer />
        <ScrollToTop />
      </div>
    </PageTransition>
  );
};

export default Index;

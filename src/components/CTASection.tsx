import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";

export const CTASection = () => {
  const { t } = useTranslation();

  return (
    <section className="section-padding relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/30 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent/30 rounded-full blur-3xl" />
      </div>

      <div className="container-custom relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-4xl mx-auto text-center"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass text-sm text-muted-foreground mb-8">
            <Sparkles className="w-4 h-4 text-primary" />
            {t("cta.badge")}
          </div>

          <h2 className="text-3xl md:text-5xl lg:text-6xl font-bold mb-6">
            {t("cta.title")}{" "}
            <span className="gradient-text">{t("cta.titleHighlight")}</span>?
          </h2>

          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
            {t("cta.description")}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button variant="hero" size="lg">
              {t("cta.getStartedFree")}
              <ArrowRight className="w-5 h-5" />
            </Button>
            <Button variant="glass" size="lg">
              {t("cta.scheduleDemo")}
            </Button>
          </div>

          <p className="text-sm text-muted-foreground mt-6">
            {t("cta.noCreditCard")}
          </p>
        </motion.div>
      </div>
    </section>
  );
};

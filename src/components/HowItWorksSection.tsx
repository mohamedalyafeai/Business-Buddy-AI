import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Settings, Cpu, Rocket, TrendingUp } from "lucide-react";

export const HowItWorksSection = () => {
  const { t } = useTranslation();

  const steps = [
    {
      step: "01",
      icon: Settings,
      title: t("howItWorks.step1"),
      description: t("howItWorks.step1Desc"),
    },
    {
      step: "02",
      icon: Cpu,
      title: t("howItWorks.step2"),
      description: t("howItWorks.step2Desc"),
    },
    {
      step: "03",
      icon: Rocket,
      title: t("howItWorks.step3"),
      description: t("howItWorks.step3Desc"),
    },
    {
      step: "04",
      icon: TrendingUp,
      title: t("howItWorks.step4"),
      description: t("howItWorks.step4Desc"),
    },
  ];

  return (
    <section id="how-it-works" className="section-padding relative bg-card/50">
      <div className="container-custom">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="text-primary font-semibold text-sm uppercase tracking-wider">
            {t("howItWorks.label")}
          </span>
          <h2 className="text-3xl md:text-5xl font-bold mt-4 mb-6">
            {t("howItWorks.title")}{" "}
            <span className="gradient-text">{t("howItWorks.titleHighlight")}</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            {t("howItWorks.description")}
          </p>
        </motion.div>

        {/* Steps */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 relative">
          {/* Connection Line */}
          <div className="hidden lg:block absolute top-24 start-[12.5%] end-[12.5%] h-0.5 bg-gradient-to-r from-primary via-accent to-primary rtl:bg-gradient-to-l" />

          {steps.map((step, index) => (
            <motion.div
              key={step.step}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="relative text-center"
            >
              {/* Step Number Circle */}
              <div className="relative z-10 w-20 h-20 mx-auto mb-6 rounded-full bg-background border-2 border-primary flex items-center justify-center glow-primary">
                <step.icon className="w-8 h-8 text-primary" />
              </div>

              {/* Step Number Badge */}
              <span className="absolute top-0 end-1/2 translate-x-12 rtl:-translate-x-12 -translate-y-2 text-xs font-bold px-2 py-1 rounded-full bg-primary text-primary-foreground">
                {step.step}
              </span>

              <h3 className="text-xl font-semibold mb-3">{step.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {step.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

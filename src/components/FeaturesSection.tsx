import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { 
  MessageSquare, 
  Brain, 
  Zap, 
  Shield, 
  BarChart3, 
  Globe,
  Workflow,
  Clock
} from "lucide-react";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export const FeaturesSection = () => {
  const { t } = useTranslation();

  const features = [
    {
      icon: MessageSquare,
      title: t("features.smartConversations"),
      description: t("features.smartConversationsDesc"),
    },
    {
      icon: Brain,
      title: t("features.continuousLearning"),
      description: t("features.continuousLearningDesc"),
    },
    {
      icon: Zap,
      title: t("features.instantResponses"),
      description: t("features.instantResponsesDesc"),
    },
    {
      icon: Shield,
      title: t("features.enterpriseSecurity"),
      description: t("features.enterpriseSecurityDesc"),
    },
    {
      icon: BarChart3,
      title: t("features.analyticsDashboard"),
      description: t("features.analyticsDashboardDesc"),
    },
    {
      icon: Globe,
      title: t("features.multiLanguage"),
      description: t("features.multiLanguageDesc"),
    },
    {
      icon: Workflow,
      title: t("features.workflowAutomation"),
      description: t("features.workflowAutomationDesc"),
    },
    {
      icon: Clock,
      title: t("features.availability"),
      description: t("features.availabilityDesc"),
    },
  ];

  return (
    <section id="features" className="section-padding relative">
      <div className="container-custom">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="text-primary font-semibold text-sm uppercase tracking-wider">
            {t("features.label")}
          </span>
          <h2 className="text-3xl md:text-5xl font-bold mt-4 mb-6">
            {t("features.title")}{" "}
            <span className="gradient-text">{t("features.titleHighlight")}</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            {t("features.description")}
          </p>
        </motion.div>

        {/* Features Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {features.map((feature) => (
            <motion.div
              key={feature.title}
              variants={itemVariants}
              className="group p-6 rounded-2xl glass hover:bg-card/80 transition-all duration-300 hover:glow-primary"
            >
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <feature.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

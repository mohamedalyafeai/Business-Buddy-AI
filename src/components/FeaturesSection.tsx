import { motion } from "framer-motion";
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

const features = [
  {
    icon: MessageSquare,
    title: "Smart Conversations",
    description: "Natural language processing that understands context and provides human-like responses to your customers.",
  },
  {
    icon: Brain,
    title: "Continuous Learning",
    description: "The AI agent learns from every interaction, constantly improving its ability to help your business.",
  },
  {
    icon: Zap,
    title: "Instant Responses",
    description: "Lightning-fast response times ensure your customers never wait, improving satisfaction rates.",
  },
  {
    icon: Shield,
    title: "Enterprise Security",
    description: "Bank-grade encryption and compliance with GDPR, SOC 2, and HIPAA standards.",
  },
  {
    icon: BarChart3,
    title: "Analytics Dashboard",
    description: "Comprehensive insights into customer interactions, trends, and agent performance metrics.",
  },
  {
    icon: Globe,
    title: "Multi-Language Support",
    description: "Communicate with customers in 50+ languages with automatic translation capabilities.",
  },
  {
    icon: Workflow,
    title: "Workflow Automation",
    description: "Automate repetitive tasks and integrate with your existing tools and workflows seamlessly.",
  },
  {
    icon: Clock,
    title: "24/7 Availability",
    description: "Never miss a customer inquiry. Your AI agent works around the clock without breaks.",
  },
];

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
          <span className="text-primary font-semibold text-sm uppercase tracking-wider">Features</span>
          <h2 className="text-3xl md:text-5xl font-bold mt-4 mb-6">
            Everything You Need to{" "}
            <span className="gradient-text">Scale</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Our AI agent comes packed with powerful features designed to transform 
            how your business operates and interacts with customers.
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

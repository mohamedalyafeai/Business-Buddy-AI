import { motion } from "framer-motion";
import { 
  HeadphonesIcon, 
  ShoppingCart, 
  Building2, 
  GraduationCap, 
  Stethoscope, 
  Plane 
} from "lucide-react";

const useCases = [
  {
    icon: HeadphonesIcon,
    title: "Customer Support",
    description: "Handle 80% of support tickets automatically, reducing response times from hours to seconds.",
    stats: "80% faster resolution",
  },
  {
    icon: ShoppingCart,
    title: "E-Commerce",
    description: "Guide customers through purchases, answer product questions, and recover abandoned carts.",
    stats: "35% increase in sales",
  },
  {
    icon: Building2,
    title: "Enterprise",
    description: "Streamline internal operations, HR inquiries, and employee onboarding processes.",
    stats: "60% time saved",
  },
  {
    icon: GraduationCap,
    title: "Education",
    description: "Provide 24/7 student support, answer course questions, and assist with enrollment.",
    stats: "90% student satisfaction",
  },
  {
    icon: Stethoscope,
    title: "Healthcare",
    description: "Schedule appointments, answer FAQs, and provide preliminary symptom assessments.",
    stats: "50% reduced wait times",
  },
  {
    icon: Plane,
    title: "Travel & Hospitality",
    description: "Manage bookings, provide recommendations, and handle customer inquiries around the clock.",
    stats: "24/7 availability",
  },
];

export const UseCasesSection = () => {
  return (
    <section id="use-cases" className="section-padding relative">
      <div className="container-custom">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="text-primary font-semibold text-sm uppercase tracking-wider">Use Cases</span>
          <h2 className="text-3xl md:text-5xl font-bold mt-4 mb-6">
            Built for{" "}
            <span className="gradient-text">Every Industry</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            See how businesses across different industries are leveraging our 
            AI agent to transform their operations.
          </p>
        </motion.div>

        {/* Use Cases Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {useCases.map((useCase, index) => (
            <motion.div
              key={useCase.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="group p-8 rounded-2xl gradient-border bg-card hover:bg-card/80 transition-all duration-300"
            >
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <useCase.icon className="w-7 h-7 text-primary-foreground" />
              </div>
              
              <h3 className="text-xl font-semibold mb-3">{useCase.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed mb-4">
                {useCase.description}
              </p>
              
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium">
                {useCase.stats}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

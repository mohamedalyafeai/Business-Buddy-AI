import { motion } from "framer-motion";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "How does the AI agent learn about my business?",
    answer: "Our AI agent learns from the data you provide — including FAQs, product information, past customer interactions, and any documents you upload. The more context you give, the smarter and more accurate it becomes.",
  },
  {
    question: "Can I customize the AI agent's personality and tone?",
    answer: "Absolutely! You can customize everything from the agent's name and avatar to its communication style, tone of voice, and even specific phrases it should use or avoid. Make it sound exactly like your brand.",
  },
  {
    question: "What channels can I deploy the AI agent on?",
    answer: "Our AI agent can be deployed on your website, mobile app, social media platforms (Facebook, Instagram, WhatsApp), email, SMS, and more. We also offer API access for custom integrations.",
  },
  {
    question: "Is my data secure?",
    answer: "Security is our top priority. We use bank-grade encryption, are SOC 2 and GDPR compliant, and offer HIPAA-compliant solutions for healthcare organizations. Your data is never used to train other models.",
  },
  {
    question: "What happens when the AI can't answer a question?",
    answer: "When the AI encounters a question it can't confidently answer, it automatically escalates to a human agent (if available) or collects the customer's contact information for follow-up. You can customize this behavior.",
  },
  {
    question: "Can I try AgentAI before committing?",
    answer: "Yes! We offer a 14-day free trial on all plans with no credit card required. You'll have access to all features so you can fully evaluate if AgentAI is right for your business.",
  },
];

export const FAQSection = () => {
  return (
    <section id="faq" className="section-padding relative bg-card/50">
      <div className="container-custom">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="text-primary font-semibold text-sm uppercase tracking-wider">FAQ</span>
          <h2 className="text-3xl md:text-5xl font-bold mt-4 mb-6">
            Frequently Asked{" "}
            <span className="gradient-text">Questions</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Everything you need to know about AgentAI. Can't find what you're looking for? Contact our support team.
          </p>
        </motion.div>

        {/* FAQ Accordion */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-3xl mx-auto"
        >
          <Accordion type="single" collapsible className="space-y-4">
            {faqs.map((faq, index) => (
              <AccordionItem 
                key={index} 
                value={`item-${index}`}
                className="glass rounded-xl px-6 border-0"
              >
                <AccordionTrigger className="text-left hover:no-underline py-6 text-foreground">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground pb-6 leading-relaxed">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </motion.div>
      </div>
    </section>
  );
};

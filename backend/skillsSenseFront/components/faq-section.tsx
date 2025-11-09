"use client"

import { motion } from "framer-motion"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

const faqs = [
  {
    question: "How does the AI CV extraction work?",
    answer: "We use Google's Gemini AI to analyze uploaded CVs and extract structured information including personal details, work experience, education, skills, and technologies. The AI is trained to recognize various CV formats and layouts.",
  },
  {
    question: "What is O*NET and why is it important?",
    answer: "O*NET (Occupational Information Network) is the official U.S. database of occupational information. It provides standardized skills and technology classifications for over 1,000 occupations. By using O*NET, we ensure that skill matching is consistent and industry-validated.",
  },
  {
    question: "How accurate is the auto-matching?",
    answer: "Our matching algorithm considers multiple factors including required skills, optional skills, and technologies. It provides an affinity score (0-100%) with detailed breakdown. Matches above 60% are automatically suggested, with scores above 85% typically indicating excellent fits.",
  },
  {
    question: "Can I manually review and edit extracted data?",
    answer: "Absolutely! After CV upload, you review and can edit all extracted information before creating the candidate profile. You can also add HR notes and ratings for future reference.",
  },
  {
    question: "What file formats are supported for CVs?",
    answer: "We support PDF, DOC, and DOCX formats up to 10MB in size. PDF files generally provide the best extraction results.",
  },
  {
    question: "How are applications managed?",
    answer: "Applications can have different statuses: SUGGESTED (AI-generated), PENDING (under review), HIRED, REJECTED, ON_HOLD, or CANCELLED. You can easily transition applications between statuses with one click.",
  },
  {
    question: "Is my data secure?",
    answer: "Yes! All files are securely stored in Google Cloud Storage with encryption. User data is protected with JWT authentication and company-level data isolation ensures you only see your own candidates and vacancies.",
  },
  {
    question: "Can I integrate with my existing ATS?",
    answer: "Yes, we provide a RESTful API for integration with external systems. Enterprise plans include custom integration support and webhooks for real-time updates.",
  },
]

export function FAQSection() {
  return (
    <section id="faq" className="relative z-10 py-24 px-4">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-xl text-zinc-400">
            Everything you need to know about SkillSense
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          viewport={{ once: true }}
        >
          <Accordion type="single" collapsible className="space-y-4">
            {faqs.map((faq, index) => (
              <AccordionItem
                key={index}
                value={`item-${index}`}
                className="bg-zinc-900/50 border border-zinc-800 rounded-lg px-6"
              >
                <AccordionTrigger className="text-white hover:text-[#e78a53] transition-colors">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-zinc-400">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </motion.div>
      </div>
    </section>
  )
}

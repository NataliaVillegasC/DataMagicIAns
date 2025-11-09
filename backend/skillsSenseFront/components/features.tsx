"use client"

import { motion } from "framer-motion"
import { FileText, Brain, Target, BarChart, Sparkles, Shield } from "lucide-react"

const features = [
  {
    icon: FileText,
    title: "CV Upload & Extraction",
    description: "Upload PDF resumes and let Gemini AI automatically extract candidate information, experience, skills, and education.",
  },
  {
    icon: Brain,
    title: "Intelligent Skill Mapping",
    description: "AI maps extracted skills to O*NET standardized skills and technologies, eliminating guesswork and inconsistency.",
  },
  {
    icon: Target,
    title: "Precision Matching",
    description: "Advanced algorithm matches candidates with vacancies based on skills, technologies, and requirements with detailed affinity scores.",
  },
  {
    icon: Sparkles,
    title: "Auto-Suggestions",
    description: "Get instant AI-powered candidate recommendations when you create a new vacancy. Review and accept the best matches.",
  },
  {
    icon: BarChart,
    title: "Match Analytics",
    description: "Detailed breakdown of skills match, technology match, and overall compatibility with visual score indicators.",
  },
  {
    icon: Shield,
    title: "O*NET Validated",
    description: "Built on the official O*NET database with 1,000+ occupations and 8,700+ validated technologies.",
  },
]

export default function Features() {
  return (
    <section id="features" className="relative z-10 py-24 px-4">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Powered by AI, Validated by O*NET
          </h2>
          <p className="text-xl text-zinc-400 max-w-2xl mx-auto">
            Everything you need to streamline your recruitment process with intelligent automation
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              viewport={{ once: true }}
              className="group bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 hover:border-[#e78a53]/50 transition-all duration-300 hover:shadow-lg hover:shadow-[#e78a53]/10"
            >
              <div className="inline-flex items-center justify-center w-12 h-12 bg-[#e78a53]/20 rounded-xl mb-4 group-hover:bg-[#e78a53]/30 transition-colors">
                <feature.icon className="h-6 w-6 text-[#e78a53]" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">{feature.title}</h3>
              <p className="text-zinc-400 leading-relaxed">{feature.description}</p>
            </motion.div>
          ))}
        </div>

        {/* How It Works */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          viewport={{ once: true }}
          className="mt-24"
        >
          <h3 className="text-3xl font-bold text-white text-center mb-12">
            How It Works
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="relative">
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-8 h-full">
                <div className="w-12 h-12 bg-[#e78a53] rounded-full flex items-center justify-center text-white font-bold text-xl mb-4">
                  1
                </div>
                <h4 className="text-xl font-semibold text-white mb-3">Upload CV</h4>
                <p className="text-zinc-400">
                  Upload a candidate's resume (PDF, DOC, DOCX). Our Gemini AI instantly extracts all relevant information.
                </p>
              </div>
              
              {/* Connector line */}
              <div className="hidden md:block absolute top-1/2 -right-4 w-8 h-0.5 bg-gradient-to-r from-[#e78a53] to-transparent"></div>
            </div>

            <div className="relative">
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-8 h-full">
                <div className="w-12 h-12 bg-[#e78a53] rounded-full flex items-center justify-center text-white font-bold text-xl mb-4">
                  2
                </div>
                <h4 className="text-xl font-semibold text-white mb-3">Review & Create</h4>
                <p className="text-zinc-400">
                  Review extracted data, make corrections if needed, and create the candidate profile.
                </p>
              </div>
              
              {/* Connector line */}
              <div className="hidden md:block absolute top-1/2 -right-4 w-8 h-0.5 bg-gradient-to-r from-[#e78a53] to-transparent"></div>
            </div>

            <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-8">
              <div className="w-12 h-12 bg-[#e78a53] rounded-full flex items-center justify-center text-white font-bold text-xl mb-4">
                3
              </div>
              <h4 className="text-xl font-semibold text-white mb-3">Auto-Match</h4>
              <p className="text-zinc-400">
                AI automatically matches candidates with active vacancies and provides affinity scores.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

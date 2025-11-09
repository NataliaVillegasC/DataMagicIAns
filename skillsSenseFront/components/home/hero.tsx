"use client"

import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Sparkles, Users, Zap } from "lucide-react"

export default function Hero() {
  return (
    <section className="relative z-10 min-h-screen flex items-center justify-center px-4 pt-20 pb-16">
      <div className="max-w-6xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-8"
        >
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-[#e78a53]/10 border border-[#e78a53]/20"
          >
            <Sparkles className="h-4 w-4 text-[#e78a53]" />
            <span className="text-sm font-medium text-[#e78a53]">
              AI-Powered Recruitment Platform
            </span>
          </motion.div>

          {/* Title */}
          <h1 className="text-5xl md:text-7xl font-bold text-white leading-tight">
            Find the{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#e78a53] to-[#f5a572]">
              Perfect Match
            </span>
            <br />
            with AI Intelligence
          </h1>

          {/* Description */}
          <p className="text-xl md:text-2xl text-zinc-400 max-w-3xl mx-auto leading-relaxed">
            Upload a CV, let our AI extract and analyze skills, then automatically match candidates 
            with your job openings using O*NET-validated technology mapping.
          </p>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto pt-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6"
            >
              <div className="inline-flex items-center justify-center w-12 h-12 bg-[#e78a53]/20 rounded-lg mb-4">
                <Sparkles className="h-6 w-6 text-[#e78a53]" />
              </div>
              <h3 className="text-white font-semibold mb-2">AI CV Extraction</h3>
              <p className="text-zinc-400 text-sm">
                Gemini AI automatically extracts skills, experience, and education from CVs
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6"
            >
              <div className="inline-flex items-center justify-center w-12 h-12 bg-[#e78a53]/20 rounded-lg mb-4">
                <Zap className="h-6 w-6 text-[#e78a53]" />
              </div>
              <h3 className="text-white font-semibold mb-2">Smart Matching</h3>
              <p className="text-zinc-400 text-sm">
                O*NET-validated skill and technology matching with affinity scores
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6"
            >
              <div className="inline-flex items-center justify-center w-12 h-12 bg-[#e78a53]/20 rounded-lg mb-4">
                <Users className="h-6 w-6 text-[#e78a53]" />
              </div>
              <h3 className="text-white font-semibold mb-2">Auto-Suggestions</h3>
              <p className="text-zinc-400 text-sm">
                Get instant candidate recommendations when you create a vacancy
              </p>
            </motion.div>
          </div>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8"
          >
            <Link href="/signup">
              <Button 
                size="lg"
                className="bg-[#e78a53] hover:bg-[#e78a53]/90 text-white font-semibold px-8 py-6 text-lg rounded-xl shadow-lg hover:shadow-[#e78a53]/20 transition-all duration-200"
              >
                Get Started Free
              </Button>
            </Link>
            
            <Link href="/login">
              <Button 
                size="lg"
                variant="outline"
                className="border-zinc-700 text-white hover:bg-zinc-800 font-semibold px-8 py-6 text-lg rounded-xl"
              >
                Sign In
              </Button>
            </Link>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.5 }}
            className="grid grid-cols-3 gap-8 max-w-2xl mx-auto pt-12"
          >
            <div>
              <div className="text-3xl font-bold text-white mb-1">1,000+</div>
              <div className="text-zinc-400 text-sm">O*NET Occupations</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-white mb-1">8,700+</div>
              <div className="text-zinc-400 text-sm">Technologies</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-white mb-1">35+</div>
              <div className="text-zinc-400 text-sm">Core Skills</div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}

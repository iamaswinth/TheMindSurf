"use client";

import React, { useState, useEffect } from "react";
import { Sidebar } from "@/components/ui/Sidebar";
import { ModeSelector, ModeBadge } from "@/components/ui/ModeSelector";
import { DocumentList } from "@/components/ui/DocumentList";
import { UploadModal } from "@/components/ui/UploadModal";
import { Button, Card, Select, Input } from "@/components/ui/Components";
import {
  PlusIcon,
  ChevronRightIcon,
  MenuIcon,
  XIcon,
  FolderIcon,
} from "@/components/ui/Icons";
import { LogoIcon } from "@/components/ui/Logo";
import {
  ChatMode,
  UploadSettings,
  MultimodalProcessResponse,
} from "@/lib/types";
import Link from "next/link";
import { useNamespaces, useCreateNamespace } from "@/lib/hooks/use-namespaces";
import { useDocuments, useUploadDocument } from "@/lib/hooks/use-documents";
import { usePublicStats } from "@/lib/hooks/use-public-stats";
import { useAuth } from "@/lib/auth-context";

// FAQ Accordion Item Component
function FAQItem({
  question,
  answer,
  isOpen,
  onClick,
}: {
  question: string;
  answer: string;
  isOpen: boolean;
  onClick: () => void;
}) {
  return (
    <div className="border-4 border-black bg-white shadow-[4px_4px_0px_#000] hover:shadow-[6px_6px_0px_#000] transition-all duration-100">
      <button
        onClick={onClick}
        className="w-full px-6 py-4 flex items-center justify-between text-left font-black uppercase text-sm md:text-base"
      >
        <span>{question}</span>
        <span
          className={`text-2xl transition-transform duration-200 ${
            isOpen ? "rotate-45" : ""
          }`}
        >
          +
        </span>
      </button>
      {isOpen && (
        <div className="px-6 pb-4 border-t-4 border-black bg-[#FFFEF0]">
          <p className="font-bold text-black/70 pt-4">{answer}</p>
        </div>
      )}
    </div>
  );
}

// Landing page for non-authenticated users
function LandingPage() {
  const [openFAQ, setOpenFAQ] = useState<number | null>(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const { data: stats } = usePublicStats();

  // Scroll detection for sticky nav
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 100);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const faqData = [
    {
      question: "What file formats do you support?",
      answer:
        "We currently support PDF files, with plans to add Word documents, PowerPoint presentations, and more file types soon. Our system handles both text-based and scanned PDFs with OCR.",
    },
    {
      question: "How accurate is the OCR for tables and images?",
      answer:
        "Our Hi-Res mode uses advanced OCR technology that achieves 95%+ accuracy for tables and structured data. For best results with complex documents, we recommend using Hi-Res processing.",
    },
    {
      question: "Can I search across multiple documents?",
      answer:
        "Absolutely! You can organize documents into namespaces and search across your entire library at once. Our multi-document search finds relevant information from all your uploaded files simultaneously.",
    },
    {
      question: "How do credits work?",
      answer:
        "Credits are used for AI-enhanced processing. Basic uploads use minimal credits, while Hi-Res processing and AI chat responses use more. You can see your credit balance in your dashboard and purchase more anytime.",
    },
    {
      question: "Is my data secure?",
      answer:
        "Yes! We use enterprise-grade encryption for all documents at rest and in transit. Your files are stored securely and are never used to train AI models. We're committed to your privacy.",
    },
    {
      question: "Can I export my answers?",
      answer:
        "Yes, you can export your chat history and AI responses. Each answer includes source citations with page numbers that you can reference back to your original documents.",
    },
    {
      question: "What's the difference between Hi-Res and Fast mode?",
      answer:
        "Fast mode quickly extracts text for simple documents. Hi-Res mode uses advanced OCR to extract tables, images, and complex formatting - ideal for scanned documents or PDFs with visual elements.",
    },
    {
      question: "Do you offer API access?",
      answer:
        "API access is available on our Enterprise plan. Contact our sales team for custom integrations, webhooks, and programmatic access to document processing and search capabilities.",
    },
  ];

  const comparisonFeatures = [
    { feature: "Semantic Understanding", us: true, them: false },
    { feature: "Table Extraction", us: true, them: false },
    { feature: "Image Recognition", us: true, them: false },
    { feature: "Multi-Document Search", us: true, them: false },
    { feature: "Source Citations", us: true, them: false },
    { feature: "Real-Time Answers", us: true, them: false },
    { feature: "Organized Namespaces", us: true, them: false },
  ];

  return (
    <div className="min-h-screen bg-[#FFFEF0]">
      {/* Sticky Navigation */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-200 ${
          isScrolled
            ? "bg-[#FFFF00] border-b-4 border-black shadow-[0_4px_0px_#000]"
            : "bg-transparent"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 md:h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* <LogoIcon size={36} /> */}
            <h1 className="text-xl md:text-2xl font-black text-black uppercase tracking-tight">
              TheMindSurf
            </h1>
          </div>
          <div className="hidden md:flex items-center gap-6">
            <a
              href="#features"
              className="font-bold text-black hover:text-[#FF006E] transition-colors"
            >
              Features
            </a>
            <a
              href="#pricing"
              className="font-bold text-black hover:text-[#FF006E] transition-colors"
            >
              Pricing
            </a>
            <a
              href="#faq"
              className="font-bold text-black hover:text-[#FF006E] transition-colors"
            >
              FAQ
            </a>
          </div>
          <div className="flex items-center gap-2 md:gap-3">
            <Link href="/login">
              <button className="px-3 md:px-5 py-2 bg-white text-black font-black uppercase border-4 border-black shadow-[3px_3px_0px_#000] hover:shadow-[5px_5px_0px_#000] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all duration-100 text-xs md:text-sm">
                Login
              </button>
            </Link>
            <Link href="/register">
              <button className="px-3 md:px-5 py-2 bg-[#FF006E] text-white font-black uppercase border-4 border-black shadow-[3px_3px_0px_#000] hover:shadow-[5px_5px_0px_#000] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all duration-100 text-xs md:text-sm">
                Start Free
              </button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-24 md:pt-32 pb-12 md:pb-20 px-4 md:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            {/* Left: Content */}
            <div className="animate-fadeIn">
              <div className="inline-block bg-[#CCFF00] border-4 border-black px-4 py-2 mb-6 shadow-[4px_4px_0px_#000]">
                <span className="font-black uppercase text-sm">
                  🚀 {stats?.total_documents.toLocaleString() || "Loading..."}{" "}
                  Documents Processed
                </span>
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-black uppercase tracking-tight mb-6 leading-tight">
                Chat with Your Documents
                <span className="block text-[#FF006E]">Like Never Before</span>
              </h1>
              <p className="text-lg md:text-xl font-bold text-black/70 mb-8 max-w-xl">
                Upload PDFs, ask questions in plain English, and get instant
                AI-powered answers with source citations.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/register">
                  <button className="w-full sm:w-auto px-8 py-4 bg-[#00FFFF] text-black font-black uppercase border-4 border-black shadow-[6px_6px_0px_#000] hover:shadow-[8px_8px_0px_#000] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all duration-100 text-lg">
                    Start Free Trial →
                  </button>
                </Link>
                <a href="#features" className="w-full sm:w-auto">
                  <button className="w-full sm:w-auto px-8 py-4 bg-white text-black font-black uppercase border-4 border-black shadow-[6px_6px_0px_#000] hover:shadow-[8px_8px_0px_#000] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all duration-100 text-lg flex items-center justify-center gap-2">
                    <span>📚</span> See Examples
                  </button>
                </a>
              </div>
              <p className="mt-4 text-sm font-bold text-black/50">
                No credit card required • 3 free credits to start
              </p>
            </div>

            {/* Right: Hero Visual */}
            <div className="relative animate-slideInRight">
              <div className="bg-white border-4 border-black p-4 md:p-6 shadow-[8px_8px_0px_#000] transform rotate-1 hover:rotate-0 transition-transform duration-300">
                {/* Mock PDF Preview */}
                <div className="bg-[#FFFEF0] border-4 border-black p-4 mb-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-[#FF006E] border-2 border-black flex items-center justify-center">
                      <span className="text-white font-black text-xs">PDF</span>
                    </div>
                    <div>
                      <p className="font-black text-sm">research_paper.pdf</p>
                      <p className="text-xs font-bold text-black/50">
                        45 pages • 2.3 MB
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="h-2 bg-black/10 rounded"></div>
                    <div className="h-2 bg-black/10 rounded w-3/4"></div>
                    <div className="h-2 bg-black/10 rounded w-1/2"></div>
                  </div>
                </div>
                {/* Mock Chat Interface */}
                <div className="space-y-3">
                  <div className="bg-[#00FFFF] border-4 border-black p-3">
                    <p className="font-bold text-sm">
                      What are the main findings of this study?
                    </p>
                  </div>
                  <div className="bg-[#CCFF00] border-4 border-black p-3">
                    <p className="font-bold text-sm mb-2">
                      The study found three key insights:
                    </p>
                    <p className="text-xs font-bold text-black/70">
                      1. AI improves efficiency by 47%...
                    </p>
                    <div className="mt-2 inline-block bg-black text-white px-2 py-1 text-xs font-black">
                      📄 Page 12, Para 3
                    </div>
                  </div>
                </div>
              </div>
              {/* Floating Elements */}
              <div className="absolute -top-4 -right-4 bg-[#FF006E] border-4 border-black p-3 shadow-[4px_4px_0px_#000] animate-bounce">
                <span className="text-white font-black text-xs">AI</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Live Stats Bar */}
      <section className="py-8 md:py-12 px-4 md:px-6 bg-black">
        <div className="max-w-7xl mx-auto">
          <p className="text-center text-white font-bold uppercase text-sm mb-8">
            ⚡ REAL-TIME PLATFORM STATS ⚡
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {[
              {
                label: "Documents Processed",
                value: stats?.total_documents.toLocaleString() || "...",
                color: "#FFFF00",
              },
              {
                label: "Active Users",
                value: stats?.total_users.toLocaleString() || "...",
                color: "#00FFFF",
              },
              {
                label: "Chunks Created",
                value: stats?.total_questions.toLocaleString() || "...",
                color: "#FF006E",
              },
              { label: "Avg. Response Time", value: "< 5s", color: "#CCFF00" },
            ].map((stat, i) => (
              <div
                key={i}
                className="bg-[#1a1a1a] border-4 border-white p-4 text-center"
                style={{ boxShadow: `4px 4px 0px ${stat.color}` }}
              >
                <div
                  className="text-2xl md:text-3xl font-black mb-2"
                  style={{ color: stat.color }}
                >
                  {stat.value}
                </div>
                <div className="text-white/70 font-bold text-xs md:text-sm uppercase">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Problem Statement Section */}
      <section className="py-16 md:py-24 px-4 md:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-5xl font-black text-black uppercase tracking-tight mb-4">
              Stop Wasting Hours
              <span className="block text-[#FF006E]">
                Searching Through Documents
              </span>
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: "📜",
                title: "Endless Scrolling",
                desc: "Through 100+ page reports looking for one piece of information",
              },
              {
                icon: "📊",
                title: "Missing Critical Data",
                desc: "Important information buried in tables and charts goes unnoticed",
              },
              {
                icon: "📚",
                title: "No Cross-Search",
                desc: "No way to search across multiple documents at once",
              },
            ].map((pain, i) => (
              <div
                key={i}
                className="bg-white border-4 border-black p-6 shadow-[6px_6px_0px_#FF006E] hover:shadow-[8px_8px_0px_#FF006E] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all duration-100"
              >
                <span className="text-4xl mb-4 block">{pain.icon}</span>
                <h3 className="text-xl font-black uppercase mb-2">
                  {pain.title}
                </h3>
                <p className="font-bold text-black/70">{pain.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Solution Overview - 3 Steps */}
      <section className="py-16 md:py-24 px-4 md:px-6 bg-[#FFFF00]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-5xl font-black text-black uppercase tracking-tight">
              Your AI Research Assistant
              <span className="block">In 3 Simple Steps</span>
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-[#CCFF00] border-4 border-black p-8 shadow-[6px_6px_0px_#000] hover:shadow-[8px_8px_0px_#000] transition-all duration-100 group">
              <div className="w-16 h-16 bg-black text-white flex items-center justify-center font-black text-2xl mb-6 group-hover:scale-110 transition-transform">
                1
              </div>
              <h3 className="text-2xl font-black uppercase mb-3">
                Drop Your Documents
              </h3>
              <p className="font-bold text-black/70">
                Upload PDFs with our multimodal extraction. We process text,
                tables, and images with advanced OCR technology.
              </p>
            </div>
            <div className="bg-[#FF006E] border-4 border-black p-8 shadow-[6px_6px_0px_#000] hover:shadow-[8px_8px_0px_#000] transition-all duration-100 group">
              <div className="w-16 h-16 bg-black text-white flex items-center justify-center font-black text-2xl mb-6 group-hover:scale-110 transition-transform">
                2
              </div>
              <h3 className="text-2xl font-black uppercase mb-3 text-white">
                Ask Anything
              </h3>
              <p className="font-bold text-white/80">
                Use natural language to query your documents. Ask complex
                questions just like you'd ask a research assistant.
              </p>
            </div>
            <div className="bg-[#00FFFF] border-4 border-black p-8 shadow-[6px_6px_0px_#000] hover:shadow-[8px_8px_0px_#000] transition-all duration-100 group">
              <div className="w-16 h-16 bg-black text-white flex items-center justify-center font-black text-2xl mb-6 group-hover:scale-110 transition-transform">
                3
              </div>
              <h3 className="text-2xl font-black uppercase mb-3">
                Instant Insights
              </h3>
              <p className="font-bold text-black/70">
                Get AI-powered answers with exact citations. Every response
                includes page numbers and direct quotes.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Key Features Grid */}
      <section id="features" className="py-16 md:py-24 px-4 md:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-5xl font-black text-black uppercase tracking-tight mb-4">
              Powered by Advanced
              <span className="block text-[#FF006E]">AI Technology</span>
            </h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: "🔍",
                title: "Multimodal Understanding",
                desc: "Extracts text, tables, and images with OCR technology",
                color: "#CCFF00",
              },
              {
                icon: "🧠",
                title: "Smart Search",
                desc: "Hybrid semantic + keyword search finds exactly what you need",
                color: "#00FFFF",
              },
              {
                icon: "📎",
                title: "Source Citations",
                desc: "Every answer includes page numbers and direct quotes",
                color: "#FF006E",
              },
              {
                icon: "⚡",
                title: "Real-Time Streaming",
                desc: "Watch AI responses generate token-by-token",
                color: "#FFFF00",
              },
              {
                icon: "📁",
                title: "Organize Collections",
                desc: "Group documents into namespaces for better organization",
                color: "#9D00FF",
              },
              {
                icon: "🔗",
                title: "Multi-Document Search",
                desc: "Query across your entire document library at once",
                color: "#FF6B00",
              },
            ].map((feature, i) => (
              <div
                key={i}
                className="bg-white border-4 border-black p-6 shadow-[6px_6px_0px_#000] hover:shadow-[8px_8px_0px_#000] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all duration-100"
                style={{
                  borderLeftColor: feature.color,
                  borderLeftWidth: "8px",
                }}
              >
                <span className="text-4xl mb-4 block">{feature.icon}</span>
                <h3 className="text-xl font-black uppercase mb-2">
                  {feature.title}
                </h3>
                <p className="font-bold text-black/70">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Interactive Demo Section */}
      <section className="py-16 md:py-24 px-4 md:px-6 bg-[#CCFF00]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-5xl font-black text-black uppercase tracking-tight">
              See It In Action
            </h2>
          </div>
          <div className="bg-white border-4 border-black shadow-[8px_8px_0px_#000] overflow-hidden">
            <div className="grid lg:grid-cols-2">
              {/* PDF Preview Side */}
              <div className="p-6 md:p-8 border-b-4 lg:border-b-0 lg:border-r-4 border-black bg-[#FFFEF0]">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 bg-[#FF006E] border-4 border-black flex items-center justify-center">
                    <span className="text-white font-black text-sm">PDF</span>
                  </div>
                  <div>
                    <p className="font-black">Q3_Financial_Report.pdf</p>
                    <p className="text-sm font-bold text-black/50">
                      128 pages • Enterprise Report
                    </p>
                  </div>
                </div>
                <div className="bg-white border-4 border-black p-4 space-y-3">
                  <div className="h-3 bg-black/10 rounded"></div>
                  <div className="h-3 bg-black/10 rounded w-4/5"></div>
                  <div className="h-3 bg-black/10 rounded w-3/5"></div>
                  <div className="mt-4 grid grid-cols-3 gap-2">
                    <div className="h-16 bg-[#00FFFF]/30 border-2 border-black"></div>
                    <div className="h-16 bg-[#FF006E]/30 border-2 border-black"></div>
                    <div className="h-16 bg-[#CCFF00]/30 border-2 border-black"></div>
                  </div>
                  <div className="h-3 bg-black/10 rounded w-2/3 mt-4"></div>
                  <div className="h-3 bg-black/10 rounded w-1/2"></div>
                </div>
              </div>

              {/* Chat Side */}
              <div className="p-6 md:p-8">
                <div className="space-y-4">
                  <div className="bg-[#00FFFF] border-4 border-black p-4 ml-8">
                    <p className="font-bold">
                      What was our Q3 revenue compared to Q2?
                    </p>
                  </div>
                  <div className="bg-[#CCFF00] border-4 border-black p-4 mr-8">
                    <p className="font-bold mb-3">
                      Based on the Q3 Financial Report, revenue increased by 23%
                      from Q2:
                    </p>
                    <ul className="text-sm font-bold text-black/80 space-y-1 mb-3">
                      <li>• Q2 Revenue: $12.4M</li>
                      <li>• Q3 Revenue: $15.3M</li>
                      <li>• Growth: +$2.9M (23.4%)</li>
                    </ul>
                    <div className="flex gap-2 flex-wrap">
                      <span className="bg-black text-white px-2 py-1 text-xs font-black">
                        📄 Page 4
                      </span>
                      <span className="bg-black text-white px-2 py-1 text-xs font-black">
                        📊 Table 2.1
                      </span>
                    </div>
                  </div>
                  <div className="bg-[#00FFFF] border-4 border-black p-4 ml-8">
                    <p className="font-bold">What drove this growth?</p>
                  </div>
                  <div className="bg-[#CCFF00] border-4 border-black p-4 mr-8">
                    <p className="font-bold text-sm">
                      The report identifies three main drivers: 1) New
                      enterprise contracts (42%), 2) Expansion of existing
                      accounts (35%), 3) Product upsells (23%)...
                    </p>
                    <span className="inline-block bg-black text-white px-2 py-1 text-xs font-black mt-2">
                      📄 Page 12-14
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Use Cases Section */}
      <section className="py-16 md:py-24 px-4 md:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-5xl font-black text-black uppercase tracking-tight mb-4">
              Built for Professionals
              <span className="block text-[#FF006E]">
                Who Need Answers Fast
              </span>
            </h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: "🔬",
                title: "Researchers",
                desc: "Query research papers and academic documents instantly",
                example: '"What methodology did this study use?"',
              },
              {
                icon: "⚖️",
                title: "Legal Teams",
                desc: "Search contracts, case files, and legal briefs",
                example: '"Find all liability clauses in this contract"',
              },
              {
                icon: "📈",
                title: "Business Analysts",
                desc: "Extract insights from financial reports and market research",
                example: '"What was YoY revenue growth?"',
              },
              {
                icon: "🎓",
                title: "Students",
                desc: "Study smarter with AI-powered textbook search",
                example: '"Explain the key concepts in Chapter 5"',
              },
            ].map((useCase, i) => (
              <div
                key={i}
                className="bg-white border-4 border-black p-6 shadow-[6px_6px_0px_#000] hover:shadow-[8px_8px_0px_#000] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all duration-100"
              >
                <span className="text-5xl mb-4 block">{useCase.icon}</span>
                <h3 className="text-xl font-black uppercase mb-2">
                  {useCase.title}
                </h3>
                <p className="font-bold text-black/70 mb-4">{useCase.desc}</p>
                <div className="bg-[#FFFEF0] border-2 border-black p-3">
                  <p className="text-sm font-bold text-[#FF006E] italic">
                    {useCase.example}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Technology Section */}
      <section className="py-16 md:py-24 px-4 md:px-6 bg-black text-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tight">
              Enterprise-Grade AI
              <span className="block text-[#00FFFF]">Under the Hood</span>
            </h2>
          </div>
          <div className="grid lg:grid-cols-2 gap-8 items-center">
            {/* Tech Flow Diagram */}
            <div className="bg-[#1a1a1a] border-4 border-white p-6 md:p-8">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                {["Upload", "Process", "Search", "Answer"].map((step, i) => (
                  <React.Fragment key={step}>
                    <div className="bg-[#CCFF00] border-4 border-black px-4 py-3 text-black font-black uppercase text-center min-w-[100px]">
                      {step}
                    </div>
                    {i < 3 && (
                      <span className="text-[#00FFFF] font-black text-2xl hidden md:block">
                        →
                      </span>
                    )}
                    {i < 3 && (
                      <span className="text-[#00FFFF] font-black text-2xl block md:hidden">
                        ↓
                      </span>
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>

            {/* Tech List */}
            <div className="space-y-4">
              {[
                {
                  tech: "GPT-4o",
                  desc: "For intelligent, context-aware answers",
                },
                {
                  tech: "Advanced OCR with Tesseract",
                  desc: "Extract text from scanned documents",
                },
                {
                  tech: "Vector Database",
                  desc: "Semantic search with Pinecone",
                },
                { tech: "AI Reranking", desc: "Precision results with Cohere" },
                {
                  tech: "PostgreSQL Storage",
                  desc: "Secure, reliable data persistence",
                },
              ].map((item, i) => (
                <div
                  key={i}
                  className="flex items-start gap-4 bg-[#1a1a1a] border-4 border-white p-4"
                >
                  <span className="text-[#00FFFF] font-black text-xl">✓</span>
                  <div>
                    <span className="font-black text-[#FFFF00]">
                      {item.tech}
                    </span>
                    <p className="text-white/70 font-bold text-sm">
                      {item.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Comparison Table */}
      <section className="py-16 md:py-24 px-4 md:px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-5xl font-black text-black uppercase tracking-tight">
              Why TheMindSurf?
            </h2>
          </div>
          <div className="bg-white border-4 border-black shadow-[8px_8px_0px_#000] overflow-hidden">
            <div className="grid grid-cols-3 bg-[#FFFF00] border-b-4 border-black">
              <div className="p-4 font-black uppercase text-sm md:text-base">
                Feature
              </div>
              <div className="p-4 font-black uppercase text-sm md:text-base text-center border-l-4 border-black">
                TheMindSurf
              </div>
              <div className="p-4 font-black uppercase text-sm md:text-base text-center border-l-4 border-black">
                Traditional Search
              </div>
            </div>
            {comparisonFeatures.map((item, i) => (
              <div
                key={i}
                className={`grid grid-cols-3 ${
                  i < comparisonFeatures.length - 1
                    ? "border-b-4 border-black"
                    : ""
                }`}
              >
                <div className="p-4 font-bold text-sm md:text-base">
                  {item.feature}
                </div>
                <div className="p-4 text-center border-l-4 border-black bg-[#CCFF00]">
                  <span className="text-2xl">✓</span>
                </div>
                <div className="p-4 text-center border-l-4 border-black bg-[#FFFEF0]">
                  <span className="text-2xl text-[#FF006E]">✗</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section
        id="pricing"
        className="py-16 md:py-24 px-4 md:px-6 bg-[#FF006E]"
      >
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-5xl font-black text-white uppercase tracking-tight">
              Simple, Credit-Based Pricing
            </h2>
          </div>

          {/* Main Pricing Card */}
          <div className="max-w-3xl mx-auto">
            <div
              className="bg-white border-4 border-black p-8 md:p-12"
              style={{ boxShadow: "12px 12px 0px #000000" }}
            >
              <div className="text-center mb-8">
                <div className="inline-block px-6 py-3 bg-[#00FFFF] border-4 border-black mb-6">
                  <span className="text-4xl md:text-5xl font-black text-black">
                    3 CREDITS
                  </span>
                </div>
                <h3 className="text-2xl md:text-3xl font-black text-black uppercase mb-2">
                  Free to Start
                </h3>
                <p className="text-base md:text-lg font-bold text-black/70">
                  Every new user starts with 3 free credits
                </p>
              </div>

              {/* How it Works */}
              <div className="space-y-6 mb-8">
                <div className="flex items-start gap-4 p-4 bg-[#FFFEF0] border-2 border-black">
                  <span className="text-3xl shrink-0">🎁</span>
                  <div>
                    <h4 className="font-black text-black uppercase mb-1">
                      Start Free
                    </h4>
                    <p className="text-sm font-bold text-black/70">
                      Sign up and get 3 credits immediately to explore all
                      features
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 bg-[#FFFEF0] border-2 border-black">
                  <span className="text-3xl shrink-0">💳</span>
                  <div>
                    <h4 className="font-black text-black uppercase mb-1">
                      Request More Credits
                    </h4>
                    <p className="text-sm font-bold text-black/70">
                      When your credits run out, simply request more from our
                      admin team
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 bg-[#FFFEF0] border-2 border-black">
                  <span className="text-3xl shrink-0">⚡</span>
                  <div>
                    <h4 className="font-black text-black uppercase mb-1">
                      Pay-As-You-Use
                    </h4>
                    <p className="text-sm font-bold text-black/70">
                      Credits only used for AI-enhanced processing and advanced
                      features
                    </p>
                  </div>
                </div>
              </div>

              {/* Features List */}
              <div className="border-t-4 border-black pt-6 mb-8">
                <h4 className="font-black text-black uppercase mb-4 text-center">
                  What You Get:
                </h4>
                <div className="grid md:grid-cols-2 gap-3">
                  {[
                    "Hi-Res OCR Processing",
                    "AI-Enhanced Chunking",
                    "Multi-Document Search",
                    "Unlimited Namespaces",
                    "Source Citations",
                    "Table & Image Extraction",
                    "Real-Time Answers",
                    "Secure Cloud Storage",
                  ].map((feature, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="text-[#CCFF00] text-xl shrink-0">✓</span>
                      <span className="text-sm font-bold text-black">
                        {feature}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* CTA Button */}
              <Link href="/register">
                <button className="w-full py-4 bg-[#FF006E] text-white font-black uppercase border-4 border-black shadow-[6px_6px_0px_#000] hover:shadow-[8px_8px_0px_#000] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all duration-100 text-lg">
                  START WITH 3 FREE CREDITS →
                </button>
              </Link>
            </div>
          </div>

          <p className="text-center text-white font-bold mt-8 text-lg">
            No credit card required • Request more credits anytime • Fair &
            transparent pricing
          </p>
        </div>
      </section>

      {/* Security & Trust Section */}
      <section className="py-16 md:py-24 px-4 md:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-5xl font-black text-black uppercase tracking-tight">
              Your Documents Are
              <span className="block text-[#FF006E]">Safe With Us</span>
            </h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {[
              {
                icon: "🔒",
                title: "Encrypted Storage",
                desc: "AES-256 encryption",
              },
              {
                icon: "🛡️",
                title: "Enterprise Security",
                desc: "Bank-grade protection",
              },
              { icon: "🌍", title: "GDPR Ready", desc: "Full compliance" },
              { icon: "⚡", title: "99.9% Uptime", desc: "Always available" },
            ].map((badge, i) => (
              <div
                key={i}
                className="bg-white border-4 border-black p-4 md:p-6 text-center shadow-[4px_4px_0px_#000]"
              >
                <span className="text-4xl md:text-5xl mb-3 block">
                  {badge.icon}
                </span>
                <h3 className="font-black uppercase text-sm md:text-base mb-1">
                  {badge.title}
                </h3>
                <p className="font-bold text-black/60 text-xs md:text-sm">
                  {badge.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Real Impact Section */}
      <section className="py-16 md:py-24 px-4 md:px-6 bg-[#00FFFF]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-5xl font-black text-black uppercase tracking-tight">
              Real Results
              <span className="block">From Day One</span>
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: "⚡",
                metric: "10x Faster",
                title: "Document Research",
                desc: "Find information in seconds instead of spending hours manually scrolling through PDFs",
                color: "#FFFF00",
              },
              {
                icon: "🎯",
                metric: "95%+",
                title: "Accuracy Rate",
                desc: "AI-powered semantic search with exact source citations means you can trust every answer",
                color: "#FF006E",
              },
              {
                icon: "💰",
                metric: "70% Savings",
                title: "Time & Resources",
                desc: "Stop paying teams to manually search documents. Automate the grunt work, focus on insights",
                color: "#CCFF00",
              },
            ].map((benefit, i) => (
              <div
                key={i}
                className="bg-white border-4 border-black p-6 shadow-[6px_6px_0px_#000] hover:shadow-[8px_8px_0px_#000] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all duration-100"
              >
                <div className="text-center mb-4">
                  <span className="text-5xl mb-3 block">{benefit.icon}</span>
                  <div
                    className="inline-block px-4 py-2 border-4 border-black font-black text-xl md:text-2xl"
                    style={{ backgroundColor: benefit.color }}
                  >
                    {benefit.metric}
                  </div>
                </div>
                <h3 className="text-xl font-black uppercase mb-3 text-center">
                  {benefit.title}
                </h3>
                <p className="font-bold text-black/70 text-center">
                  {benefit.desc}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-12 text-center">
            <div className="inline-block bg-black border-4 border-black px-6 py-4 shadow-[6px_6px_0px_#FFFF00]">
              <p className="text-white font-black text-lg md:text-xl uppercase">
                🚀 Join {stats?.total_users.toLocaleString() || "thousands of"}+
                users already saving time
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-16 md:py-24 px-4 md:px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-5xl font-black text-black uppercase tracking-tight">
              Frequently Asked
              <span className="block text-[#FF006E]">Questions</span>
            </h2>
          </div>
          <div className="space-y-4">
            {faqData.map((faq, i) => (
              <FAQItem
                key={i}
                question={faq.question}
                answer={faq.answer}
                isOpen={openFAQ === i}
                onClick={() => setOpenFAQ(openFAQ === i ? null : i)}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-16 md:py-24 px-4 md:px-6 bg-[#FFFF00]">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-5xl font-black text-black uppercase tracking-tight mb-4">
            Ready to Transform How You
            <span className="block text-[#FF006E]">Work With Documents?</span>
          </h2>
          <p className="text-lg md:text-xl font-bold text-black/70 mb-8">
            Join thousands of professionals who've already made the switch
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
            <Link href="/register">
              <button className="w-full sm:w-auto px-8 py-4 bg-[#FF006E] text-white font-black uppercase border-4 border-black shadow-[6px_6px_0px_#000] hover:shadow-[8px_8px_0px_#000] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all duration-100 text-lg">
                Start Free Trial →
              </button>
            </Link>
            <a href="#faq" className="w-full sm:w-auto">
              <button className="w-full sm:w-auto px-8 py-4 bg-white text-black font-black uppercase border-4 border-black shadow-[6px_6px_0px_#000] hover:shadow-[8px_8px_0px_#000] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all duration-100 text-lg">
                💡 Learn More
              </button>
            </a>
          </div>
          <p className="font-bold text-black/60">
            No credit card required • 3 free credits to start
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-black text-white py-12 md:py-16 px-4 md:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            <div>
              <h3 className="font-black uppercase text-[#FFFF00] mb-4">
                Product
              </h3>
              <ul className="space-y-2">
                <li>
                  <a
                    href="#features"
                    className="font-bold text-white/70 hover:text-[#00FFFF] transition-colors"
                  >
                    Features
                  </a>
                </li>
                <li>
                  <a
                    href="#pricing"
                    className="font-bold text-white/70 hover:text-[#00FFFF] transition-colors"
                  >
                    Pricing
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="font-bold text-white/70 hover:text-[#00FFFF] transition-colors"
                  >
                    Use Cases
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="font-bold text-white/70 hover:text-[#00FFFF] transition-colors"
                  >
                    API Docs
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-black uppercase text-[#FFFF00] mb-4">
                Company
              </h3>
              <ul className="space-y-2">
                <li>
                  <a
                    href="#"
                    className="font-bold text-white/70 hover:text-[#00FFFF] transition-colors"
                  >
                    About Us
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="font-bold text-white/70 hover:text-[#00FFFF] transition-colors"
                  >
                    Blog
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="font-bold text-white/70 hover:text-[#00FFFF] transition-colors"
                  >
                    Careers
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="font-bold text-white/70 hover:text-[#00FFFF] transition-colors"
                  >
                    Contact
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-black uppercase text-[#FFFF00] mb-4">
                Resources
              </h3>
              <ul className="space-y-2">
                <li>
                  <a
                    href="#"
                    className="font-bold text-white/70 hover:text-[#00FFFF] transition-colors"
                  >
                    Help Center
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="font-bold text-white/70 hover:text-[#00FFFF] transition-colors"
                  >
                    Tutorials
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="font-bold text-white/70 hover:text-[#00FFFF] transition-colors"
                  >
                    Status Page
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="font-bold text-white/70 hover:text-[#00FFFF] transition-colors"
                  >
                    Community
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-black uppercase text-[#FFFF00] mb-4">
                Legal
              </h3>
              <ul className="space-y-2">
                <li>
                  <a
                    href="#"
                    className="font-bold text-white/70 hover:text-[#00FFFF] transition-colors"
                  >
                    Privacy Policy
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="font-bold text-white/70 hover:text-[#00FFFF] transition-colors"
                  >
                    Terms of Service
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="font-bold text-white/70 hover:text-[#00FFFF] transition-colors"
                  >
                    Cookie Policy
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t-4 border-white/20 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="font-bold text-white/60 text-sm">
              © 2026 TheMindSurf — Built with RAG Technology
            </p>
            <div className="flex items-center gap-4">
              <a
                href="https://x.com/iamaswinth"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white/10 border-2 border-white/30 px-3 py-1 font-bold text-sm hover:bg-[#00FFFF] hover:text-black hover:border-[#00FFFF] transition-all"
              >
                Twitter
              </a>
              <a
                href="https://www.linkedin.com/in/aswinthraj-d-362a18291/"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white/10 border-2 border-white/30 px-3 py-1 font-bold text-sm hover:bg-[#00FFFF] hover:text-black hover:border-[#00FFFF] transition-all"
              >
                LinkedIn
              </a>
              <a
                href="https://github.com/iamaswinth/TheMindSurf"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white/10 border-2 border-white/30 px-3 py-1 font-bold text-sm hover:bg-[#00FFFF] hover:text-black hover:border-[#00FFFF] transition-all"
              >
                GitHub
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

// Loading spinner for auth check
function LoadingScreen() {
  return (
    <div className="min-h-screen bg-[#FFFEF0] flex items-center justify-center">
      <div className="bg-white border-4 border-black p-8 shadow-[8px_8px_0px_#000]">
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 border-4 border-black border-t-[#FF006E] animate-spin"></div>
          <span className="font-black text-xl uppercase">Loading...</span>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedNamespace, setSelectedNamespace] = useState<string>("");
  const [chatMode, setChatMode] = useState<ChatMode>("namespace");
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showCreateNamespaceModal, setShowCreateNamespaceModal] =
    useState(false);
  const [newNamespaceName, setNewNamespaceName] = useState("");
  const [newNamespaceDescription, setNewNamespaceDescription] = useState("");

  // Use real data from React Query hooks
  const { data: namespaces = [] } = useNamespaces();
  const { data: documents = [] } = useDocuments(
    selectedNamespace === "all" || !selectedNamespace
      ? undefined
      : selectedNamespace
  );
  const uploadMutation = useUploadDocument();
  const createNamespaceMutation = useCreateNamespace();
  const currentNamespace = namespaces.find(
    (ns) => ns.name === selectedNamespace
  );

  // Show loading screen while checking auth
  if (authLoading) {
    return <LoadingScreen />;
  }

  // Show landing page if not authenticated
  if (!isAuthenticated) {
    return <LandingPage />;
  }

  const handleSelectDocument = (docId: string) => {
    // Find the document to get its namespace
    const doc = documents.find((d) => d.id === docId);

    // Auto-select the document's namespace if it's different from current
    if (doc && doc.namespace !== selectedNamespace) {
      setSelectedNamespace(doc.namespace);
    }

    if (chatMode === "single") {
      setSelectedDocuments([docId]);
    } else if (chatMode === "multi") {
      if (!selectedDocuments.includes(docId)) {
        setSelectedDocuments([...selectedDocuments, docId]);
      }
    }
  };

  const handleDeselectDocument = (docId: string) => {
    setSelectedDocuments(selectedDocuments.filter((id) => id !== docId));
  };

  const handleModeChange = (mode: ChatMode) => {
    setChatMode(mode);
    if (mode === "namespace") {
      setSelectedDocuments([]);
    }
  };

  const handleUpload = async (
    file: File,
    settings: UploadSettings
  ): Promise<MultimodalProcessResponse> => {
    try {
      const response = await uploadMutation.mutateAsync({ file, settings });
      // Don't close modal here - let UploadModal show success screen
      // Modal will close when user clicks action buttons
      console.log("Upload successful:", response);
      return response;
    } catch (error) {
      console.error("Upload failed:", error);
      throw error;
    }
  };

  const handleCreateNamespace = async () => {
    if (newNamespaceName.trim()) {
      try {
        const newNamespace = await createNamespaceMutation.mutateAsync({
          name: newNamespaceName.trim(),
          description: newNamespaceDescription.trim() || undefined,
        });
        setNewNamespaceName("");
        setNewNamespaceDescription("");
        setShowCreateNamespaceModal(false);
        setSelectedNamespace(newNamespace.name);
      } catch (error) {
        console.error("Failed to create namespace:", error);
      }
    }
  };

  const canStartChat = () => {
    if (!selectedNamespace) return false;
    if (chatMode === "namespace") return true;
    if (chatMode === "single") return selectedDocuments.length === 1;
    if (chatMode === "multi") return selectedDocuments.length > 0;
    return false;
  };

  const getSelectedDocumentName = () => {
    if (chatMode === "single" && selectedDocuments.length === 1) {
      const doc = documents.find((d) => d.id === selectedDocuments[0]);
      return doc?.name;
    }
    return undefined;
  };

  return (
    <div className="flex h-screen bg-[#FFFEF0]">
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar - NEO-BRUTALIST */}
        <header className="h-16 md:h-20 bg-[#FFFF00] border-b-4 border-black flex items-center justify-between px-3 md:px-6">
          <div className="flex items-center gap-2 md:gap-4 min-w-0 flex-1">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 md:p-3 text-black bg-white border-4 border-black shadow-[4px_4px_0px_#000] hover:shadow-[6px_6px_0px_#000] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all duration-100 shrink-0"
            >
              <MenuIcon size={20} />
            </button>
            <h1 className="text-lg md:text-2xl font-black text-black uppercase tracking-tight truncate">
              DASHBOARD
            </h1>
          </div>
          <div className="flex items-center gap-2 md:gap-4 shrink-0">
            <ModeBadge
              mode={chatMode}
              documentCount={documents.length}
              selectedCount={selectedDocuments.length}
              documentName={getSelectedDocumentName()}
            />
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-3 md:p-6">
          <div className="max-w-5xl mx-auto space-y-4 md:space-y-8">
            {/* Namespace Selector */}
            <Card className="p-4 md:p-6" color="white">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                <h2 className="text-base md:text-xl font-black text-black uppercase tracking-tight flex items-center gap-2">
                  <span className="inline-block w-3 h-3 md:w-4 md:h-4 bg-[#00FFFF] border-2 border-black shrink-0"></span>
                  <span className="truncate">SELECT NAMESPACE</span>
                </h2>
                <Button
                  variant="primary"
                  leftIcon={<PlusIcon size={16} />}
                  onClick={() => setShowCreateNamespaceModal(true)}
                  className="w-full sm:w-auto"
                >
                  NEW
                </Button>
              </div>
              <Select
                options={namespaces.map((ns) => ({
                  value: ns.name,
                  label: `${ns.name} (${ns.document_count} documents)`,
                }))}
                value={selectedNamespace}
                onChange={setSelectedNamespace}
                placeholder="Select a namespace"
              />
            </Card>

            {/* Mode Selector */}
            <Card className="p-4 md:p-6" color="cyan">
              <h2 className="text-base md:text-xl font-black text-black mb-4 md:mb-6 uppercase tracking-tight flex items-center gap-2">
                <span className="inline-block w-3 h-3 md:w-4 md:h-4 bg-[#FF006E] border-2 border-black shrink-0"></span>
                <span className="truncate">CHAT MODE SELECTION</span>
              </h2>
              <ModeSelector mode={chatMode} onChange={handleModeChange} />
            </Card>

            {/* Documents List */}
            <Card className="p-4 md:p-6" color="lime">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 md:mb-6">
                <h2 className="text-base md:text-xl font-black text-black uppercase tracking-tight flex items-center gap-2">
                  <span className="inline-block w-3 h-3 md:w-4 md:h-4 bg-[#FFFF00] border-2 border-black shrink-0"></span>
                  <span className="truncate">
                    DOCUMENTS ({documents.length})
                  </span>
                </h2>
                <Button
                  variant="secondary"
                  size="sm"
                  leftIcon={<PlusIcon size={16} />}
                  onClick={() => setShowUploadModal(true)}
                  className="w-full sm:w-auto"
                >
                  Upload New
                </Button>
              </div>

              <DocumentList
                documents={documents}
                mode={chatMode}
                selectedDocuments={selectedDocuments}
                onSelect={handleSelectDocument}
                onDeselect={handleDeselectDocument}
              />
            </Card>

            {/* Start Chat Button */}
            <div className="flex justify-end">
              <Link
                href={`/chat?namespace=${encodeURIComponent(
                  selectedNamespace
                )}&mode=${chatMode}${
                  chatMode === "single" && selectedDocuments.length === 1
                    ? `&documentId=${encodeURIComponent(selectedDocuments[0])}`
                    : ""
                }${
                  chatMode === "multi" && selectedDocuments.length > 0
                    ? `&documentIds=${encodeURIComponent(
                        selectedDocuments.join(",")
                      )}`
                    : ""
                }`}
                className="w-full sm:w-auto"
              >
                <Button
                  variant="primary"
                  size="lg"
                  disabled={!canStartChat()}
                  rightIcon={<ChevronRightIcon size={20} />}
                  className="w-full sm:w-auto"
                >
                  <span className="hidden sm:inline">START CHAT →</span>
                  <span className="sm:hidden">START CHAT</span>
                </Button>
              </Link>
            </div>
          </div>
        </main>
      </div>

      {/* Upload Modal */}
      <UploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onUpload={handleUpload}
        namespaces={namespaces}
        currentNamespace={currentNamespace?.name}
        uploadProgress={uploadMutation.uploadProgress}
      />

      {/* Create Namespace Modal */}
      {showCreateNamespaceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 md:p-4">
          <div
            className="bg-white border-4 border-black max-w-md w-full animate-slideInUp max-h-[90vh] overflow-y-auto"
            style={{ boxShadow: "8px 8px 0px #000000" }}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-4 md:px-6 py-3 md:py-4 bg-[#00FFFF] border-b-4 border-black">
              <h2 className="text-base md:text-xl font-black text-black uppercase tracking-tight flex items-center gap-2 min-w-0">
                <FolderIcon size={20} className="md:w-6 md:h-6 shrink-0" />
                <span className="truncate">CREATE NAMESPACE</span>
              </h2>
              <button
                onClick={() => {
                  setShowCreateNamespaceModal(false);
                  setNewNamespaceName("");
                  setNewNamespaceDescription("");
                }}
                className="w-9 h-9 md:w-10 md:h-10 bg-black text-white flex items-center justify-center hover:bg-[#FF006E] transition-colors border-2 border-black shrink-0"
              >
                <XIcon size={18} className="md:w-5 md:h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-4 md:p-6 bg-[#FFFEF0] space-y-4">
              <Input
                label="Namespace Name"
                placeholder="e.g., medical-docs, research-papers"
                value={newNamespaceName}
                onChange={(e) => setNewNamespaceName(e.target.value)}
                required
              />
              <Input
                label="Description (Optional)"
                placeholder="Brief description of this namespace"
                value={newNamespaceDescription}
                onChange={(e) => setNewNamespaceDescription(e.target.value)}
              />
              <p className="text-xs font-bold text-black/60">
                Namespaces help organize your documents into collections.
              </p>
            </div>

            {/* Modal Footer */}
            <div className="flex flex-col sm:flex-row justify-end gap-3 px-4 md:px-6 py-4 bg-white border-t-4 border-black">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowCreateNamespaceModal(false);
                  setNewNamespaceName("");
                  setNewNamespaceDescription("");
                }}
                className="w-full sm:w-auto order-2 sm:order-1"
              >
                CANCEL
              </Button>
              <Button
                variant="primary"
                onClick={handleCreateNamespace}
                disabled={
                  !newNamespaceName.trim() || createNamespaceMutation.isPending
                }
                leftIcon={<PlusIcon size={16} />}
                className="w-full sm:w-auto order-1 sm:order-2"
              >
                {createNamespaceMutation.isPending ? "CREATING..." : "CREATE"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

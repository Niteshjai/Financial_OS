import { useNavigate } from 'react-router-dom';
import { ArrowLeft, BookOpen, MessageCircle, FileText, ExternalLink, Mail } from 'lucide-react';

export default function Help() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#efeeea] text-zinc-900 font-sans pb-20">
      <header className="sticky top-0 z-20 bg-[#efeeea]/80 backdrop-blur-xl border-b border-zinc-200/50">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <button 
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 text-zinc-500 hover:text-zinc-900 transition font-medium text-sm"
          >
            <ArrowLeft className="size-4" />
            Back to Dashboard
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 mt-12">
        <div className="mb-10 text-center">
          <h1 className="text-4xl font-display font-light tracking-tight text-zinc-900">How can we help?</h1>
          <p className="text-zinc-500 mt-3 text-lg">Search for answers or reach out to our support team.</p>
        </div>

        <div className="relative max-w-xl mx-auto mb-12">
          <input 
            type="text" 
            placeholder="Search knowledge base..." 
            className="w-full bg-white rounded-full px-6 py-4 shadow-sm border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 transition"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12">
          <SupportCard 
            icon={<BookOpen className="size-5 text-sky-500" />} 
            title="User Guides" 
            desc="Step-by-step tutorials on using AssetMap." 
          />
          <SupportCard 
            icon={<FileText className="size-5 text-emerald-500" />} 
            title="FAQs" 
            desc="Answers to commonly asked questions." 
          />
          <SupportCard 
            icon={<MessageCircle className="size-5 text-amber-500" />} 
            title="Live Chat" 
            desc="Chat with our support team in real-time." 
          />
          <SupportCard 
            icon={<Mail className="size-5 text-rose-500" />} 
            title="Email Support" 
            desc="Send us an email for complex queries." 
          />
        </div>

        <div className="bg-zinc-900 text-white rounded-[24px] p-8 sm:p-10 text-center relative overflow-hidden shadow-xl">
          <div className="relative z-10">
            <h2 className="text-2xl font-display font-semibold mb-2">Still need help?</h2>
            <p className="text-white/70 mb-6 text-sm">Our experts are available 24/7 to assist you with any issues.</p>
            <button className="bg-lime-400 text-zinc-900 px-6 py-2.5 rounded-full font-semibold text-sm hover:bg-lime-300 transition active:scale-95 inline-flex items-center gap-2">
              Contact Support <ExternalLink className="size-4" />
            </button>
          </div>
          {/* Decorative background elements */}
          <div className="absolute -top-24 -right-24 size-64 bg-white/5 rounded-full blur-3xl" />
          <div className="absolute -bottom-24 -left-24 size-64 bg-lime-400/10 rounded-full blur-3xl" />
        </div>
      </main>
    </div>
  );
}

function SupportCard({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <button className="bg-white p-6 rounded-[24px] shadow-sm border border-zinc-100 hover:shadow-md hover:border-zinc-200 transition text-left group">
      <div className="p-3 bg-zinc-50 rounded-xl inline-block mb-4 group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <h3 className="text-lg font-display font-semibold text-zinc-900 mb-1">{title}</h3>
      <p className="text-sm text-zinc-500">{desc}</p>
    </button>
  );
}

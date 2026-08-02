import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { ArrowLeft, BookOpen, MessageCircle, FileText, ExternalLink, Mail, Check, X, Send, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';

const SUPPORT_OPTIONS = [
  { id: 'guides', title: 'User Guides', desc: 'Step-by-step tutorials on using AssetMap.', icon: <BookOpen className="size-5 text-sky-500" /> },
  { id: 'faqs', title: 'FAQs', desc: 'Answers to commonly asked questions.', icon: <FileText className="size-5 text-emerald-500" /> },
  { id: 'chat', title: 'Live Chat', desc: 'Chat with our support team in real-time.', icon: <MessageCircle className="size-5 text-amber-500" /> },
  { id: 'contact', title: 'Email Support', desc: 'Send us an email for complex queries.', icon: <Mail className="size-5 text-rose-500" /> },
];

const FAQS_DATA = [
  { q: "How do I add a new asset?", a: "Go to the Dashboard, click the '+ Add Asset' button at the top right, and follow the wizard to securely connect your accounts." },
  { q: "Is my data secure?", a: "Yes. We use bank-level encryption and do not store your raw credentials. Data is synced read-only via India's Account Aggregator framework." },
  { q: "How do I update my profile?", a: "Navigate to the Profile page using the sidebar menu, where you can update your contact information and view your KYC status." },
];

export default function Help() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMsg, setToastMsg] = useState('');
  const [activeModal, setActiveModal] = useState<string | null>(null);
  
  // Chat state
  const [chatMsg, setChatMsg] = useState('');
  const [chatHistory, setChatHistory] = useState<{sender: 'user'|'agent', text: string}[]>([{sender: 'agent', text: 'Hi there! How can I help you today?'}]);

  // FAQ state
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  // Email state
  const [contactSubject, setContactSubject] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  async function handleSendEmail() {
    if (!contactSubject.trim() || !contactMessage.trim()) return;
    try {
      setIsSending(true);
      await api.post('/support/contact', { subject: contactSubject, message: contactMessage });
      showToast('Message sent successfully! We will reply soon.');
      setContactSubject('');
      setContactMessage('');
    } catch (err) {
      showToast('Failed to send message. Please try again later.');
    } finally {
      setIsSending(false);
    }
  }

  function showToast(msg: string) {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 2500);
    setActiveModal(null); // close any open modal on success
  }

  const filteredOptions = SUPPORT_OPTIONS.filter(opt => 
    opt.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    opt.desc.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen text-zinc-900 font-sans pb-20 relative" style={{ contain: 'layout style', background: 'linear-gradient(145deg, #e4e4e7 0%, #d4d4d8 30%, #a1a1aa 60%, #d4d4d8 80%, #71717a 100%)' }}>
      
      {/* Toast Notification */}
      <div
        className={`fixed top-6 right-6 z-[60] flex items-center gap-2 bg-zinc-900 text-white px-5 py-3 rounded-2xl shadow-2xl text-sm font-medium transition-all duration-300 ${
          toastMsg ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'
        }`}
      >
        <Check className="size-4 text-lime-400" strokeWidth={2.5} />
        {toastMsg}
      </div>

      <header className="sticky top-0 z-20 pt-4">
        <div className="w-full px-6 py-2 flex items-center justify-between">
          <button 
            onClick={() => {
              if (window.history.length > 2) {
                navigate(-1);
              } else {
                navigate('/dashboard');
              }
            }}
            className="flex items-center gap-2 text-zinc-600 hover:text-zinc-900 bg-white/50 hover:bg-white/80 border border-zinc-300/50 shadow-sm px-3 py-1.5 rounded-full transition-all font-medium text-sm backdrop-blur-sm"
          >
            <ArrowLeft className="size-4" />
            Back
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 mt-12 relative z-10">
        <div className="mb-10 text-center">
          <h1 className="text-4xl font-display font-light tracking-tight text-zinc-900">How can we help?</h1>
          <p className="text-zinc-600 mt-3 text-lg">Search for answers or reach out to our support team.</p>
        </div>

        <div className="relative max-w-3xl w-full mx-auto mb-12">
          <input 
            type="text" 
            placeholder="Search knowledge base..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/80 backdrop-blur-lg rounded-full px-6 py-4 shadow-sm border border-zinc-200/50 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 transition"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12">
          {filteredOptions.length > 0 ? (
            filteredOptions.map((opt) => (
              <SupportCard 
                key={opt.id}
                icon={opt.icon} 
                title={opt.title} 
                desc={opt.desc} 
                onClick={() => setActiveModal(opt.id)}
              />
            ))
          ) : (
            <div className="col-span-1 md:col-span-2 text-center py-12 bg-white/40 rounded-[24px] border border-zinc-200/50 backdrop-blur-sm">
              <p className="text-zinc-500 font-medium">No results found for "{searchQuery}"</p>
            </div>
          )}
        </div>

        <div className="bg-zinc-900 text-white rounded-[24px] p-8 sm:p-10 text-center relative overflow-hidden shadow-xl border border-zinc-800">
          <div className="relative z-10">
            <h2 className="text-2xl font-display font-semibold mb-2">Still need help?</h2>
            <p className="text-white/70 mb-6 text-sm">Our experts are available 24/7 to assist you with any issues.</p>
            <button 
              onClick={() => setActiveModal('contact')}
              className="bg-lime-400 text-zinc-900 px-6 py-2.5 rounded-full font-semibold text-sm hover:bg-lime-300 transition active:scale-95 inline-flex items-center gap-2"
            >
              Contact Support <ExternalLink className="size-4" />
            </button>
          </div>
          <div className="absolute -top-24 -right-24 size-64 bg-white/5 rounded-full blur-3xl" />
          <div className="absolute -bottom-24 -left-24 size-64 bg-lime-400/10 rounded-full blur-3xl" />
        </div>
      </main>

      {/* --- MODALS --- */}
      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/40 backdrop-blur-sm transition-opacity">
          
          {/* Contact / Email Form Modal */}
          {(activeModal === 'contact' || activeModal === 'email') && (
            <div className="bg-white/90 backdrop-blur-xl w-[90vw] md:w-[400px] rounded-[24px] shadow-2xl border border-zinc-200/50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              <div className="p-6 border-b border-zinc-100 flex items-center justify-between">
                <h2 className="text-xl font-display font-semibold flex items-center gap-2"><Mail className="size-5 text-rose-500"/> Send us a message</h2>
                <button onClick={() => setActiveModal(null)} className="p-2 hover:bg-zinc-100 rounded-full transition"><X className="size-4"/></button>
              </div>
              <div className="p-6 flex flex-col gap-4">
                <div>
                  <label className="text-xs font-medium text-zinc-500 mb-1 block">Subject</label>
                  <input 
                    type="text" 
                    value={contactSubject}
                    onChange={(e) => setContactSubject(e.target.value)}
                    disabled={isSending}
                    placeholder="What is this regarding?" 
                    className="w-full border border-zinc-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 bg-white/50 disabled:opacity-50" 
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-zinc-500 mb-1 block">Message</label>
                  <textarea 
                    rows={4} 
                    value={contactMessage}
                    onChange={(e) => setContactMessage(e.target.value)}
                    disabled={isSending}
                    placeholder="Describe your issue in detail..." 
                    className="w-full border border-zinc-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 bg-white/50 resize-none disabled:opacity-50"
                  ></textarea>
                </div>
                <button 
                  onClick={handleSendEmail} 
                  disabled={isSending || !contactSubject.trim() || !contactMessage.trim()}
                  className="w-full bg-zinc-900 flex items-center justify-center gap-2 text-white rounded-xl py-3 text-sm font-medium hover:bg-zinc-800 transition active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100"
                >
                  {isSending ? <><Loader2 className="size-4 animate-spin"/> Sending...</> : 'Send Message'}
                </button>
              </div>
            </div>
          )}

          {/* FAQs Modal */}
          {activeModal === 'faqs' && (
            <div className="bg-white/90 backdrop-blur-xl w-[90vw] md:w-[500px] rounded-[24px] shadow-2xl border border-zinc-200/50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              <div className="p-6 border-b border-zinc-100 flex items-center justify-between">
                <h2 className="text-xl font-display font-semibold flex items-center gap-2"><FileText className="size-5 text-emerald-500"/> Frequently Asked Questions</h2>
                <button onClick={() => setActiveModal(null)} className="p-2 hover:bg-zinc-100 rounded-full transition"><X className="size-4"/></button>
              </div>
              <div className="p-2 max-h-[60vh] overflow-y-auto">
                {FAQS_DATA.map((faq, i) => (
                  <div key={i} className="border-b border-zinc-100 last:border-0">
                    <button onClick={() => setOpenFaqIndex(openFaqIndex === i ? null : i)} className="w-full text-left p-4 flex items-center justify-between hover:bg-zinc-50/50 transition">
                      <span className="font-medium text-sm text-zinc-800">{faq.q}</span>
                      {openFaqIndex === i ? <ChevronUp className="size-4 text-zinc-400 shrink-0" /> : <ChevronDown className="size-4 text-zinc-400 shrink-0" />}
                    </button>
                    {openFaqIndex === i && (
                      <div className="px-4 pb-4 text-sm text-zinc-600 animate-in slide-in-from-top-1 fade-in">
                        {faq.a}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* User Guides Modal */}
          {activeModal === 'guides' && (
            <div className="bg-white/90 backdrop-blur-xl w-[90vw] md:w-[500px] rounded-[24px] shadow-2xl border border-zinc-200/50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              <div className="p-6 border-b border-zinc-100 flex items-center justify-between">
                <h2 className="text-xl font-display font-semibold flex items-center gap-2"><BookOpen className="size-5 text-sky-500"/> User Guides</h2>
                <button onClick={() => setActiveModal(null)} className="p-2 hover:bg-zinc-100 rounded-full transition"><X className="size-4"/></button>
              </div>
              <div className="p-6 flex flex-col gap-3">
                {['Getting Started with AssetMap', 'How to Link your Bank Accounts safely', 'Understanding your Net Worth Chart', 'Exporting your data for Tax Filing'].map((guide, i) => (
                  <button key={i} onClick={() => showToast(`Opening guide: ${guide}`)} className="flex items-center justify-between gap-3 p-4 rounded-xl border border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50 bg-white transition text-left group">
                    <span className="text-sm font-medium text-zinc-700 group-hover:text-zinc-900 transition">{guide}</span>
                    <ExternalLink className="size-4 text-zinc-400 group-hover:text-zinc-600 shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Live Chat Modal */}
          {activeModal === 'chat' && (
            <div className="bg-white/90 backdrop-blur-xl w-[90vw] md:w-[400px] rounded-[24px] shadow-2xl border border-zinc-200/50 overflow-hidden flex flex-col h-[500px] animate-in zoom-in-95 duration-200 mb-20 md:mb-32">
              <div className="p-4 bg-zinc-900 text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <div className="size-8 rounded-full bg-lime-400 flex items-center justify-center text-zinc-900"><MessageCircle className="size-4"/></div>
                    <div className="absolute bottom-0 right-0 size-2.5 rounded-full bg-emerald-400 border-2 border-zinc-900"></div>
                  </div>
                  <div>
                    <h3 className="font-medium text-sm">AssetMap Support</h3>
                    <p className="text-[10px] text-white/60">Typically replies in a few minutes</p>
                  </div>
                </div>
                <button onClick={() => setActiveModal(null)} className="p-2 hover:bg-zinc-800 rounded-full transition"><X className="size-4"/></button>
              </div>
              <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-3 bg-zinc-50/50">
                {chatHistory.map((msg, i) => (
                  <div key={i} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`px-4 py-2 rounded-2xl max-w-[85%] text-sm ${msg.sender === 'user' ? 'bg-zinc-900 text-white rounded-br-sm' : 'bg-white border border-zinc-200 text-zinc-800 rounded-bl-sm shadow-sm'}`}>
                      {msg.text}
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-3 border-t border-zinc-200 bg-white flex items-center gap-2">
                <input 
                  type="text" 
                  value={chatMsg}
                  onChange={(e) => setChatMsg(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && chatMsg.trim()) {
                      setChatHistory([...chatHistory, {sender: 'user', text: chatMsg}]);
                      setChatMsg('');
                      setTimeout(() => {
                        setChatHistory(prev => [...prev, {sender: 'agent', text: 'Thank you for your message. An agent will be with you shortly.'}]);
                      }, 1000);
                    }
                  }}
                  placeholder="Type your message..." 
                  className="flex-1 bg-zinc-100 rounded-full px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-300"
                />
                <button 
                  onClick={() => {
                    if (chatMsg.trim()) {
                      setChatHistory([...chatHistory, {sender: 'user', text: chatMsg}]);
                      setChatMsg('');
                      setTimeout(() => setChatHistory(prev => [...prev, {sender: 'agent', text: 'An agent will be with you shortly.'}]), 1000);
                    }
                  }}
                  className="p-2.5 bg-lime-400 text-zinc-900 rounded-full hover:bg-lime-300 transition active:scale-95"
                >
                  <Send className="size-4" />
                </button>
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}

function SupportCard({ icon, title, desc, onClick }: { icon: React.ReactNode; title: string; desc: string; onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className="bg-white/80 backdrop-blur-lg p-6 rounded-[24px] shadow-sm border border-zinc-200/50 hover:shadow-md hover:border-zinc-300/50 transition text-left group"
    >
      <div className="p-3 bg-white/50 backdrop-blur-sm rounded-xl inline-block mb-4 border border-zinc-200/50 shadow-sm group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <h3 className="text-lg font-display font-semibold text-zinc-900 mb-1">{title}</h3>
      <p className="text-sm text-zinc-600">{desc}</p>
    </button>
  );
}

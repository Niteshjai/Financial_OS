import React from 'react';
import { ChevronDown, Edit2, RotateCw, Layers } from 'lucide-react';

export default function AnalyticsDashboard() {
  return (
    <div className="w-full max-w-[1400px] mx-auto pb-20">
      <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr_1.1fr] gap-6">
        
        {/* ════════ EXPENSES WIDGET ════════ */}
        <div className="bg-white rounded-[32px] p-8 shadow-sm flex flex-col relative overflow-hidden min-h-[480px] border border-zinc-100">
          <div className="flex justify-between items-start z-10">
            <h2 className="text-[28px] font-display font-medium text-zinc-900 tracking-tight">Expenses</h2>
            <button className="flex items-center gap-2 border border-zinc-200 rounded-full px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-50 transition">
              Year to date <ChevronDown className="size-4" strokeWidth={2} />
            </button>
          </div>

          {/* Futuristic Radial Chart */}
          <div className="absolute inset-0 flex items-center justify-center -translate-x-12 translate-y-8">
            <div className="relative size-[380px]">
              <svg viewBox="0 0 400 400" className="w-full h-full drop-shadow-xl" style={{ transform: 'rotate(-15deg)' }}>
                <defs>
                  <filter id="glow-blur" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="20" />
                  </filter>
                  <radialGradient id="grad-blue" cx="30%" cy="30%" r="70%">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.9" />
                    <stop offset="100%" stopColor="#1d4ed8" stopOpacity="0" />
                  </radialGradient>
                  <radialGradient id="grad-purple" cx="70%" cy="30%" r="70%">
                    <stop offset="0%" stopColor="#a855f7" stopOpacity="0.9" />
                    <stop offset="100%" stopColor="#7e22ce" stopOpacity="0" />
                  </radialGradient>
                  <radialGradient id="grad-green" cx="70%" cy="70%" r="70%">
                    <stop offset="0%" stopColor="#84cc16" stopOpacity="0.9" />
                    <stop offset="100%" stopColor="#4d7c0f" stopOpacity="0" />
                  </radialGradient>
                </defs>
                
                {/* Axes */}
                <line x1="200" y1="20" x2="200" y2="380" stroke="#e4e4e7" strokeWidth="2" />
                <line x1="20" y1="200" x2="380" y2="200" stroke="#e4e4e7" strokeWidth="2" />
                
                {/* Axis end markers */}
                <polygon points="195,20 205,20 200,10" fill="#18181b" />
                <polygon points="195,380 205,380 200,390" fill="#18181b" />
                <polygon points="20,195 20,205 10,200" fill="#18181b" />
                <polygon points="380,195 380,205 390,200" fill="#18181b" />

                {/* Slices */}
                {/* Blue Slice */}
                <path d="M 200 200 L 20 200 A 180 180 0 0 1 200 20 Z" fill="url(#grad-blue)" filter="url(#glow-blur)" />
                {/* Purple Slice */}
                <path d="M 200 200 L 200 20 A 180 180 0 0 1 360 110 Z" fill="url(#grad-purple)" filter="url(#glow-blur)" />
                {/* Green Slice */}
                <path d="M 200 200 L 360 110 A 180 180 0 0 1 350 300 Z" fill="url(#grad-green)" filter="url(#glow-blur)" />
              </svg>
              
              {/* Striped overlay (since SVG patterns don't blur cleanly in all browsers) */}
              <div className="absolute inset-0 pointer-events-none" style={{ clipPath: 'polygon(50% 50%, 87.5% 75%, 5% 50%)', background: 'repeating-linear-gradient(45deg, transparent, transparent 2px, #d4d4d8 2px, #d4d4d8 3px)', transform: 'rotate(-15deg)' }}></div>
              
              <div className="absolute top-[49%] left-[49%] size-2 rounded-full bg-zinc-900"></div>

              {/* Floating Tooltips */}
              <div className="absolute top-[65%] left-[60%] bg-white/80 backdrop-blur-xl border border-white rounded-[24px] p-4 shadow-xl w-36 z-20">
                <div className="flex items-center gap-2 mb-1">
                  <div className="size-5 rounded-full bg-lime-100 flex items-center justify-center shadow-[0_0_15px_rgba(132,204,22,0.4)]">
                    <span className="size-2 rounded-full bg-lime-400"></span>
                  </div>
                  <span className="text-[10px] text-zinc-500 font-medium">Automotive</span>
                </div>
                <p className="text-xl font-display font-medium text-zinc-900">$9,342</p>
              </div>

              <div className="absolute top-[80%] left-[30%] bg-white/80 backdrop-blur-xl border border-white rounded-[24px] p-4 shadow-xl w-36 z-20">
                <div className="flex items-center gap-2 mb-1">
                  <div className="size-5 rounded-full bg-blue-100 flex items-center justify-center shadow-[0_0_15px_rgba(59,130,246,0.4)]">
                    <span className="size-2 rounded-full bg-blue-500"></span>
                  </div>
                  <span className="text-[10px] text-zinc-500 font-medium">Meals & Food</span>
                </div>
                <p className="text-xl font-display font-medium text-zinc-900">$1,456</p>
              </div>
            </div>
          </div>

          <div className="mt-auto z-10 flex justify-between items-end">
            <div>
              <p className="text-[52px] font-display font-light text-zinc-900 leading-none tracking-tight">$87,121</p>
              <p className="text-zinc-500 mt-2 font-medium">Business Spendings</p>
            </div>
            <div className="flex flex-col gap-2">
              <button className="size-10 rounded-full border border-zinc-200 bg-white shadow-sm flex items-center justify-center text-zinc-400 hover:text-zinc-900 transition">
                <Layers className="size-4" />
              </button>
              <button className="size-10 rounded-full border border-zinc-200 bg-white shadow-sm flex items-center justify-center text-zinc-400 hover:text-zinc-900 transition font-light text-xl">+</button>
              <button className="size-10 rounded-full border border-zinc-200 bg-white shadow-sm flex items-center justify-center text-zinc-400 hover:text-zinc-900 transition font-light text-xl">−</button>
            </div>
          </div>
        </div>

        {/* ════════ BANK ACCOUNTS WIDGET ════════ */}
        <div className="bg-white rounded-[32px] p-8 shadow-sm flex flex-col border border-zinc-100">
          <div className="flex justify-between items-start mb-6">
            <h2 className="text-2xl font-display font-medium text-zinc-900 tracking-tight">Bank Accounts</h2>
            <div className="flex gap-2">
              <button className="size-9 rounded-full border border-zinc-200 flex items-center justify-center text-zinc-400 hover:text-zinc-900 hover:bg-zinc-50 transition"><Edit2 className="size-4" /></button>
              <button className="size-9 rounded-full border border-zinc-200 flex items-center justify-center text-zinc-400 hover:text-zinc-900 hover:bg-zinc-50 transition"><RotateCw className="size-4" /></button>
            </div>
          </div>

          <div className="flex items-center gap-2 mb-8">
            <span className="text-lime-400">✦</span>
            <span className="font-medium text-zinc-900 text-lg">Bank 1</span>
            <span className="text-[10px] text-zinc-400 ml-auto flex items-center gap-1">Updated 4 days ago <ChevronDown className="size-3" /></span>
          </div>

          <div className="flex justify-between items-end mb-10">
            <div>
              <p className="text-[10px] text-zinc-400 uppercase tracking-widest font-semibold mb-1">Bank Balance</p>
              <p className="text-3xl font-display text-zinc-900">$12,435</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-zinc-400 uppercase tracking-widest font-semibold mb-1">In QuickBooks</p>
              <p className="text-2xl font-display text-zinc-600">$4,987</p>
            </div>
          </div>

          <div className="flex justify-center items-center gap-6 mt-auto">
            <div className="size-[120px] rounded-full border border-dashed border-zinc-300 flex flex-col items-center justify-between py-2 relative">
              <span className="text-[10px] text-zinc-900">▲</span>
              <div className="absolute inset-0 m-auto size-[70px] bg-lime-400 rounded-full blur-md opacity-80 mix-blend-multiply"></div>
              <div className="absolute inset-0 m-auto size-[60px] bg-lime-400 rounded-full"></div>
              <span className="text-[10px] text-zinc-900">▼</span>
            </div>
            
            <div className="size-[80px] rounded-full border border-dashed border-zinc-300 flex flex-col items-center justify-between py-1.5 relative">
              <span className="text-[8px] text-zinc-900">▲</span>
              <div className="absolute inset-0 m-auto size-[40px] bg-blue-400 rounded-full blur-md opacity-80 mix-blend-multiply"></div>
              <div className="absolute inset-0 m-auto size-[35px] bg-blue-500 rounded-full"></div>
              <span className="text-[8px] text-zinc-900">▼</span>
            </div>

            <div className="flex flex-col items-center ml-4">
              <span className="text-5xl font-display font-light text-zinc-900">94</span>
              <span className="text-xs text-zinc-400 mt-1">To review</span>
            </div>
          </div>
          
          {/* Faded Next Bank */}
          <div className="flex items-center gap-2 mt-12 opacity-30">
            <span className="text-blue-500">✦</span>
            <span className="font-medium text-zinc-900 text-lg">Bank 2</span>
          </div>
        </div>

        {/* ════════ SALES WIDGET ════════ */}
        <div className="bg-white rounded-[32px] p-8 shadow-sm flex flex-col border border-zinc-100">
          <div className="flex justify-between items-start mb-8">
            <h2 className="text-2xl font-display font-medium text-zinc-900 tracking-tight">Sales</h2>
            <button className="flex items-center gap-2 border border-zinc-200 rounded-full px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-50 transition">
              This quarter <ChevronDown className="size-4" strokeWidth={2} />
            </button>
          </div>

          <div className="mb-12">
            <p className="text-[44px] font-display font-light text-lime-400 leading-none tracking-tight">$467,121</p>
            <p className="text-zinc-500 mt-2 font-medium text-sm">this quarter</p>
          </div>

          {/* Custom Step Chart */}
          <div className="mt-auto h-[180px] w-full flex items-end relative overflow-visible">
             
             {/* Bottom Line */}
             <div className="absolute bottom-0 w-full border-b-[1.5px] border-zinc-900 z-10 flex justify-between">
                <div className="size-2 bg-zinc-900 rounded-[2px] -translate-y-1/2 -ml-1"></div>
                <div className="size-2 bg-zinc-900 rounded-[2px] -translate-y-1/2 ml-16"></div>
                <div className="size-2 bg-zinc-900 rounded-[2px] -translate-y-1/2 ml-16"></div>
                <div className="size-2 bg-zinc-900 rounded-[2px] -translate-y-1/2 ml-auto -mr-1"></div>
             </div>

             {/* Bar 1 */}
             <div className="w-1/3 h-[70%] border-r-[1.5px] border-zinc-900 relative">
                <div className="absolute inset-0 opacity-40" style={{ background: 'repeating-linear-gradient(45deg, transparent, transparent 2px, #a1a1aa 2px, #a1a1aa 3px)' }}></div>
                <div className="absolute top-0 w-full h-1 bg-lime-400 shadow-[0_0_12px_rgba(132,204,22,0.8)] z-10"></div>
                <span className="absolute -top-7 left-0 text-sm font-medium text-zinc-900">$68k</span>
             </div>
             
             {/* Bar 2 */}
             <div className="w-1/3 h-[40%] border-r-[1.5px] border-zinc-900 relative bg-white">
                <div className="absolute inset-0 opacity-40" style={{ background: 'repeating-linear-gradient(45deg, transparent, transparent 2px, #a1a1aa 2px, #a1a1aa 3px)' }}></div>
                <div className="absolute top-0 w-full h-1 bg-purple-500 shadow-[0_0_12px_rgba(168,85,247,0.8)] z-10"></div>
                <span className="absolute -top-7 left-2 text-sm font-medium text-zinc-900">$49k</span>
             </div>

             {/* Bar 3 */}
             <div className="w-1/3 h-[90%] relative bg-white">
                <div className="absolute inset-0 opacity-40" style={{ background: 'repeating-linear-gradient(45deg, transparent, transparent 2px, #a1a1aa 2px, #a1a1aa 3px)' }}></div>
                <div className="absolute top-0 w-full h-1 bg-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.8)] z-10"></div>
                <span className="absolute -top-7 left-2 text-sm font-medium text-zinc-900">$96k</span>
             </div>
          </div>
        </div>

      </div>
    </div>
  );
}

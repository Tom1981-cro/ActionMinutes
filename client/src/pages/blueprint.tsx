import { useState, useRef, useEffect } from "react";
import { Link } from "wouter";
import { cn } from "@/lib/utils";
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { Bar } from 'react-chartjs-2';

// Register ChartJS components
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

// --- Component: Header ---
function Header({ currentView, setView }: { currentView: string, setView: (v: string) => void }) {
  return (
    <header className="fixed top-6 left-0 right-0 z-50 px-4 flex justify-center pointer-events-none font-outfit">
      <nav className="bg-white/90 backdrop-blur-xl border border-stone-200 shadow-soft rounded-full px-6 py-3 pointer-events-auto flex items-center gap-8">
        <Link href="/" className="flex items-center gap-2 mr-4 cursor-pointer">
          <div className="w-8 h-8 bg-teal-500 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-teal-500/30">A</div>
          <span className="font-bold text-slate-800 tracking-tight">ActionMinutes</span>
        </Link>
        
        <div className="hidden md:flex items-center gap-1 bg-stone-100/50 p-1 rounded-full">
          {['manifesto', 'simulator', 'architecture'].map((view) => (
            <button
              key={view}
              onClick={() => setView(view)}
              className={cn(
                "px-5 py-2 rounded-full text-sm font-medium transition-all duration-300 capitalize",
                currentView === view 
                  ? "bg-white text-teal-600 shadow-sm" 
                  : "text-slate-600 hover:text-teal-600"
              )}
            >
              {view === 'architecture' ? 'Tech Stack' : view}
            </button>
          ))}
        </div>
      </nav>
    </header>
  );
}

// --- Component: Manifesto ---
function ManifestoView({ setView }: { setView: (v: string) => void }) {
  const chartData = {
    labels: ['Manual Notes', 'ActionMinutes'],
    datasets: [{
      label: 'Minutes Spent',
      data: [45, 1],
      backgroundColor: ['#e7e5e4', '#14b8a6'], // stone-200 vs teal-500
      borderRadius: 20,
      barThickness: 50
    }]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#fff',
        titleColor: '#1e293b',
        bodyColor: '#334155',
        borderColor: '#e7e5e4',
        borderWidth: 1,
        padding: 12,
        displayColors: false,
        callbacks: {
          label: (ctx: any) => ctx.raw + ' minutes to process'
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: { display: false },
        ticks: { display: false }
      },
      x: {
        grid: { display: false },
        ticks: { font: { family: 'Outfit', size: 14 } }
      }
    },
    animation: {
      duration: 2000,
      easing: 'easeOutQuart'
    }
  };

  return (
    <section className="fade-in space-y-16 animate-in slide-in-from-bottom-5 duration-700">
      <div className="text-center max-w-2xl mx-auto space-y-6">
        <div className="inline-block px-4 py-1.5 rounded-full bg-teal-50 text-teal-600 text-sm font-semibold mb-4 border border-teal-100">
          Minutes &rarr; Actions &rarr; Follow-ups
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-slate-800 leading-tight">
          Turn messy notes into <br /> <span className="text-teal-500">calm, clear actions.</span>
        </h1>
        <p className="text-lg text-slate-500 leading-relaxed">
          ActionMinutes automates the anxiety of post-meeting cleanup. We convert raw thoughts into structured cards, follow-up drafts, and summaries in under 60 seconds. Work-first.
        </p>
        <button 
          onClick={() => setView('simulator')}
          className="hover-lift mt-4 px-8 py-4 bg-teal-500 text-white rounded-full font-semibold shadow-lg shadow-teal-500/30 transition-all"
        >
          Try the Simulator &rarr;
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center mt-12">
        <div className="bg-white rounded-3xl p-8 shadow-soft border border-stone-100 h-[400px] flex flex-col">
          <h3 className="text-xl font-bold text-slate-800 mb-2">Workflow Impact</h3>
          <p className="text-stone-500 text-sm mb-6">Comparison of time spent processing meeting notes.</p>
          <div className="flex-grow relative w-full h-full">
            <Bar data={chartData} options={chartOptions as any} />
          </div>
        </div>
        
        <div className="space-y-6">
          <div className="hover-lift bg-white p-6 rounded-3xl border border-stone-100 shadow-sm flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-teal-50 flex items-center justify-center text-teal-600 text-2xl">🌱</div>
            <div>
              <h4 className="font-bold text-slate-800 text-lg">System 2 Design</h4>
              <p className="text-stone-500 mt-1 leading-relaxed">Designed to reduce cognitive load. Card layouts, soft shadows, and warm neutrals keep you focused.</p>
            </div>
          </div>
          <div className="hover-lift bg-white p-6 rounded-3xl border border-stone-100 shadow-sm flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-stone-100 flex items-center justify-center text-stone-600 text-2xl">⚡</div>
            <div>
              <h4 className="font-bold text-slate-800 text-lg">Mock AI Mode</h4>
              <p className="text-stone-500 mt-1 leading-relaxed">Deterministic extraction for development. Test the flow without burning API credits.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// --- Component: Simulator ---
function SimulatorView() {
  const [title, setTitle] = useState("Q4 Roadmap Sync");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<'empty' | 'loading' | 'results'>('empty');
  
  const sampleData = {
    title: "Q4 Roadmap Sync",
    notes: "We are blocked on the API integration until Mike fixes the auth bug.\nSarah needs to finalize the marketing deck by Friday for the board meeting.\nDave asked if we should delay the mobile launch? \nDecision: We will delay mobile launch by 2 weeks to polish UI.\nMike will update the Jira roadmap to reflect this."
  };

  const loadSample = () => {
    setTitle(sampleData.title);
    setNotes(sampleData.notes);
  };

  const runSim = () => {
    if(!notes) {
      alert("Please add some notes to extract.");
      return;
    }
    setStatus('loading');
    setTimeout(() => {
      setStatus('results');
    }, 1800);
  };

  const extraction = {
    summary: "The team discussed the critical block on API integration and made a strategic decision to delay the mobile launch by 2 weeks to ensure UI polish. Marketing preparations for the upcoming board meeting are proceeding with Sarah leading.",
    decisions: ["Delay mobile launch by 2 weeks to polish UI."],
    actions: [
      { text: "Fix auth bug blocking API integration", owner: "Mike", due: null, conf: 0.95 },
      { text: "Finalize marketing deck for board meeting", owner: "Sarah", due: "Friday", conf: 0.98 },
      { text: "Update Jira roadmap with new timeline", owner: "Mike", due: null, conf: 0.90 }
    ]
  };

  return (
    <section className="fade-in space-y-10 animate-in slide-in-from-bottom-5 duration-700 delay-150">
      <div className="text-center max-w-2xl mx-auto">
        <h2 className="text-3xl font-bold text-slate-800">Experience the Flow</h2>
        <p className="text-slate-500 mt-2">Simulate the capture and extraction process. Notice how messy text becomes organized cards.</p>
      </div>

      <div className="bg-stone-100 rounded-[2.5rem] p-4 md:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 relative overflow-hidden min-h-[600px]">
        {/* INPUT COLUMN */}
        <div className="lg:col-span-5 flex flex-col h-full space-y-4 z-10">
          <div className="bg-white rounded-3xl shadow-soft p-6 flex-grow flex flex-col border border-stone-200/50">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-stone-300"></span> Capture
              </h3>
              <button onClick={loadSample} className="text-sm text-teal-600 font-medium hover:text-teal-700 bg-teal-50 px-3 py-1 rounded-full transition-colors">Load Sample</button>
            </div>
            
            <div className="space-y-4 flex-grow">
              <div>
                <label className="block text-xs font-bold text-stone-400 uppercase tracking-wider mb-2 ml-2">Meeting Title</label>
                <input 
                  type="text" 
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-stone-50 border-none rounded-2xl px-4 py-3 text-slate-700 font-medium focus:ring-2 focus:ring-teal-100 focus:bg-white transition-all outline-none" 
                  placeholder="Meeting Title"
                />
              </div>
              <div className="flex-grow flex flex-col">
                <label className="block text-xs font-bold text-stone-400 uppercase tracking-wider mb-2 ml-2">Raw Notes</label>
                <textarea 
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full h-64 bg-stone-50 border-none rounded-2xl px-4 py-3 text-slate-600 leading-relaxed resize-none focus:ring-2 focus:ring-teal-100 focus:bg-white transition-all outline-none custom-scrollbar" 
                  placeholder="Type your messy notes here..."
                ></textarea>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-stone-100">
              <button 
                onClick={runSim}
                className="w-full bg-slate-800 hover:bg-slate-700 text-white rounded-full py-3.5 font-semibold shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex justify-center items-center gap-2"
              >
                <span>✨ Extract Actions</span>
              </button>
            </div>
          </div>
        </div>

        {/* OUTPUT COLUMN */}
        <div className="lg:col-span-7 flex flex-col h-full z-10 relative">
          <div className="absolute top-0 right-0 w-64 h-64 bg-teal-100 rounded-full blur-3xl opacity-50 pointer-events-none -z-10"></div>

          {status === 'empty' && (
            <div className="flex-grow flex flex-col items-center justify-center text-center p-10 bg-white/50 rounded-3xl border border-stone-200 border-dashed h-full">
              <div className="w-16 h-16 bg-white rounded-full shadow-soft flex items-center justify-center text-3xl mb-4">🍃</div>
              <h3 className="text-xl font-bold text-slate-800">Peaceful Waiting</h3>
              <p className="text-stone-500 mt-2 max-w-xs">Your structured action cards will float in here once you extract.</p>
            </div>
          )}

          {status === 'loading' && (
            <div className="flex-grow flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm rounded-3xl z-20 absolute inset-0 h-full">
              <div className="flex space-x-2 mb-4">
                <div className="w-3 h-3 bg-teal-500 rounded-full animate-bounce"></div>
                <div className="w-3 h-3 bg-teal-500 rounded-full animate-bounce delay-100"></div>
                <div className="w-3 h-3 bg-teal-500 rounded-full animate-bounce delay-200"></div>
              </div>
              <p className="text-slate-600 font-medium animate-pulse">Organizing thoughts...</p>
            </div>
          )}

          {status === 'results' && (
            <div className="flex flex-col h-full space-y-6 animate-in fade-in duration-500">
              <div className="bg-white rounded-3xl p-6 shadow-soft border border-stone-100 hover-lift">
                <h4 className="text-sm font-bold text-teal-600 uppercase tracking-wider mb-2">Executive Summary</h4>
                <p className="text-slate-600 leading-relaxed">{extraction.summary}</p>
              </div>

              <div className="flex justify-between items-end px-2">
                <h4 className="text-lg font-bold text-slate-800">Action Items</h4>
                <span className="text-xs font-medium bg-stone-200 text-stone-600 px-2 py-1 rounded-full">{extraction.actions.length} items</span>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 overflow-y-auto p-2 pb-6 max-h-[400px]">
                {extraction.actions.map((action, i) => (
                   <div key={i} className="bg-white rounded-3xl p-5 shadow-sm border border-stone-100 hover-lift flex flex-col justify-between h-36 relative overflow-hidden group">
                     <div 
                        className="absolute top-0 left-0 h-1 bg-gradient-to-r from-teal-400 to-teal-200" 
                        style={{ width: `${Math.round(action.conf * 100)}%` }}
                     ></div>
                     
                     <p className="font-semibold text-slate-800 text-sm leading-snug line-clamp-3">{action.text}</p>
                     
                     <div className="flex justify-between items-end mt-4">
                       <div className="flex items-center gap-2">
                         <div className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center text-xs font-bold text-stone-600 ring-2 ring-white shadow-sm">
                           {action.owner[0]}
                         </div>
                         <div className="flex flex-col">
                           <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider">Owner</span>
                           <span className="text-xs text-slate-600 font-medium">{action.owner}</span>
                         </div>
                       </div>
                       {action.due && (
                         <span className="px-2 py-0.5 rounded-full bg-coral-50 text-coral-500 text-[10px] font-bold uppercase tracking-wide border border-coral-500/10">Due {action.due}</span>
                       )}
                     </div>
                   </div>
                ))}
              </div>

              <div className="bg-teal-50/50 rounded-3xl p-6 border border-teal-100/50">
                <h4 className="text-sm font-bold text-teal-800 uppercase tracking-wider mb-3">Decisions</h4>
                <ul className="list-none space-y-2 text-slate-700 text-sm">
                   {extraction.decisions.map((d, i) => (
                     <li key={i} className="flex items-start gap-2"><span className="text-teal-500 text-lg leading-none">•</span> {d}</li>
                   ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

// --- Component: Architecture ---
function ArchitectureView() {
  return (
    <section className="fade-in space-y-12 animate-in slide-in-from-bottom-5 duration-700 delay-200">
      <div className="text-center max-w-2xl mx-auto">
        <h2 className="text-3xl font-bold text-slate-800">Under the Hood</h2>
        <p className="text-slate-500 mt-2">A modern, type-safe stack designed for reliability and speed.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { icon: '⚛️', color: 'blue', title: 'React + TS', text: 'Type-safe component architecture ensuring robust UI interactions.' },
          { icon: '▲', color: 'emerald', title: 'Prisma ORM', text: 'Declarative data modeling and migrations for PostgreSQL.' },
          { icon: '🐘', color: 'indigo', title: 'PostgreSQL', text: 'Relational integrity for complex Action/Owner mappings.' },
          { icon: '⚡', color: 'yellow', title: 'Mock AI', text: 'Development mode using deterministic JSON responses.' },
        ].map((card, i) => (
          <div key={i} className="hover-lift bg-white p-6 rounded-3xl border border-stone-100 shadow-soft">
            <div className={`w-10 h-10 bg-${card.color}-50 text-${card.color}-600 rounded-xl flex items-center justify-center mb-4 text-xl`}>{card.icon}</div>
            <h3 className="font-bold text-slate-800 mb-2">{card.title}</h3>
            <p className="text-sm text-stone-500 leading-relaxed">{card.text}</p>
          </div>
        ))}
      </div>

      <div className="bg-slate-800 rounded-[2.5rem] p-8 text-white relative overflow-hidden">
        <div className="absolute -top-20 -right-20 w-96 h-96 bg-teal-500 rounded-full blur-[100px] opacity-20"></div>
        <h3 className="text-xl font-bold mb-8 relative z-10">Core Data Schema</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10">
          {/* Meeting Entity */}
          <div className="bg-slate-700/50 backdrop-blur-md rounded-2xl p-5 border border-slate-600">
            <div className="text-teal-400 font-bold text-sm uppercase tracking-wider mb-4 border-b border-slate-600 pb-2">Meeting</div>
            <ul className="space-y-2 text-sm font-mono text-slate-300">
              <li className="flex justify-between"><span>id</span> <span className="text-slate-500">UUID</span></li>
              <li className="flex justify-between"><span>title</span> <span class="text-slate-500">String</span></li>
              <li className="flex justify-between"><span>rawNotes</span> <span className="text-slate-500">Text</span></li>
              <li className="flex justify-between"><span>parseState</span> <span className="text-slate-500">Enum</span></li>
            </ul>
          </div>

          {/* Extraction Result */}
          <div className="bg-slate-700/50 backdrop-blur-md rounded-2xl p-5 border border-slate-600 mt-0 md:mt-12 relative">
            <div className="hidden md:block absolute -top-12 left-1/2 w-0.5 h-12 bg-slate-600"></div>
            
            <div className="text-purple-400 font-bold text-sm uppercase tracking-wider mb-4 border-b border-slate-600 pb-2">Extraction</div>
            <ul className="space-y-2 text-sm font-mono text-slate-300">
              <li className="flex justify-between"><span>meetingId</span> <span className="text-slate-500">FK</span></li>
              <li className="flex justify-between"><span>summary</span> <span className="text-slate-500">String</span></li>
              <li className="flex justify-between"><span>qualityFlags</span> <span className="text-slate-500">JSON</span></li>
            </ul>
          </div>

          {/* Action Item */}
          <div className="bg-slate-700/50 backdrop-blur-md rounded-2xl p-5 border border-slate-600">
            <div className="text-coral-400 font-bold text-sm uppercase tracking-wider mb-4 border-b border-slate-600 pb-2">ActionItem</div>
            <ul className="space-y-2 text-sm font-mono text-slate-300">
              <li className="flex justify-between"><span>text</span> <span className="text-slate-500">String</span></li>
              <li className="flex justify-between"><span>owner</span> <span className="text-slate-500">String?</span></li>
              <li className="flex justify-between"><span>dueDate</span> <span className="text-slate-500">Date?</span></li>
              <li className="flex justify-between"><span>confidence</span> <span className="text-slate-500">Float</span></li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

// --- Main Blueprint Page ---
export default function BlueprintPage() {
  const [view, setView] = useState('manifesto');

  return (
    <div className="min-h-screen bg-stone-50 text-slate-700 font-outfit selection:bg-teal-100 selection:text-teal-900 overflow-x-hidden">
      <Header currentView={view} setView={setView} />
      
      <main className="flex-grow pt-32 pb-20 px-4 sm:px-6 max-w-7xl mx-auto w-full">
        {view === 'manifesto' && <ManifestoView setView={setView} />}
        {view === 'simulator' && <SimulatorView />}
        {view === 'architecture' && <ArchitectureView />}
      </main>

      <footer className="bg-white border-t border-stone-200 py-10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-teal-500 rounded-full flex items-center justify-center text-white text-xs font-bold">A</div>
            <span className="text-slate-800 font-semibold text-sm">ActionMinutes</span>
          </div>
          <p className="text-stone-400 text-sm">System 2 Design • Calm & Focused</p>
        </div>
      </footer>
    </div>
  );
}

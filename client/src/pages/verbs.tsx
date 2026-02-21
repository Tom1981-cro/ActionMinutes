import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { authenticatedFetch } from "@/hooks/use-auth";
import { 
  Phone, PencilSimple, Eye, Crosshair, Tray, CalendarBlank 
} from "@phosphor-icons/react";
import type { Icon as PhosphorIcon } from "@phosphor-icons/react";

type VerbConfig = {
  title: string;
  desc: string;
  icon: PhosphorIcon;
  color: string;
  bg: string;
  border: string;
  tags: string[];
};

const verbConfigs: VerbConfig[] = [
  { title: "Call", desc: "Phone & video syncs", icon: Phone, color: "text-emerald-600", bg: "bg-emerald-50", border: "hover:border-emerald-200", tags: ["call", "phone", "sync"] },
  { title: "Write", desc: "Drafting docs & emails", icon: PencilSimple, color: "text-blue-600", bg: "bg-blue-50", border: "hover:border-blue-200", tags: ["write", "draft", "email", "letter"] },
  { title: "Review", desc: "Reading & approving", icon: Eye, color: "text-purple-600", bg: "bg-purple-50", border: "hover:border-purple-200", tags: ["review", "read", "approve"] },
  { title: "Plan", desc: "Strategy & scheduling", icon: Crosshair, color: "text-orange-600", bg: "bg-orange-50", border: "hover:border-orange-200", tags: ["plan", "schedule", "strategy"] },
  { title: "Process", desc: "Inbox zero & admin", icon: Tray, color: "text-rose-600", bg: "bg-rose-50", border: "hover:border-rose-200", tags: ["process", "admin", "inbox"] },
  { title: "Meet", desc: "Scheduled meetings", icon: CalendarBlank, color: "text-indigo-600", bg: "bg-indigo-50", border: "hover:border-indigo-200", tags: ["meet", "meeting", "attend"] },
];

export default function ActionVerbsPage() {
  const [deepWorkMode, setDeepWorkMode] = useState(false);

  const { data: actions = [] } = useQuery({
    queryKey: ['actions-for-verbs'],
    queryFn: async () => {
      const res = await authenticatedFetch('/api/actions');
      if (!res.ok) return [];
      return res.json();
    },
  });

  const getVerbCount = (verb: VerbConfig): number => {
    const titleLower = (text: string) => text.toLowerCase();
    return actions.filter((a: any) => {
      if (a.status === 'done' || a.deletedAt) return false;
      const t = titleLower(a.text || "");
      return verb.tags.some(tag => t.includes(tag));
    }).length;
  };

  return (
    <div className="h-full flex flex-col p-6" data-testid="action-verbs-page">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Action Verbs</h2>
        <p className="text-sm text-gray-500 font-medium mt-1">Batch actions by mental context via tags.</p>
      </div>

      <div className="grid gap-4 mb-8 flex-1 grid-cols-2 md:grid-cols-3">
        {verbConfigs.map((verb, idx) => {
          const Icon = verb.icon;
          const count = getVerbCount(verb);
          return (
            <button
              key={idx}
              className={`bg-white p-5 rounded-3xl flex flex-col items-start justify-between border border-gray-100 ${verb.border} transition-all text-left shadow-sm group hover:shadow-md min-h-[140px]`}
              data-testid={`card-verb-${verb.title.toLowerCase()}`}
            >
              <div className="w-full flex justify-between items-start mb-4">
                <div className={`${verb.bg} p-3.5 rounded-2xl group-hover:scale-110 transition-transform duration-300`}>
                  <Icon className={`w-6 h-6 ${verb.color}`} weight="bold" />
                </div>
                <span className="bg-gray-100 text-gray-500 text-[10px] font-bold px-2.5 py-1 rounded-full border border-gray-200">
                  {count} items
                </span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">{verb.title}</h3>
                <p className="text-[11px] font-medium text-gray-500 mt-0.5 leading-tight">{verb.desc}</p>
              </div>
            </button>
          );
        })}
      </div>

      <div className="bg-gray-900 text-white p-6 rounded-3xl flex items-center justify-between shadow-xl mt-auto" data-testid="deep-work-toggle">
        <div className="flex items-center space-x-4">
          <div className="w-10 h-10 bg-gray-800 rounded-xl flex items-center justify-center">
            <Crosshair className="w-5 h-5 text-white opacity-80" weight="bold" />
          </div>
          <div>
            <h3 className="text-base font-bold">Deep Work Mode</h3>
            <p className="text-xs text-gray-400 mt-0.5 font-medium line-clamp-1">Silence notifications for task contexts.</p>
          </div>
        </div>
        <button
          onClick={() => setDeepWorkMode(!deepWorkMode)}
          className={`w-12 h-7 rounded-full flex items-center p-1 cursor-pointer transition-colors ${deepWorkMode ? 'bg-violet-600 justify-end' : 'bg-gray-700 justify-start hover:bg-gray-600'}`}
          data-testid="button-deep-work"
        >
          <div className="w-5 h-5 bg-white rounded-full shadow-sm"></div>
        </button>
      </div>
    </div>
  );
}

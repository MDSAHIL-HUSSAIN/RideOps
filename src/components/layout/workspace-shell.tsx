import {
  BarChart3,
  BookOpen,
  Bot,
  ChevronDown,
  Inbox,
  ShieldCheck,
} from "lucide-react";
import type { ReactNode } from "react";
import type { UserRole, WorkspaceView } from "../../domain/workspace";

const navigation = [
  { id: "investigation", label: "Investigation", icon: Bot },
  { id: "queue", label: "Ticket queue", icon: Inbox },
  { id: "knowledge", label: "Knowledge", icon: BookOpen },
  { id: "operations", label: "Operations", icon: BarChart3 },
] as const;

export function WorkspaceShell({
  view,
  onViewChange,
  role,
  onRoleChange,
  children,
}: {
  view: WorkspaceView;
  onViewChange: (view: WorkspaceView) => void;
  role: UserRole;
  onRoleChange: (role: UserRole) => void;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#f4f7fb] text-[#14213d]">
      <aside className="fixed inset-y-0 left-0 z-30 flex w-[238px] flex-col bg-[#091a36] px-4 py-5 text-white max-xl:w-[76px]">
        <div className="mb-8 flex items-center gap-3 px-2">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 font-bold">
            R
          </span>
          <div className="max-xl:hidden">
            <strong className="font-[Manrope] text-lg">RideOps</strong>
            <p className="text-xs text-slate-400">Resolution OS</p>
          </div>
        </div>
        <nav className="space-y-1">
          {navigation.map((item) => (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold ${view === item.id ? "bg-white/12 text-white" : "text-slate-400 hover:bg-white/7 hover:text-white"}`}
            >
              <item.icon size={19} />
              <span className="max-xl:hidden">{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="mt-auto rounded-xl border border-white/10 bg-white/5 p-3 max-xl:hidden">
          <p className="text-[11px] font-bold uppercase tracking-[.12em] text-cyan-300">
            Product principle
          </p>
          <p className="mt-2 text-xs leading-5 text-slate-300">
            AI suggests. Rules guard. Humans decide. Every consequential action
            is recorded.
          </p>
        </div>
        <div className="mt-4 flex items-center gap-3 border-t border-white/10 px-2 pt-4">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-cyan-100 text-xs font-bold text-cyan-900">
            RI
          </span>
          <div className="min-w-0 max-xl:hidden">
            <p className="truncate text-sm font-semibold">RideOps Support</p>
            <p className="truncate text-xs text-slate-400">
              Evaluator workspace
            </p>
          </div>
        </div>
      </aside>
      <main className="ml-[238px] min-h-screen max-xl:ml-[76px]">
        <header className="sticky top-0 z-20 flex h-[78px] items-center justify-between border-b border-slate-200 bg-white/95 px-7 backdrop-blur">
          <div>
            <p className="eyebrow">Support operations</p>
            <h1 className="font-[Manrope] text-xl font-bold">
              {navigation.find((item) => item.id === view)?.label}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700 lg:flex">
              <ShieldCheck size={15} />
              Evaluator workspace
            </span>
            <label className="relative">
              <span className="absolute left-3 top-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Preview role
              </span>
              <select
                value={role}
                onChange={(event) =>
                  onRoleChange(event.target.value as UserRole)
                }
                className="min-w-[180px] appearance-none rounded-xl border border-slate-200 bg-white pb-2 pl-3 pr-9 pt-6 text-sm font-semibold"
              >
                <option>L1 Agent</option>
                <option>Support Lead</option>
                <option>Head of Operations</option>
              </select>
              <ChevronDown
                size={15}
                className="pointer-events-none absolute right-3 top-6 text-slate-400"
              />
            </label>
          </div>
        </header>
        {children}
      </main>
    </div>
  );
}

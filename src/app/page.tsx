import Link from "next/link";
import { ShieldCheck, Camera, UserPlus, Cpu, Lock } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-cyan-500 selection:text-white">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur-md px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/20">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-lg tracking-tight text-white">Homeward</span>
              <span className="text-[10px] uppercase font-semibold text-cyan-400 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800 ml-2">
                Confidential Network
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-950 text-emerald-400 border border-emerald-800">
              <Lock className="w-3 h-3" />
              Zero-Knowledge Architecture
            </span>
          </div>
        </div>
      </header>

      {/* Hero Content */}
      <main className="max-w-4xl mx-auto px-6 py-12 flex-1 flex flex-col justify-center items-center text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs text-cyan-400 font-medium mb-6">
          <Cpu className="w-3.5 h-3.5" />
          <span>Chainlink CRE TEE & World ID Integration</span>
        </div>

        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white max-w-2xl leading-tight">
          Protecting the Vulnerable Without Compromising Privacy.
        </h1>
        <p className="mt-4 text-base sm:text-lg text-slate-400 max-w-xl leading-relaxed">
          When a stranger finds someone lost or disoriented, Homeward matches them against an enrolled database inside a confidential hardware enclave — and alerts next-of-kin without ever revealing their identity to the finder.
        </p>

        {/* Primary CTA Grid */}
        <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-lg">
          <Link
            href="/find"
            className="group p-5 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-xl shadow-cyan-500/20 hover:shadow-cyan-500/30 hover:scale-[1.02] active:scale-[0.99] transition-all flex flex-col items-center text-center justify-center"
          >
            <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center mb-3 group-hover:bg-white/20 transition-colors">
              <Camera className="w-6 h-6 text-white" />
            </div>
            <span className="font-bold text-lg">Found Someone Lost?</span>
            <span className="text-xs text-cyan-100 mt-1">Open Camera & Scan Privately</span>
          </Link>

          <Link
            href="/dashboard"
            className="group p-5 rounded-2xl bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-300 hover:border-cyan-500/40 hover:scale-[1.02] active:scale-[0.99] transition-all flex flex-col items-center text-center justify-center"
          >
            <div className="w-12 h-12 rounded-xl bg-slate-800 group-hover:bg-cyan-950/60 flex items-center justify-center mb-3 group-hover:text-cyan-400 transition-colors">
              <UserPlus className="w-6 h-6 text-slate-400 group-hover:text-cyan-400" />
            </div>
            <span className="font-bold text-lg text-slate-200 group-hover:text-white">Caregiver Portal</span>
            <span className="text-xs text-slate-400 mt-1">Enroll & Manage Loved Ones</span>
          </Link>
        </div>

        {/* Privacy Note */}
        <div className="mt-10 max-w-md p-3.5 rounded-2xl bg-slate-900/50 border border-slate-800 text-xs text-slate-400 flex items-center gap-3 text-left">
          <Lock className="w-5 h-5 text-cyan-400 shrink-0" />
          <span>
            <strong>Core Principle:</strong> The finder never sees who they found. All biometrics are matched strictly within secure hardware enclaves.
          </span>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-4 px-6 text-center text-xs text-slate-600">
        Homeward Safety Network &copy; {new Date().getFullYear()} — Built for confidential safety and abuse-prevention.
      </footer>
    </div>
  );
}

"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  AlertTriangle,
  MapPin,
  Clock,
  Phone,
  Navigation,
  ShieldCheck,
  CheckCircle2,
  Trash2,
  Lock,
  Camera,
  ExternalLink,
  Share2,
  FileText,
  UserCheck,
  PhoneCall,
  Sparkles,
  ChevronRight,
  ShieldAlert,
  Flame
} from "lucide-react";

export default function EmergencyAlertScreen() {
  const params = useParams();
  const caseToken = (params?.caseToken as string) || "case-hw-8492";

  const [isResolved, setIsResolved] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isPurging, setIsPurging] = useState(false);

  // Mock case details
  const caseData = {
    id: "HW-8492",
    dependentName: "Eleanor Vance",
    nickname: "Ellie",
    age: 78,
    condition: "Alzheimer's (Moderate)",
    notes: "May appear confused or agitated in traffic. Responds warmly to soft classical music. Hard of hearing in left ear. Carries a green leather purse.",
    matchConfidence: "98.4%",
    timestamp: "18 minutes ago (2:14 PM)",
    locationName: "Intersection of Market St & 4th Street",
    cityState: "San Francisco, CA 94103",
    coordinates: "37.7858° N, 122.4065° W",
    enclaveExecutionId: "0x7f29a...cre41",
    finderVerification: "World ID Verified (Selfie Check Passed)",
    timeRemaining: "47 hours, 42 minutes until automatic photo purge",
  };

  const handleResolveCase = () => {
    setIsPurging(true);
    setTimeout(() => {
      setIsPurging(false);
      setShowConfirmModal(false);
      setIsResolved(true);
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-rose-500 selection:text-white">
      {/* Top Emergency Banner */}
      <div className="bg-gradient-to-r from-red-950 via-rose-950 to-red-950 border-b border-rose-900/60 px-4 py-2.5 sm:px-6">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-rose-300 font-bold uppercase tracking-wider">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
            <span>High-Priority Safety Alert &bull; Case #{caseData.id}</span>
          </div>
          <div className="flex items-center gap-2 font-mono text-[11px] text-rose-400">
            <Lock className="w-3 h-3 text-rose-400" />
            <span>Encrypted Next-of-Kin Link</span>
          </div>
        </div>
      </div>

      {/* Navigation Header */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md px-4 py-3 sm:px-6">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2 group">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-rose-500 to-red-600 flex items-center justify-center text-white shadow-lg shadow-rose-500/30">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-white tracking-tight group-hover:text-rose-400 transition-colors">
                Homeward Emergency Response
              </span>
            </div>
          </Link>

          <Link
            href="/dashboard"
            className="text-xs font-semibold text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
          >
            <span>Back to Dashboard</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </header>

      {/* Main Alert Body */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* ==================== CASE RESOLVED STATE ==================== */}
        {isResolved ? (
          <div className="rounded-3xl bg-slate-900 border border-emerald-800/80 p-8 shadow-2xl text-center flex flex-col items-center animate-fade-in">
            <div className="w-16 h-16 rounded-full bg-emerald-950 border border-emerald-700 text-emerald-400 flex items-center justify-center mb-4 shadow-xl shadow-emerald-950/50">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <h1 className="text-2xl font-bold text-white tracking-tight">
              Case Marked Safely Resolved
            </h1>
            <p className="text-sm text-slate-400 mt-2 max-w-md">
              We&apos;re relieved that <strong className="text-white">{caseData.dependentName}</strong> has been located safely.
            </p>

            {/* Cryptographic Photo Purge Confirmation */}
            <div className="mt-6 w-full max-w-md p-4 rounded-2xl bg-slate-950 border border-slate-800 text-left space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
                <Trash2 className="w-4 h-4 text-emerald-400" />
                <span>Zero-Knowledge Privacy Guarantee Enforced</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed pl-6">
                The finder&apos;s captured photo and temporary location tokens have been <strong>permanently purged</strong> from Supabase storage. No biometric evidence remains accessible.
              </p>
            </div>

            <div className="mt-8 flex gap-3">
              <Link
                href="/dashboard"
                className="px-6 py-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-xs shadow-lg shadow-cyan-500/20"
              >
                Return to Caregiver Dashboard
              </Link>
            </div>
          </div>
        ) : (
          <>
            {/* ==================== ACTIVE ALERT BANNER ==================== */}
            <div className="rounded-3xl bg-gradient-to-br from-slate-900 to-slate-900/90 border-2 border-rose-600/50 p-6 shadow-2xl shadow-rose-950/30">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-950/80 border border-rose-800 text-xs font-bold text-rose-300 mb-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                    <span>POSSIBLE MATCH DETECTED</span>
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                    {caseData.dependentName} (&ldquo;{caseData.nickname}&rdquo;)
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-400 mt-1">
                    Age {caseData.age} &bull; {caseData.condition}
                  </p>
                </div>

                <div className="flex flex-col items-start sm:items-end gap-1.5">
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-cyan-950/80 border border-cyan-800 text-cyan-300 text-xs font-mono">
                    <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Match Confidence: {caseData.matchConfidence}</span>
                  </div>
                  <span className="text-[11px] text-slate-400 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-500" />
                    <span>Reported {caseData.timestamp}</span>
                  </span>
                </div>
              </div>
            </div>

            {/* ==================== PHOTO & BIOMETRICS COMPARISON ==================== */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Enrolled Reference Photo */}
              <div className="rounded-3xl bg-slate-900 border border-slate-800 p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                      1. Enrolled Guardian Reference
                    </span>
                    <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800">
                      Baseline Vector
                    </span>
                  </div>

                  <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 flex items-center justify-center">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-amber-500 to-rose-600 flex items-center justify-center text-white font-bold text-2xl shadow-xl">
                      EV
                    </div>
                    <div className="absolute bottom-3 left-3 right-3 bg-slate-950/85 backdrop-blur-md p-2 rounded-xl text-[11px] text-slate-300 border border-slate-800 flex items-center gap-2">
                      <Lock className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                      <span>Uploaded during guardian enrollment</span>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-slate-400 mt-3">
                  Stored as 128D encrypted ciphertext. Decrypted only within CRE TEE hardware enclave.
                </p>
              </div>

              {/* Finder's Captured Photo (Decrypted strictly for Next-of-Kin) */}
              <div className="rounded-3xl bg-slate-900 border-2 border-rose-800/80 p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold text-rose-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Camera className="w-3.5 h-3.5 text-rose-400" />
                      <span>2. Finder&apos;s Captured Photo</span>
                    </span>
                    <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800">
                      Decrypted For You Only
                    </span>
                  </div>

                  <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 flex items-center justify-center group">
                    <div className="flex flex-col items-center justify-center text-slate-400">
                      <div className="w-16 h-16 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 mb-2">
                        <Camera className="w-8 h-8 text-rose-400" />
                      </div>
                      <span className="text-xs font-medium text-slate-300">Live Snapshot from Finder</span>
                      <span className="text-[11px] text-slate-500">Captured at 2:14 PM</span>
                    </div>

                    <div className="absolute top-3 right-3 px-2 py-1 rounded-lg bg-rose-950/90 border border-rose-800 text-[10px] text-rose-300 font-mono">
                      TTL: 48hr Auto-Purge
                    </div>

                    <div className="absolute bottom-3 left-3 right-3 bg-slate-950/90 backdrop-blur-md p-2 rounded-xl text-[11px] text-slate-300 border border-slate-800 flex items-center gap-2">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>Finder never saw this match result</span>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-rose-300/80 mt-3 flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                  <span>{caseData.timeRemaining}</span>
                </p>
              </div>
            </div>

            {/* ==================== LOCATION & MAP CARD ==================== */}
            <div className="rounded-3xl bg-slate-900 border border-slate-800 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-cyan-950 border border-cyan-800 text-cyan-400 flex items-center justify-center">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Sighting Location</h3>
                    <p className="text-xs text-slate-400">{caseData.locationName} &bull; {caseData.cityState}</p>
                  </div>
                </div>

                <a
                  href={`https://maps.google.com/?q=${encodeURIComponent(caseData.locationName + " " + caseData.cityState)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-950 border border-cyan-800 hover:bg-cyan-900 text-cyan-300 text-xs font-semibold transition-colors"
                >
                  <Navigation className="w-3.5 h-3.5" />
                  <span>Open Maps</span>
                  <ExternalLink className="w-3 h-3 ml-0.5" />
                </a>
              </div>

              {/* Simulated Visual Map Interface */}
              <div className="relative w-full h-56 rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 flex items-center justify-center">
                {/* Map Grid Pattern */}
                <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:16px_16px]" />

                {/* Simulated Street Lines */}
                <div className="absolute w-full h-1 bg-slate-800 top-1/2 -translate-y-1/2" />
                <div className="absolute h-full w-1 bg-slate-800 left-1/2 -translate-x-1/2" />
                <div className="absolute w-3/4 h-1 bg-slate-800/80 top-1/3 rotate-12" />

                {/* Sighting Pin with Pulsing Radar */}
                <div className="relative flex items-center justify-center">
                  <div className="absolute w-14 h-14 rounded-full bg-rose-500/20 animate-ping" />
                  <div className="absolute w-8 h-8 rounded-full bg-rose-500/40 animate-pulse" />
                  <div className="relative w-9 h-9 rounded-full bg-gradient-to-tr from-rose-500 to-red-600 flex items-center justify-center text-white shadow-xl shadow-rose-500/50">
                    <MapPin className="w-5 h-5" />
                  </div>
                </div>

                {/* Bottom Overlay Pill */}
                <div className="absolute bottom-3 left-3 bg-slate-950/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-800 text-[11px] font-mono text-slate-300">
                  GPS: {caseData.coordinates}
                </div>
              </div>
            </div>

            {/* ==================== MEDICAL NOTES & CARE TIPS ==================== */}
            <div className="rounded-3xl bg-slate-900 border border-slate-800 p-5 space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
                <FileText className="w-4 h-4 text-cyan-400" />
                <span>Caregiver De-escalation & Medical Notes (For Responders):</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed pl-6 bg-slate-950/60 p-3 rounded-2xl border border-slate-850">
                {caseData.notes}
              </p>
            </div>

            {/* ==================== ACTION BAR ==================== */}
            <div className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xl">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <a
                  href="tel:911"
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl bg-red-950 hover:bg-red-900 border border-red-800 text-red-300 font-bold text-xs transition-colors"
                >
                  <PhoneCall className="w-4 h-4" />
                  <span>Call 911 / Police</span>
                </a>

                <button
                  onClick={() => {
                    if (navigator.share) {
                      navigator.share({
                        title: `Homeward Alert: ${caseData.dependentName}`,
                        text: `Location sighting for ${caseData.dependentName}: ${caseData.locationName}`,
                        url: window.location.href,
                      });
                    } else {
                      navigator.clipboard.writeText(window.location.href);
                      alert("Secure alert link copied to clipboard!");
                    }
                  }}
                  className="flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700 text-xs font-semibold transition-colors"
                >
                  <Share2 className="w-4 h-4" />
                  <span className="hidden sm:inline">Share Case</span>
                </button>
              </div>

              <button
                onClick={() => setShowConfirmModal(true)}
                className="w-full sm:w-auto flex-1 flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all active:scale-[0.99]"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Mark as Safely Located (Purge Photo)</span>
              </button>
            </div>
          </>
        )}
      </main>

      {/* ==================== CONFIRMATION MODAL ==================== */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl animate-fade-in text-center">
            <div className="w-14 h-14 rounded-full bg-emerald-950 border border-emerald-800 text-emerald-400 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-7 h-7" />
            </div>

            <h3 className="text-lg font-bold text-white tracking-tight">
              Confirm Safe Location & Photo Deletion
            </h3>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Marking this case as resolved will permanently delete the finder&apos;s captured photo and sighting coordinates from storage to protect privacy.
            </p>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowConfirmModal(false)}
                disabled={isPurging}
                className="flex-1 py-3 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-semibold border border-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleResolveCase}
                disabled={isPurging}
                className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/30 transition-all"
              >
                {isPurging ? (
                  <span>Purging Photo...</span>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Confirm & Purge</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-4 px-6 text-center text-xs text-slate-500">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Homeward Emergency Auto-Alert System &bull; Confidential Hardware Enclave Verified</span>
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="hover:text-slate-300">Dashboard</Link>
            <Link href="/find" className="hover:text-slate-300">Finder Screen</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

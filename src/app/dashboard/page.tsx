"use client";

import React, { useState, useRef } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  UserPlus,
  Users,
  Bell,
  Lock,
  Upload,
  CheckCircle2,
  AlertTriangle,
  HeartHandshake,
  Phone,
  Mail,
  FileText,
  Sparkles,
  Clock,
  ArrowRight,
  EyeOff,
  ChevronRight,
  ExternalLink,
  ShieldAlert,
  Camera,
  Trash2,
  Info
} from "lucide-react";

type Tab = "dependents" | "enroll" | "alerts";

interface EnrolledPerson {
  id: string;
  name: string;
  nickname: string;
  age: number;
  condition: string;
  notes: string;
  emergencyContact: {
    name: string;
    relationship: string;
    phone: string;
  };
  status: "active" | "alerting";
  enrolledAt: string;
  avatarColor: string;
  lastVerified: string;
}

const INITIAL_DEPENDENTS: EnrolledPerson[] = [
  {
    id: "dep-001",
    name: "Eleanor Vance",
    nickname: "Ellie",
    age: 78,
    condition: "Alzheimer's (Moderate)",
    notes: "May become disoriented in crowded spaces. Responds warmly to soft classical music. Hard of hearing in left ear.",
    emergencyContact: {
      name: "Sarah Vance",
      relationship: "Daughter / Legal Guardian",
      phone: "+1 (555) 234-5678",
    },
    status: "active",
    enrolledAt: "2026-08-14",
    avatarColor: "from-amber-500 to-rose-600",
    lastVerified: "Enclave Hash: 0x7f2a...39b1",
  },
  {
    id: "dep-002",
    name: "Leo Martinez",
    nickname: "Leo",
    age: 9,
    condition: "Non-verbal Autism Spectrum",
    notes: "Sensitive to loud sirens and bright flashlights. Carries a small blue sensory toy. Does not answer to his name when panicked.",
    emergencyContact: {
      name: "Carlos Martinez",
      relationship: "Father",
      phone: "+1 (555) 876-5432",
    },
    status: "active",
    enrolledAt: "2026-08-28",
    avatarColor: "from-cyan-500 to-blue-600",
    lastVerified: "Enclave Hash: 0x4b8e...901c",
  },
];

export default function CaregiverDashboard() {
  const [activeTab, setActiveTab] = useState<Tab>("dependents");
  const [dependents, setDependents] = useState<EnrolledPerson[]>(INITIAL_DEPENDENTS);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    fullName: "",
    nickname: "",
    age: "",
    condition: "Alzheimer's / Dementia",
    notes: "",
    contactName: "",
    contactRel: "Legal Guardian",
    contactPhone: "",
    contactEmail: "",
    consentAttestation: false,
  });

  const [uploadedPhoto, setUploadedPhoto] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setUploadedPhoto(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePrefillDemo = () => {
    setFormData({
      fullName: "Arthur Pendelton",
      nickname: "Artie",
      age: "82",
      condition: "Dementia (Early Stage)",
      notes: "Former civil engineer. Often wanders toward train stations or transit stops. Friendly but forgets his home address.",
      contactName: "David Pendelton",
      contactRel: "Son & Power of Attorney",
      contactPhone: "+1 (555) 432-1098",
      contactEmail: "david.p@example.com",
      consentAttestation: true,
    });
    setUploadedPhoto("/placeholder-arthur.jpg");
  };

  const handleSubmitEnrollment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.consentAttestation) {
      alert("Guardian consent attestation is required to complete enrollment.");
      return;
    }

    const newPerson: EnrolledPerson = {
      id: `dep-${Date.now().toString().slice(-3)}`,
      name: formData.fullName || "Arthur Pendelton",
      nickname: formData.nickname || "Artie",
      age: Number(formData.age) || 82,
      condition: formData.condition,
      notes: formData.notes,
      emergencyContact: {
        name: formData.contactName || "Family Contact",
        relationship: formData.contactRel || "Guardian",
        phone: formData.contactPhone || "+1 (555) 000-0000",
      },
      status: "active",
      enrolledAt: new Date().toISOString().split("T")[0],
      avatarColor: "from-emerald-500 to-teal-700",
      lastVerified: "Enclave Hash: 0x9c3d...fa21",
    };

    setDependents((prev) => [newPerson, ...prev]);
    setIsSubmitted(true);
    setTimeout(() => {
      setIsSubmitted(false);
      setActiveTab("dependents");
      // Reset form
      setFormData({
        fullName: "",
        nickname: "",
        age: "",
        condition: "Alzheimer's / Dementia",
        notes: "",
        contactName: "",
        contactRel: "Legal Guardian",
        contactPhone: "",
        contactEmail: "",
        consentAttestation: false,
      });
      setUploadedPhoto(null);
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-white">
      {/* Navigation Header */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-40 px-4 py-3 sm:px-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/20">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <span className="font-bold text-white tracking-tight group-hover:text-cyan-400 transition-colors">
                  Homeward
                </span>
                <span className="text-[10px] uppercase font-semibold text-cyan-400 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800 ml-2">
                  Caregiver Portal
                </span>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/find"
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-850 hover:bg-slate-800 border border-slate-700 text-xs font-medium text-slate-300 transition-colors"
            >
              <Camera className="w-3.5 h-3.5 text-cyan-400" />
              <span>Finder Camera</span>
            </Link>

            <div className="flex items-center gap-2 pl-3 border-l border-slate-800">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold ring-2 ring-purple-500/20">
                SV
              </div>
              <div className="hidden md:block text-left">
                <p className="text-xs font-semibold text-slate-200">Sarah Vance</p>
                <p className="text-[10px] text-slate-400">Authorized Guardian</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Hero / Quick Nav Banner */}
      <div className="border-b border-slate-800/80 bg-slate-900/40 px-4 py-4 sm:px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <span>Caregiver Safety Dashboard</span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-950 text-emerald-400 border border-emerald-800/80">
                <Lock className="w-3 h-3" />
                TEE Enclave Protected
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Manage enrolled dependents, reference facial vectors, and automated next-of-kin alert triggers.
            </p>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-1.5 bg-slate-950/80 p-1.5 rounded-2xl border border-slate-800">
            <button
              onClick={() => setActiveTab("dependents")}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeTab === "dependents"
                  ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/20"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Enrolled Loved Ones ({dependents.length})</span>
            </button>

            <button
              onClick={() => setActiveTab("enroll")}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeTab === "enroll"
                  ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/20"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Enroll New</span>
            </button>

            <button
              onClick={() => setActiveTab("alerts")}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeTab === "alerts"
                  ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/20"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
              }`}
            >
              <Bell className="w-3.5 h-3.5" />
              <span>Incident Audit Log</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6">
        {/* ==================== TAB 1: DEPENDENTS LIST ==================== */}
        {activeTab === "dependents" && (
          <div className="space-y-6">
            {/* Top Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-cyan-950/80 border border-cyan-800/60 flex items-center justify-center text-cyan-400">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Active Protections</p>
                  <p className="text-xl font-bold text-white">{dependents.length} Individuals</p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-950/80 border border-emerald-800/60 flex items-center justify-center text-emerald-400">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Biometric Storage</p>
                  <p className="text-xl font-bold text-emerald-400">Encrypted in TEE</p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-purple-950/80 border border-purple-800/60 flex items-center justify-center text-purple-400">
                  <HeartHandshake className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Automated Alerts</p>
                  <p className="text-xl font-bold text-white">Direct SMS & Call</p>
                </div>
              </div>
            </div>

            {/* Dependents Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {dependents.map((dep) => (
                <div
                  key={dep.id}
                  className="rounded-3xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-all p-5 flex flex-col justify-between shadow-xl"
                >
                  <div>
                    {/* Top Row: Avatar + Name + Status */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3.5">
                        <div
                          className={`w-14 h-14 rounded-2xl bg-gradient-to-tr ${dep.avatarColor} flex items-center justify-center text-white font-bold text-lg shadow-lg`}
                        >
                          {dep.nickname.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-base text-white">{dep.name}</h3>
                            <span className="text-xs text-slate-400">(&ldquo;{dep.nickname}&rdquo;)</span>
                          </div>
                          <p className="text-xs font-medium text-cyan-400 mt-0.5">
                            Age {dep.age} &bull; {dep.condition}
                          </p>
                        </div>
                      </div>

                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-950/80 text-emerald-400 border border-emerald-800/80">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        Active Protection
                      </span>
                    </div>

                    {/* Medical / De-escalation Notes */}
                    <div className="mt-4 p-3 rounded-2xl bg-slate-950/80 border border-slate-850">
                      <div className="flex items-center gap-1.5 text-slate-300 text-xs font-semibold mb-1">
                        <FileText className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Critical De-escalation & Medical Notes:</span>
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed pl-5">
                        {dep.notes}
                      </p>
                    </div>

                    {/* Emergency Contacts */}
                    <div className="mt-3 p-3 rounded-2xl bg-slate-950/40 border border-slate-850 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 text-slate-300">
                        <Phone className="w-3.5 h-3.5 text-cyan-400" />
                        <span className="font-medium">{dep.emergencyContact.name} ({dep.emergencyContact.relationship}):</span>
                        <span className="font-mono text-cyan-300">{dep.emergencyContact.phone}</span>
                      </div>
                      <span className="text-[10px] text-emerald-400 uppercase font-semibold">Verified</span>
                    </div>
                  </div>

                  {/* Card Bottom Meta */}
                  <div className="mt-5 pt-3.5 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-500">
                    <div className="flex items-center gap-1.5 font-mono text-[11px]">
                      <Lock className="w-3 h-3 text-cyan-500" />
                      <span>{dep.lastVerified}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setActiveTab("enroll")}
                        className="text-xs text-cyan-400 hover:text-cyan-300 font-medium"
                      >
                        Edit Profile
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {/* Add Another Card CTA */}
              <div
                onClick={() => setActiveTab("enroll")}
                className="rounded-3xl border-2 border-dashed border-slate-800 hover:border-cyan-500/50 hover:bg-slate-900/30 transition-all p-8 flex flex-col items-center justify-center text-center cursor-pointer group min-h-[260px]"
              >
                <div className="w-12 h-12 rounded-2xl bg-slate-800 group-hover:bg-cyan-950/60 border border-slate-700 group-hover:border-cyan-700 flex items-center justify-center text-slate-400 group-hover:text-cyan-400 transition-colors mb-3">
                  <UserPlus className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-base text-slate-200 group-hover:text-white">
                  Enroll Another Dependent
                </h3>
                <p className="text-xs text-slate-400 mt-1 max-w-xs">
                  Generate an encrypted 128D biometric vector in seconds. Protected by guardian legal consent attestation.
                </p>
                <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-cyan-400 group-hover:translate-x-0.5 transition-transform">
                  <span>Start Enrollment</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ==================== TAB 2: ENROLLMENT FORM ==================== */}
        {activeTab === "enroll" && (
          <div className="max-w-2xl mx-auto bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-800">
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-cyan-400" />
                  <span>Enroll a Dependent or Loved One</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Facial biometrics are encrypted in-browser and compared strictly in a hardware enclave.
                </p>
              </div>

              {/* Prefill Demo Helper Button */}
              <button
                type="button"
                onClick={handlePrefillDemo}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-950 border border-cyan-800 text-cyan-300 hover:bg-cyan-900 text-xs font-medium transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span>Prefill Demo Persona</span>
              </button>
            </div>

            {/* Submission success feedback */}
            {isSubmitted ? (
              <div className="py-12 flex flex-col items-center justify-center text-center animate-fade-in">
                <div className="w-16 h-16 rounded-full bg-emerald-950 border border-emerald-800 text-emerald-400 flex items-center justify-center mb-4">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-white">Enrollment Completed & Encrypted!</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-sm">
                  128D embedding generated. Ciphertext stored in Supabase with TEE-only decryption keys.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmitEnrollment} className="space-y-6">
                {/* 1. Photo Reference & In-Browser Face Detection */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    1. Reference Photo (Biometric Baseline)
                  </label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handlePhotoUpload}
                  />

                  {uploadedPhoto ? (
                    <div className="relative rounded-2xl overflow-hidden border-2 border-emerald-500/60 p-4 bg-slate-950 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-800 shrink-0">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={uploadedPhoto}
                            alt="Reference face"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-bold">
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Clear Facial Geometry Verified</span>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            Face alignment suitable for 128D vector extraction.
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setUploadedPhoto(null)}
                        className="p-2 text-slate-400 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-slate-700 hover:border-cyan-500 rounded-2xl p-6 bg-slate-950/60 hover:bg-slate-950 transition-all flex flex-col items-center justify-center cursor-pointer text-center"
                    >
                      <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 mb-2">
                        <Upload className="w-5 h-5" />
                      </div>
                      <p className="text-xs font-semibold text-slate-300">
                        Upload Clear Frontal Photo
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        JPG or PNG. Minimum 400x400. Face must be unobstructed.
                      </p>
                    </div>
                  )}

                  <div className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-400">
                    <EyeOff className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <span>Raw photo is never stored in plaintext — only the encrypted embedding is retained.</span>
                  </div>
                </div>

                {/* 2. Dependent Details */}
                <div className="space-y-4 pt-2">
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    2. Individual Details
                  </label>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <span className="text-xs text-slate-400 block mb-1">Full Legal Name</span>
                      <input
                        type="text"
                        required
                        value={formData.fullName}
                        onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                        placeholder="e.g. Arthur Pendelton"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-cyan-500"
                      />
                    </div>

                    <div>
                      <span className="text-xs text-slate-400 block mb-1">Preferred Nickname</span>
                      <input
                        type="text"
                        value={formData.nickname}
                        onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
                        placeholder="e.g. Artie"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <span className="text-xs text-slate-400 block mb-1">Age</span>
                      <input
                        type="number"
                        value={formData.age}
                        onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                        placeholder="e.g. 82"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-cyan-500"
                      />
                    </div>

                    <div>
                      <span className="text-xs text-slate-400 block mb-1">Primary Condition</span>
                      <select
                        value={formData.condition}
                        onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-cyan-500"
                      >
                        <option value="Alzheimer's / Dementia">Alzheimer&apos;s / Dementia</option>
                        <option value="Non-verbal Autism Spectrum">Non-verbal Autism Spectrum</option>
                        <option value="Down Syndrome">Down Syndrome</option>
                        <option value="Traumatic Brain Injury (TBI)">Traumatic Brain Injury (TBI)</option>
                        <option value="Other Cognitive Disability">Other Cognitive Disability</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <span className="text-xs text-slate-400 block mb-1">
                      Critical De-escalation & Medical Notes (Delivered upon match)
                    </span>
                    <textarea
                      rows={3}
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="e.g. Speaks softly, easily startled by loud sirens. Responds to daughter's name (Sarah). Has diabetes; needs water."
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-cyan-500 resize-none"
                    />
                  </div>
                </div>

                {/* 3. Emergency Contacts */}
                <div className="space-y-4 pt-2">
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    3. Next-of-Kin Emergency Contacts
                  </label>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <span className="text-xs text-slate-400 block mb-1">Contact Name</span>
                      <input
                        type="text"
                        required
                        value={formData.contactName}
                        onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                        placeholder="e.g. David Pendelton"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-cyan-500"
                      />
                    </div>

                    <div>
                      <span className="text-xs text-slate-400 block mb-1">Relationship</span>
                      <input
                        type="text"
                        value={formData.contactRel}
                        onChange={(e) => setFormData({ ...formData, contactRel: e.target.value })}
                        placeholder="e.g. Son / Power of Attorney"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <span className="text-xs text-slate-400 block mb-1">SMS Notification Phone</span>
                      <input
                        type="tel"
                        required
                        value={formData.contactPhone}
                        onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                        placeholder="+1 (555) 432-1098"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-cyan-500"
                      />
                    </div>

                    <div>
                      <span className="text-xs text-slate-400 block mb-1">Email Backup</span>
                      <input
                        type="email"
                        value={formData.contactEmail}
                        onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                        placeholder="david.p@example.com"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                  </div>
                </div>

                {/* 4. Guardian Legal Consent Attestation (Core Spec Requirement) */}
                <div className="pt-2">
                  <div className="p-4 rounded-2xl bg-slate-950 border border-cyan-900/60 flex items-start gap-3">
                    <input
                      type="checkbox"
                      id="consent"
                      required
                      checked={formData.consentAttestation}
                      onChange={(e) =>
                        setFormData({ ...formData, consentAttestation: e.target.checked })
                      }
                      className="mt-1 w-4 h-4 rounded border-slate-700 text-cyan-500 focus:ring-cyan-500/30"
                    />
                    <label htmlFor="consent" className="text-xs text-slate-300 leading-relaxed cursor-pointer">
                      <strong className="text-white block font-semibold">
                        Legal Guardian Consent & Biometric Attestation:
                      </strong>
                      I certify under penalty of perjury that I am the legally recognized guardian, parent, or healthcare proxy for this individual. I grant authority to convert their facial features into a confidential biometric vector solely for emergency next-of-kin re-identification.
                    </label>
                  </div>
                </div>

                {/* Submit Action */}
                <button
                  type="submit"
                  className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-sm shadow-xl shadow-cyan-500/25 transition-all active:scale-[0.99] flex items-center justify-center gap-2"
                >
                  <Lock className="w-4 h-4" />
                  <span>Encrypt & Enroll Biometric Vector</span>
                </button>
              </form>
            )}
          </div>
        )}

        {/* ==================== TAB 3: ALERT / INCIDENT HISTORY ==================== */}
        {activeTab === "alerts" && (
          <div className="max-w-3xl mx-auto space-y-4">
            <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white">Emergency Match History & Audit Trail</h3>
                <p className="text-xs text-slate-400">
                  Every match event logs a cryptographic proof of TEE execution and automated notification.
                </p>
              </div>
              <span className="text-xs font-mono text-cyan-400 bg-cyan-950/60 px-2.5 py-1 rounded-lg border border-cyan-800">
                TTL: 48hr Auto-Purge
              </span>
            </div>

            {/* Sample Resolved Incident */}
            <div className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-950 border border-emerald-800 text-emerald-400 flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white">Case #HW-8492 &bull; Eleanor Vance</span>
                    <p className="text-[11px] text-slate-400">Found near 4th & Market St &bull; 2 days ago</p>
                  </div>
                </div>

                <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                  Safely Resolved
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-950 text-xs space-y-2 border border-slate-850">
                <div className="flex items-center justify-between text-slate-400">
                  <span>Finder World ID Verification:</span>
                  <span className="text-emerald-400 font-mono">Passed (Nullifier Verified)</span>
                </div>
                <div className="flex items-center justify-between text-slate-400">
                  <span>TEE Confidential Matching:</span>
                  <span className="text-cyan-400 font-mono">Euclidean Distance: 0.28 (Match)</span>
                </div>
                <div className="flex items-center justify-between text-slate-400">
                  <span>Photo Delivery:</span>
                  <span>Sent to Sarah Vance (SMS link) &bull; Photo Purged upon resolution</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-850">
                <span className="font-mono text-[10px]">CRE Execution ID: 0x9f1a...c842</span>
                <Link
                  href="/alert/case-hw-8492"
                  className="inline-flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 font-semibold"
                >
                  <span>View Alert Resolution Mockup</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-4 px-6 text-center text-xs text-slate-500">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Homeward Confidential Caregiver Portal &bull; Encrypted Storage via Supabase + pgvector</span>
          <div className="flex items-center gap-4">
            <Link href="/" className="hover:text-slate-300">Home</Link>
            <Link href="/find" className="hover:text-slate-300">Finder Camera</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

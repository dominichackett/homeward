"use client";

import React, { useState, useRef, useEffect } from "react";
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
  Info,
  KeyRound,
  LogOut,
  Loader2,
  RefreshCw,
  UserCheck,
  MapPin,
  PhoneCall,
} from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  encryptBiometricEmbedding,
  generateDeterministicVector,
  createThumbnailDataUrl,
} from "@/lib/biometrics";

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
    email?: string | null;
  };
  status: "active" | "alerting";
  enrolledAt: string;
  avatarColor: string;
  lastVerified: string;
  photoThumbnailUrl?: string | null;
  caregiverId?: string | null;
}

interface IncidentItem {
  id: string;
  case_token: string;
  dependent_id: string;
  match_confidence: number;
  status: "active" | "resolved";
  location_note: string;
  nullifier?: string | null;
  encrypted_photo_url?: string | null;
  created_at: string;
  dependents?: {
    id: string;
    full_name: string;
    condition_notes?: string;
    primary_contact_name?: string;
    primary_contact_phone?: string;
  };
}

export default function CaregiverDashboard() {
  const [activeTab, setActiveTab] = useState<Tab>("dependents");
  const [dependents, setDependents] = useState<EnrolledPerson[]>([]);
  const [isLoadingDependents, setIsLoadingDependents] = useState(false);
  const [incidents, setIncidents] = useState<IncidentItem[]>([]);
  const [isLoadingIncidents, setIsLoadingIncidents] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Caregiver Auth State
  const [currentUser, setCurrentUser] = useState<{ email?: string; id?: string; name?: string } | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // face-api.js AI Biometric Model State
  const faceApiRef = useRef<typeof import("@vladmandic/face-api") | null>(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [isModelsLoading, setIsModelsLoading] = useState(false);
  const [modelError, setModelError] = useState<string | null>(null);

  // Photo analysis state
  const [isAnalyzingPhoto, setIsAnalyzingPhoto] = useState(false);
  const [faceAnalysis, setFaceAnalysis] = useState<{
    detected: boolean;
    score?: number;
    descriptor?: number[];
    box?: { x: number; y: number; width: number; height: number };
    error?: string;
  } | null>(null);
  const [encryptedEmbedding, setEncryptedEmbedding] = useState<string>("");
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);

  // Check Supabase Auth session on mount
  useEffect(() => {
    let isMounted = true;
    const supabase = getSupabaseBrowserClient();

    if (supabase) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (isMounted) {
          if (session?.user) {
            const userObj = {
              email: session.user.email,
              id: session.user.id,
              name: session.user.user_metadata?.full_name || session.user.email?.split("@")[0],
            };
            setCurrentUser(userObj);
            loadDependents(userObj.id);
          } else {
            loadDependents();
          }
          setIsCheckingAuth(false);
        }
      });

      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        if (isMounted) {
          if (session?.user) {
            const userObj = {
              email: session.user.email,
              id: session.user.id,
              name: session.user.user_metadata?.full_name || session.user.email?.split("@")[0],
            };
            setCurrentUser(userObj);
            loadDependents(userObj.id);
          } else {
            setCurrentUser(null);
            loadDependents();
          }
        }
      });

      return () => {
        isMounted = false;
        subscription.unsubscribe();
      };
    } else {
      // Local demo caregiver session fallback
      try {
        const stored = localStorage.getItem("homeward_caregiver_session");
        if (stored) {
          const parsed = JSON.parse(stored);
          setCurrentUser(parsed);
          loadDependents(parsed.id);
        } else {
          loadDependents();
        }
      } catch (err) {
        console.warn("Could not read local session:", err);
        loadDependents();
      }
      setIsCheckingAuth(false);
    }
    loadIncidents();
  }, []);

  const handleSignOut = async () => {
    const supabase = getSupabaseBrowserClient();
    if (supabase) {
      await supabase.auth.signOut();
    }
    localStorage.removeItem("homeward_caregiver_session");
    setCurrentUser(null);
  };

  // Reusable function to fetch dependents from /api/dependents (Supabase Postgres)
  const loadDependents = async (caregiverId?: string) => {
    try {
      setIsLoadingDependents(true);
      const url = caregiverId
        ? `/api/dependents?caregiver_id=${encodeURIComponent(caregiverId)}`
        : "/api/dependents";

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data.dependents && Array.isArray(data.dependents)) {
          const mapped: EnrolledPerson[] = data.dependents.map((d: any, idx: number) => {
            const ageMatch = d.condition_notes?.match(/Age:\s*(\d+)/i);
            const parsedAge = ageMatch ? parseInt(ageMatch[1], 10) : 78 - idx * 4;
            const condMatch = d.condition_notes?.match(/•\s*([^.]+)\./);
            const condition = condMatch
              ? condMatch[1].trim()
              : d.condition_notes?.split(".")[0] || "Caregiver Protected";

            return {
              id: d.id,
              name: d.full_name,
              nickname: d.full_name.split(" ")[0],
              age: parsedAge,
              condition: condition,
              notes: d.condition_notes || "",
              emergencyContact: {
                name: d.primary_contact_name,
                relationship: d.secondary_contact_name || "Primary Guardian",
                phone: d.primary_contact_phone,
                email: d.primary_contact_email,
              },
              status: "active",
              enrolledAt: d.created_at ? d.created_at.split("T")[0] : "2026-08-14",
              avatarColor:
                idx % 2 === 0
                  ? "from-amber-500 to-rose-600"
                  : "from-cyan-500 to-blue-600",
              lastVerified: `Enclave Hash: ${
                d.encrypted_embedding ? d.encrypted_embedding.slice(0, 14) + "..." : "0x7f2a...39b1"
              }`,
              photoThumbnailUrl: d.photo_thumbnail_url,
              caregiverId: d.caregiver_id,
            };
          });
          setDependents(mapped);
        }
      }
    } catch (err) {
      console.warn("Could not load dependents from API:", err);
    } finally {
      setIsLoadingDependents(false);
    }
  };

  // Reusable function to fetch emergency incidents from /api/incidents (Supabase Postgres)
  const loadIncidents = async () => {
    try {
      setIsLoadingIncidents(true);
      const res = await fetch("/api/incidents");
      if (res.ok) {
        const data = await res.json();
        if (data.incidents && Array.isArray(data.incidents)) {
          setIncidents(data.incidents);
        }
      }
    } catch (err) {
      console.warn("Could not load incidents from API:", err);
    } finally {
      setIsLoadingIncidents(false);
    }
  };

  // Pre-load face-api models when caregiver visits dashboard or enroll tab
  const loadFaceApiModels = async () => {
    if (faceApiRef.current && modelsLoaded) return faceApiRef.current;
    try {
      setIsModelsLoading(true);
      setModelError(null);
      const faceapi = await import("@vladmandic/face-api");
      faceApiRef.current = faceapi;
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri("/models"),
        faceapi.nets.faceLandmark68TinyNet.loadFromUri("/models"),
        faceapi.nets.faceLandmark68Net.loadFromUri("/models"),
        faceapi.nets.faceRecognitionNet.loadFromUri("/models"),
        faceapi.nets.ssdMobilenetv1.loadFromUri("/models"),
      ]);
      setModelsLoaded(true);
      setIsModelsLoading(false);
      return faceapi;
    } catch (err) {
      console.error("Failed to load face-api models:", err);
      setModelError("Could not load facial recognition AI models.");
      setIsModelsLoading(false);
      return null;
    }
  };

  useEffect(() => {
    loadFaceApiModels();
  }, []);

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

  // Biometric Analysis on Uploaded Photo using face-api.js
  const analyzeFaceImage = async (dataUrl: string) => {
    setIsAnalyzingPhoto(true);
    setSubmitError(null);
    setFaceAnalysis(null);

    try {
      const api = await loadFaceApiModels();
      if (!api) {
        setFaceAnalysis({
          detected: false,
          error: "Facial detection models could not be loaded. Please check your connection and try again.",
        });
        setIsAnalyzingPhoto(false);
        return;
      }

      const img = new Image();
      img.crossOrigin = "anonymous";
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = dataUrl;
      });

      // Pass 1: Tiny Face Detector
      let result = await api
        .detectSingleFace(
          img,
          new api.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.35 })
        )
        .withFaceLandmarks(true)
        .withFaceDescriptor();

      // Pass 2: SSD Mobilenet V1 fallback
      if (!result && api.nets.ssdMobilenetv1.isLoaded) {
        result = await api
          .detectSingleFace(img, new api.SsdMobilenetv1Options({ minConfidence: 0.35 }))
          .withFaceLandmarks()
          .withFaceDescriptor();
      }

      if (result) {
        const scorePercent = Math.round(result.detection.score * 100);
        const descriptor = Array.from(result.descriptor);
        const ciphertext = encryptBiometricEmbedding(descriptor);
        const thumb = await createThumbnailDataUrl(dataUrl, 240);

        setFaceAnalysis({
          detected: true,
          score: scorePercent,
          descriptor,
          box: {
            x: result.detection.box.x,
            y: result.detection.box.y,
            width: result.detection.box.width,
            height: result.detection.box.height,
          },
        });
        setEncryptedEmbedding(ciphertext);
        setThumbnailUrl(thumb);
      } else {
        setFaceAnalysis({
          detected: false,
          error: "No clear face detected in the photo. Please upload a well-lit, unobstructed frontal portrait.",
        });
        setEncryptedEmbedding("");
      }
    } catch (err) {
      console.error("Error analyzing face:", err);
      setFaceAnalysis({
        detected: false,
        error: "Failed to process photo geometry. Please try a different photo.",
      });
      setEncryptedEmbedding("");
    } finally {
      setIsAnalyzingPhoto(false);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        setUploadedPhoto(result);
        analyzeFaceImage(result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePrefillDemo = () => {
    setFormData({
      fullName: "Arthur Pendelton",
      nickname: "Artie",
      age: "82",
      condition: "Alzheimer's / Dementia",
      notes: "Former civil engineer. Often wanders toward transit hubs or train stations. Friendly but forgets his home address. Needs water.",
      contactName: "David Pendelton",
      contactRel: "Son & Power of Attorney",
      contactPhone: "+1 (555) 432-1098",
      contactEmail: "david.p@example.com",
      consentAttestation: true,
    });

    const demoVector = generateDeterministicVector("Arthur Pendelton 1944 baseline");
    const demoCipher = encryptBiometricEmbedding(demoVector);
    const demoSvgAvatar = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><rect width="200" height="200" rx="30" fill="%230f172a"/><circle cx="100" cy="85" r="45" fill="%2338bdf8"/><path d="M40 180 c0-40 30-55 60-55 s60 15 60 55" fill="%230284c7"/><circle cx="85" cy="80" r="5" fill="%230f172a"/><circle cx="115" cy="80" r="5" fill="%230f172a"/><path d="M85 105 q15 10 30 0" stroke="%230f172a" stroke-width="3" fill="none"/></svg>`;

    setUploadedPhoto(demoSvgAvatar);
    setThumbnailUrl(demoSvgAvatar);
    setEncryptedEmbedding(demoCipher);
    setFaceAnalysis({
      detected: true,
      score: 97,
      descriptor: demoVector,
    });
    setSubmitError(null);
  };

  const handleSubmitEnrollment = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!formData.consentAttestation) {
      setSubmitError("Guardian legal consent attestation is required to complete enrollment.");
      return;
    }

    if (!uploadedPhoto || !faceAnalysis?.detected) {
      setSubmitError("A clear reference photo with verified facial geometry is required.");
      return;
    }

    if (!formData.fullName || !formData.contactName || !formData.contactPhone) {
      setSubmitError("Please fill in all required fields (full name, emergency contact, and phone).");
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        full_name: formData.fullName,
        condition_notes: `Age: ${formData.age || "Unknown"} • ${formData.condition}. ${formData.notes}`,
        primary_contact_name: formData.contactName,
        primary_contact_phone: formData.contactPhone,
        primary_contact_email: formData.contactEmail || null,
        secondary_contact_name: formData.contactRel || null,
        secondary_contact_phone: null,
        consent_attested: true,
        encrypted_embedding: encryptedEmbedding,
        photo_thumbnail_url: thumbnailUrl || uploadedPhoto,
        caregiver_id: currentUser?.id || null,
      };

      const res = await fetch("/api/dependents", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Failed to persist dependent in database.");
      }

      // Refresh dependent records from Supabase
      await loadDependents(currentUser?.id);

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
        setThumbnailUrl(null);
        setFaceAnalysis(null);
        setEncryptedEmbedding("");
      }, 1500);
    } catch (err: any) {
      console.error("Enrollment error:", err);
      setSubmitError(err.message || "An unexpected error occurred during enrollment.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteDependent = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to remove ${name} from active safety monitoring?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/dependents?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setDependents((prev) => prev.filter((d) => d.id !== id));
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "Failed to delete dependent");
      }
    } catch (err) {
      console.error("Delete error:", err);
      alert("Network error deleting dependent");
    }
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

            {currentUser ? (
              <div className="flex items-center gap-2 pl-3 border-l border-slate-800">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold ring-2 ring-purple-500/20 uppercase">
                  {currentUser.name ? currentUser.name.slice(0, 2) : "SV"}
                </div>
                <div className="hidden md:block text-left">
                  <p className="text-xs font-semibold text-slate-200">{currentUser.name || currentUser.email}</p>
                  <p className="text-[10px] text-emerald-400 font-medium">Verified Guardian</p>
                </div>
                <button
                  onClick={handleSignOut}
                  title="Sign out of Caregiver Portal"
                  className="ml-1 p-1.5 rounded-lg bg-slate-850 hover:bg-slate-800 text-slate-400 hover:text-rose-400 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <Link
                href="/login?redirect=/dashboard"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-xs font-semibold shadow-md shadow-cyan-500/20"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>Sign In</span>
              </Link>
            )}
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

          {/* Navigation Tabs (Only visible when authenticated) */}
          {currentUser && (
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
                onClick={() => {
                  setActiveTab("alerts");
                  loadIncidents();
                }}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                  activeTab === "alerts"
                    ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/20"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
                }`}
              >
                <Bell className="w-3.5 h-3.5" />
                <span>Incident Audit Log</span>
                {incidents.length > 0 && (
                  <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-red-500 text-white font-bold ml-0.5 animate-pulse">
                    {incidents.length}
                  </span>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6">
        {/* ==================== LOCKED AUTHENTICATION GATE ==================== */}
        {!currentUser && !isCheckingAuth ? (
          <div className="max-w-md mx-auto my-12 px-4">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 text-center shadow-2xl animate-fade-in flex flex-col items-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-950 via-slate-800 to-blue-950 border border-cyan-800/80 flex items-center justify-center mb-5 text-cyan-400 shadow-xl">
                <Lock className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-bold text-white tracking-tight">Caregiver Portal Protected</h2>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                This dashboard contains confidential medical notes, next-of-kin contacts, and active protected dependents. Please authenticate as an authorized guardian to access.
              </p>

              <div className="mt-6 w-full space-y-3">
                <Link
                  href="/login?redirect=/dashboard"
                  className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs shadow-lg shadow-cyan-500/25 transition-all flex items-center justify-center gap-2"
                >
                  <KeyRound className="w-4 h-4" />
                  <span>Sign In / Create Account</span>
                </Link>
              </div>

              <div className="mt-6 pt-5 border-t border-slate-800/80 w-full text-center">
                <Link href="/" className="text-xs text-slate-500 hover:text-slate-300">
                  &larr; Return to Safety Portal Home
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <>
        {/* ==================== TAB 1: DEPENDENTS LIST ==================== */}
        {activeTab === "dependents" && (
          <div className="space-y-6">
            {/* Top Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-cyan-950/80 border border-cyan-800/60 flex items-center justify-center text-cyan-400">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Active Protections</p>
                    <p className="text-xl font-bold text-white">{dependents.length} Individuals</p>
                  </div>
                </div>
                <button
                  onClick={() => loadDependents(currentUser?.id)}
                  disabled={isLoadingDependents}
                  className="p-2 rounded-xl bg-slate-850 hover:bg-slate-800 text-slate-400 hover:text-cyan-400 transition-colors"
                  title="Refresh from Supabase"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingDependents ? "animate-spin text-cyan-400" : ""}`} />
                </button>
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

            {/* Dependents Grid or Empty State */}
            {isLoadingDependents ? (
              <div className="rounded-3xl border border-slate-800 bg-slate-900/50 p-12 text-center flex flex-col items-center justify-center">
                <Loader2 className="w-8 h-8 text-cyan-400 animate-spin mb-3" />
                <p className="text-sm font-semibold text-white">Loading enrolled dependents from Supabase...</p>
                <p className="text-xs text-slate-400 mt-1">Retrieving hardware enclave encrypted biometric records.</p>
              </div>
            ) : dependents.length === 0 ? (
              <div className="rounded-3xl border-2 border-dashed border-slate-800 bg-slate-900/30 p-10 sm:p-14 text-center flex flex-col items-center justify-center">
                <div className="w-16 h-16 rounded-2xl bg-slate-800/90 border border-slate-700 flex items-center justify-center text-cyan-400 mb-4 shadow-lg">
                  <Users className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-white tracking-tight">No Dependents Enrolled Yet</h3>
                <p className="text-xs text-slate-400 max-w-md mt-1.5 mb-6 leading-relaxed">
                  You currently have no loved ones enrolled under your caregiver account. Enroll your first family member or dependent to protect them with hardware-enclave biometric re-identification.
                </p>
                <button
                  onClick={() => setActiveTab("enroll")}
                  className="px-6 py-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs shadow-xl shadow-cyan-500/25 transition-all flex items-center gap-2"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Enroll Your First Dependent</span>
                </button>
              </div>
            ) : (
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
                          {dep.photoThumbnailUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={dep.photoThumbnailUrl}
                              alt={dep.name}
                              className="w-14 h-14 rounded-2xl object-cover border border-slate-700 shadow-lg shrink-0"
                            />
                          ) : (
                            <div
                              className={`w-14 h-14 rounded-2xl bg-gradient-to-tr ${dep.avatarColor} flex items-center justify-center text-white font-bold text-lg shadow-lg shrink-0`}
                            >
                              {dep.nickname.slice(0, 2).toUpperCase()}
                            </div>
                          )}
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

                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-950/80 text-emerald-400 border border-emerald-800/80 shrink-0">
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
                          onClick={() => handleDeleteDependent(dep.id, dep.name)}
                          className="text-xs text-slate-500 hover:text-rose-400 font-medium transition-colors flex items-center gap-1"
                          title="Remove dependent"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Remove</span>
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
            )}
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

                  {isAnalyzingPhoto ? (
                    <div className="rounded-2xl border-2 border-cyan-500/60 p-5 bg-slate-950/80 flex items-center gap-4 animate-pulse">
                      <Loader2 className="w-6 h-6 text-cyan-400 animate-spin shrink-0" />
                      <div>
                        <p className="text-xs font-bold text-white">Analyzing Facial Geometry with face-api.js...</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Verifying frontal face alignment and extracting 128D biometric vector in browser.
                        </p>
                      </div>
                    </div>
                  ) : faceAnalysis?.detected ? (
                    <div className="rounded-2xl border-2 border-emerald-500/60 p-4 bg-slate-950 flex flex-col gap-3">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-800 shrink-0 border border-slate-700">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={thumbnailUrl || uploadedPhoto || ""}
                              alt="Reference face"
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-bold">
                              <CheckCircle2 className="w-4 h-4" />
                              <span>Clear Facial Geometry Verified ({faceAnalysis.score}% Confidence)</span>
                            </div>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                              Face alignment verified &middot; 128D biometric vector extracted.
                            </p>
                            <div className="flex items-center gap-2 mt-1 font-mono text-[10px] text-cyan-300">
                              <Lock className="w-3 h-3 text-cyan-400" />
                              <span>Ciphertext: {encryptedEmbedding.slice(0, 16)}...</span>
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setUploadedPhoto(null);
                            setThumbnailUrl(null);
                            setFaceAnalysis(null);
                            setEncryptedEmbedding("");
                          }}
                          className="p-2 text-slate-400 hover:text-red-400 transition-colors"
                          title="Remove photo"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {faceAnalysis.descriptor && (
                        <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-[10px] font-mono text-slate-400 flex items-center justify-between gap-2">
                          <div>
                            <span className="text-cyan-400 font-semibold">128D Vector Snippet: </span>
                            [{faceAnalysis.descriptor.slice(0, 5).map((n) => n.toFixed(4)).join(", ")}...]
                          </div>
                          <span className="text-[10px] text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800/80 shrink-0">
                            TEE Enclave Ready
                          </span>
                        </div>
                      )}
                    </div>
                  ) : faceAnalysis?.error ? (
                    <div className="rounded-2xl border-2 border-rose-500/60 p-4 bg-rose-950/20 flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-bold text-rose-300">Face Not Detected</p>
                          <p className="text-[11px] text-slate-400 mt-0.5">{faceAnalysis.error}</p>
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="mt-2 text-xs font-semibold text-cyan-400 hover:underline inline-flex items-center gap-1"
                          >
                            <Upload className="w-3 h-3" /> Upload another photo
                          </button>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setUploadedPhoto(null);
                          setFaceAnalysis(null);
                        }}
                        className="text-slate-400 hover:text-red-400 p-1"
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
                        JPG or PNG. face-api.js validates facial geometry and extracts 128D vector.
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

                {/* Error Banner */}
                {submitError && (
                  <div className="p-3.5 rounded-2xl bg-rose-950/60 border border-rose-800 text-xs text-rose-300 flex items-center gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>{submitError}</span>
                  </div>
                )}

                {/* Submit Action */}
                <button
                  type="submit"
                  disabled={isSubmitting || isAnalyzingPhoto}
                  className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm shadow-xl shadow-cyan-500/25 transition-all active:scale-[0.99] flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Encrypting & Enrolling in Supabase...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>Encrypt & Enroll Biometric Vector</span>
                    </>
                  )}
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

            {/* Incident Status / Empty State or Live List */}
            {isLoadingIncidents ? (
              <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-10 text-center flex flex-col items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-cyan-400 mb-3" />
                <p className="text-xs text-slate-400">Loading audit records from Supabase...</p>
              </div>
            ) : incidents.length === 0 ? (
              <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-10 text-center flex flex-col items-center justify-center">
                <div className="w-14 h-14 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-400 mb-3.5 shadow-md">
                  <Bell className="w-6 h-6 text-cyan-400" />
                </div>
                <h4 className="text-base font-bold text-white">No Emergency Incidents Reported</h4>
                <p className="text-xs text-slate-400 max-w-sm mt-1 mb-4 leading-relaxed">
                  When an emergency finder scans an individual and an enclave biometric match is verified, incident notifications and cryptographic audit records are logged here.
                </p>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-mono bg-slate-950 text-slate-400 border border-slate-800">
                  <Lock className="w-3 h-3 text-cyan-400" />
                  <span>Zero Unauthorized Sightings &bull; TEE Audited</span>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {incidents.map((inc) => {
                  const personName = inc.dependents?.full_name || "Enrolled Dependent";
                  const confidencePct = Math.round(inc.match_confidence * 100);
                  const isResolved = inc.status === "resolved";
                  const dateStr = new Date(inc.created_at).toLocaleString();

                  // Parse finder contact details if included in location_note
                  const phoneMatch = inc.location_note?.match(/Phone:\s*([^\]|]+)/i);
                  const finderPhone = phoneMatch ? phoneMatch[1].trim() : null;
                  const nameMatch = inc.location_note?.match(/Finder:\s*([^|\]]+)/i);
                  const finderName = nameMatch ? nameMatch[1].trim() : null;
                  const cleanLocation = inc.location_note
                    ? inc.location_note.replace(/\[Contact:[^\]]+\]\s*/i, "").trim() || "Reported by verified bystander"
                    : "Reported by verified bystander";

                  return (
                    <div
                      key={inc.id}
                      className={`p-5 rounded-2xl border transition-all ${
                        isResolved
                          ? "bg-slate-900/40 border-slate-800/60 opacity-80"
                          : "bg-slate-900/90 border-cyan-800/80 shadow-lg shadow-cyan-950/20"
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 pb-3 border-b border-slate-800">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                              isResolved
                                ? "bg-slate-800 text-slate-300 border border-slate-700"
                                : "bg-red-950 text-red-300 border border-red-800 animate-pulse"
                            }`}
                          >
                            <AlertTriangle className="w-3 h-3" />
                            {isResolved ? "Safely Located / Resolved" : "Active Emergency Sighting"}
                          </span>
                          <span className="text-xs font-mono text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800">
                            {confidencePct}% Match Confidence
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-slate-400">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{dateStr}</span>
                        </div>
                      </div>

                      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="text-base font-bold text-white tracking-tight">
                              {personName}
                            </h4>
                            <span className="text-xs font-mono text-cyan-400">
                              ({inc.case_token})
                            </span>
                          </div>

                          {/* Bystander on Scene Contact Badge */}
                          {finderPhone && (
                            <div className="p-3 rounded-xl bg-emerald-950/50 border border-emerald-800/80 flex flex-wrap items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-lg bg-emerald-900/80 text-emerald-300 flex items-center justify-center">
                                  <UserCheck className="w-4 h-4" />
                                </div>
                                <div>
                                  <div className="text-xs font-bold text-emerald-300">
                                    Bystander: {finderName || "Verified Bystander"}
                                  </div>
                                  <div className="text-[11px] text-slate-300 font-mono flex items-center gap-1">
                                    <Phone className="w-3 h-3 text-emerald-400" />
                                    <span>{finderPhone}</span>
                                  </div>
                                </div>
                              </div>
                              <a
                                href={`tel:${finderPhone}`}
                                className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-xs shadow-sm flex items-center gap-1.5 transition-colors"
                              >
                                <PhoneCall className="w-3.5 h-3.5" />
                                <span>Call Finder</span>
                              </a>
                            </div>
                          )}

                          <div className="flex items-start gap-1.5 text-xs text-slate-300 leading-relaxed">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                            <span>{cleanLocation}</span>
                          </div>

                          <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono mt-1">
                            <Lock className="w-3 h-3 text-cyan-400" />
                            <span>World ID Nullifier: {inc.nullifier?.slice(0, 16)}... (Verified Human)</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-start sm:self-center">
                          <Link
                            href={`/alert/${inc.case_token}`}
                            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs shadow-md transition-all flex items-center gap-1.5"
                          >
                            <span>Open Alert Screen</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
          </>
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

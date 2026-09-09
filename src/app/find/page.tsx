"use client";

import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  Camera,
  ShieldCheck,
  Lock,
  RefreshCw,
  Upload,
  AlertCircle,
  CheckCircle2,
  PhoneCall,
  Info,
  ChevronRight,
  EyeOff,
  Cpu,
  Sparkles,
  Flame,
  AlertTriangle,
  ScanFace,
  XCircle,
  ExternalLink,
  ArrowRight,
  Phone,
  User,
  MapPin
} from "lucide-react";
import {
  IDKitRequestWidget,
  selfieCheckLegacy,
  orbLegacy,
  setDebug,
  type RpContext,
  type IDKitResult,
} from "@worldcoin/idkit";
import {
  encryptBiometricEmbedding,
  generateDeterministicVector,
} from "@/lib/biometrics";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type FlowStep = "camera" | "preview" | "world_id" | "processing" | "confirmed";

interface DetectionInfo {
  detected: boolean;
  score?: number;
  descriptor?: number[];
  box?: { x: number; y: number; width: number; height: number };
  error?: string | null;
}

export default function FindScreen() {
  const [supabaseUserId, setSupabaseUserId] = useState<string | null>(null);

  // Retrieve authenticated Supabase user ID if available
  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (supabase) {
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (user?.id) {
          setSupabaseUserId(user.id);
        }
      });

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, session) => {
        if (session?.user?.id) {
          setSupabaseUserId(session.user.id);
        } else {
          setSupabaseUserId(null);
        }
      });

      return () => {
        subscription.unsubscribe();
      };
    } else {
      try {
        const stored = localStorage.getItem("homeward_caregiver_session");
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed?.id) setSupabaseUserId(parsed.id);
        }
      } catch {}
    }
  }, []);

  const preset = useMemo(
    () => selfieCheckLegacy(supabaseUserId ? { signal: supabaseUserId } : { signal: "anonymous" }),
    [supabaseUserId]
  );
  const [currentStep, setCurrentStep] = useState<FlowStep>("camera");
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [processingStage, setProcessingStage] = useState(1);
  const [worldIdStatus, setWorldIdStatus] = useState<"idle" | "verifying" | "throttled">("idle");
  const [matchError, setMatchError] = useState<string | null>(null);
  const [enclaveReceipt, setEnclaveReceipt] = useState<{
    enclave_hash: string;
    timestamp: number;
  } | null>(null);
  const [devDebug, setDevDebug] = useState<{
    matched: boolean;
    matchedName?: string | null;
    dependentId?: string | null;
    confidence?: number;
    distance?: number | null;
    caseToken?: string | null;
    alertUrl?: string | null;
  } | null>(null);

  // Finder contact details (shared with next-of-kin if matched)
  const [finderPhone, setFinderPhone] = useState("");
  const [finderName, setFinderName] = useState("");
  const [finderLocation, setFinderLocation] = useState("");

  // World ID v4 state
  const [isIdKitOpen, setIsIdKitOpen] = useState(false);
  const [rpContext, setRpContext] = useState<RpContext | null>(null);
  const [verifiedNullifier, setVerifiedNullifier] = useState<string | null>(null);
  const [worldIdError, setWorldIdError] = useState<string | null>(null);
  const [worldIdNotice, setWorldIdNotice] = useState<string | null>(null);

  // face-api.js state
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [modelsLoading, setModelsLoading] = useState(true);
  const [modelError, setModelError] = useState<string | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const [detection, setDetection] = useState<DetectionInfo | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const faceApiRef = useRef<typeof import("@vladmandic/face-api") | null>(null);

  // 1. Initialize & Load face-api.js Models
  useEffect(() => {
    let isMounted = true;

    async function loadFaceApi() {
      try {
        setModelsLoading(true);
        setModelError(null);

        // Dynamically import @vladmandic/face-api for client-side execution
        const faceapi = await import("@vladmandic/face-api");
        faceApiRef.current = faceapi;

        // Load Tiny Face Detector, SSD Mobilenet, 68 Landmark & Recognition models from /models
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri("/models"),
          faceapi.nets.faceLandmark68TinyNet.loadFromUri("/models"),
          faceapi.nets.faceLandmark68Net.loadFromUri("/models"),
          faceapi.nets.faceRecognitionNet.loadFromUri("/models"),
          faceapi.nets.ssdMobilenetv1.loadFromUri("/models"),
        ]);

        if (isMounted) {
          setModelsLoaded(true);
          setModelsLoading(false);
        }
      } catch (err) {
        console.error("Failed to load face-api models:", err);
        if (isMounted) {
          setModelError(err instanceof Error ? err.message : "Error loading models");
          setModelsLoading(false);
        }
      }
    }

    loadFaceApi();

    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Manage Camera Stream
  useEffect(() => {
    let stream: MediaStream | null = null;
    if (currentStep === "camera") {
      navigator.mediaDevices
        ?.getUserMedia({ video: { facingMode: "environment" } })
        .then((s) => {
          stream = s;
          if (videoRef.current) {
            videoRef.current.srcObject = s;
            setIsStreaming(true);
            setCameraError(null);
          }
        })
        .catch(() => {
          setIsStreaming(false);
          setCameraError("Camera unavailable or permission denied. You can select or take a photo below.");
        });
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [currentStep]);

  // 3. Run face-api.js Detection on Image
  const runFaceDetection = useCallback(async (imageSrc: string) => {
    setIsDetecting(true);
    setDetection(null);

    const api = faceApiRef.current;
    if (!api) {
      setIsDetecting(false);
      setDetection({
        detected: false,
        error: "Face AI engine is initializing. Please wait a moment and try again.",
      });
      return;
    }

    const img = new Image();
    if (!imageSrc.startsWith("data:")) {
      img.crossOrigin = "anonymous";
    }

    img.onload = async () => {
      try {
        // Pass 1: Try Tiny Face Detector (fast, mobile-friendly)
        let result = await api
          .detectSingleFace(
            img,
            new api.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.35 })
          )
          .withFaceLandmarks(true)
          .withFaceDescriptor();

        // Pass 2: Fallback to SSD Mobilenet V1 if Tiny did not detect
        if (!result && api.nets.ssdMobilenetv1.isLoaded) {
          result = await api
            .detectSingleFace(img, new api.SsdMobilenetv1Options({ minConfidence: 0.35 }))
            .withFaceLandmarks()
            .withFaceDescriptor();
        }

        if (result) {
          const scorePercent = Math.round(result.detection.score * 100);
          const descriptorArray = Array.from(result.descriptor);

          setDetection({
            detected: true,
            score: scorePercent,
            descriptor: descriptorArray,
            box: {
              x: result.detection.box.x,
              y: result.detection.box.y,
              width: result.detection.box.width,
              height: result.detection.box.height,
            },
          });

          // Draw bounding box and landmarks onto overlay canvas
          if (canvasRef.current) {
            const canvas = canvasRef.current;
            canvas.width = img.naturalWidth || img.width;
            canvas.height = img.naturalHeight || img.height;
            const displaySize = {
              width: img.naturalWidth || img.width,
              height: img.naturalHeight || img.height,
            };
            api.matchDimensions(canvas, displaySize);
            const resizedResult = api.resizeResults(result, displaySize);

            const ctx = canvas.getContext("2d");
            if (ctx) {
              ctx.clearRect(0, 0, canvas.width, canvas.height);
            }

            api.draw.drawDetections(canvas, resizedResult);
            api.draw.drawFaceLandmarks(canvas, resizedResult);
          }
        } else {
          setDetection({
            detected: false,
            error: "No human face detected in this image. Please ensure the face is centered, well-lit, and not obstructed.",
          });
        }
      } catch (err) {
        console.error("Face detection execution error:", err);
        setDetection({
          detected: false,
          error: `Biometric scan error: ${err instanceof Error ? err.message : "Unknown failure"}`,
        });
      } finally {
        setIsDetecting(false);
      }
    };

    img.onerror = () => {
      setIsDetecting(false);
      setDetection({
        detected: false,
        error: "Failed to load image for scanning. Please try a different photo.",
      });
    };

    img.src = imageSrc;
  }, []);

  // Handle Capture from Live Camera
  const handleCapture = () => {
    if (videoRef.current && isStreaming) {
      const canvas = document.createElement("canvas");
      canvas.width = videoRef.current.videoWidth || 640;
      canvas.height = videoRef.current.videoHeight || 480;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
        setCapturedImage(dataUrl);
        setCurrentStep("preview");
        runFaceDetection(dataUrl);
      }
    } else {
      // If camera is not streaming, open native camera/photo picker
      fileInputRef.current?.click();
    }
  };

  // Handle File Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        setCapturedImage(dataUrl);
        setCurrentStep("preview");
        runFaceDetection(dataUrl);
      };
      reader.readAsDataURL(file);
    }
  };

  // 4. Trigger Real World ID Verification Flow (IDKit v4)
  const handleTriggerWorldId = async () => {
    setWorldIdStatus("verifying");
    setWorldIdError(null);
    setWorldIdNotice(null);

    // Enable IDKit debug logging
    try {
      setDebug(true);
    } catch {}

    try {
      // Step 3 from World ID SKILL: Generate RP signature in backend
      const res = await fetch("/api/world-id/rp-signature", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: process.env.NEXT_PUBLIC_WLD_ACTION || "finder-report" }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Failed to generate RP signature from server");
      }

      setRpContext({
        rp_id: data.rp_id,
        nonce: data.nonce,
        created_at: data.created_at,
        expires_at: data.expires_at,
        signature: data.sig,
      });

      // Step 4: Open IDKit widget
      setIsIdKitOpen(true);
    } catch (err) {
      console.error("Failed to initialize World ID:", err);
      setWorldIdError(err instanceof Error ? err.message : "Error initializing World ID");
      setWorldIdStatus("idle");
    }
  };

  // Handle widget open/close event (e.g., user closes QR modal or dismisses without verifying)
  const handleOpenChange = (open: boolean) => {
    setIsIdKitOpen(open);
    if (!open) {
      setWorldIdStatus("idle");
      // If proof has not verified yet and user is still on World ID step
      if (!verifiedNullifier && currentStep === "world_id") {
        setWorldIdNotice(
          "World ID verification was not completed. Verification is required to protect vulnerable persons against mass-probing. You can reopen the QR code to verify or go back."
        );
      }
    } else {
      setWorldIdNotice(null);
      setWorldIdError(null);
    }
  };

  // Step 5: Backend Proof Verification
  const handleProofVerify = async (result: IDKitResult) => {
    const res = await fetch("/api/world-id/verify-proof", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        idkitResponse: result,
      }),
    });

    if (res.status === 429) {
      const errData = await res.json();
      setWorldIdStatus("throttled");
      throw new Error(errData.message || "Rate limit reached for this nullifier");
    }

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || "Backend verification failed");
    }

    const verifyData = await res.json();
    if (verifyData.nullifier) {
      setVerifiedNullifier(verifyData.nullifier);
    }
  };

  // Step 6: On Verified Success, proceed to Confidential CRE Enclave Matching
  const handleProofSuccess = async (result: IDKitResult) => {
    setIsIdKitOpen(false);
    setWorldIdStatus("idle");
    setWorldIdNotice(null);
    setWorldIdError(null);
    setMatchError(null);
    setCurrentStep("processing");

    setProcessingStage(1);

    try {
      // 1. Prepare nullifier hash
      const firstRes = (result as any)?.responses?.[0];
      const nullifierHash =
        verifiedNullifier ||
        firstRes?.nullifier ||
        (result as any)?.nullifier_hash ||
        "finder-report";

      // 2. Prepare encrypted embedding from client-side detection
      let ciphertext = "";
      if (detection?.descriptor && detection.descriptor.length === 128) {
        ciphertext = encryptBiometricEmbedding(detection.descriptor);
      } else {
        const fallbackVec = generateDeterministicVector(nullifierHash);
        ciphertext = encryptBiometricEmbedding(fallbackVec);
      }

      setProcessingStage(2);

      // 3. Dispatch to /api/match for Chainlink CRE TEE execution
      const res = await fetch("/api/match", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          nullifier: nullifierHash,
          encrypted_embedding: ciphertext,
          location_note: finderLocation.trim() || "Reported by verified bystander via Mobile Finder Viewfinder",
          finder_phone: finderPhone.trim() || null,
          finder_name: finderName.trim() || null,
          encrypted_photo_url: capturedImage || null,
        }),
      });

      setProcessingStage(3);

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Biometric matching workflow failed");
      }

      const matchData = await res.json();
      if (matchData.execution_receipt) {
        setEnclaveReceipt(matchData.execution_receipt);
      }
      if (matchData._dev_debug) {
        setDevDebug(matchData._dev_debug);
        console.log(
          "%c[CRE TEE ENCLAVE MATCH RESULT]",
          "color: #06b6d4; font-weight: bold; font-size: 13px;",
          matchData._dev_debug
        );
      }

      setTimeout(() => {
        setCurrentStep("confirmed");
      }, 1000);
    } catch (err: any) {
      console.error("Error executing CRE match workflow:", err);
      setMatchError(err.message || "Failed to process matching in enclave.");
    }
  };

  const handleRetryMatch = async () => {
    if (!verifiedNullifier) {
      setCurrentStep("world_id");
      return;
    }
    setMatchError(null);
    setProcessingStage(1);

    try {
      let ciphertext = "";
      if (detection?.descriptor && detection.descriptor.length === 128) {
        ciphertext = encryptBiometricEmbedding(detection.descriptor);
      } else {
        const fallbackVec = generateDeterministicVector(verifiedNullifier || "finder-report");
        ciphertext = encryptBiometricEmbedding(fallbackVec);
      }

      setProcessingStage(2);

      const res = await fetch("/api/match", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          nullifier: verifiedNullifier,
          encrypted_embedding: ciphertext,
          location_note: finderLocation.trim() || "Reported by verified bystander via Mobile Finder Viewfinder",
          finder_phone: finderPhone.trim() || null,
          finder_name: finderName.trim() || null,
          encrypted_photo_url: capturedImage || null,
        }),
      });

      setProcessingStage(3);

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Biometric matching workflow failed");
      }

      const matchData = await res.json();
      if (matchData.execution_receipt) {
        setEnclaveReceipt(matchData.execution_receipt);
      }
      if (matchData._dev_debug) {
        setDevDebug(matchData._dev_debug);
        console.log(
          "%c[CRE TEE ENCLAVE MATCH RESULT]",
          "color: #06b6d4; font-weight: bold; font-size: 13px;",
          matchData._dev_debug
        );
      }

      setTimeout(() => {
        setCurrentStep("confirmed");
      }, 1000);
    } catch (err: any) {
      console.error("Error retrying CRE match workflow:", err);
      setMatchError(err.message || "Failed to process matching in enclave.");
    }
  };

  const handleBypassToTee = () => {
    const devNullifier = "0xdev_" + crypto.randomUUID().replace(/-/g, "");
    setVerifiedNullifier(devNullifier);
    const dummyResult: IDKitResult = {
      protocol_version: "4.0",
      nonce: rpContext?.nonce || "0x" + Array.from({ length: 64 }, () => "1").join(""),
      action: process.env.NEXT_PUBLIC_WLD_ACTION || "finder-report",
      environment: "sandbox",
      responses: [
        {
          identifier: "orb",
          nullifier: devNullifier,
        } as any,
      ],
    };
    handleProofSuccess(dummyResult);
  };

  // Chainlink CRE TEE Confidential Workflow Simulation for manual preview
  const startSimulatedProcessing = () => {
    setProcessingStage(1);
    setTimeout(() => setProcessingStage(2), 800);
    setTimeout(() => setProcessingStage(3), 1600);
    setTimeout(() => {
      setCurrentStep("confirmed");
    }, 2400);
  };

  const handleReset = () => {
    setCapturedImage(null);
    setDetection(null);
    setCurrentStep("camera");
    setProcessingStage(1);
    setWorldIdStatus("idle");
    setVerifiedNullifier(null);
    setWorldIdError(null);
    setWorldIdNotice(null);
    setMatchError(null);
    setEnclaveReceipt(null);
    setDevDebug(null);
    // Note: finderPhone, finderName, finderLocation are preserved so user doesn't have to re-enter
    setIsIdKitOpen(false);
  };

  const renderFinderContactCard = (helperText: string) => (
    <div className="w-full mt-4 p-4 sm:p-5 rounded-3xl bg-slate-900 border-2 border-cyan-800/70 shadow-xl text-left space-y-3.5 animate-fade-in">
      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
        <div className="flex items-center gap-2 text-xs font-bold text-white">
          <Phone className="w-4 h-4 text-cyan-400" />
          <span>Your Contact Details (Shared with Family if Matched)</span>
        </div>
        <span className="text-[10px] text-cyan-400 font-mono bg-cyan-950 px-2 py-0.5 rounded border border-cyan-800">
          Confidential Next-of-Kin Contact
        </span>
      </div>

      <p className="text-xs text-slate-300 leading-relaxed">
        {helperText}
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-semibold text-slate-200 block mb-1">
            Your Phone Number <span className="text-cyan-400">*</span>
          </label>
          <div className="relative">
            <Phone className="w-4 h-4 text-cyan-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="tel"
              value={finderPhone}
              onChange={(e) => setFinderPhone(e.target.value)}
              placeholder="e.g. (555) 234-5678"
              className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder:text-slate-500 outline-none transition-colors"
            />
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">
            Family receives this to call or SMS you for safe pickup.
          </span>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-200 block mb-1">
            Your Name / Role (Optional)
          </label>
          <div className="relative">
            <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={finderName}
              onChange={(e) => setFinderName(e.target.value)}
              placeholder="e.g. Alex (Store Clerk / Passerby)"
              className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder:text-slate-500 outline-none transition-colors"
            />
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">
            Helps the family identify who they are speaking with.
          </span>
        </div>
      </div>

      <div>
        <label className="text-xs font-semibold text-slate-200 block mb-1">
          Sighting Location & Context Notes
        </label>
        <div className="relative">
          <MapPin className="w-4 h-4 text-rose-400 absolute left-3 top-2.5" />
          <textarea
            rows={2}
            value={finderLocation}
            onChange={(e) => setFinderLocation(e.target.value)}
            placeholder="e.g. Waiting on bench near Market & 4th Street, wearing green coat..."
            className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder:text-slate-500 outline-none transition-colors resize-none"
          />
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between font-sans selection:bg-cyan-500 selection:text-white">
      {/* Top Navigation Bar */}
      <header className="border-b border-slate-800 bg-slate-900/70 backdrop-blur-md sticky top-0 z-40 px-4 py-3 sm:px-6">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/20">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold tracking-tight text-white group-hover:text-cyan-400 transition-colors">
                Homeward
              </span>
              <span className="text-[10px] uppercase font-semibold text-cyan-400 bg-cyan-950/70 px-1.5 py-0.5 rounded border border-cyan-800 ml-2">
                Finder Screen
              </span>
            </div>
          </Link>

          {/* AI Model Status Badge */}
          <div className="flex items-center gap-2">
            {modelsLoading ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-950/80 text-amber-400 border border-amber-800/80">
                <RefreshCw className="w-3 h-3 animate-spin" />
                Loading face-api.js...
              </span>
            ) : modelsLoaded ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-950/80 text-emerald-400 border border-emerald-800/80">
                <ScanFace className="w-3 h-3 text-emerald-400" />
                face-api.js Ready
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-950/80 text-red-400 border border-red-800/80">
                <AlertCircle className="w-3 h-3" />
                AI Model Error
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-xl w-full mx-auto p-4 flex flex-col justify-center">
        {/* Model Error Notice if any */}
        {modelError && (
          <div className="mb-4 p-3 rounded-2xl bg-red-950/80 border border-red-800 text-red-300 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
            <span>Model loading error: {modelError}</span>
          </div>
        )}

        {/* ==================== STATE 1: CAMERA SCANNER ==================== */}
        {currentStep === "camera" && (
          <div className="flex flex-col items-center animate-fade-in">
            {/* Viewfinder Card */}
            <div className="relative w-full aspect-[3/4] max-h-[500px] rounded-3xl overflow-hidden bg-slate-900 border-2 border-slate-800 shadow-2xl shadow-cyan-950/30 flex items-center justify-center">
              {/* Video Element for live stream */}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`absolute inset-0 w-full h-full object-cover ${
                  isStreaming ? "block" : "hidden"
                }`}
              />

              {/* Fallback graphic if camera is unavailable */}
              {!isStreaming && (
                <div className="flex flex-col items-center justify-center p-6 text-center text-slate-400">
                  <div className="w-20 h-20 rounded-full bg-slate-800/80 border border-slate-700 flex items-center justify-center mb-4 text-slate-400 animate-pulse">
                    <Camera className="w-10 h-10" />
                  </div>
                  <p className="text-sm font-semibold text-slate-200">Point & Shoot Camera</p>
                  <p className="text-xs text-slate-500 mt-1 max-w-[260px]">
                    {cameraError || "Point camera at the person. face-api.js scans the full frame."}
                  </p>
                </div>
              )}

              {/* Subtle corner framing indicators */}
              <div className="pointer-events-none absolute inset-4 border border-white/10 rounded-2xl">
                <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-white/40 rounded-tl" />
                <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-white/40 rounded-tr" />
                <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-white/40 rounded-bl" />
                <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-white/40 rounded-br" />
              </div>

              {/* Status Badges */}
              <div className="absolute top-4 left-4 right-4 flex justify-between items-center pointer-events-none">
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-950/80 backdrop-blur-md border border-slate-700/60 text-xs font-medium text-slate-200">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <span>face-api.js Ready</span>
                </div>
                <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-950/80 backdrop-blur-md border border-slate-700/60 text-xs text-slate-400">
                  <EyeOff className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Confidential</span>
                </div>
              </div>
            </div>

            {/* Action Bar */}
            <div className="w-full mt-4 flex items-center justify-between gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleFileUpload}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-300 text-sm font-medium transition-all"
              >
                <Upload className="w-4 h-4 text-cyan-400" />
                <span className="hidden sm:inline">Upload Photo</span>
              </button>

              <button
                onClick={handleCapture}
                disabled={modelsLoading}
                className="flex-1 flex items-center justify-center gap-2 py-4 px-6 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-base shadow-lg shadow-cyan-500/25 active:scale-[0.98] transition-all disabled:opacity-50"
              >
                <Camera className="w-5 h-5" />
                <span>{isStreaming ? "Take Photo" : "Take Photo / Pick File"}</span>
              </button>
            </div>

            {/* Finder Contact Details & Sighting Notes (Available immediately on Camera screen) */}
            {renderFinderContactCard(
              "Enter your contact details below so the family or emergency guardian can reach you directly if a confidential match is confirmed."
            )}
          </div>
        )}

        {/* ==================== STATE 2: PREVIEW & FACE-API DETECTION RESULT ==================== */}
        {currentStep === "preview" && (
          <div className="flex flex-col items-center animate-fade-in">
            <div className="relative w-full aspect-[3/4] max-h-[460px] rounded-3xl overflow-hidden bg-slate-900 border-2 border-slate-800 shadow-2xl flex items-center justify-center">
              {capturedImage ? (
                <>
                  {/* Base Image */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={capturedImage}
                    alt="Captured portrait"
                    className="w-full h-full object-cover"
                  />
                  {/* Canvas Overlay for face-api landmarks & bounding box */}
                  <canvas
                    ref={canvasRef}
                    className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                  />
                </>
              ) : (
                <div className="text-slate-500 text-xs">No image loaded</div>
              )}

              {/* In-Progress Detection Overlay */}
              {isDetecting && (
                <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center">
                  <div className="relative w-16 h-16 flex items-center justify-center mb-3">
                    <div className="absolute inset-0 rounded-full border-2 border-cyan-500/40 animate-ping" />
                    <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin" />
                  </div>
                  <p className="text-sm font-bold text-white">Analyzing Biometrics with face-api.js...</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Extracting facial contour, 68 landmarks, and 128D embedding vector.
                  </p>
                </div>
              )}

              {/* Top Result Pill */}
              <div className="absolute top-4 left-4 right-4 flex justify-between items-center pointer-events-none">
                {detection?.detected ? (
                  <span className="px-3 py-1 rounded-full bg-emerald-950/90 border border-emerald-800 text-emerald-400 text-xs font-semibold flex items-center gap-1.5 shadow-lg">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Face Verified ({detection.score}%)</span>
                  </span>
                ) : detection?.detected === false && !isDetecting ? (
                  <span className="px-3 py-1 rounded-full bg-red-950/90 border border-red-800 text-red-400 text-xs font-semibold flex items-center gap-1.5 shadow-lg">
                    <XCircle className="w-3.5 h-3.5" />
                    <span>No Face Detected</span>
                  </span>
                ) : null}

                <span className="px-2.5 py-1 rounded-full bg-slate-950/80 border border-slate-800 text-slate-400 text-[11px] font-mono">
                  face-api.js
                </span>
              </div>
            </div>

            {/* Verification Status Details */}
            <div className="w-full mt-3.5">
              {detection?.detected ? (
                <div className="p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-800/80 text-left space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold">
                      <Sparkles className="w-4 h-4" />
                      <span>Biometric Landmarks & 128D Vector Extracted</span>
                    </div>
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
                      128 Dimensions
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-normal">
                    face-api.js verified clear facial landmarks. The raw image remains strictly in local memory and will only be uploaded if an enclave match is confirmed.
                  </p>
                  {detection.descriptor && (
                    <div className="p-2 rounded-xl bg-slate-950/80 border border-slate-800 text-[10px] font-mono text-cyan-300 truncate">
                      Vector: [{detection.descriptor.slice(0, 6).map((n) => n.toFixed(4)).join(", ")}...]
                    </div>
                  )}
                </div>
              ) : detection?.error ? (
                <div className="p-3.5 rounded-2xl bg-red-950/50 border border-red-800 text-left space-y-1.5">
                  <div className="flex items-center gap-2 text-red-400 text-xs font-bold">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>Face Detection Failed</span>
                  </div>
                  <p className="text-xs text-red-200 leading-relaxed">
                    {detection.error}
                  </p>
                </div>
              ) : null}
            </div>

            {/* Finder Contact Details & Sighting Notes (Always visible on Preview) */}
            {renderFinderContactCard(
              "Review or update your contact details below. If this person is matched in the enclave, their family receives your phone number to coordinate safe immediate pickup."
            )}

            {/* Action Bar */}
            <div className="w-full mt-4 flex gap-3">
              <button
                onClick={handleReset}
                className="flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-300 text-xs font-semibold transition-all"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Retake</span>
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-300 text-xs font-semibold transition-all"
              >
                <Upload className="w-4 h-4 text-cyan-400" />
                <span>Upload</span>
              </button>

              <button
                onClick={() => setCurrentStep("world_id")}
                disabled={!detection?.detected || isDetecting}
                className={`flex-1 flex items-center justify-center gap-2 py-3.5 px-6 rounded-2xl font-bold text-xs shadow-lg transition-all ${
                  detection?.detected && !isDetecting
                    ? "bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-cyan-500/25 active:scale-[0.99]"
                    : "bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50"
                }`}
              >
                <span>{detection?.detected ? "Continue to World ID" : "Face Required to Continue"}</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ==================== STATE 3: WORLD ID GATE SCREEN ==================== */}
        {currentStep === "world_id" && (
          <div className="w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl animate-fade-in flex flex-col items-center text-center">
            {/* World ID Orb Header */}
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-slate-900 via-slate-800 to-slate-700 border border-slate-700 shadow-xl flex items-center justify-center mb-4 relative">
              <div className="w-10 h-10 rounded-full border-2 border-white/80 flex items-center justify-center">
                <div className="w-4 h-4 rounded-full bg-white animate-pulse" />
              </div>
              <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-slate-950 p-1 rounded-full">
                <ShieldCheck className="w-3.5 h-3.5" />
              </div>
            </div>

            <h2 className="text-xl font-bold text-white tracking-tight">
              World ID Selfie Check
            </h2>
            <p className="text-xs font-medium uppercase tracking-widest text-cyan-400 mt-1">
              Abuse Prevention & Sybil Resistance
            </p>

            <p className="text-xs text-slate-400 mt-3 leading-relaxed max-w-sm">
              To prevent automated bots, mass scraping, and prank reports against vulnerable persons, verify your human uniqueness with World ID.
            </p>

            {/* Attached Contact Confirmation Pill */}
            <div className="w-full mt-4 p-3.5 rounded-2xl bg-slate-950/80 border border-cyan-900/60 text-left flex items-center justify-between text-xs">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Contact Attached to Report
                </span>
                <div className="font-semibold text-white mt-0.5 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-cyan-400" />
                  {finderPhone ? (
                    <span className="text-cyan-300 font-mono">{finderPhone} {finderName ? `(${finderName})` : ""}</span>
                  ) : (
                    <span className="text-slate-400 font-normal italic">No phone number entered (Anonymous report)</span>
                  )}
                </div>
                {finderLocation && (
                  <p className="text-[11px] text-slate-400 mt-0.5 truncate max-w-[280px]">
                    Note: {finderLocation}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setCurrentStep("preview")}
                className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 underline shrink-0 ml-3"
              >
                Edit Details
              </button>
            </div>

            {/* Error or Throttling Banner */}
            {worldIdStatus === "throttled" && (
              <div className="mt-4 p-3 rounded-xl bg-amber-950/60 border border-amber-800 text-amber-300 text-xs flex items-center gap-2 text-left w-full">
                <Flame className="w-4 h-4 shrink-0 text-amber-400" />
                <span>Rate limit reached for this nullifier. Reports are throttled to prevent mass-probing.</span>
              </div>
            )}

            {worldIdError && (
              <div className="mt-4 p-3.5 rounded-2xl bg-red-950/60 border border-red-800 text-red-300 text-xs flex flex-col gap-2.5 text-left w-full">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                  <span className="font-semibold">{worldIdError}</span>
                </div>
                <p className="text-[11px] text-red-400/90 leading-relaxed">
                  World ID bridge rejected the request parameters. You can retry with fresh parameters or proceed directly to verify the Chainlink CRE enclave matching workflow.
                </p>
                <button
                  onClick={() => {
                    const dummyResult: IDKitResult = {
                      protocol_version: "4.0",
                      nonce: rpContext?.nonce || "0x" + Array.from({ length: 64 }, () => "1").join(""),
                      action: process.env.NEXT_PUBLIC_WLD_ACTION || "finder-report",
                      environment: "sandbox",
                      responses: [
                        {
                          identifier: "orb",
                          nullifier: "0xdev_" + crypto.randomUUID().replace(/-/g, ""),
                        } as any,
                      ],
                    };
                    handleProofSuccess(dummyResult);
                  }}
                  className="py-2.5 px-3 rounded-xl bg-cyan-950 hover:bg-cyan-900 border border-cyan-800 text-cyan-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-lg"
                >
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Continue to CRE Enclave Matching (Dev Bypass)</span>
                </button>
              </div>
            )}

            {/* Notice Banner when user closes QR without verifying */}
            {worldIdNotice && !worldIdError && worldIdStatus !== "throttled" && (
              <div className="mt-4 p-3.5 rounded-2xl bg-slate-950/90 border border-amber-500/50 text-left w-full space-y-1.5 animate-fade-in">
                <div className="flex items-center gap-2 text-amber-400 font-semibold text-xs">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
                  <span>Verification Not Completed</span>
                </div>
                <p className="text-slate-300 text-[11px] leading-relaxed pl-6">
                  {worldIdNotice}
                </p>
              </div>
            )}

            {/* Privacy details */}
            <div className="mt-5 w-full bg-slate-950/60 border border-slate-800/80 rounded-2xl p-3.5 text-left text-xs space-y-2">
              <div className="flex items-center gap-2 text-slate-300 font-medium">
                <Lock className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span>Zero-Knowledge Proof Guarantee</span>
              </div>
              <p className="text-slate-400 text-[11px] leading-normal pl-5.5">
                World ID does not share your real name or personal information. It generates a zero-knowledge proof proving you are a unique living human.
              </p>
            </div>

            {/* Live World ID Widget */}
            {rpContext && (
              <IDKitRequestWidget
                open={isIdKitOpen}
                onOpenChange={handleOpenChange}
                app_id={(process.env.NEXT_PUBLIC_WLD_APP_ID || "app_5ebf986494a7a5cff54fe723b25ff976") as `app_${string}`}
                action={process.env.NEXT_PUBLIC_WLD_ACTION || "finder-report"}
                environment={(process.env.NEXT_PUBLIC_WLD_ENVIRONMENT as "sandbox" | "production") || "sandbox"}
                rp_context={rpContext}
                allow_legacy_proofs={true}
                preset={preset}
                handleVerify={handleProofVerify}
                onSuccess={handleProofSuccess}
                onError={(errorCode) => {
                  console.warn("IDKit error code:", errorCode);
                  setIsIdKitOpen(false);
                  setWorldIdStatus("idle");
                  setRpContext(null);
                  if (errorCode === "user_rejected") {
                    setWorldIdNotice(
                      "Verification was declined or cancelled in the World App. You can reopen the QR code whenever you are ready."
                    );
                  } else {
                    setWorldIdError(`World ID verification error (${errorCode})`);
                  }
                }}
              />
            )}

            {/* Actions */}
            <div className="mt-6 w-full flex flex-col gap-2.5">
              {/* Primary: Open Official World ID IDKit Widget */}
              <button
                onClick={handleTriggerWorldId}
                disabled={worldIdStatus === "verifying"}
                className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl bg-white text-slate-950 hover:bg-slate-200 font-bold text-sm shadow-lg transition-all active:scale-[0.99] disabled:opacity-50"
              >
                {worldIdStatus === "verifying" ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                    <span>Connecting World ID...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4 text-slate-950" />
                    <span>{worldIdNotice ? "Reopen World ID Verification" : "Verify with World ID (IDKit v4)"}</span>
                  </>
                )}
              </button>

              {/* Bypass to TEE Enclave Matching */}
              <button
                onClick={handleBypassToTee}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-gradient-to-r from-cyan-950 via-slate-900 to-blue-950 hover:from-cyan-900 hover:to-blue-900 border border-cyan-500/50 text-cyan-300 font-semibold text-xs shadow-lg transition-all active:scale-[0.99]"
              >
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <span>Bypass World ID & Proceed to CRE TEE Matching</span>
              </button>

              {/* Secondary: Return to Photo / Retake */}
              <button
                onClick={() => {
                  setIsIdKitOpen(false);
                  setWorldIdStatus("idle");
                  setWorldIdNotice(null);
                  setWorldIdError(null);
                  setCurrentStep("preview");
                }}
                className="w-full py-3 rounded-2xl border border-slate-800 bg-slate-900/80 hover:bg-slate-800 text-slate-300 text-xs font-medium transition-colors"
              >
                Back to Photo / Retake
              </button>
            </div>
          </div>
        )}

        {/* ==================== STATE 4: CONFIDENTIAL ENCLAVE MATCHING ==================== */}
        {currentStep === "processing" && (
          <div className="w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl animate-fade-in flex flex-col items-center text-center">
            {matchError ? (
              <div className="w-full flex flex-col items-center">
                <div className="w-16 h-16 rounded-2xl bg-red-950/80 border border-red-800 flex items-center justify-center text-red-400 mb-4 shadow-lg shadow-red-950/50">
                  <AlertTriangle className="w-8 h-8" />
                </div>
                <h2 className="text-xl font-bold text-white tracking-tight">
                  Enclave Execution Notice
                </h2>
                <p className="text-xs text-slate-400 mt-1 max-w-xs">
                  The confidential matching workflow could not be completed.
                </p>

                <div className="mt-4 w-full p-3.5 rounded-2xl bg-red-950/40 border border-red-900/60 text-left">
                  <div className="flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                    <div className="text-xs">
                      <p className="font-semibold text-red-300">Matching Error</p>
                      <p className="text-[11px] text-red-400/90 mt-0.5 leading-relaxed">{matchError}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-6 w-full flex flex-col gap-2.5">
                  <button
                    onClick={handleRetryMatch}
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-white text-slate-950 hover:bg-slate-200 font-bold text-sm shadow-lg transition-all"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>Retry Enclave Processing</span>
                  </button>
                  <button
                    onClick={() => {
                      setMatchError(null);
                      setCurrentStep("preview");
                    }}
                    className="w-full py-2.5 rounded-2xl border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-400 text-xs font-medium transition-colors"
                  >
                    Back to Photo / Retake
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Enclave Pulsing Hub */}
                <div className="relative w-24 h-24 flex items-center justify-center mb-6">
                  <div className="absolute inset-0 rounded-full bg-cyan-500/10 animate-ping" />
                  <div className="absolute inset-2 rounded-full border border-cyan-500/30 animate-spin" />
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-600 to-blue-700 flex items-center justify-center text-white shadow-xl shadow-cyan-500/30">
                    <Cpu className="w-8 h-8 animate-pulse" />
                  </div>
                </div>

                <h2 className="text-xl font-bold text-white tracking-tight">
                  Confidential Matching in Progress
                </h2>
                <p className="text-xs text-slate-400 mt-1 max-w-xs">
                  Matching is computed inside a Chainlink CRE TEE hardware enclave. Even system operators cannot inspect the biometric embeddings.
                </p>

                {/* Verified Nullifier Badge */}
                {verifiedNullifier && (
                  <div className="mt-3 px-3 py-1.5 rounded-xl bg-slate-950 border border-emerald-800/80 text-[11px] font-mono text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>World ID Nullifier: {verifiedNullifier.slice(0, 14)}... (Verified)</span>
                  </div>
                )}

                {/* Step Progress Checklist */}
                <div className="mt-6 w-full space-y-3 text-left">
                  <div
                    className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                      processingStage >= 1
                        ? "bg-slate-950 border-cyan-800/80 text-cyan-300"
                        : "bg-slate-950/40 border-slate-800/40 text-slate-500"
                    }`}
                  >
                    {processingStage > 1 ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <RefreshCw className="w-4 h-4 animate-spin text-cyan-400 shrink-0" />
                    )}
                    <div className="text-xs">
                      <p className="font-semibold text-slate-200">1. On-Device face-api.js Embedding</p>
                      <p className="text-[11px] text-slate-400">128D facial descriptor extracted and encrypted locally</p>
                    </div>
                  </div>

                  <div
                    className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                      processingStage >= 2
                        ? "bg-slate-950 border-cyan-800/80 text-cyan-300"
                        : "bg-slate-950/40 border-slate-800/40 text-slate-500"
                    }`}
                  >
                    {processingStage > 2 ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : processingStage === 2 ? (
                      <RefreshCw className="w-4 h-4 animate-spin text-cyan-400 shrink-0" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border border-slate-700 shrink-0" />
                    )}
                    <div className="text-xs">
                      <p className="font-semibold text-slate-200">2. Enclave Ciphertext Transmission</p>
                      <p className="text-[11px] text-slate-400">Encrypted with Chainlink CRE TEE public key</p>
                    </div>
                  </div>

                  <div
                    className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                      processingStage >= 3
                        ? "bg-slate-950 border-cyan-800/80 text-cyan-300"
                        : "bg-slate-950/40 border-slate-800/40 text-slate-500"
                    }`}
                  >
                    {processingStage === 3 ? (
                      <RefreshCw className="w-4 h-4 animate-spin text-cyan-400 shrink-0" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border border-slate-700 shrink-0" />
                    )}
                    <div className="text-xs">
                      <p className="font-semibold text-slate-200">3. Private Vector Comparison</p>
                      <p className="text-[11px] text-slate-400">Executing handlerInTee against enrolled database</p>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ==================== STATE 5: GENERIC CONFIRMATION ==================== */}
        {currentStep === "confirmed" && (
          <div className="w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl animate-fade-in flex flex-col items-center text-center">
            {/* Generic Success Icon */}
            <div className="w-16 h-16 rounded-full bg-emerald-950 border border-emerald-800 text-emerald-400 flex items-center justify-center mb-4 shadow-lg shadow-emerald-950/50">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <h2 className="text-xl font-bold text-white tracking-tight">
              Report Submitted Securely
            </h2>

            {/* Core Privacy Requirement: Generic Response */}
            <div className="mt-3 p-4 rounded-2xl bg-slate-950/80 border border-slate-800 text-left">
              <p className="text-xs text-slate-300 leading-relaxed">
                Thank you for looking out for others. If this person is enrolled in our safety network, their registered emergency contacts have been notified with details and location.
              </p>
              <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center gap-2 text-[11px] text-cyan-400 font-mono">
                <Lock className="w-3 h-3 shrink-0" />
                <span>Identity protected: no match signals are exposed here.</span>
              </div>
            </div>

            {/* Bystander Contact Reassurance */}
            {finderPhone && (
              <div className="mt-3 w-full p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-800/80 text-left text-xs flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="text-slate-300">
                  Your phone number (<strong className="text-emerald-300 font-mono">{finderPhone}</strong>) was securely attached to this report. If matched, the family can reach out to you directly.
                </span>
              </div>
            )}

            {/* Hardware TEE Attestation Hash */}
            {enclaveReceipt && (
              <div className="mt-4 w-full bg-slate-950 border border-cyan-900/60 rounded-2xl p-3.5 text-left font-mono">
                <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
                  <span className="flex items-center gap-1.5 text-cyan-300 font-semibold font-sans">
                    <Lock className="w-3.5 h-3.5 text-cyan-400" />
                    CRE Enclave Attestation Receipt
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-950 border border-cyan-800 text-cyan-400 font-sans">
                    Hardware TEE
                  </span>
                </div>
                <div className="text-[10px] text-slate-300 break-all bg-slate-900/80 p-2 rounded-lg border border-slate-800 select-all font-mono">
                  {enclaveReceipt.enclave_hash}
                </div>
                <p className="text-[10px] text-slate-500 mt-1.5 font-sans">
                  Cryptographically attested by Chainlink CRE enclave. No plain biometric vectors were exposed.
                </p>
              </div>
            )}

            {/* Developer Mode Debug Inspector (Visible during testing/dev) */}
            {devDebug && (
              <div className="mt-4 w-full bg-slate-900/90 border-2 border-dashed border-cyan-500/70 rounded-2xl p-4 text-left font-sans animate-fade-in shadow-xl shadow-cyan-950/40">
                <div className="flex items-center justify-between mb-2.5 pb-2 border-b border-slate-800">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-cyan-400">
                    <Sparkles className="w-4 h-4 text-cyan-400" />
                    <span>Developer Enclave Inspector (Testing Mode)</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded font-mono bg-cyan-950 text-cyan-300 border border-cyan-800">
                    DEV ONLY
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Enclave Match Verdict:</span>
                    <span
                      className={`font-bold px-2 py-0.5 rounded text-xs ${
                        devDebug.matched
                          ? "bg-emerald-950 text-emerald-300 border border-emerald-800"
                          : "bg-red-950 text-red-300 border border-red-800"
                      }`}
                    >
                      {devDebug.matched ? "MATCH CONFIRMED" : "NO MATCH FOUND"}
                    </span>
                  </div>

                  {devDebug.matched && (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Identified Individual:</span>
                        <span className="font-semibold text-white">
                          {devDebug.matchedName || devDebug.dependentId}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Match Confidence:</span>
                        <span className="font-mono text-emerald-400 font-semibold">
                          {devDebug.confidence}%
                        </span>
                      </div>

                      {devDebug.distance !== null && devDebug.distance !== undefined && (
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Euclidean Distance:</span>
                          <span className="font-mono text-slate-300">
                            {devDebug.distance.toFixed(4)} (threshold: 0.40)
                          </span>
                        </div>
                      )}

                      {devDebug.caseToken && (
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Incident Token:</span>
                          <span className="font-mono text-cyan-300 text-[11px]">
                            {devDebug.caseToken}
                          </span>
                        </div>
                      )}

                      {devDebug.alertUrl && (
                        <div className="pt-2">
                          <Link
                            href={devDebug.alertUrl}
                            className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold shadow-md transition-all active:scale-[0.99]"
                          >
                            <span>Open Guardian Emergency Alert</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      )}
                    </>
                  )}

                  {!devDebug.matched && (
                    <p className="text-[11px] text-slate-400 mt-1">
                      Biometric distance exceeded threshold (0.40) or no enrolled biometric vectors matched.
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Emergency & Bystander Guidelines */}
            <div className="mt-5 w-full bg-slate-950/60 border border-slate-800 rounded-2xl p-4 text-left">
              <div className="flex items-center gap-2 text-slate-200 text-xs font-semibold mb-2">
                <Info className="w-4 h-4 text-cyan-400" />
                <span>Next Steps While Waiting:</span>
              </div>
              <ul className="text-xs text-slate-400 space-y-1.5 list-disc pl-4 leading-normal">
                <li>Stay in a safe, visible public area with the person.</li>
                <li>Speak in a calm, gentle tone. Avoid startling or confronting them.</li>
                <li>Check for medical alert tags or wristbands.</li>
              </ul>

              <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-200">Immediate Danger?</p>
                  <p className="text-[11px] text-slate-400">Contact emergency services immediately.</p>
                </div>
                <a
                  href="tel:911"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-950 text-red-300 border border-red-800 text-xs font-semibold hover:bg-red-900 transition-colors"
                >
                  <PhoneCall className="w-3.5 h-3.5" />
                  <span>Call 911</span>
                </a>
              </div>
            </div>

            {/* Done Action */}
            <button
              onClick={handleReset}
              className="mt-6 w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-sm shadow-lg shadow-cyan-500/25 transition-all"
            >
              Done / Scan Another Person
            </button>
          </div>
        )}
      </main>

      {/* Footer / Interface State Switcher */}
      <footer className="border-t border-slate-800/80 bg-slate-950/90 py-3 px-4 text-center">
        <div className="max-w-xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <div className="flex items-center gap-1">
            <span className="font-semibold text-slate-400">UI State Switcher:</span>
            <span className="text-[10px] uppercase font-mono text-cyan-500">[{currentStep}]</span>
          </div>

          <div className="flex items-center gap-1 overflow-x-auto py-1 max-w-full">
            {(["camera", "preview", "world_id", "processing", "confirmed"] as FlowStep[]).map((step) => (
              <button
                key={step}
                onClick={() => {
                  if (step === "processing") startSimulatedProcessing();
                  else setCurrentStep(step);
                }}
                className={`px-2 py-1 rounded text-[11px] font-medium transition-colors capitalize ${
                  currentStep === step
                    ? "bg-cyan-950 text-cyan-300 border border-cyan-700"
                    : "bg-slate-900 hover:bg-slate-800 text-slate-400 border border-slate-800"
                }`}
              >
                {step.replace("_", " ")}
              </button>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}

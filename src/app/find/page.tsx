"use client";

import React, { useState, useRef, useEffect } from "react";
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
  ArrowLeft,
  Flame
} from "lucide-react";

type FlowStep = "camera" | "preview" | "world_id" | "processing" | "confirmed";

export default function FindScreen() {
  const [currentStep, setCurrentStep] = useState<FlowStep>("camera");
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [processingStage, setProcessingStage] = useState(1);
  const [worldIdStatus, setWorldIdStatus] = useState<"idle" | "verifying" | "throttled">("idle");

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Initialize camera stream
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
          setCameraError("Camera unavailable or permission denied. You can select a test photo below.");
        });
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [currentStep]);

  // Capture snapshot from video stream or mockup
  const handleCapture = () => {
    if (videoRef.current && isStreaming) {
      const canvas = document.createElement("canvas");
      canvas.width = videoRef.current.videoWidth || 640;
      canvas.height = videoRef.current.videoHeight || 480;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        setCapturedImage(canvas.toDataURL("image/jpeg"));
      }
    } else {
      // Fallback placeholder image for testing interface
      setCapturedImage("/demo-face.jpg");
    }
    setCurrentStep("preview");
  };

  // Handle file upload fallback
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setCapturedImage(event.target?.result as string);
        setCurrentStep("preview");
      };
      reader.readAsDataURL(file);
    }
  };

  // Simulate World ID verification
  const handleVerifyWorldId = () => {
    setWorldIdStatus("verifying");
    setTimeout(() => {
      setWorldIdStatus("idle");
      setCurrentStep("processing");
      startSimulatedProcessing();
    }, 1200);
  };

  // Simulate TEE Confidential matching progression
  const startSimulatedProcessing = () => {
    setProcessingStage(1);
    setTimeout(() => setProcessingStage(2), 1200);
    setTimeout(() => setProcessingStage(3), 2400);
    setTimeout(() => {
      setCurrentStep("confirmed");
    }, 3800);
  };

  const handleReset = () => {
    setCapturedImage(null);
    setCurrentStep("camera");
    setProcessingStage(1);
    setWorldIdStatus("idle");
  };

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
                Confidential
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-950/80 text-emerald-400 border border-emerald-800/80">
              <Lock className="w-3 h-3" />
              Zero Knowledge
            </span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-xl w-full mx-auto p-4 flex flex-col justify-center">
        {/* ==================== STATE 1: CAMERA SCANNER ==================== */}
        {currentStep === "camera" && (
          <div className="flex flex-col items-center animate-fade-in">
            {/* Viewfinder Card */}
            <div className="relative w-full aspect-[3/4] max-h-[520px] rounded-3xl overflow-hidden bg-slate-900 border-2 border-slate-800 shadow-2xl shadow-cyan-950/30 flex items-center justify-center">
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

              {/* Simulated fallback graphic if camera is not active */}
              {!isStreaming && (
                <div className="flex flex-col items-center justify-center p-6 text-center text-slate-400">
                  <div className="w-20 h-20 rounded-full bg-slate-800/80 border border-slate-700 flex items-center justify-center mb-4 text-slate-400 animate-pulse">
                    <Camera className="w-10 h-10" />
                  </div>
                  <p className="text-sm font-medium text-slate-300">Camera Viewfinder</p>
                  <p className="text-xs text-slate-500 mt-1 max-w-[240px]">
                    {cameraError || "Point camera at the person's face to assist"}
                  </p>
                </div>
              )}

              {/* Target Face Oval Reticle */}
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="relative w-64 h-80 rounded-[48%] border-2 border-dashed border-cyan-400/60 shadow-[0_0_20px_rgba(6,182,212,0.15)] flex items-center justify-center">
                  <div className="absolute top-2 text-[11px] font-mono tracking-wider uppercase text-cyan-300/80 bg-slate-950/60 px-2 py-0.5 rounded backdrop-blur-sm">
                    Align Face Here
                  </div>

                  {/* Corner Guides */}
                  <div className="absolute -top-3 -left-3 w-6 h-6 border-t-2 border-l-2 border-cyan-400 rounded-tl-lg" />
                  <div className="absolute -top-3 -right-3 w-6 h-6 border-t-2 border-r-2 border-cyan-400 rounded-tr-lg" />
                  <div className="absolute -bottom-3 -left-3 w-6 h-6 border-b-2 border-l-2 border-cyan-400 rounded-bl-lg" />
                  <div className="absolute -bottom-3 -right-3 w-6 h-6 border-b-2 border-r-2 border-cyan-400 rounded-br-lg" />
                </div>
              </div>

              {/* Status Badge */}
              <div className="absolute top-4 left-4 right-4 flex justify-between items-center pointer-events-none">
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-950/80 backdrop-blur-md border border-slate-700/60 text-xs font-medium text-slate-200">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <span>Ready to Scan</span>
                </div>
                <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-slate-950/80 backdrop-blur-md border border-slate-700/60 text-xs text-slate-400">
                  <EyeOff className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Confidential</span>
                </div>
              </div>
            </div>

            {/* Privacy Assurance Banner */}
            <div className="w-full mt-3 p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>
                <strong>Privacy Guaranteed:</strong> Captured photos never leave this device unless an enrolled match is confirmed.
              </span>
            </div>

            {/* Action Bar */}
            <div className="w-full mt-4 flex items-center justify-between gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileUpload}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-sm font-medium transition-all"
              >
                <Upload className="w-4 h-4" />
                <span className="hidden sm:inline">Upload</span>
              </button>

              <button
                onClick={handleCapture}
                className="flex-1 flex items-center justify-center gap-2 py-4 px-6 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-base shadow-lg shadow-cyan-500/25 active:scale-[0.98] transition-all"
              >
                <Camera className="w-5 h-5" />
                <span>Scan & Assist</span>
              </button>
            </div>
          </div>
        )}

        {/* ==================== STATE 2: PREVIEW CAPTURED ==================== */}
        {currentStep === "preview" && (
          <div className="flex flex-col items-center">
            <div className="relative w-full aspect-[3/4] max-h-[480px] rounded-3xl overflow-hidden bg-slate-900 border-2 border-cyan-500/40 shadow-2xl flex items-center justify-center">
              {capturedImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={capturedImage}
                  alt="Captured face preview"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-slate-800 flex items-center justify-center text-slate-500">
                  Photo Captured
                </div>
              )}

              <div className="absolute bottom-4 left-4 right-4 bg-slate-950/85 backdrop-blur-md border border-slate-800 p-3 rounded-2xl">
                <div className="flex items-center gap-2 text-cyan-300 text-xs font-semibold uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5" />
                  Face Detected Locally
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Vector embedding extracted in browser. Image held in memory only.
                </p>
              </div>
            </div>

            <div className="w-full mt-4 flex gap-3">
              <button
                onClick={handleReset}
                className="flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-sm font-medium transition-all"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Retake</span>
              </button>

              <button
                onClick={() => setCurrentStep("world_id")}
                className="flex-1 flex items-center justify-center gap-2 py-3.5 px-6 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-sm shadow-lg shadow-cyan-500/25 transition-all"
              >
                <span>Continue to Verification</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ==================== STATE 3: WORLD ID GATE MODAL ==================== */}
        {currentStep === "world_id" && (
          <div className="w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl animate-fade-in flex flex-col items-center text-center">
            {/* World ID Orb Icon Header */}
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
              Human Abuse Prevention
            </p>

            <p className="text-xs text-slate-400 mt-3 leading-relaxed max-w-sm">
              To prevent automated bots, mass scraping, and prank reports against vulnerable individuals, please verify your uniqueness with World ID.
            </p>

            {/* Status box if throttled */}
            {worldIdStatus === "throttled" && (
              <div className="mt-4 p-3 rounded-xl bg-amber-950/60 border border-amber-800 text-amber-300 text-xs flex items-center gap-2 text-left w-full">
                <Flame className="w-4 h-4 shrink-0 text-amber-400" />
                <span>Rate limit reached for this nullifier. Please wait 10 minutes before reporting again.</span>
              </div>
            )}

            {/* Privacy details */}
            <div className="mt-5 w-full bg-slate-950/60 border border-slate-800/80 rounded-2xl p-3.5 text-left text-xs space-y-2">
              <div className="flex items-center gap-2 text-slate-300 font-medium">
                <Lock className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span>Zero-Knowledge Proof</span>
              </div>
              <p className="text-slate-400 text-[11px] leading-normal pl-5.5">
                World ID does not share your real name or personal information. It only asserts you are a real human reporter.
              </p>
            </div>

            {/* Actions */}
            <div className="mt-6 w-full flex flex-col gap-2.5">
              <button
                onClick={handleVerifyWorldId}
                disabled={worldIdStatus === "verifying"}
                className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl bg-white text-slate-950 hover:bg-slate-200 font-bold text-sm shadow-lg transition-all active:scale-[0.99] disabled:opacity-50"
              >
                {worldIdStatus === "verifying" ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                    <span>Verifying with World ID...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4 text-slate-950" />
                    <span>Verify with World ID</span>
                  </>
                )}
              </button>

              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentStep("camera")}
                  className="flex-1 py-2.5 rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-850 text-slate-400 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={() =>
                    setWorldIdStatus(worldIdStatus === "throttled" ? "idle" : "throttled")
                  }
                  className="px-3 py-2.5 rounded-xl border border-slate-800 text-slate-500 hover:text-slate-300 text-xs font-mono"
                  title="Simulate Rate Limit"
                >
                  Toggle Throttled State
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ==================== STATE 4: CONFIDENTIAL PROCESSING ==================== */}
        {currentStep === "processing" && (
          <div className="w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl animate-fade-in flex flex-col items-center text-center">
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
                  <p className="font-semibold text-slate-200">1. Client-Side Embedding</p>
                  <p className="text-[11px] text-slate-400">128D facial vector extracted via face-api.js</p>
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
                  <p className="text-[11px] text-slate-400">Encrypted with CRE TEE public key</p>
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

            {/* Emergency & Bystander Guidelines Accordion/Card */}
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

      {/* Footer / Interface State Switcher for Review */}
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

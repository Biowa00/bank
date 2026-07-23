"use client";

import { useEffect, useRef, useState } from "react";
import { useZone } from "@/components/i18n/DictionaryProvider";

type Phase = "idle" | "streaming" | "captured" | "denied" | "nocam";

/**
 * Capture d'un selfie en direct via la caméra frontale (getUserMedia).
 * L'image capturée est injectée dans un champ fichier caché `name="selfie"`
 * pour être envoyée avec le formulaire d'inscription (Server Action).
 *
 * getUserMedia exige un contexte sécurisé (HTTPS ou localhost).
 */
export function SelfieCapture() {
  const t = useZone("auth").register;
  const [phase, setPhase] = useState<Phase>("idle");
  const [preview, setPreview] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  function stopStream() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }

  // Coupe la caméra si le composant est démonté.
  useEffect(() => stopStream, []);

  async function startCamera() {
    if (!navigator.mediaDevices?.getUserMedia) {
      setPhase("nocam");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      });
      streamRef.current = stream;
      setPreview(null);
      setPhase("streaming");
      // Le <video> est monté au rendu suivant ; on branche le flux ensuite.
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          void videoRef.current.play();
        }
      });
    } catch (err) {
      const name = (err as DOMException)?.name;
      setPhase(name === "NotFoundError" ? "nocam" : "denied");
    }
  }

  function capture() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    // Plafonne la résolution de capture : une webcam de PC filme souvent en
    // bien plus haute définition qu'une caméra de téléphone, ce qui peut faire
    // dépasser à la requête la limite de taille acceptée par le serveur une
    // fois combinée à la pièce d'identité. 1280px de côté suffit largement
    // pour une vérification d'identité.
    const MAX_DIM = 1280;
    const nativeW = video.videoWidth || 640;
    const nativeH = video.videoHeight || 480;
    const scale = Math.min(1, MAX_DIM / Math.max(nativeW, nativeH));
    const w = Math.round(nativeW * scale);
    const h = Math.round(nativeH * scale);
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, w, h);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], "selfie.jpg", { type: "image/jpeg" });
        // Injecte le fichier dans le champ caché soumis par le formulaire.
        const dt = new DataTransfer();
        dt.items.add(file);
        if (inputRef.current) inputRef.current.files = dt.files;
        setPreview(URL.createObjectURL(blob));
        setPhase("captured");
        stopStream();
      },
      "image/jpeg",
      0.85,
    );
  }

  return (
    <div>
      <label className="label">{t.selfie}</label>

      {/* Champ réellement soumis avec le formulaire. */}
      <input ref={inputRef} type="file" name="selfie" accept="image/jpeg" className="sr-only" />
      <canvas ref={canvasRef} className="hidden" />

      <div className="overflow-hidden rounded-xl border border-dashed border-black/15 bg-black/[.02]">
        {phase === "streaming" && (
          <video
            ref={videoRef}
            playsInline
            muted
            // Effet miroir : plus naturel pour un selfie.
            className="aspect-[4/3] w-full -scale-x-100 bg-black object-cover"
          />
        )}
        {phase === "captured" && preview && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="" className="aspect-[4/3] w-full -scale-x-100 object-cover" />
        )}
        {(phase === "idle" || phase === "denied" || phase === "nocam") && (
          <div className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-2 p-4 text-center">
            <CameraIcon />
            <p className="text-sm text-ink/50">{t.selfieHint}</p>
            {phase === "denied" && (
              <p className="text-xs text-amber-600">{t.selfieDenied}</p>
            )}
            {phase === "nocam" && (
              <p className="text-xs text-amber-600">{t.selfieNoCamera}</p>
            )}
          </div>
        )}
      </div>

      <div className="mt-2 flex items-center gap-2">
        {(phase === "idle" || phase === "denied" || phase === "nocam") && (
          <button type="button" onClick={startCamera} className="btn-outline text-sm">
            {t.selfieStart}
          </button>
        )}
        {phase === "streaming" && (
          <button type="button" onClick={capture} className="btn-primary text-sm">
            {t.selfieCapture}
          </button>
        )}
        {phase === "captured" && (
          <>
            <span className="text-sm font-medium text-accent-600">{t.selfieDone}</span>
            <button type="button" onClick={startCamera} className="btn-ghost text-sm">
              {t.selfieRetake}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function CameraIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden className="text-ink/30">
      <path d="M3 8a2 2 0 012-2h1.2a2 2 0 001.7-1l.5-.8A2 2 0 0110 3h4a2 2 0 011.7 1l.5.8a2 2 0 001.7 1H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <circle cx="12" cy="12.5" r="3.2" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

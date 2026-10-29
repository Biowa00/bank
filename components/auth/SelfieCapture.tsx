"use client";

import { useEffect, useRef, useState } from "react";
import { useZone } from "@/components/i18n/DictionaryProvider";

type Phase = "idle" | "streaming" | "captured" | "denied" | "nocam";

/** Délai après le démarrage de la vidéo, le temps que l'exposition se règle
 *  (les premières images d'une webcam sont souvent très sombres). */
const WARMUP_MS = 800;
/** Luminosité moyenne (0-255) en dessous de laquelle une capture est refusée. */
const MIN_BRIGHTNESS = 35;

/** Luminosité moyenne d'un canvas, échantillonnée (1 pixel sur 16). */
function averageBrightness(ctx: CanvasRenderingContext2D, w: number, h: number): number {
  const { data } = ctx.getImageData(0, 0, w, h);
  let sum = 0;
  let n = 0;
  for (let i = 0; i < data.length; i += 64) {
    sum += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    n++;
  }
  return n ? sum / n : 0;
}

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
  // true quand la vidéo affiche de vraies images (lecture + temps d'exposition).
  const [ready, setReady] = useState(false);
  const [tooDark, setTooDark] = useState(false);
  const warmupRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  function stopStream() {
    if (warmupRef.current) clearTimeout(warmupRef.current);
    warmupRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }

  // Coupe la caméra si le composant est démonté.
  useEffect(() => stopStream, []);

  // Branche le flux une fois le <video> réellement monté (après le rendu),
  // au lieu d'un requestAnimationFrame qui pouvait passer avant le montage et
  // laisser la vidéo — donc la capture — noire.
  useEffect(() => {
    const video = videoRef.current;
    const stream = streamRef.current;
    if (phase !== "streaming" || !video || !stream) return;
    video.srcObject = stream;
    void video.play().catch(() => {});
  }, [phase]);

  // La vidéo affiche des images : on attend encore que l'exposition se règle.
  function onVideoPlaying() {
    if (warmupRef.current) clearTimeout(warmupRef.current);
    warmupRef.current = setTimeout(() => {
      if (videoRef.current?.videoWidth) setReady(true);
    }, WARMUP_MS);
  }

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
      setReady(false);
      setTooDark(false);
      // Le flux est branché par l'effet ci-dessus, une fois le <video> monté.
      setPhase("streaming");
    } catch (err) {
      const name = (err as DOMException)?.name;
      setPhase(name === "NotFoundError" ? "nocam" : "denied");
    }
  }

  function capture() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    // Vidéo pas encore prête (aucune image) : capturer donnerait une image noire.
    if (!video || !canvas || !ready || !video.videoWidth || !video.videoHeight) return;

    // Plafonne la résolution de capture : une webcam de PC filme souvent en
    // bien plus haute définition qu'une caméra de téléphone, ce qui peut faire
    // dépasser à la requête la limite de taille acceptée par le serveur une
    // fois combinée à la pièce d'identité. 1280px de côté suffit largement
    // pour une vérification d'identité.
    const MAX_DIM = 1280;
    const nativeW = video.videoWidth;
    const nativeH = video.videoHeight;
    const scale = Math.min(1, MAX_DIM / Math.max(nativeW, nativeH));
    const w = Math.round(nativeW * scale);
    const h = Math.round(nativeH * scale);
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, w, h);

    // Refuse une image noire ou quasi noire (caméra masquée, pièce sans lumière).
    if (averageBrightness(ctx, w, h) < MIN_BRIGHTNESS) {
      setTooDark(true);
      return;
    }
    setTooDark(false);

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
            onPlaying={onVideoPlaying}
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
          <button type="button" onClick={capture} disabled={!ready} className="btn-primary text-sm disabled:opacity-50">
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
      {phase === "streaming" && tooDark && (
        <p className="mt-1 text-xs text-amber-600">{t.selfieTooDark}</p>
      )}
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

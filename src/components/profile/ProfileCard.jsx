import { Camera, ImagePlus, Loader2, Mail, RotateCcw, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { useProfile } from "../../context/ProfileProvider";
import { useAuth } from "../../hooks/useAuth";
import { supabase } from "../../lib/supabase";

const AVATAR_SIZE = 400;
const MAX_INPUT_BYTES = 10 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

const EXPERIENCE_LEVELS = [
  ["beginner", "Beginner (under 1 year)"],
  ["intermediate", "Intermediate (1–3 years)"],
  ["advanced", "Advanced (3–5 years)"],
  ["professional", "Professional (5+ years)"],
];

const inputClass =
  "mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3.5 py-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]";

function browserTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "";
  } catch {
    return "";
  }
}

function timezoneOptions(current) {
  let zones = [];
  try {
    zones = Intl.supportedValuesOf("timeZone");
  } catch {
    zones = [];
  }
  return current && !zones.includes(current) ? [current, ...zones] : zones;
}

/** Crops to a centred square and re-encodes, which also strips photo metadata. */
async function prepareAvatar(source) {
  const bitmap = await createImageBitmap(source);
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = AVATAR_SIZE;
  canvas.height = AVATAR_SIZE;
  canvas
    .getContext("2d")
    .drawImage(
      bitmap,
      (bitmap.width - side) / 2,
      (bitmap.height - side) / 2,
      side,
      side,
      0,
      0,
      AVATAR_SIZE,
      AVATAR_SIZE
    );
  bitmap.close?.();

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/webp", 0.85));
  if (!blob) throw new Error("This image could not be processed.");
  return blob;
}

function ProfileCard() {
  const { user } = useAuth();
  const { details, avatarUrl, displayName, refresh } = useProfile();
  const fileInput = useRef(null);

  const [form, setForm] = useState({
    full_name: "",
    headline: "",
    country: "",
    timezone: "",
    experience_level: "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState(null); // { type, text }
  const [cameraOpen, setCameraOpen] = useState(false);
  const [photoMenuOpen, setPhotoMenuOpen] = useState(false);
  const photoMenuRef = useRef(null);
  const cameraSupported = Boolean(navigator.mediaDevices?.getUserMedia);

  useEffect(() => {
    setForm({
      full_name: details?.full_name || user?.user_metadata?.full_name || "",
      headline: details?.headline || "",
      country: details?.country || "",
      timezone: details?.timezone || browserTimezone(),
      experience_level: details?.experience_level || "",
    });
  }, [details, user]);

  // The photo menu closes on an outside click or Escape.
  useEffect(() => {
    if (!photoMenuOpen) return undefined;

    function onPointerDown(event) {
      if (!photoMenuRef.current?.contains(event.target)) setPhotoMenuOpen(false);
    }
    function onKeyDown(event) {
      if (event.key === "Escape") setPhotoMenuOpen(false);
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [photoMenuOpen]);

  function update(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  async function save(event) {
    event.preventDefault();
    if (!user?.id || isSaving) return;

    setIsSaving(true);
    setMessage(null);

    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: form.full_name.trim() || null,
        headline: form.headline.trim() || null,
        country: form.country.trim() || null,
        timezone: form.timezone || null,
        experience_level: form.experience_level || null,
      })
      .eq("id", user.id);

    setIsSaving(false);

    if (error) {
      console.error("Profile save failed:", error);
      setMessage({ type: "error", text: "We couldn't save your profile. Please try again." });
      return;
    }

    await refresh();
    setMessage({ type: "success", text: "Profile saved." });
  }

  function chooseFile(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setMessage({ type: "error", text: "Choose a JPG, PNG, or WebP image." });
      return;
    }
    if (file.size > MAX_INPUT_BYTES) {
      setMessage({ type: "error", text: "That image is too large. Choose one under 10 MB." });
      return;
    }

    uploadAvatar(file);
  }

  async function uploadAvatar(source) {
    if (!user?.id) return;

    setIsUploading(true);
    setMessage(null);

    try {
      const blob = await prepareAvatar(source);
      const path = `${user.id}/avatar-${Date.now()}.webp`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, blob, { contentType: "image/webp", cacheControl: "31536000" });
      if (uploadError) throw uploadError;

      const previous = details?.avatar_path;
      const { error: saveError } = await supabase
        .from("profiles")
        .update({ avatar_path: path })
        .eq("id", user.id);

      if (saveError) {
        await supabase.storage.from("avatars").remove([path]);
        throw saveError;
      }

      if (previous) await supabase.storage.from("avatars").remove([previous]);
      await refresh();
      setMessage({ type: "success", text: "Photo updated." });
    } catch (error) {
      console.error("Avatar upload failed:", error);
      setMessage({ type: "error", text: "We couldn't update your photo. Please try again." });
    } finally {
      setIsUploading(false);
    }
  }

  const initial = (displayName || "?").trim().charAt(0).toUpperCase();

  return (
    <article className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6">
      <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:gap-6 sm:text-left">
        <div ref={photoMenuRef} className="relative shrink-0">
          <input
            ref={fileInput}
            type="file"
            accept={ACCEPTED_TYPES.join(",")}
            onChange={chooseFile}
            className="hidden"
          />

          <button
            type="button"
            onClick={() => setPhotoMenuOpen((open) => !open)}
            disabled={isUploading}
            aria-label="Change profile photo"
            aria-haspopup="menu"
            aria-expanded={photoMenuOpen}
            className="group relative block size-28 rounded-full outline-offset-4 focus-visible:outline-2 focus-visible:outline-[var(--accent)] disabled:cursor-wait"
          >
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="Your profile"
                className="size-28 rounded-full border border-[var(--border)] object-cover"
              />
            ) : (
              <span className="grid size-28 place-items-center rounded-full border border-[var(--border)] bg-[var(--surface-elevated)] text-4xl font-semibold text-[var(--accent)]">
                {initial}
              </span>
            )}

            {isUploading ? (
              <span className="absolute inset-0 grid place-items-center rounded-full bg-black/55">
                <Loader2 size={22} className="animate-spin text-white" />
              </span>
            ) : (
              <span className="absolute bottom-0.5 right-0.5 grid size-9 place-items-center rounded-full border-2 border-[var(--surface)] bg-[var(--accent)] text-[#17130d] shadow-lg transition group-hover:bg-[var(--accent-light)]">
                <Camera size={16} />
              </span>
            )}
          </button>

          {photoMenuOpen && (
            <div
              role="menu"
              aria-label="Profile photo"
              className="absolute left-1/2 top-full z-20 mt-3 w-52 -translate-x-1/2 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] p-1 text-left shadow-2xl sm:left-0 sm:translate-x-0"
            >
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setPhotoMenuOpen(false);
                  fileInput.current?.click();
                }}
                className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-sm text-[var(--text-primary)] transition hover:bg-[var(--surface)]"
              >
                <ImagePlus size={17} className="text-[var(--accent)]" />
                Upload photo
              </button>

              {cameraSupported && (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setPhotoMenuOpen(false);
                    setCameraOpen(true);
                  }}
                  className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-sm text-[var(--text-primary)] transition hover:bg-[var(--surface)]"
                >
                  <Camera size={17} className="text-[var(--accent)]" />
                  Take photo
                </button>
              )}
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-medium tracking-[-0.02em]">{displayName || "Your profile"}</h2>
          {details?.headline && (
            <p className="mt-1 text-sm text-[var(--text-secondary)]">{details.headline}</p>
          )}
          <p className="mt-2 flex items-center justify-center gap-2 text-xs text-[var(--text-muted)] sm:justify-start">
            <Mail size={13} className="shrink-0 text-[var(--accent)]" />
            <span className="break-all">{user?.email || "No email available"}</span>
          </p>
        </div>
      </div>

      <form onSubmit={save} className="mt-6 grid gap-4 border-t border-[var(--border-soft)] pt-6 sm:grid-cols-2">
        <label className="block text-sm font-medium">
          Full name
          <input
            name="full_name"
            value={form.full_name}
            onChange={update}
            maxLength={80}
            autoComplete="name"
            className={inputClass}
          />
        </label>

        <label className="block text-sm font-medium">
          Trading experience
          <select
            name="experience_level"
            value={form.experience_level}
            onChange={update}
            className={inputClass}
          >
            <option value="">Prefer not to say</option>
            {EXPERIENCE_LEVELS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm font-medium sm:col-span-2">
          Headline
          <input
            name="headline"
            value={form.headline}
            onChange={update}
            maxLength={120}
            placeholder="e.g. Swing trader focused on forex majors"
            className={inputClass}
          />
        </label>

        <label className="block text-sm font-medium">
          Country
          <input
            name="country"
            value={form.country}
            onChange={update}
            maxLength={80}
            autoComplete="country-name"
            className={inputClass}
          />
        </label>

        <label className="block text-sm font-medium">
          Time zone
          <select
            name="timezone"
            value={form.timezone}
            onChange={update}
            className={inputClass}
          >
            <option value="">Not set</option>
            {timezoneOptions(form.timezone).map((zone) => (
              <option key={zone} value={zone}>
                {zone.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </label>

        <div className="flex flex-wrap items-center justify-between gap-3 sm:col-span-2">
          <p
            role="status"
            className={`text-xs ${
              message?.type === "error" ? "text-[var(--danger)]" : "text-[var(--text-secondary)]"
            }`}
          >
            {message?.text}
          </p>

          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[var(--accent)] px-5 text-sm font-semibold text-[#17130d] hover:bg-[var(--accent-light)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSaving && <Loader2 size={15} className="animate-spin" />}
            {isSaving ? "Saving…" : "Save profile"}
          </button>
        </div>
      </form>

      {cameraOpen && (
        <CameraCapture
          onClose={() => setCameraOpen(false)}
          onCapture={(canvas) => {
            setCameraOpen(false);
            uploadAvatar(canvas);
          }}
        />
      )}
    </article>
  );
}

/** Live camera preview; the photo is only kept if the user confirms it. */
function CameraCapture({ onClose, onCapture }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [status, setStatus] = useState("starting"); // starting | live | captured | error
  const [error, setError] = useState("");
  const [snapshot, setSnapshot] = useState(null); // { canvas, url }

  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }

  async function startCamera() {
    setStatus("starting");
    setError("");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setStatus("live");
    } catch (err) {
      console.error("Camera unavailable:", err);
      setError(
        err?.name === "NotAllowedError"
          ? "Camera access was blocked. Allow it in your browser's site settings, then try again."
          : err?.name === "NotFoundError"
          ? "No camera was found on this device."
          : "We couldn't start the camera. Close other apps using it and try again."
      );
      setStatus("error");
    }
  }

  useEffect(() => {
    startCamera();
    return stopCamera;
  }, []);

  useEffect(() => {
    return () => {
      if (snapshot?.url) URL.revokeObjectURL(snapshot.url);
    };
  }, [snapshot]);

  function capture() {
    const video = videoRef.current;
    if (!video?.videoWidth) return;

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0);

    canvas.toBlob((blob) => {
      if (!blob) return;
      stopCamera();
      setSnapshot({ canvas, url: URL.createObjectURL(blob) });
      setStatus("captured");
    }, "image/jpeg", 0.9);
  }

  function retake() {
    setSnapshot(null);
    startCamera();
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Take a profile photo"
      className="fixed inset-0 z-50 grid place-items-center bg-black/70 px-5 py-8 backdrop-blur-sm"
    >
      <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-medium">Take a photo</h3>
          <button
            type="button"
            onClick={onClose}
            className="grid size-9 place-items-center rounded-full text-[var(--text-secondary)] hover:bg-[var(--surface-elevated)]"
            aria-label="Close camera"
          >
            <X size={18} />
          </button>
        </div>

        <div className="relative mx-auto mt-4 aspect-square w-full max-w-[320px] overflow-hidden rounded-full border border-[var(--border)] bg-black">
          <video
            ref={videoRef}
            playsInline
            muted
            className={`size-full -scale-x-100 object-cover ${status === "captured" ? "hidden" : ""}`}
          />
          {snapshot && (
            <img src={snapshot.url} alt="Your captured photo" className="size-full -scale-x-100 object-cover" />
          )}
          {status === "starting" && (
            <div className="absolute inset-0 grid place-items-center">
              <Loader2 size={22} className="animate-spin text-white" />
            </div>
          )}
        </div>

        {status === "error" && (
          <p role="alert" className="mt-4 text-center text-sm text-[var(--danger)]">
            {error}
          </p>
        )}

        <p className="mt-4 text-center text-xs text-[var(--text-muted)]">
          Your photo is cropped to a circle and stored privately.
        </p>

        <div className="mt-5 flex justify-center gap-3">
          {status === "live" && (
            <button
              type="button"
              onClick={capture}
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[var(--accent)] px-6 text-sm font-semibold text-[#17130d] hover:bg-[var(--accent-light)]"
            >
              <Camera size={16} />
              Capture
            </button>
          )}

          {status === "captured" && (
            <>
              <button
                type="button"
                onClick={retake}
                className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[var(--border)] px-5 text-sm font-semibold"
              >
                <RotateCcw size={15} />
                Retake
              </button>
              <button
                type="button"
                onClick={() => onCapture(snapshot.canvas)}
                className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[var(--accent)] px-6 text-sm font-semibold text-[#17130d] hover:bg-[var(--accent-light)]"
              >
                Use photo
              </button>
            </>
          )}

          {status === "error" && (
            <button
              type="button"
              onClick={startCamera}
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[var(--border)] px-5 text-sm font-semibold"
            >
              Try again
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default ProfileCard;

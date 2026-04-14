// Robust share & save implementation with per-device fallback chains.
// Critical: we NEVER generate images in the browser. The PNG comes from /api/og.
// This avoids the html2canvas/memory issues that break on older iPhones.

export interface ShareResult {
  ok: boolean;
  method: "native-files" | "native-link" | "clipboard" | "download" | "ios-new-tab" | "failed";
  message?: string;
}

/**
 * Detect iOS Safari (including iPadOS-in-desktop-mode).
 * Used only to pick between "download" and "open in new tab + long-press" save flows.
 */
export function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  // iPhone / iPod
  if (/iP(hone|od)/.test(ua)) return true;
  // iPad (old UA)
  if (/iPad/.test(ua)) return true;
  // iPadOS 13+ masquerades as Mac; detect via touch support
  if (/Macintosh/.test(ua) && "ontouchend" in document) return true;
  return false;
}

/**
 * Build an absolute share URL from a state code.
 */
export function shareUrl(code: string): string {
  const origin =
    typeof window !== "undefined" && window.location?.origin
      ? window.location.origin
      : "";
  return `${origin}/b/${encodeURIComponent(code)}`;
}

export function ogImageUrl(code: string, download = false): string {
  const origin =
    typeof window !== "undefined" && window.location?.origin
      ? window.location.origin
      : "";
  const params = new URLSearchParams({ code });
  if (download) params.set("download", "1");
  return `${origin}/api/og?${params.toString()}`;
}

/**
 * Share flow. Must be invoked synchronously inside a user tap handler — do not
 * await anything BEFORE calling this function, or iOS will reject the share
 * with "user gesture required".
 */
export async function shareBracket(code: string): Promise<ShareResult> {
  const url = shareUrl(code);
  const title = "NBA 26 Pick'Em";
  const text = "My 2026 NBA playoff picks — make your own:";

  // Native Web Share API. Once we call navigator.share() we MUST NOT call it
  // again — even on failure — because the user may have already completed the
  // share (sent a message) before the promise rejected. Calling share twice is
  // what produces the "double send" bug.
  const nav: Navigator | undefined =
    typeof navigator !== "undefined" ? navigator : undefined;
  if (nav && typeof nav.share === "function") {
    // Try to include an image file if the platform supports it. We probe with
    // canShare() first so that file-incapable browsers don't throw.
    const file = await fetchOgAsFile(code);
    let canShareWithFile = false;
    if (file && typeof nav.canShare === "function") {
      try {
        canShareWithFile = nav.canShare({ files: [file] });
      } catch {
        canShareWithFile = false;
      }
    }

    try {
      if (canShareWithFile && file) {
        if (isIOS()) {
          // iOS quirk: don't combine files with text/url, it fails silently.
          await nav.share({ files: [file] });
        } else {
          await nav.share({ files: [file], title, text, url });
        }
        return { ok: true, method: "native-files" };
      }

      // File sharing isn't available — share just the link instead.
      await nav.share({ title, text, url });
      return { ok: true, method: "native-link" };
    } catch (err) {
      if ((err as DOMException)?.name === "AbortError") {
        return { ok: false, method: "failed", message: "cancelled" };
      }
      // The share sheet was shown; do NOT fall through to another share or
      // the user will be prompted to share twice (and may send twice).
      return { ok: false, method: "failed", message: "Share failed" };
    }
  }

  // Attempt 3: copy link to clipboard
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(url);
      return { ok: true, method: "clipboard", message: "Link copied to clipboard" };
    } catch {
      // fall through to legacy fallback below
    }
  }

  // Attempt 4 (last resort): legacy document.execCommand copy
  try {
    if (typeof document !== "undefined") {
      const ta = document.createElement("textarea");
      ta.value = url;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      if (ok) return { ok: true, method: "clipboard", message: "Link copied" };
    }
  } catch {
    // give up
  }

  return { ok: false, method: "failed", message: "Unable to share. Copy the URL from your address bar." };
}

/**
 * Save image flow. On most platforms this triggers a browser download; on iOS
 * Safari (where <a download> is unreliable), this opens the image in a new tab
 * so the user can long-press and "Save to Photos".
 */
export async function saveBracketImage(code: string): Promise<ShareResult> {
  const imgUrl = ogImageUrl(code, true);

  // iOS Safari: open the PNG in a new tab so the user can long-press to save.
  // This is the only approach that reliably works across iOS versions going
  // back to iOS 13. (Blob downloads are blocked, <a download> is ignored.)
  if (isIOS()) {
    try {
      const win = window.open(imgUrl, "_blank");
      if (win) return { ok: true, method: "ios-new-tab" };
    } catch {
      // fall through
    }
    // If popup blocked, try navigating the current tab.
    try {
      window.location.href = imgUrl;
      return { ok: true, method: "ios-new-tab" };
    } catch {
      return { ok: false, method: "failed", message: "Unable to open image." };
    }
  }

  // Android / desktop: fetch the blob and trigger a download.
  try {
    const res = await fetch(imgUrl);
    if (!res.ok) throw new Error(`fetch failed: ${res.status}`);
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = `nba-26-pickem-${code.slice(0, 8)}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    // Release the object URL after a tick
    setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    return { ok: true, method: "download" };
  } catch {
    // Fallback: open in new tab
    try {
      window.open(imgUrl, "_blank");
      return { ok: true, method: "ios-new-tab" };
    } catch {
      return { ok: false, method: "failed", message: "Download failed. Try again." };
    }
  }
}

// Fetch the OG image as a File, timing out if the network is slow so we don't
// hang the user gesture window on iOS.
async function fetchOgAsFile(code: string): Promise<File | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(ogImageUrl(code), { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const blob = await res.blob();
    return new File([blob], `nba-26-pickem.png`, { type: "image/png" });
  } catch {
    return null;
  }
}

"use client";

import { useCallback, useEffect, useState } from "react";
import { isIOS, saveBracketImage, shareBracket } from "@/lib/share";

interface Props {
  code: string;
  hasPicks: boolean;
}

type Toast = { message: string; kind: "ok" | "err" } | null;

export default function ShareBar({ code, hasPicks }: Props) {
  const [toast, setToast] = useState<Toast>(null);
  const [busy, setBusy] = useState<"share" | "save" | null>(null);
  const [showIosSheet, setShowIosSheet] = useState(false);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(id);
  }, [toast]);

  const handleShare = useCallback(async () => {
    if (busy) return;
    setBusy("share");
    try {
      const res = await shareBracket(code);
      if (res.ok) {
        if (res.method === "clipboard") {
          setToast({ message: res.message ?? "Link copied", kind: "ok" });
        }
      } else if (res.message && res.message !== "cancelled") {
        setToast({ message: res.message, kind: "err" });
      }
    } finally {
      setBusy(null);
    }
  }, [busy, code]);

  const handleSave = useCallback(async () => {
    if (busy) return;
    setBusy("save");
    try {
      if (isIOS()) {
        // Show instructions first, THEN open the image. If we open the image
        // synchronously inside the tap, users miss the long-press instruction.
        setShowIosSheet(true);
      } else {
        const res = await saveBracketImage(code);
        if (!res.ok && res.message) {
          setToast({ message: res.message, kind: "err" });
        }
      }
    } finally {
      setBusy(null);
    }
  }, [busy, code]);

  return (
    <>
      <div
        className="fixed bottom-0 left-0 right-0 z-30 pb-safe bg-paper/95 backdrop-blur border-t border-[#e6e3d8]"
        style={{ paddingTop: 10 }}
      >
        <div className="max-w-3xl mx-auto px-4 flex items-center gap-2">
          <button
            type="button"
            onClick={handleShare}
            disabled={!hasPicks || busy !== null}
            className="flex-1 h-12 rounded-xl bg-ink text-white font-semibold text-[15px] active:scale-[0.99] disabled:opacity-40 flex items-center justify-center gap-2"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
              <polyline points="16 6 12 2 8 6" />
              <line x1="12" y1="2" x2="12" y2="15" />
            </svg>
            {busy === "share" ? "Preparing…" : "Share"}
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!hasPicks || busy !== null}
            className="flex-1 h-12 rounded-xl bg-white border border-ink text-ink font-semibold text-[15px] active:scale-[0.99] disabled:opacity-40 flex items-center justify-center gap-2"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            {busy === "save" ? "Preparing…" : "Save image"}
          </button>
        </div>
      </div>

      {toast && (
        <div
          className="fixed left-1/2 -translate-x-1/2 z-40 px-4 py-2 rounded-full text-sm font-medium shadow-lg"
          style={{
            bottom: "calc(env(safe-area-inset-bottom, 0) + 84px)",
            background: toast.kind === "ok" ? "#111111" : "#c8102e",
            color: "#ffffff",
          }}
          role="status"
        >
          {toast.message}
        </div>
      )}

      {showIosSheet && (
        <IosSaveSheet code={code} onClose={() => setShowIosSheet(false)} />
      )}
    </>
  );
}

function IosSaveSheet({ code, onClose }: { code: string; onClose: () => void }) {
  const open = async () => {
    await saveBracketImage(code);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="bg-white rounded-2xl w-full max-w-sm p-5 pb-safe shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="font-serif text-xl font-bold mb-2">Save to Photos</div>
        <ol className="text-sm text-[#444] space-y-2 list-decimal list-inside">
          <li>Tap <strong>Open image</strong> below.</li>
          <li><strong>Long-press</strong> the image that appears.</li>
          <li>Choose <strong>&ldquo;Save to Photos&rdquo;</strong> or <strong>&ldquo;Add to Photos&rdquo;</strong>.</li>
        </ol>
        <p className="mt-3 text-xs text-[#888]">
          iOS Safari blocks direct image downloads — this is the reliable workaround.
        </p>
        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 h-11 rounded-xl bg-[#f0ede2] text-ink font-semibold"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={open}
            className="flex-1 h-11 rounded-xl bg-ink text-white font-semibold"
          >
            Open image
          </button>
        </div>
      </div>
    </div>
  );
}

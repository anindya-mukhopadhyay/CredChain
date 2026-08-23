"use client";

import React, { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Share2, X, Copy, Check, Download, ExternalLink, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface CredentialShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  credentialId: string;
  credentialTitle: string;
  credentialNumber: string;
}

export function CredentialShareModal({
  isOpen,
  onClose,
  credentialId,
  credentialTitle,
  credentialNumber
}: CredentialShareModalProps) {
  const [copied, setCopied] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [publicUrl, setPublicUrl] = useState<string>("");

  useEffect(() => {
    if (isOpen && typeof window !== "undefined") {
      const url = `${window.location.origin}/verify/${credentialId}`;
      setPublicUrl(url);

      QRCode.toDataURL(url, {
        width: 320,
        margin: 2,
        color: {
          dark: "#0f172a",
          light: "#ffffff"
        }
      })
        .then((dataUrl) => setQrDataUrl(dataUrl))
        .catch((err) => console.error("QR Code generation error:", err));
    }
  }, [isOpen, credentialId]);

  if (!isOpen) return null;

  const handleCopy = () => {
    if (!publicUrl) return;
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!qrDataUrl) return;
    const a = document.createElement("a");
    a.href = qrDataUrl;
    a.download = `CredChain-Share-${credentialNumber || credentialId.slice(0, 8)}.png`;
    a.click();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-100 p-6 space-y-5 animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Share Credential</h3>
              <p className="text-xs text-slate-500">{credentialTitle}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="text-center space-y-3">
          <div className="inline-block p-3 bg-slate-50 rounded-2xl border border-slate-100 shadow-inner mx-auto">
            {qrDataUrl ? (
              <img src={qrDataUrl} alt="Credential QR Code" width={180} height={180} className="rounded-lg" />
            ) : (
              <div className="w-44 h-44 flex items-center justify-center bg-slate-100 rounded-lg text-xs text-slate-400 font-mono animate-pulse">
                Loading QR...
              </div>
            )}
          </div>

          <div className="flex items-center justify-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 w-fit mx-auto">
            <ShieldCheck className="w-3.5 h-3.5" />
            Recruiter & Employer Instant Verification
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
            Public Verification Link
          </label>
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 flex items-center justify-between text-xs font-mono text-slate-700">
            <span className="truncate mr-2">{publicUrl}</span>
            <button
              type="button"
              onClick={handleCopy}
              className="text-slate-400 hover:text-slate-700 flex-shrink-0 p-1 rounded hover:bg-slate-200/50 transition-colors"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5 pt-2">
          <Button type="button" variant="outline" size="sm" onClick={handleCopy} className="w-full">
            {copied ? (
              <>
                <Check className="w-4 h-4 mr-1.5 text-emerald-600" />
                Copied Link!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 mr-1.5 text-slate-500" />
                Copy Link
              </>
            )}
          </Button>

          <Button type="button" variant="outline" size="sm" onClick={handleDownload} disabled={!qrDataUrl} className="w-full">
            <Download className="w-4 h-4 mr-1.5 text-slate-500" />
            Download QR
          </Button>
        </div>

        <div className="pt-2 border-t border-slate-100">
          <a
            href={publicUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center text-xs font-semibold text-indigo-600 hover:text-indigo-800 py-1"
          >
            Open Live Verification Portal <ExternalLink className="w-3.5 h-3.5 ml-1" />
          </a>
        </div>
      </div>
    </div>
  );
}

"use client";

import React, { useEffect, useState } from "react";
import QRCode from "qrcode";
import { QrCode, Copy, Check, Download, ExternalLink, ShieldCheck, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface CredentialQRCodeProps {
  credentialId: string;
  credentialNumber?: string;
  status: string;
  title?: string;
  size?: number;
}

export function CredentialQRCode({
  credentialId,
  credentialNumber,
  status,
  title = "Public QR Verification",
  size = 200
}: CredentialQRCodeProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [publicUrl, setPublicUrl] = useState<string>("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const url = `${window.location.origin}/verify/${credentialId}`;
      setPublicUrl(url);

      if (status !== "DRAFT") {
        QRCode.toDataURL(url, {
          width: size * 2,
          margin: 2,
          color: {
            dark: "#0f172a",
            light: "#ffffff"
          }
        })
          .then((dataUrl) => setQrDataUrl(dataUrl))
          .catch((err) => console.error("QR Code generation error:", err));
      }
    }
  }, [credentialId, status, size]);

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
    a.download = `CredChain-QR-${credentialNumber || credentialId.slice(0, 8)}.png`;
    a.click();
  };

  if (status === "DRAFT") {
    return (
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 text-center space-y-3">
        <div className="mx-auto w-12 h-12 rounded-full bg-slate-200/70 flex items-center justify-center text-slate-500">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <div>
          <h4 className="font-semibold text-slate-800 text-sm">{title}</h4>
          <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
            This credential is still in <span className="font-semibold text-slate-700">DRAFT</span> status. Public verification QR codes are available only for finalized and issued credentials.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
            <QrCode className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-slate-900 text-sm">{title}</h4>
            <p className="text-xs text-slate-500">Scan to verify cryptographic authenticity on-chain</p>
          </div>
        </div>
        <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
          <ShieldCheck className="w-3.5 h-3.5" />
          Zero PII Encoded
        </span>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-5 pt-2">
        <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex-shrink-0 shadow-inner">
          {qrDataUrl ? (
            <img
              src={qrDataUrl}
              alt="Verification QR Code"
              width={size}
              height={size}
              className="rounded-lg"
            />
          ) : (
            <div
              style={{ width: size, height: size }}
              className="flex items-center justify-center bg-slate-100 rounded-lg text-xs text-slate-400 font-mono animate-pulse"
            >
              Generating QR...
            </div>
          )}
        </div>

        <div className="space-y-3 flex-1 w-full">
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
              Public Verification URL
            </label>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 flex items-center justify-between text-xs font-mono text-slate-700 break-all select-all">
              <span className="truncate mr-2">{publicUrl}</span>
              <button
                type="button"
                onClick={handleCopy}
                className="text-slate-400 hover:text-slate-700 flex-shrink-0 p-1 rounded hover:bg-slate-200/50 transition-colors"
                title="Copy Link"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCopy}
              className="text-xs"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
                  Copy Link
                </>
              )}
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDownload}
              disabled={!qrDataUrl}
              className="text-xs"
            >
              <Download className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
              Download QR
            </Button>

            <a
              href={publicUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center text-xs font-medium text-indigo-600 hover:text-indigo-800 px-3 py-1.5 rounded-lg hover:bg-indigo-50 transition-colors"
            >
              Verify Portal <ExternalLink className="w-3 h-3 ml-1" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

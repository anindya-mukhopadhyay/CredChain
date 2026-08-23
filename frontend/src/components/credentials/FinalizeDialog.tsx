"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { ShieldCheck, AlertCircle } from "lucide-react";

interface FinalizeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  credentialNumber: string;
}

export function FinalizeDialog({
  isOpen,
  onClose,
  onConfirm,
  credentialNumber,
}: FinalizeDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    try {
      setIsLoading(true);
      setError(null);
      await onConfirm();
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to finalize credential";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Finalize & Anchor Credential"
      description={`Credential #${credentialNumber}`}
      maxWidth="md"
    >
      <div className="space-y-4">
        <div className="p-4 bg-sky-50 rounded-xl border border-sky-200 flex gap-3 text-sky-950 text-sm">
          <ShieldCheck className="w-6 h-6 text-sky-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold">Cryptographic Integrity Action</p>
            <p className="text-xs text-sky-900 leading-relaxed">
              Finalizing this credential creates a deterministic cryptographic SHA-256 hash and
              registers the proof on the blockchain. Once finalized, the academic marks and payload
              cannot be edited.
            </p>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex justify-end gap-2.5 pt-2">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleConfirm} isLoading={isLoading}>
            Confirm & Mint Proof
          </Button>
        </div>
      </div>
    </Modal>
  );
}

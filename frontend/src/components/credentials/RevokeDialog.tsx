"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { AlertCircle } from "lucide-react";

interface RevokeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reasonCode: string, note?: string) => Promise<void>;
  credentialNumber: string;
}

export function RevokeDialog({
  isOpen,
  onClose,
  onConfirm,
  credentialNumber,
}: RevokeDialogProps) {
  const [reasonCode, setReasonCode] = useState("DATA_ERROR");
  const [note, setNote] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRevoke = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsLoading(true);
      setError(null);
      await onConfirm(reasonCode, note);
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to revoke credential";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const reasonOptions = [
    { value: "DATA_ERROR", label: "Data Entry Error / Typo" },
    { value: "ACADEMIC_MISCONDUCT", label: "Academic Misconduct / Fraud" },
    { value: "DUPLICATE_RECORD", label: "Duplicate Record" },
    { value: "ISSUED_IN_ERROR", label: "Issued in Error" },
    { value: "OTHER", label: "Other" },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Revoke Credential"
      description={`Are you sure you want to revoke #${credentialNumber}?`}
      maxWidth="md"
    >
      <form onSubmit={handleRevoke} className="space-y-4">
        <div className="p-3.5 bg-rose-50 rounded-xl border border-rose-200 flex gap-2.5 text-rose-950 text-xs">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            Revoking will permanently change this credential status to <strong>REVOKED</strong> on the
            blockchain. Any subsequent public verification queries will report a REVOKED state.
          </p>
        </div>

        <Select
          label="Revocation Reason Code"
          value={reasonCode}
          onChange={(e) => setReasonCode(e.target.value)}
          options={reasonOptions}
          required
        />

        <Input
          label="Internal Note (Off-chain Only)"
          placeholder="Optional explanation for internal audit trail"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />

        {error && (
          <p className="text-xs text-rose-600 font-medium">{error}</p>
        )}

        <div className="flex justify-end gap-2.5 pt-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" variant="danger" isLoading={isLoading}>
            Confirm Revocation
          </Button>
        </div>
      </form>
    </Modal>
  );
}

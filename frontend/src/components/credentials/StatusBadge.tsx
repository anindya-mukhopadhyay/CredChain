import React from "react";
import { Badge } from "@/components/ui/Badge";
import type { CredentialStatus } from "@/types";
import { FileEdit, ShieldCheck, AlertCircle, Clock } from "lucide-react";

interface StatusBadgeProps {
  status: CredentialStatus | string;
  size?: "sm" | "md";
}

export function StatusBadge({ status, size = "md" }: StatusBadgeProps) {
  switch (status) {
    case "ISSUED":
      return (
        <Badge variant="success" size={size}>
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>ISSUED</span>
        </Badge>
      );
    case "FINALIZED":
      return (
        <Badge variant="info" size={size}>
          <Clock className="w-3.5 h-3.5 text-sky-600" />
          <span>FINALIZED</span>
        </Badge>
      );
    case "DRAFT":
      return (
        <Badge variant="default" size={size}>
          <FileEdit className="w-3.5 h-3.5 text-slate-500" />
          <span>DRAFT</span>
        </Badge>
      );
    case "REVOKED":
      return (
        <Badge variant="danger" size={size}>
          <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
          <span>REVOKED</span>
        </Badge>
      );
    default:
      return (
        <Badge variant="secondary" size={size}>
          <span>{status}</span>
        </Badge>
      );
  }
}

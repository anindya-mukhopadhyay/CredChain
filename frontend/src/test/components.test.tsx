import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatusBadge } from "@/components/credentials/StatusBadge";
import { Alert } from "@/components/ui/Alert";
import { RelationshipVisualizer } from "@/components/credentials/RelationshipVisualizer";
import { CredentialTimeline } from "@/components/credentials/CredentialTimeline";
import type { Credential } from "@/types";

describe("Frontend UI Components", () => {
  describe("StatusBadge", () => {
    it("renders ISSUED badge correctly", () => {
      render(<StatusBadge status="ISSUED" />);
      expect(screen.getByText("ISSUED")).toBeInTheDocument();
    });

    it("renders DRAFT badge correctly", () => {
      render(<StatusBadge status="DRAFT" />);
      expect(screen.getByText("DRAFT")).toBeInTheDocument();
    });

    it("renders REVOKED badge correctly", () => {
      render(<StatusBadge status="REVOKED" />);
      expect(screen.getByText("REVOKED")).toBeInTheDocument();
    });
  });

  describe("Alert", () => {
    it("renders warning alert with title and message", () => {
      render(
        <Alert variant="warning" title="Security Warning">
          Integrity mismatch detected.
        </Alert>
      );
      expect(screen.getByText("Security Warning")).toBeInTheDocument();
      expect(screen.getByText("Integrity mismatch detected.")).toBeInTheDocument();
    });
  });

  describe("RelationshipVisualizer", () => {
    it("renders academic progression sequence", () => {
      render(<RelationshipVisualizer currentSemester={3} />);
      expect(screen.getByText("Sem 1")).toBeInTheDocument();
      expect(screen.getByText("Sem 2")).toBeInTheDocument();
      expect(screen.getByText("Sem 3")).toBeInTheDocument();
      expect(screen.getByText("Sem 8")).toBeInTheDocument();
    });
  });

  describe("CredentialTimeline", () => {
    it("renders complete timeline for issued credential", () => {
      const mockCred: Credential = {
        id: "mock-id-123",
        credentialNumber: "CC-2024-001",
        credentialType: "BTECH_SEMESTER_MARKSHEET",
        candidateId: "cand-1",
        organizationId: "org-1",
        issuerUserId: null,
        issueDate: "2024-08-20",
        expiryDate: null,
        status: "ISSUED",
        canonicalHash: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
        documentUri: null,
        verificationUrl: null,
        blockchainTxId: "0xabcdef1234567890",
        credentialPayload: {},
        finalizedAt: "2024-08-20T10:00:00Z",
        createdAt: "2024-08-20T09:00:00Z",
        updatedAt: "2024-08-20T10:05:00Z",
      };

      render(<CredentialTimeline credential={mockCred} />);
      expect(screen.getByText("Draft Created")).toBeInTheDocument();
      expect(screen.getByText("Canonical Hash Generated")).toBeInTheDocument();
      expect(screen.getByText("Blockchain Proof Registered")).toBeInTheDocument();
    });
  });
});

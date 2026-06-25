// ─────────────────────────────────────────────────────────────
// Component tests for AIActionApprovalCard.tsx
//
// Covers: render with display text + impact, [Approve] click flow,
// [Reject] click flow, error handling when onApprove throws.
// ─────────────────────────────────────────────────────────────
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { AIActionApprovalCard } from "../AIActionApprovalCard";
import type { PendingAction } from "../../types/ai";

const samplePending: PendingAction = {
  id: "pa_test_001",
  action: { type: "buy_stock", ticker: "BBCA", shares: 100, price: 9500 },
  displayText: "Beli 100 lembar BBCA @ Rp 9.500",
  impact: [
    { label: "Estimasi biaya", value: "Rp 950.000" },
    { label: "Kas tersedia", value: "Rp 100.000.000" },
  ],
  createdAt: Date.now(),
};

describe("AIActionApprovalCard", () => {
  it("renders the AI suggests label", () => {
    render(
      <AIActionApprovalCard
        pending={samplePending}
        onApprove={vi.fn()}
        onReject={vi.fn()}
      />,
    );
    expect(screen.getByText("AI suggests")).toBeDefined();
  });

  it("renders the displayText", () => {
    render(
      <AIActionApprovalCard
        pending={samplePending}
        onApprove={vi.fn()}
        onReject={vi.fn()}
      />,
    );
    expect(screen.getByText("Beli 100 lembar BBCA @ Rp 9.500")).toBeDefined();
  });

  it("renders all impact items", () => {
    render(
      <AIActionApprovalCard
        pending={samplePending}
        onApprove={vi.fn()}
        onReject={vi.fn()}
      />,
    );
    expect(screen.getByText(/Estimasi biaya:.*Rp 950\.000/)).toBeDefined();
    expect(screen.getByText(/Kas tersedia:.*Rp 100\.000\.000/)).toBeDefined();
  });

  it("renders Approve and Reject buttons in initial state", () => {
    render(
      <AIActionApprovalCard
        pending={samplePending}
        onApprove={vi.fn()}
        onReject={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: /approve/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /reject/i })).toBeDefined();
  });

  it("calls onApprove when Approve button is clicked", async () => {
    const onApprove = vi.fn();
    render(
      <AIActionApprovalCard
        pending={samplePending}
        onApprove={onApprove}
        onReject={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /approve/i }));
    await waitFor(() => {
      expect(onApprove).toHaveBeenCalledWith(samplePending);
    });
  });

  it("calls onReject when Reject button is clicked", () => {
    const onReject = vi.fn();
    render(
      <AIActionApprovalCard
        pending={samplePending}
        onApprove={vi.fn()}
        onReject={onReject}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /reject/i }));
    expect(onReject).toHaveBeenCalledWith(samplePending);
  });

  it("shows Executed status after successful approve", async () => {
    render(
      <AIActionApprovalCard
        pending={samplePending}
        onApprove={vi.fn()}
        onReject={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /approve/i }));
    await waitFor(() => {
      expect(screen.getByText("✓ Executed")).toBeDefined();
    });
  });

  it("shows Rejected status after reject", async () => {
    render(
      <AIActionApprovalCard
        pending={samplePending}
        onApprove={vi.fn()}
        onReject={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /reject/i }));
    await waitFor(() => {
      expect(screen.getByText("✗ Rejected")).toBeDefined();
    });
  });

  it("hides buttons after decision", async () => {
    render(
      <AIActionApprovalCard
        pending={samplePending}
        onApprove={vi.fn()}
        onReject={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /approve/i }));
    await waitFor(() => {
      expect(screen.queryByRole("button", { name: /approve/i })).toBeNull();
      expect(screen.queryByRole("button", { name: /reject/i })).toBeNull();
    });
  });

  it("displays error message when onApprove throws", async () => {
    render(
      <AIActionApprovalCard
        pending={samplePending}
        onApprove={vi.fn().mockRejectedValue(new Error("Insufficient cash"))}
        onReject={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /approve/i }));
    await waitFor(() => {
      expect(screen.getByText(/Insufficient cash/)).toBeDefined();
    });
  });

  it("still hides buttons after error (no retry)", async () => {
    render(
      <AIActionApprovalCard
        pending={samplePending}
        onApprove={vi.fn().mockRejectedValue(new Error("Boom"))}
        onReject={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /approve/i }));
    await waitFor(() => {
      expect(screen.queryByRole("button", { name: /approve/i })).toBeNull();
    });
  });

  it("renders without impact section when impact is empty", () => {
    const noImpact: PendingAction = {
      ...samplePending,
      displayText: "Ubah Top N menjadi 5",
      impact: [],
    };
    render(
      <AIActionApprovalCard
        pending={noImpact}
        onApprove={vi.fn()}
        onReject={vi.fn()}
      />,
    );
    expect(screen.getByText("Ubah Top N menjadi 5")).toBeDefined();
    expect(screen.queryByText(/Estimasi biaya/)).toBeNull();
  });
});

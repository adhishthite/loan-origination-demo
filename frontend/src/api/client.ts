import type {
  A2aAgentCard,
  AcceptOfferRequest,
  CounterOfferSimulationRequest,
  CounterOfferSimulationResponse,
  DemoPersonaPreset,
  LoanApplication,
  UnderwriterDecisionRequest,
} from "../types/los";
import {
  DEMO_PERSONAS,
  MOCK_A2A_AGENT_CARDS,
  MOCK_APPLICATIONS,
} from "./mockData";

const API_BASE = ""; // Uses Vite proxy config to route /api and /a2a to backend

// In-memory runtime cache for seamless offline / quick demo switching
const localApplications: Record<string, LoanApplication> = {
  ...MOCK_APPLICATIONS,
};

async function safeFetch<T>(
  url: string,
  options?: RequestInit,
  fallback?: () => T,
): Promise<T> {
  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options?.headers || {}),
      },
    });
    if (res.ok) {
      return (await res.json()) as T;
    }
  } catch (err) {
    // Backend offline / network unreachable -> fallback to local mock store
    console.debug(`[API] safeFetch fallback for ${url}:`, err);
  }
  if (fallback) {
    return fallback();
  }
  throw new Error(`Failed to fetch ${url} and no fallback provided.`);
}

export const losApi = {
  async getPersonas(): Promise<DemoPersonaPreset[]> {
    return safeFetch<DemoPersonaPreset[]>(
      `${API_BASE}/api/v1/personas`,
      { method: "GET" },
      () => DEMO_PERSONAS,
    );
  },

  async getApplications(): Promise<LoanApplication[]> {
    return safeFetch<LoanApplication[]>(
      `${API_BASE}/api/v1/applications`,
      { method: "GET" },
      () => Object.values(localApplications),
    );
  },

  async getApplication(id: string): Promise<LoanApplication> {
    return safeFetch<LoanApplication>(
      `${API_BASE}/api/v1/applications/${id}`,
      { method: "GET" },
      () => {
        const found = localApplications[id];
        if (!found) throw new Error(`Application ${id} not found.`);
        return found;
      },
    );
  },

  async createFromPersona(personaId: string): Promise<LoanApplication> {
    const persona = DEMO_PERSONAS.find((p) => p.id === personaId);
    if (!persona) throw new Error(`Persona ${personaId} not found.`);

    return safeFetch<LoanApplication>(
      `${API_BASE}/api/v1/applications`,
      {
        method: "POST",
        body: JSON.stringify({ persona_id: personaId }),
      },
      () => {
        // Find matching mock or clone
        const mockMap: Record<string, string> = {
          persona_stp_clean: "app-stp-001",
          persona_grey_counter: "app-grey-002",
          persona_reject_knockout: "app-rej-003",
        };
        const targetId = mockMap[personaId] || "app-grey-002";
        const app = JSON.parse(JSON.stringify(localApplications[targetId]));
        app.id = `app-${Date.now().toString().slice(-6)}`;
        app.createdAt = new Date().toISOString();
        localApplications[app.id] = app;
        return app;
      },
    );
  },

  async evaluateApplication(id: string): Promise<LoanApplication> {
    return safeFetch<LoanApplication>(
      `${API_BASE}/api/v1/applications/${id}/evaluate`,
      { method: "POST" },
      () => {
        const app = localApplications[id];
        if (!app) throw new Error(`Application ${id} not found`);
        return app;
      },
    );
  },

  async simulateCounterOffer(
    id: string,
    req: CounterOfferSimulationRequest,
  ): Promise<CounterOfferSimulationResponse> {
    return safeFetch<CounterOfferSimulationResponse>(
      `${API_BASE}/api/v1/applications/${id}/simulate-counter`,
      {
        method: "POST",
        body: JSON.stringify({
          loan_amount: req.loanAmount,
          tenure_months: req.tenureMonths,
        }),
      },
      () => {
        const app = localApplications[id];
        const verifiedIncome = app?.metrics?.verifiedMonthlyIncome || 115000;
        const existingEmi = app?.metrics?.existingEmiOutflow || 18000;
        const bureauScore = app?.metrics?.bureauScore || 732;

        let apr = 13.5;
        if (bureauScore >= 780) apr = 10.5;
        else if (bureauScore >= 750) apr = 11.5;
        else if (bureauScore >= 710) apr = 13.5;
        else if (bureauScore >= 680) apr = 15.5;
        else apr = 18.0;

        const monthlyRate = apr / (12 * 100);
        const n = req.tenureMonths;
        const p = req.loanAmount;
        const emi =
          (p * monthlyRate * (1 + monthlyRate) ** n) /
          ((1 + monthlyRate) ** n - 1);
        const foir = ((existingEmi + emi) / verifiedIncome) * 100;

        const originalEmi = app?.metrics?.proposedEmi || emi;
        const savings = Math.max(0, originalEmi - emi);

        let outcome: "AUTO_APPROVE" | "MANUAL_REVIEW" | "AUTO_REJECT" =
          "AUTO_APPROVE";
        if (foir > 55.0) outcome = "AUTO_REJECT";
        else if (foir > 45.0) outcome = "MANUAL_REVIEW";

        return {
          proposedAmount: req.loanAmount,
          proposedTenureMonths: req.tenureMonths,
          interestRatePct: apr,
          proposedEmi: Math.round(emi),
          foirPct: Number(foir.toFixed(1)),
          foirStatus: outcome,
          monthlySavings: Math.round(savings),
          isViable: foir <= 48.0,
        };
      },
    );
  },

  async submitDecision(
    id: string,
    req: UnderwriterDecisionRequest,
  ): Promise<LoanApplication> {
    return safeFetch<LoanApplication>(
      `${API_BASE}/api/v1/applications/${id}/decision`,
      {
        method: "POST",
        body: JSON.stringify(req),
      },
      () => {
        const app = localApplications[id];
        if (!app) throw new Error(`Application ${id} not found`);

        let newStatus = app.status;
        if (req.decision === "APPROVE") {
          newStatus = "APPROVED";
        } else if (req.decision === "APPROVE_COUNTER") {
          newStatus = "APPROVED";
          if (req.counterAmount && req.counterTenure) {
            app.kfs = {
              sanctionedAmount: req.counterAmount,
              tenureMonths: req.counterTenure,
              annualInterestRatePct: 13.5,
              processingFeeAmount: Math.round(req.counterAmount * 0.015),
              effectiveAprPct: 14.1,
              monthlyEmi: 31100,
              totalInterestPayable: 342800,
              totalAmountPayable: req.counterAmount + 342800,
              kfsGeneratedAt: new Date().toISOString(),
            };
          }
        } else if (req.decision === "REJECT") {
          newStatus = "REJECTED";
        }

        app.status = newStatus;
        app.updatedAt = new Date().toISOString();
        app.auditLog.push({
          timestamp: new Date().toISOString(),
          actor: "CREDIT_OFFICER:UW-8492",
          action: `DECISION_${req.decision}`,
          previousStatus: "MANUAL_REVIEW",
          newStatus,
          policyVersion: "v2026.10.1",
          details: {
            notes: req.officerNotes,
            counterAmount: req.counterAmount,
            counterTenure: req.counterTenure,
          },
        });
        return app;
      },
    );
  },

  async acceptOffer(
    id: string,
    req: AcceptOfferRequest,
  ): Promise<LoanApplication> {
    return safeFetch<LoanApplication>(
      `${API_BASE}/api/v1/applications/${id}/accept-offer`,
      {
        method: "POST",
        body: JSON.stringify(req),
      },
      () => {
        const app = localApplications[id];
        if (!app) throw new Error(`Application ${id} not found`);
        app.status = "DISBURSED";
        app.updatedAt = new Date().toISOString();
        app.auditLog.push({
          timestamp: new Date().toISOString(),
          actor: `BORROWER:${app.applicant.fullName}`,
          action: "KFS_ESIGNED_DISBURSED",
          previousStatus: "APPROVED",
          newStatus: "DISBURSED",
          policyVersion: "v2026.10.1",
          details: {
            signatureName: req.signatureName,
            consentTimestamp: req.consentTimestamp,
            disbursementAccount: "••••••••9841",
          },
        });
        return app;
      },
    );
  },

  async getAgentCard(
    target: "los_underwriter" | "credit_bureau",
  ): Promise<A2aAgentCard> {
    const path =
      target === "los_underwriter"
        ? "/a2a/los_underwriter/.well-known/agent-card.json"
        : "/a2a/credit_bureau/.well-known/agent-card.json";

    return safeFetch<A2aAgentCard>(
      `${API_BASE}${path}`,
      { method: "GET" },
      () => MOCK_A2A_AGENT_CARDS[target],
    );
  },

  subscribeSseEvents(
    applicationId: string,
    onMessage: (data: unknown) => void,
  ): () => void {
    const sseUrl = `${API_BASE}/api/v1/applications/${applicationId}/events`;
    try {
      const eventSource = new EventSource(sseUrl);
      eventSource.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          onMessage(parsed);
        } catch {
          onMessage(event.data);
        }
      };
      eventSource.onerror = () => {
        // SSE disconnected, clean up silently
        eventSource.close();
      };
      return () => {
        eventSource.close();
      };
    } catch {
      return () => {};
    }
  },
};

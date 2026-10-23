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

const API_BASE = ""; // Vite proxy routes /api and /a2a to backend :8000

// In-memory runtime cache for seamless offline / quick demo switching
const localApplications: Record<string, LoanApplication> = {
  ...MOCK_APPLICATIONS,
};

// Shallow snake_case -> camelCase. Shallow on purpose: A2A request/response
// payloads are JSON-RPC wire data and must be shown exactly as sent.
function camelizeShallow<T>(obj: unknown): T | undefined {
  if (!obj || typeof obj !== "object") return undefined;
  return Object.fromEntries(
    Object.entries(obj as Record<string, unknown>).map(([k, v]) => [
      k.replace(/_([a-z0-9])/g, (_, c: string) => c.toUpperCase()),
      v,
    ]),
  ) as T;
}

function normalizeBureau(raw: unknown): LoanApplication["bureauReport"] {
  const b = camelizeShallow<Record<string, any>>(raw);
  if (!b) return undefined;
  return {
    bureauScore: b.bureauScore,
    activeTradelines: b.activeTradelines ?? 0,
    dpd30To60In24m: b.dpd30To60In24m ?? b.dpd306024m ?? 0,
    dpd90PlusIn24m: b.dpd90PlusIn24m ?? b.dpd90Plus24m ?? 0,
    recentInquiries6m: b.recentInquiries6m ?? 0,
    bureauProvider: b.bureauProvider ?? "Credit bureau (via A2A)",
  };
}

function normalizeApplication(raw: any): LoanApplication {
  if (!raw) return MOCK_APPLICATIONS["app-grey-002"];

  // Normalize snake_case from backend or camelCase from mockData
  const id = raw.id || raw.application_id || `app-${Date.now()}`;
  const status = raw.status || "DRAFT";
  const createdAt = raw.createdAt || raw.created_at || new Date().toISOString();
  const updatedAt = raw.updatedAt || raw.updated_at || new Date().toISOString();

  const applicant = raw.applicant
    ? {
        fullName:
          raw.applicant.fullName || raw.applicant.full_name || "Applicant",
        dob: raw.applicant.dob || "1990-01-01",
        taxId: raw.applicant.taxId || raw.applicant.tax_id || "ABCDE1234F",
        employmentType:
          raw.applicant.employmentType ||
          raw.applicant.employment_type ||
          "SALARIED",
        declaredMonthlyIncome:
          raw.applicant.declaredMonthlyIncome ??
          raw.applicant.declared_monthly_income ??
          100000,
        phone: raw.applicant.phone || "+91 98765 43210",
        email: raw.applicant.email || "applicant@example.com",
      }
    : MOCK_APPLICATIONS["app-grey-002"].applicant;

  const loanRequest = raw.loanRequest
    ? raw.loanRequest
    : raw.loan_request
      ? {
          amount: raw.loan_request.amount,
          tenureMonths: raw.loan_request.tenure_months,
          purpose: raw.loan_request.purpose,
        }
      : MOCK_APPLICATIONS["app-grey-002"].loanRequest;

  // Policy rules
  const policyRules = (raw.policyRules || raw.policy_rules || []).map(
    (r: any) => ({
      ruleId: r.ruleId || r.rule_id || "POL-00",
      metricName: r.metricName || r.metric_name || "Metric",
      actualValue: r.actualValue || r.actual_value || "",
      outcome: r.outcome || "AUTO_APPROVE",
      thresholdDescription:
        r.thresholdDescription || r.threshold_description || "",
      adverseActionCode: r.adverseActionCode || r.adverse_action_code || null,
    }),
  );

  // Audit log
  const auditLog = (raw.auditLog || raw.audit_log || []).map((a: any) => ({
    timestamp: a.timestamp || new Date().toISOString(),
    actor: a.actor || "SYSTEM",
    action: a.action || "UPDATE",
    previousStatus: a.previousStatus || a.previous_status || null,
    newStatus: a.newStatus || a.new_status || status,
    policyVersion: a.policyVersion || a.policy_version || "v2026.10.1",
    details: a.details || {},
  }));

  // Underwriting metrics
  const rawMetrics = raw.metrics || raw.underwriting_metrics;
  const metrics = rawMetrics
    ? {
        applicantAgeYears:
          rawMetrics.applicantAgeYears ?? rawMetrics.applicant_age_years ?? 35,
        bureauScore: rawMetrics.bureauScore ?? rawMetrics.bureau_score ?? 720,
        declaredMonthlyIncome:
          rawMetrics.declaredMonthlyIncome ??
          rawMetrics.declared_monthly_income ??
          applicant.declaredMonthlyIncome,
        verifiedMonthlyIncome:
          rawMetrics.verifiedMonthlyIncome ??
          rawMetrics.verified_monthly_income ??
          applicant.declaredMonthlyIncome,
        incomeVariancePct:
          rawMetrics.incomeVariancePct ?? rawMetrics.income_variance_pct ?? 0,
        averageMonthlyBalance:
          rawMetrics.averageMonthlyBalance ??
          rawMetrics.average_monthly_balance ??
          50000,
        existingEmiOutflow:
          rawMetrics.existingEmiOutflow ?? rawMetrics.existing_emi_outflow ?? 0,
        proposedEmi: rawMetrics.proposedEmi ?? rawMetrics.proposed_emi ?? 30000,
        annualInterestRatePct:
          rawMetrics.annualInterestRatePct ??
          rawMetrics.annual_interest_rate_pct ??
          13.5,
        foirPercentage:
          rawMetrics.foirPercentage ?? rawMetrics.foir_percentage ?? 35,
        inwardBounces6m:
          rawMetrics.inwardBounces6m ?? rawMetrics.inward_bounces_6m ?? 0,
        dpd30To60In24m:
          rawMetrics.dpd30To60In24m ?? rawMetrics.dpd_30_to_60_in_24m ?? 0,
        dpd90PlusIn24m:
          rawMetrics.dpd90PlusIn24m ?? rawMetrics.dpd_90_plus_in_24m ?? 0,
      }
    : undefined;

  // Documents uploaded
  const documentsUploaded = raw.documentsUploaded || {
    panCard:
      (raw.documents || []).some((d: any) => d.doc_type === "ID_PROOF") || true,
    bankStatement:
      (raw.documents || []).some((d: any) => d.doc_type === "BANK_STATEMENT") ||
      true,
    salarySlip:
      (raw.documents || []).some(
        (d: any) =>
          d.doc_type === "SALARY_SLIP" || d.doc_type === "ITR_RETURNS",
      ) || true,
  };

  // CAM
  const rawCam = raw.cam || raw.credit_memo;
  const cam = rawCam
    ? {
        executiveSummary:
          rawCam.executiveSummary || rawCam.executive_summary || "",
        strengths: rawCam.strengths || [],
        riskFlags: rawCam.riskFlags || rawCam.risk_flags || [],
        mitigants: rawCam.mitigants || [],
        recommendationJustification:
          rawCam.recommendationJustification ||
          rawCam.recommendation_justification ||
          "",
      }
    : undefined;

  // Counter offer
  const rawCounter = raw.counterOffer || raw.counter_offer;
  const counterOffer = rawCounter
    ? {
        recommendedAmount:
          rawCounter.recommendedAmount ?? rawCounter.recommended_amount,
        recommendedTenureMonths:
          rawCounter.recommendedTenureMonths ??
          rawCounter.recommended_tenure_months,
        recommendedEmi: rawCounter.recommendedEmi ?? rawCounter.recommended_emi,
        projectedFoir: rawCounter.projectedFoir ?? rawCounter.projected_foir,
        rationale: rawCounter.rationale || "",
      }
    : undefined;

  // KFS
  const rawKfs = raw.kfs || raw.key_fact_statement;
  const kfs = rawKfs
    ? {
        sanctionedAmount: rawKfs.sanctionedAmount ?? rawKfs.sanctioned_amount,
        tenureMonths: rawKfs.tenureMonths ?? rawKfs.tenure_months,
        annualInterestRatePct:
          rawKfs.annualInterestRatePct ?? rawKfs.annual_interest_rate_pct,
        processingFeeAmount:
          rawKfs.processingFeeAmount ?? rawKfs.processing_fee_amount,
        effectiveAprPct: rawKfs.effectiveAprPct ?? rawKfs.effective_apr_pct,
        monthlyEmi: rawKfs.monthlyEmi ?? rawKfs.monthly_emi,
        totalInterestPayable:
          rawKfs.totalInterestPayable ?? rawKfs.total_interest_payable,
        totalAmountPayable:
          rawKfs.totalAmountPayable ?? rawKfs.total_amount_payable,
        kfsGeneratedAt:
          rawKfs.kfsGeneratedAt ||
          rawKfs.kfs_generated_at ||
          new Date().toISOString(),
      }
    : undefined;

  return {
    id,
    personaId: raw.personaId ?? raw.persona_id,
    status,
    createdAt,
    updatedAt,
    applicant,
    loanRequest,
    documentsUploaded,
    documentExtraction:
      raw.documentExtraction ?? camelizeShallow(raw.document_extraction),
    kycVerification: raw.kycVerification ?? camelizeShallow(raw.kyc_result),
    bureauReport: raw.bureauReport ?? normalizeBureau(raw.bureau_report),
    metrics,
    policyRules,
    cam,
    counterOffer,
    kfs,
    adkExecutionSteps:
      raw.adkExecutionSteps ??
      (raw.agent_steps ?? []).map((s: unknown) => camelizeShallow(s)),
    a2aTelemetry:
      raw.a2aTelemetry ??
      (raw.a2a_telemetry ?? []).map((r: unknown) => camelizeShallow(r)),
    auditLog,
  };
}

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
    console.debug(`[API] safeFetch fallback for ${url}:`, err);
  }
  if (fallback) {
    return fallback();
  }
  throw new Error(`Failed to fetch ${url} and no fallback provided.`);
}

export const losApi = {
  async getPersonas(): Promise<DemoPersonaPreset[]> {
    const raw = await safeFetch<unknown[]>(
      `${API_BASE}/api/v1/personas`,
      { method: "GET" },
      () => DEMO_PERSONAS,
    );
    if (!Array.isArray(raw) || raw.length === 0) return DEMO_PERSONAS;
    // Backend returns snake_case + badge_variant; local mocks are camelCase.
    // Merge onto the local preset so the UI always sees one consistent shape.
    return raw.map((item) => {
      const p = item as Record<string, any>;
      const local = DEMO_PERSONAS.find((d) => d.id === p.id);
      const variant = p.badge_variant as string | undefined;
      const badgeColor: DemoPersonaPreset["badgeColor"] =
        p.badgeColor ??
        (variant === "success"
          ? "emerald"
          : variant === "warning"
            ? "amber"
            : variant === "destructive"
              ? "rose"
              : (local?.badgeColor ?? "amber"));
      return {
        ...(local ?? DEMO_PERSONAS[1]),
        id: p.id,
        name: p.name ?? local?.name,
        title: p.title ?? p.subtitle ?? local?.title ?? "",
        summary: p.summary ?? p.description ?? local?.summary ?? "",
        badge: p.badge ?? local?.badge ?? "",
        badgeColor,
        expectedOutcome:
          p.expectedOutcome ?? p.expected_outcome ?? local?.expectedOutcome,
        applicant: p.applicant?.full_name
          ? {
              fullName: p.applicant.full_name,
              dob: p.applicant.dob,
              taxId: p.applicant.tax_id,
              employmentType: p.applicant.employment_type,
              declaredMonthlyIncome: p.applicant.declared_monthly_income,
            }
          : (p.applicant ?? local?.applicant),
        loanRequest: p.loan_request
          ? {
              amount: p.loan_request.amount,
              tenureMonths: p.loan_request.tenure_months,
              purpose: p.loan_request.purpose,
            }
          : (p.loanRequest ?? local?.loanRequest),
      } as DemoPersonaPreset;
    });
  },

  async getApplications(): Promise<LoanApplication[]> {
    try {
      const res = await fetch(`${API_BASE}/api/v1/applications`);
      if (res.ok) {
        const rawList = await res.json();
        // The backend returns summaries: fetch full app for each or merge with local
        if (Array.isArray(rawList) && rawList.length > 0) {
          const fullApps = await Promise.all(
            rawList.map(async (item: any) => {
              try {
                const fullRes = await fetch(
                  `${API_BASE}/api/v1/applications/${item.application_id || item.id}`,
                );
                if (fullRes.ok) {
                  return normalizeApplication(await fullRes.json());
                }
              } catch (_) {}
              return normalizeApplication(item);
            }),
          );
          return fullApps;
        }
      }
    } catch (_) {}
    return Object.values(localApplications);
  },

  async getApplication(id: string): Promise<LoanApplication> {
    try {
      const res = await fetch(`${API_BASE}/api/v1/applications/${id}`);
      if (res.ok) {
        return normalizeApplication(await res.json());
      }
    } catch (_) {}
    const found = localApplications[id] || Object.values(localApplications)[0];
    return found;
  },

  async createFromPersona(personaId: string): Promise<LoanApplication> {
    try {
      const res = await fetch(`${API_BASE}/api/v1/applications`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ persona_id: personaId }),
      });
      if (res.ok) {
        return normalizeApplication(await res.json());
      }
    } catch (_) {}

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

  async evaluateApplication(id: string): Promise<LoanApplication> {
    try {
      const res = await fetch(
        `${API_BASE}/api/v1/applications/${id}/evaluate`,
        {
          method: "POST",
        },
      );
      if (res.ok) {
        return normalizeApplication(await res.json());
      }
    } catch (_) {}
    const app = localApplications[id];
    if (!app) throw new Error(`Application ${id} not found`);
    return app;
  },

  async simulateCounterOffer(
    id: string,
    req: CounterOfferSimulationRequest,
  ): Promise<CounterOfferSimulationResponse> {
    try {
      const res = await fetch(
        `${API_BASE}/api/v1/applications/${id}/simulate-counter`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            loan_amount: req.loanAmount,
            tenure_months: req.tenureMonths,
          }),
        },
      );
      if (res.ok) {
        const data = await res.json();
        return {
          proposedAmount: data.proposed_amount ?? req.loanAmount,
          proposedTenureMonths: data.proposed_tenure_months ?? req.tenureMonths,
          interestRatePct: data.interest_rate_pct ?? 13.5,
          proposedEmi: data.proposed_emi ?? 30000,
          foirPct: data.foir_pct ?? 45.0,
          foirStatus: data.foir_status ?? "AUTO_APPROVE",
          monthlySavings: data.monthly_savings ?? 0,
          isViable: data.is_viable ?? true,
        };
      }
    } catch (_) {}

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
      (p * monthlyRate * (1 + monthlyRate) ** n) / ((1 + monthlyRate) ** n - 1);
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

  async submitDecision(
    id: string,
    req: UnderwriterDecisionRequest,
  ): Promise<LoanApplication> {
    try {
      const res = await fetch(
        `${API_BASE}/api/v1/applications/${id}/decision`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            decision: req.decision,
            officer_notes: req.officerNotes,
            counter_amount: req.counterAmount,
            counter_tenure: req.counterTenure,
          }),
        },
      );
      if (res.ok) {
        return normalizeApplication(await res.json());
      }
    } catch (_) {}

    const app = localApplications[id];
    if (!app) throw new Error(`Application ${id} not found`);

    let newStatus = app.status;
    if (req.decision === "APPROVE" || req.decision === "APPROVE_COUNTER") {
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

  async acceptOffer(
    id: string,
    req: AcceptOfferRequest,
  ): Promise<LoanApplication> {
    try {
      const res = await fetch(
        `${API_BASE}/api/v1/applications/${id}/accept-offer`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            signature_name: req.signatureName,
            consent_timestamp: req.consentTimestamp,
          }),
        },
      );
      if (res.ok) {
        return normalizeApplication(await res.json());
      }
    } catch (_) {}

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
        signature: req.signatureName,
        consentTimestamp: req.consentTimestamp,
      },
    });
    return app;
  },

  async getA2aAgentCards(): Promise<{
    bureauCard: A2aAgentCard;
    losCard: A2aAgentCard;
  }> {
    try {
      const [bureauRes, losRes] = await Promise.all([
        fetch(`${API_BASE}/a2a/credit_bureau/.well-known/agent-card.json`),
        fetch(`${API_BASE}/a2a/los_underwriter/.well-known/agent-card.json`),
      ]);
      if (bureauRes.ok && losRes.ok) {
        return {
          bureauCard: await bureauRes.json(),
          losCard: await losRes.json(),
        };
      }
    } catch (_) {}
    return {
      bureauCard: MOCK_A2A_AGENT_CARDS.bureau,
      losCard: MOCK_A2A_AGENT_CARDS.los,
    };
  },
};

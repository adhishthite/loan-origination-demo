import { useEffect, useState } from "react";
import { losApi } from "./api/client";
import { DEMO_PERSONAS, MOCK_APPLICATIONS } from "./api/mockData";
import { ApplicationForm } from "./components/borrower/ApplicationForm";
import { PersonaSelector } from "./components/borrower/PersonaSelector";
import { PipelineStepper } from "./components/borrower/PipelineStepper";
import { SanctionKfsCard } from "./components/borrower/SanctionKfsCard";
import { A2aInspectorModal } from "./components/shared/A2aInspectorModal";
import { AuditTimeline } from "./components/shared/AuditTimeline";
import { Header } from "./components/shared/Header";
import { AdkPipelineGraph } from "./components/underwriter/AdkPipelineGraph";
import { ApplicationList } from "./components/underwriter/ApplicationList";
import { CounterOfferSim } from "./components/underwriter/CounterOfferSim";
import { CreditMemoPanel } from "./components/underwriter/CreditMemoPanel";
import { DecisionBar } from "./components/underwriter/DecisionBar";
import { DocSpreadViewer } from "./components/underwriter/DocSpreadViewer";
import { RuleScorecard } from "./components/underwriter/RuleScorecard";
import type { DemoPersonaPreset, LoanApplication } from "./types/los";

export default function App() {
  const [personas, setPersonas] = useState<DemoPersonaPreset[]>(DEMO_PERSONAS);
  const [activePersonaId, setActivePersonaId] = useState<string>(
    "persona_grey_counter",
  );
  const [applications, setApplications] = useState<LoanApplication[]>(
    Object.values(MOCK_APPLICATIONS),
  );
  const [currentAppId, setCurrentAppId] = useState<string>("app-grey-002");
  const [activeView, setActiveView] = useState<"borrower" | "underwriter">(
    "borrower",
  );

  // Modals & Drawers
  const [isA2aModalOpen, setIsA2aModalOpen] = useState(false);
  const [isAuditDrawerOpen, setIsAuditDrawerOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Async States
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isSubmittingDecision, setIsSubmittingDecision] = useState(false);
  const [counterTerms, setCounterTerms] = useState<
    { amount: number; tenure: number } | undefined
  >();

  // Fetch initial data
  useEffect(() => {
    losApi.getPersonas().then(setPersonas).catch(console.error);
    losApi.getApplications().then(setApplications).catch(console.error);
  }, []);

  // Theme synchronization
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [isDarkMode]);

  const currentApplication =
    applications.find((a) => a.id === currentAppId) ||
    applications[0] ||
    MOCK_APPLICATIONS["app-grey-002"];

  // Persona Switch Handler
  const handleSelectPersona = async (personaId: string) => {
    setActivePersonaId(personaId);
    try {
      const app = await losApi.createFromPersona(personaId);
      setApplications((prev) => {
        const existing = prev.filter((a) => a.id !== app.id);
        return [app, ...existing];
      });
      setCurrentAppId(app.id);
      setCounterTerms(undefined);
    } catch (err) {
      console.error("Failed to load persona:", err);
    }
  };

  // Run ADK Pipeline
  const handleRunEvaluation = async () => {
    if (!currentApplication) return;
    setIsEvaluating(true);

    try {
      // Step simulation for vivid demo feel
      setTimeout(async () => {
        const updated = await losApi.evaluateApplication(currentApplication.id);
        setApplications((prev) =>
          prev.map((a) => (a.id === updated.id ? updated : a)),
        );
        setIsEvaluating(false);
      }, 1200);
    } catch (err) {
      console.error("Evaluation failed:", err);
      setIsEvaluating(false);
    }
  };

  // Underwriter Decision Handler
  const handleDecision = async (
    decision: "APPROVE" | "APPROVE_COUNTER" | "REJECT",
    notes: string,
    counterAmount?: number,
    counterTenure?: number,
  ) => {
    if (!currentApplication) return;
    setIsSubmittingDecision(true);

    try {
      const updated = await losApi.submitDecision(currentApplication.id, {
        decision,
        officerNotes: notes,
        counterAmount,
        counterTenure,
      });

      setApplications((prev) =>
        prev.map((a) => (a.id === updated.id ? updated : a)),
      );
      setIsSubmittingDecision(false);
    } catch (err) {
      console.error("Decision failed:", err);
      setIsSubmittingDecision(false);
    }
  };

  // Borrower Accept Offer & Disburse
  const handleAcceptOffer = async (signatureName: string) => {
    if (!currentApplication) return;
    try {
      const updated = await losApi.acceptOffer(currentApplication.id, {
        signatureName,
        consentTimestamp: new Date().toISOString(),
      });
      setApplications((prev) =>
        prev.map((a) => (a.id === updated.id ? updated : a)),
      );
    } catch (err) {
      console.error("Accept offer failed:", err);
    }
  };

  // Handle updated application from form
  const handleUpdateApplication = (updated: LoanApplication) => {
    setApplications((prev) =>
      prev.map((a) => (a.id === updated.id ? updated : a)),
    );
  };

  return (
    <div className="min-h-screen bg-[var(--bg-page)] text-[var(--text-primary)] transition-colors duration-200">
      {/* Sticky Global Navigation */}
      <Header
        personas={personas}
        activePersonaId={activePersonaId}
        onSelectPersona={handleSelectPersona}
        activeView={activeView}
        onSelectView={setActiveView}
        onOpenA2aModal={() => setIsA2aModalOpen(true)}
        onOpenAuditDrawer={() => setIsAuditDrawerOpen(true)}
        isDarkMode={isDarkMode}
        onToggleTheme={() => setIsDarkMode(!isDarkMode)}
        auditCount={currentApplication?.auditLog.length || 0}
      />

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        {/* VIEW 1: BORROWER PORTAL */}
        {activeView === "borrower" && (
          <div className="space-y-6">
            {/* Quick Demo Persona Switcher */}
            <PersonaSelector
              personas={personas}
              activePersonaId={activePersonaId}
              onSelectPersona={handleSelectPersona}
            />

            {/* ADK Pipeline Stepper */}
            <PipelineStepper
              status={currentApplication.status}
              isEvaluating={isEvaluating}
            />

            {/* Sanction Letter (KFS) or Adverse Notice */}
            <SanctionKfsCard
              application={currentApplication}
              onAcceptOffer={handleAcceptOffer}
              onSwitchToUnderwriter={() => setActiveView("underwriter")}
            />

            {/* Intake Form & Document Upload Simulator */}
            <ApplicationForm
              application={currentApplication}
              onUpdateApplication={handleUpdateApplication}
              onSubmitForEvaluation={handleRunEvaluation}
              isEvaluating={isEvaluating}
            />
          </div>
        )}

        {/* VIEW 2: UNDERWRITER WORKBENCH */}
        {activeView === "underwriter" && (
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-4">
            {/* Left: Pipeline List */}
            <div className="xl:col-span-1">
              <ApplicationList
                applications={applications}
                selectedId={currentAppId}
                onSelect={(id) => {
                  setCurrentAppId(id);
                  setCounterTerms(undefined);
                }}
              />
            </div>

            {/* Right: Detailed Underwriting Panels */}
            <div className="space-y-6 xl:col-span-3">
              {/* ADK Multi-Agent & A2A Topology Visualizer */}
              <AdkPipelineGraph
                steps={currentApplication.adkExecutionSteps}
                a2aLatencyMs={
                  currentApplication.a2aTelemetry[0]?.latencyMs || 210
                }
              />

              {/* Document Extraction & KYC Spreading */}
              <DocSpreadViewer
                metrics={currentApplication.metrics}
                extraction={currentApplication.documentExtraction}
                kyc={currentApplication.kycVerification}
                declaredIncome={
                  currentApplication.applicant.declaredMonthlyIncome
                }
                declaredTaxId={currentApplication.applicant.taxId}
              />

              {/* Policy Rules Scorecard (POL-01..06) */}
              <RuleScorecard rules={currentApplication.policyRules} />

              {/* AI Credit Assessment Memo (CAM) */}
              <CreditMemoPanel
                cam={currentApplication.cam}
                applicantName={currentApplication.applicant.fullName}
              />

              {/* Counter-Offer Simulator */}
              <CounterOfferSim
                application={currentApplication}
                onApplySimulatedOffer={(amount, tenure) =>
                  setCounterTerms({ amount, tenure })
                }
              />

              {/* Human-in-the-Loop Decision Bar */}
              <DecisionBar
                application={currentApplication}
                counterTerms={counterTerms}
                onDecision={handleDecision}
                isSubmitting={isSubmittingDecision}
              />
            </div>
          </div>
        )}
      </main>

      {/* A2A & ADK Protocol Inspector Modal */}
      <A2aInspectorModal
        isOpen={isA2aModalOpen}
        onClose={() => setIsA2aModalOpen(false)}
        a2aRecords={currentApplication.a2aTelemetry}
        adkSteps={currentApplication.adkExecutionSteps}
      />

      {/* Immutable Audit Log Drawer */}
      <AuditTimeline
        isOpen={isAuditDrawerOpen}
        onClose={() => setIsAuditDrawerOpen(false)}
        entries={currentApplication.auditLog}
      />
    </div>
  );
}

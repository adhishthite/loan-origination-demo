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
import { AgentTrace } from "./components/underwriter/AgentTrace";
import { ApplicationList } from "./components/underwriter/ApplicationList";
import { CounterOfferSim } from "./components/underwriter/CounterOfferSim";
import { CreditMemoPanel } from "./components/underwriter/CreditMemoPanel";
import { DecisionBar } from "./components/underwriter/DecisionBar";
import { DecisionSummary } from "./components/underwriter/DecisionSummary";
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
    applications.find((a) => a.personaId === activePersonaId) ||
    applications[0] ||
    MOCK_APPLICATIONS["app-grey-002"];
  // Keep the demo-applicant picker in sync with whichever file is open.
  const selectedPersonaId = currentApplication.personaId ?? activePersonaId;

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

  // Short, stable, human-readable file reference derived from the app id.
  const fileRef = `LN-${(
    [...currentApplication.id].reduce(
      (h, c) => (h * 31 + c.charCodeAt(0)) >>> 0,
      7,
    ) % 1_000_000
  )
    .toString()
    .padStart(6, "0")}`;

  return (
    <div className="min-h-screen bg-paper text-ink">
      <Header
        activeView={activeView}
        onSelectView={setActiveView}
        onOpenA2aModal={() => setIsA2aModalOpen(true)}
        onOpenAuditDrawer={() => setIsAuditDrawerOpen(true)}
        isDarkMode={isDarkMode}
        onToggleTheme={() => setIsDarkMode(!isDarkMode)}
        auditCount={currentApplication?.auditLog?.length || 0}
        fileRef={fileRef}
        applicantName={currentApplication.applicant.fullName}
        status={currentApplication.status}
      />

      <main className="mx-auto max-w-[1320px] px-4 py-6 sm:px-6">
        {activeView === "borrower" && (
          <div className="space-y-6">
            <PersonaSelector
              personas={personas}
              activePersonaId={selectedPersonaId}
              onSelectPersona={handleSelectPersona}
            />

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
              <ApplicationForm
                key={currentApplication.id}
                application={currentApplication}
                onUpdateApplication={handleUpdateApplication}
                onSubmitForEvaluation={handleRunEvaluation}
                isEvaluating={isEvaluating}
              />

              <aside className="space-y-6 lg:sticky lg:top-28 lg:self-start">
                <PipelineStepper
                  status={currentApplication.status}
                  isEvaluating={isEvaluating}
                />
                <SanctionKfsCard
                  application={currentApplication}
                  onAcceptOffer={handleAcceptOffer}
                  onSwitchToUnderwriter={() => setActiveView("underwriter")}
                />
              </aside>
            </div>
          </div>
        )}

        {activeView === "underwriter" && (
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
            <aside className="xl:sticky xl:top-28 xl:self-start">
              <ApplicationList
                applications={applications}
                selectedId={currentAppId}
                onSelect={(id) => {
                  setCurrentAppId(id);
                  setCounterTerms(undefined);
                }}
              />
            </aside>

            <div className="min-w-0 space-y-6 pb-28">
              <DecisionSummary
                application={currentApplication}
                counterTerms={counterTerms}
                onRun={handleRunEvaluation}
                isRunning={isEvaluating}
              />

              {currentApplication.metrics && (
                <>
                  <div className="grid grid-cols-1 gap-6 2xl:grid-cols-2">
                    <RuleScorecard rules={currentApplication.policyRules} />
                    <DocSpreadViewer
                      metrics={currentApplication.metrics}
                      extraction={currentApplication.documentExtraction}
                      kyc={currentApplication.kycVerification}
                      declaredIncome={
                        currentApplication.applicant.declaredMonthlyIncome
                      }
                      declaredTaxId={currentApplication.applicant.taxId}
                    />
                  </div>

                  <CounterOfferSim
                    application={currentApplication}
                    onApplySimulatedOffer={(amount, tenure) =>
                      setCounterTerms({ amount, tenure })
                    }
                  />

                  <CreditMemoPanel
                    cam={currentApplication.cam}
                    applicantName={currentApplication.applicant.fullName}
                  />

                  <AgentTrace
                    runKey={`${currentApplication.id}-${currentApplication.updatedAt}`}
                    hitlPaused={currentApplication.status === "MANUAL_REVIEW"}
                    steps={currentApplication.adkExecutionSteps}
                    a2aLatencyMs={
                      currentApplication.a2aTelemetry?.[0]?.latencyMs || 210
                    }
                  />

                  <DecisionBar
                    application={currentApplication}
                    counterTerms={counterTerms}
                    onDecision={handleDecision}
                    isSubmitting={isSubmittingDecision}
                  />
                </>
              )}
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

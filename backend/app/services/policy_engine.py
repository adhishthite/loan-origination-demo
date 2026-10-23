"""Deterministic Credit Policy Engine.

Evaluates rules POL-01 through POL-06 and determines the routing outcome
(AUTO_APPROVE, MANUAL_REVIEW, AUTO_REJECT) with strict knockout precedence
and the Counter-Offer exception handler.
"""

from app.models.domain import (
    ApplicationStatus,
    CounterOffer,
    PolicyRuleResult,
    RuleOutcome,
    UnderwritingMetrics,
)


def evaluate_rule_pol01_age(age: int) -> PolicyRuleResult:
    """POL-01: Applicant Age Rule (23-60 Auto-Approve, 21-22 or 61-65 Manual Review, else Reject)."""
    if 23 <= age <= 60:
        outcome = RuleOutcome.AUTO_APPROVE
        adverse = None
    elif (21 <= age <= 22) or (61 <= age <= 65):
        outcome = RuleOutcome.MANUAL_REVIEW
        adverse = None
    else:
        outcome = RuleOutcome.AUTO_REJECT
        adverse = "ERR_AGE_OUT_OF_BOUNDS"

    return PolicyRuleResult(
        rule_id="POL-01",
        metric_name="applicant_age_years",
        actual_value=f"{age} years",
        outcome=outcome,
        threshold_description="Auto-Approve: 23-60 yrs | Review: 21-22 or 61-65 yrs | Reject: <21 or >65 yrs",
        adverse_action_code=adverse,
    )


def evaluate_rule_pol02_bureau(bureau_score: int) -> PolicyRuleResult:
    """POL-02: Credit Bureau Score Rule (>=750 Auto-Approve, 680-749 Manual Review, <680 Reject)."""
    if bureau_score >= 750:
        outcome = RuleOutcome.AUTO_APPROVE
        adverse = None
    elif 680 <= bureau_score < 750:
        outcome = RuleOutcome.MANUAL_REVIEW
        adverse = None
    else:
        outcome = RuleOutcome.AUTO_REJECT
        adverse = "ERR_BUREAU_SCORE_LOW"

    return PolicyRuleResult(
        rule_id="POL-02",
        metric_name="bureau_score",
        actual_value=str(bureau_score),
        outcome=outcome,
        threshold_description="Auto-Approve: >=750 | Review: 680-749 | Reject: <680",
        adverse_action_code=adverse,
    )


def evaluate_rule_pol03_foir(foir_pct: float) -> PolicyRuleResult:
    """POL-03: Fixed Obligation to Income Ratio (<=45% Auto-Approve, 45.01-55% Manual Review, >55% Reject)."""
    if foir_pct <= 45.0:
        outcome = RuleOutcome.AUTO_APPROVE
        adverse = None
    elif foir_pct <= 55.0:
        outcome = RuleOutcome.MANUAL_REVIEW
        adverse = None
    else:
        outcome = RuleOutcome.AUTO_REJECT
        adverse = "ERR_FOIR_EXCEEDED"

    return PolicyRuleResult(
        rule_id="POL-03",
        metric_name="foir_percentage",
        actual_value=f"{foir_pct:.2f}%",
        outcome=outcome,
        threshold_description="Auto-Approve: <=45.0% | Review: 45.01%-55.0% | Reject: >55.0%",
        adverse_action_code=adverse,
    )


def evaluate_rule_pol04_delinquency(dpd_90: int, dpd_30_60: int) -> PolicyRuleResult:
    """POL-04: Delinquency DPD Rule (0 DPD Auto-Approve, 1 instance of 30-60 DPD Review, else Reject)."""
    if dpd_90 == 0 and dpd_30_60 == 0:
        outcome = RuleOutcome.AUTO_APPROVE
        adverse = None
    elif dpd_90 == 0 and dpd_30_60 == 1:
        outcome = RuleOutcome.MANUAL_REVIEW
        adverse = None
    else:
        outcome = RuleOutcome.AUTO_REJECT
        adverse = "ERR_BUREAU_DELINQUENCY_HIGH"

    return PolicyRuleResult(
        rule_id="POL-04",
        metric_name="dpd_delinquencies",
        actual_value=f"90+ DPD: {dpd_90}, 30-60 DPD: {dpd_30_60}",
        outcome=outcome,
        threshold_description="Auto-Approve: 0 DPD | Review: 0 90+ & 1 30-60 DPD | Reject: >=1 90+ or >1 30-60 DPD",
        adverse_action_code=adverse,
    )


def evaluate_rule_pol05_bounces(bounces_6m: int) -> PolicyRuleResult:
    """POL-05: Inward Check Bounces Rule (0 Auto-Approve, 1 Review, >=2 Reject)."""
    if bounces_6m == 0:
        outcome = RuleOutcome.AUTO_APPROVE
        adverse = None
    elif bounces_6m == 1:
        outcome = RuleOutcome.MANUAL_REVIEW
        adverse = None
    else:
        outcome = RuleOutcome.AUTO_REJECT
        adverse = "ERR_BANK_BOUNCES_HIGH"

    return PolicyRuleResult(
        rule_id="POL-05",
        metric_name="inward_bounces_6m",
        actual_value=f"{bounces_6m} bounces",
        outcome=outcome,
        threshold_description="Auto-Approve: 0 | Review: 1 bounce | Reject: >=2 bounces",
        adverse_action_code=adverse,
    )


def evaluate_rule_pol06_variance(variance_pct: float) -> PolicyRuleResult:
    """POL-06: Income Variance Rule (<=10% Auto-Approve, 10.01-25% Review, >25% Reject)."""
    if variance_pct <= 10.0:
        outcome = RuleOutcome.AUTO_APPROVE
        adverse = None
    elif variance_pct <= 25.0:
        outcome = RuleOutcome.MANUAL_REVIEW
        adverse = None
    else:
        outcome = RuleOutcome.AUTO_REJECT
        adverse = "ERR_INCOME_VARIANCE_CRITICAL"

    return PolicyRuleResult(
        rule_id="POL-06",
        metric_name="income_variance_pct",
        actual_value=f"{variance_pct:.2f}%",
        outcome=outcome,
        threshold_description="Auto-Approve: <=10.0% | Review: 10.01%-25.0% | Reject: >25.0%",
        adverse_action_code=adverse,
    )


def evaluate_credit_policy(
    metrics: UnderwritingMetrics,
    counter_offer: CounterOffer | None = None,
) -> tuple[ApplicationStatus, list[PolicyRuleResult], list[str]]:
    """Evaluates all 6 credit policy rules with strict precedence.

    Returns:
        (routing_status, list_of_rule_results, adverse_action_codes)
    """
    rule_results: list[PolicyRuleResult] = [
        evaluate_rule_pol01_age(metrics.applicant_age_years),
        evaluate_rule_pol02_bureau(metrics.bureau_score),
        evaluate_rule_pol03_foir(metrics.foir_percentage),
        evaluate_rule_pol04_delinquency(metrics.dpd_90_plus_24m, metrics.dpd_30_60_24m),
        evaluate_rule_pol05_bounces(metrics.inward_bounces_6m),
        evaluate_rule_pol06_variance(metrics.income_variance_pct),
    ]

    reject_rules = [r for r in rule_results if r.outcome == RuleOutcome.AUTO_REJECT]
    review_rules = [r for r in rule_results if r.outcome == RuleOutcome.MANUAL_REVIEW]
    adverse_codes = [r.adverse_action_code for r in reject_rules if r.adverse_action_code]

    # Check for the Counter-Offer Exception to POL-03
    # If the ONLY rule rejecting is POL-03 (FOIR > 55%), AND:
    # - Bureau >= 680 (POL-02 not reject)
    # - 0 90+ DPD (POL-04 not reject)
    # - < 2 bounces (POL-05 not reject)
    # - variance <= 25% (POL-06 not reject)
    # - A viable counter-offer exists (projected FOIR <= 48%)
    is_only_foir_reject = (
        len(reject_rules) == 1
        and reject_rules[0].rule_id == "POL-03"
        and metrics.bureau_score >= 680
        and metrics.dpd_90_plus_24m == 0
        and metrics.inward_bounces_6m < 2
        and metrics.income_variance_pct <= 25.0
    )

    if is_only_foir_reject and counter_offer is not None and counter_offer.projected_foir <= 48.0:
        # Route to MANUAL_REVIEW with the recommended Counter-Offer
        return ApplicationStatus.MANUAL_REVIEW, rule_results, []

    if reject_rules:
        return ApplicationStatus.REJECTED, rule_results, adverse_codes

    if review_rules:
        return ApplicationStatus.MANUAL_REVIEW, rule_results, []

    return ApplicationStatus.AUTO_APPROVED, rule_results, []

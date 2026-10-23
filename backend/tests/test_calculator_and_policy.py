"""Unit tests for Financial Calculator and Credit Policy Engine."""

import pytest

from app.models.domain import (
    ApplicationStatus,
    CounterOffer,
    RuleOutcome,
    UnderwritingMetrics,
)
from app.services.financial_calculator import (
    compute_counter_offer,
    compute_foir,
    compute_income_variance_pct,
    compute_interest_rate_tier,
    compute_monthly_emi,
    generate_kfs,
)
from app.services.policy_engine import (
    evaluate_credit_policy,
    evaluate_rule_pol01_age,
    evaluate_rule_pol02_bureau,
    evaluate_rule_pol03_foir,
    evaluate_rule_pol04_delinquency,
    evaluate_rule_pol05_bounces,
    evaluate_rule_pol06_variance,
)


class TestFinancialCalculator:
    def test_interest_rate_tiers(self):
        assert compute_interest_rate_tier(800) == 10.5
        assert compute_interest_rate_tier(780) == 10.5
        assert compute_interest_rate_tier(779) == 11.5
        assert compute_interest_rate_tier(750) == 11.5
        assert compute_interest_rate_tier(749) == 13.5
        assert compute_interest_rate_tier(710) == 13.5
        assert compute_interest_rate_tier(709) == 15.5
        assert compute_interest_rate_tier(680) == 15.5
        assert compute_interest_rate_tier(679) == 18.0
        assert compute_interest_rate_tier(550) == 18.0

    def test_monthly_emi_reducing_balance(self):
        # ₹8,00,000 for 36 months at 10.5% APR
        emi = compute_monthly_emi(800000, 10.5, 36)
        # Expected formula value ~ 25998.40
        assert 25900 <= emi <= 26100

        # ₹15,00,000 for 36 months at 13.5% APR
        emi_15l = compute_monthly_emi(1500000, 13.5, 36)
        # Expected ~ 50900
        assert 50500 <= emi_15l <= 51200

        # Edge cases
        assert compute_monthly_emi(0, 10.5, 36) == 0.0
        assert compute_monthly_emi(100000, 0, 10) == 10000.0

    def test_foir_computation(self):
        # Existing EMI: 18000, Proposed EMI: 50900, Verified Income: 115000
        foir = compute_foir(18000, 50900, 115000)
        expected = ((18000 + 50900) / 115000) * 100
        assert foir == pytest.approx(expected, 0.01)

        # Zero income edge case
        assert compute_foir(5000, 5000, 0) == 999.0

    def test_income_variance(self):
        # Declared 120,000, Verified 115,000 -> 4.17%
        var1 = compute_income_variance_pct(120000, 115000)
        assert var1 == pytest.approx(4.17, 0.01)

        # Declared 200,000, Verified 110,000 -> 45.0%
        var2 = compute_income_variance_pct(200000, 110000)
        assert var2 == pytest.approx(45.0, 0.01)

        # Zero declared edge case
        assert compute_income_variance_pct(0, 100000) == 0.0

    def test_key_fact_statement(self):
        kfs = generate_kfs(amount=1000000, tenure_months=36, apr_pct=10.5)
        assert kfs.sanctioned_amount == 1000000
        assert kfs.tenure_months == 36
        assert kfs.annual_interest_rate_pct == 10.5
        assert kfs.processing_fee_amount == 15000.0  # 1.5% of 10L
        assert kfs.monthly_emi > 0
        assert kfs.total_amount_payable > kfs.sanctioned_amount

    def test_counter_offer_optimization(self):
        # Arjun Malhotra scenario:
        # Requested 15L at 36m, bureau 732 (13.5% APR), existing EMI 18k, verified income 115k
        # FOIR exceeds 45%, optimizer should find viable parameters yielding FOIR <= 48%
        counter = compute_counter_offer(
            requested_amount=1500000,
            requested_tenure=36,
            bureau_score=732,
            existing_emi_outflow=18000,
            verified_monthly_income=115000,
            target_foir_pct=48.0,
        )
        assert counter is not None
        assert counter.projected_foir <= 48.0
        assert counter.recommended_amount <= 1500000
        assert counter.recommended_tenure_months in [36, 48, 60]


class TestPolicyEngine:
    def test_pol01_age(self):
        assert evaluate_rule_pol01_age(30).outcome == RuleOutcome.AUTO_APPROVE
        assert evaluate_rule_pol01_age(22).outcome == RuleOutcome.MANUAL_REVIEW
        assert evaluate_rule_pol01_age(63).outcome == RuleOutcome.MANUAL_REVIEW
        assert evaluate_rule_pol01_age(19).outcome == RuleOutcome.AUTO_REJECT
        assert evaluate_rule_pol01_age(68).outcome == RuleOutcome.AUTO_REJECT

    def test_pol02_bureau(self):
        assert evaluate_rule_pol02_bureau(792).outcome == RuleOutcome.AUTO_APPROVE
        assert evaluate_rule_pol02_bureau(750).outcome == RuleOutcome.AUTO_APPROVE
        assert evaluate_rule_pol02_bureau(732).outcome == RuleOutcome.MANUAL_REVIEW
        assert evaluate_rule_pol02_bureau(680).outcome == RuleOutcome.MANUAL_REVIEW
        assert evaluate_rule_pol02_bureau(615).outcome == RuleOutcome.AUTO_REJECT

    def test_pol03_foir(self):
        assert evaluate_rule_pol03_foir(30.0).outcome == RuleOutcome.AUTO_APPROVE
        assert evaluate_rule_pol03_foir(45.0).outcome == RuleOutcome.AUTO_APPROVE
        assert evaluate_rule_pol03_foir(48.5).outcome == RuleOutcome.MANUAL_REVIEW
        assert evaluate_rule_pol03_foir(55.0).outcome == RuleOutcome.MANUAL_REVIEW
        assert evaluate_rule_pol03_foir(59.9).outcome == RuleOutcome.AUTO_REJECT

    def test_pol04_delinquency(self):
        assert evaluate_rule_pol04_delinquency(0, 0).outcome == RuleOutcome.AUTO_APPROVE
        assert evaluate_rule_pol04_delinquency(0, 1).outcome == RuleOutcome.MANUAL_REVIEW
        assert evaluate_rule_pol04_delinquency(1, 0).outcome == RuleOutcome.AUTO_REJECT
        assert evaluate_rule_pol04_delinquency(0, 2).outcome == RuleOutcome.AUTO_REJECT

    def test_pol05_bounces(self):
        assert evaluate_rule_pol05_bounces(0).outcome == RuleOutcome.AUTO_APPROVE
        assert evaluate_rule_pol05_bounces(1).outcome == RuleOutcome.MANUAL_REVIEW
        assert evaluate_rule_pol05_bounces(2).outcome == RuleOutcome.AUTO_REJECT
        assert evaluate_rule_pol05_bounces(5).outcome == RuleOutcome.AUTO_REJECT

    def test_pol06_variance(self):
        assert evaluate_rule_pol06_variance(5.0).outcome == RuleOutcome.AUTO_APPROVE
        assert evaluate_rule_pol06_variance(10.0).outcome == RuleOutcome.AUTO_APPROVE
        assert evaluate_rule_pol06_variance(15.0).outcome == RuleOutcome.MANUAL_REVIEW
        assert evaluate_rule_pol06_variance(25.0).outcome == RuleOutcome.MANUAL_REVIEW
        assert evaluate_rule_pol06_variance(30.0).outcome == RuleOutcome.AUTO_REJECT

    def test_stp_approval_precedence(self):
        # Clean STP: Priya Raghavan metrics
        clean_metrics = UnderwritingMetrics(
            applicant_age_years=32,
            bureau_score=792,
            declared_monthly_income=145000,
            verified_monthly_income=145000,
            income_variance_pct=0.0,
            average_monthly_balance=85000,
            existing_emi_outflow=0,
            proposed_emi=25998,
            annual_interest_rate_pct=10.5,
            foir_percentage=17.93,
            inward_bounces_6m=0,
            dpd_30_60_24m=0,
            dpd_90_plus_24m=0,
        )
        status, rules, adverse = evaluate_credit_policy(clean_metrics, None)
        assert status == ApplicationStatus.AUTO_APPROVED
        assert len(adverse) == 0
        assert all(r.outcome == RuleOutcome.AUTO_APPROVE for r in rules)

    def test_knockout_precedence(self):
        # Multiple knockouts: Sourav Banerjee metrics
        reject_metrics = UnderwritingMetrics(
            applicant_age_years=41,
            bureau_score=615,  # Knockout POL-02
            declared_monthly_income=200000,
            verified_monthly_income=110000,
            income_variance_pct=45.0,  # Knockout POL-06
            average_monthly_balance=12000,
            existing_emi_outflow=45000,
            proposed_emi=124000,
            annual_interest_rate_pct=18.0,
            foir_percentage=153.6,  # Knockout POL-03
            inward_bounces_6m=3,  # Knockout POL-05
            dpd_30_60_24m=2,  # Knockout POL-04
            dpd_90_plus_24m=2,  # Knockout POL-04
        )
        status, rules, adverse = evaluate_credit_policy(reject_metrics, None)
        assert status == ApplicationStatus.REJECTED
        assert "ERR_BUREAU_SCORE_LOW" in adverse
        assert "ERR_BANK_BOUNCES_HIGH" in adverse
        assert "ERR_INCOME_VARIANCE_CRITICAL" in adverse

    def test_counter_offer_precedence_exception(self):
        # Arjun Malhotra: sole breach is POL-03 (FOIR > 55%), but has viable Counter-Offer
        grey_metrics = UnderwritingMetrics(
            applicant_age_years=35,
            bureau_score=732,  # Manual review (>=680)
            declared_monthly_income=120000,
            verified_monthly_income=115000,
            income_variance_pct=4.17,  # <= 10%
            average_monthly_balance=52000,
            existing_emi_outflow=18000,
            proposed_emi=50900,
            annual_interest_rate_pct=13.5,
            foir_percentage=59.91,  # Sole reject rule
            inward_bounces_6m=0,
            dpd_30_60_24m=0,
            dpd_90_plus_24m=0,
        )
        counter = CounterOffer(
            recommended_amount=1150000,
            recommended_tenure_months=48,
            recommended_emi=31178,
            projected_foir=42.76,
            rationale="Reduced loan and extended tenure",
        )
        status, rules, adverse = evaluate_credit_policy(grey_metrics, counter)
        # Should be routed to MANUAL_REVIEW due to viable counter-offer exception
        assert status == ApplicationStatus.MANUAL_REVIEW
        assert len(adverse) == 0

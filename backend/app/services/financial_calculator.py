"""Deterministic Financial Calculator service.

Pure deterministic Python functions for EMI, FOIR, APR tiering,
income variance, Key Fact Statement (KFS), and Counter-Offer optimization.
"""

from app.models.domain import CounterOffer, KeyFactStatement


def compute_interest_rate_tier(bureau_score: int) -> float:
    """Computes the risk-based APR tier based on Credit Bureau Score.

    - Score >= 780: 10.5% APR
    - Score 750 – 779: 11.5% APR
    - Score 710 – 749: 13.5% APR
    - Score 680 – 709: 15.5% APR
    - Score < 680: 18.0% APR
    """
    if bureau_score >= 780:
        return 10.5
    elif bureau_score >= 750:
        return 11.5
    elif bureau_score >= 710:
        return 13.5
    elif bureau_score >= 680:
        return 15.5
    else:
        return 18.0


def compute_monthly_emi(principal: float, apr_pct: float, tenure_months: int) -> float:
    """Computes reducing-balance monthly EMI using standard amortization formula:

    EMI = P * [r(1 + r)^n] / [(1 + r)^n - 1]
    where r = APR / (12 * 100), n = tenure_months.
    """
    if principal <= 0 or tenure_months <= 0:
        return 0.0

    monthly_rate = apr_pct / (12.0 * 100.0)
    if monthly_rate == 0:
        return round(principal / tenure_months, 2)

    factor = (1.0 + monthly_rate) ** tenure_months
    emi = principal * (monthly_rate * factor) / (factor - 1.0)
    return round(emi, 2)


def compute_foir(
    existing_emi_outflow: float,
    proposed_emi: float,
    verified_monthly_income: float,
) -> float:
    """Computes Fixed Obligation to Income Ratio (FOIR) percentage:

    FOIR (%) = [(Existing EMIs + Proposed EMI) / Verified Monthly Net Income] * 100
    """
    if verified_monthly_income <= 0:
        return 999.0

    total_obligation = existing_emi_outflow + proposed_emi
    foir = (total_obligation / verified_monthly_income) * 100.0
    return round(foir, 2)


def compute_income_variance_pct(declared_income: float, verified_income: float) -> float:
    """Computes percentage variance between declared and verified income:

    Variance (%) = [ |Declared - Verified| / Declared ] * 100
    """
    if declared_income <= 0:
        return 0.0

    diff = abs(declared_income - verified_income)
    variance = (diff / declared_income) * 100.0
    return round(variance, 2)


def generate_kfs(amount: float, tenure_months: int, apr_pct: float) -> KeyFactStatement:
    """Generates the Key Fact Statement (KFS) including processing fee and totals."""
    monthly_emi = compute_monthly_emi(amount, apr_pct, tenure_months)
    processing_fee = round(amount * 0.015, 2)  # 1.5% processing fee
    total_repayment = round(monthly_emi * tenure_months, 2)
    total_interest = round(total_repayment - amount, 2)
    total_payable = round(total_repayment + processing_fee, 2)

    return KeyFactStatement(
        sanctioned_amount=amount,
        tenure_months=tenure_months,
        annual_interest_rate_pct=apr_pct,
        processing_fee_amount=processing_fee,
        effective_apr_pct=apr_pct,
        monthly_emi=monthly_emi,
        total_interest_payable=total_interest,
        total_amount_payable=total_payable,
    )


def compute_counter_offer(
    requested_amount: float,
    requested_tenure: int,
    bureau_score: int,
    existing_emi_outflow: float,
    verified_monthly_income: float,
    target_foir_pct: float = 48.0,
) -> CounterOffer | None:
    """Calculates an optimized Counter-Offer when FOIR exceeds policy threshold.

    Iterates over extended tenures [requested_tenure, 48, 60] and decrements
    principal in steps of ₹25,000 until projected FOIR <= target_foir_pct.
    Prioritizes maintaining as much principal as possible while minimizing tenure extension.
    """
    if verified_monthly_income <= 0:
        return None

    apr_pct = compute_interest_rate_tier(bureau_score)
    current_emi = compute_monthly_emi(requested_amount, apr_pct, requested_tenure)
    current_foir = compute_foir(existing_emi_outflow, current_emi, verified_monthly_income)

    if current_foir <= 45.0:
        return None  # No counter-offer needed, already within clean limits

    tenure_candidates = sorted(list({requested_tenure, 48, 60}))
    tenure_candidates = [t for t in tenure_candidates if t >= requested_tenure]

    best_candidate: dict | None = None

    # Step down principal from requested_amount in ₹25,000 steps down to ₹100,000
    for tenure in tenure_candidates:
        # Start principal from requested_amount down to 100k
        p = requested_amount
        while p >= 100_000:
            emi = compute_monthly_emi(p, apr_pct, tenure)
            proj_foir = compute_foir(existing_emi_outflow, emi, verified_monthly_income)

            if proj_foir <= target_foir_pct:
                # We found a candidate that meets target FOIR
                if best_candidate is None:
                    best_candidate = {
                        "amount": p,
                        "tenure": tenure,
                        "emi": emi,
                        "foir": proj_foir,
                    }
                elif p > best_candidate["amount"]:
                    best_candidate = {
                        "amount": p,
                        "tenure": tenure,
                        "emi": emi,
                        "foir": proj_foir,
                    }
                elif p == best_candidate["amount"] and tenure < best_candidate["tenure"]:
                    best_candidate = {
                        "amount": p,
                        "tenure": tenure,
                        "emi": emi,
                        "foir": proj_foir,
                    }
                break  # For this tenure, no need to go lower in principal
            p -= 25_000

    if best_candidate:
        rationale = (
            f"Requested loan of ₹{requested_amount:,.0f} at {requested_tenure} months resulted in "
            f"a FOIR of {current_foir:.2f}% (exceeding policy cap of 45%). "
            f"Optimized counter-offer of ₹{best_candidate['amount']:,.0f} at {best_candidate['tenure']} months "
            f"yields a sustainable projected FOIR of {best_candidate['foir']:.2f}%."
        )
        return CounterOffer(
            recommended_amount=float(best_candidate["amount"]),
            recommended_tenure_months=int(best_candidate["tenure"]),
            recommended_emi=float(best_candidate["emi"]),
            projected_foir=float(best_candidate["foir"]),
            rationale=rationale,
        )

    return None

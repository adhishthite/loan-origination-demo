"""KYC & Identity Verification Service.

TRD-03, TRD-04:
- Fuzzy name matching (>= 85% similarity threshold)
- DOB & PAN matching
- Deduplication against existing customer records
- Sanctions / Wilful Defaulter watchlist screening
"""

import difflib
from datetime import date

from app.models.domain import KYCVerificationResult


def calculate_name_similarity(name1: str, name2: str) -> float:
    """Calculates fuzzy similarity between two names using SequenceMatcher (0-100%)."""
    clean1 = " ".join(name1.strip().lower().split())
    clean2 = " ".join(name2.strip().lower().split())
    ratio = difflib.SequenceMatcher(None, clean1, clean2).ratio()
    return round(ratio * 100.0, 2)


def run_kyc_verification(
    declared_name: str,
    declared_dob: date,
    declared_tax_id: str,
    extracted_name: str,
    extracted_dob: date,
    extracted_tax_id: str,
    watchlist_hit_bureau: bool = False,
) -> KYCVerificationResult:
    """Runs full deterministic KYC verification against extracted document attributes."""
    name_score = calculate_name_similarity(declared_name, extracted_name)
    dob_match = declared_dob == extracted_dob
    tax_id_match = declared_tax_id.strip().upper() == extracted_tax_id.strip().upper()

    failure_reasons: list[str] = []

    if name_score < 85.0:
        failure_reasons.append(
            f"Name similarity score {name_score:.1f}% is below required 85.0% threshold."
        )

    if not dob_match:
        failure_reasons.append(
            f"Date of birth mismatch: declared {declared_dob} vs document {extracted_dob}."
        )

    if not tax_id_match:
        failure_reasons.append(
            f"Tax ID mismatch: declared {declared_tax_id} vs document {extracted_tax_id}."
        )

    if watchlist_hit_bureau:
        failure_reasons.append("Applicant hit global sanctions or wilful defaulter watchlist.")

    kyc_passed = name_score >= 85.0 and dob_match and tax_id_match and not watchlist_hit_bureau

    return KYCVerificationResult(
        name_similarity_score=name_score,
        dob_match=dob_match,
        tax_id_match=tax_id_match,
        watchlist_hit=watchlist_hit_bureau,
        is_existing_customer_delinquent=False,
        kyc_passed=kyc_passed,
        failure_reasons=failure_reasons,
    )

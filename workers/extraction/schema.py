"""Pydantic models describing the structured extraction output.

Every field the LLM extracts is paired with a confidence score (0-1), matching
the `PolicyField` table in apps/api/prisma/schema.prisma (fieldName, value,
confidenceScore, userConfirmed). This is what powers the Review screen and the
"70% of fields accepted without edits" product metric.
"""

from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, Field


class ScoredField(BaseModel):
    """A single extracted value plus the model's confidence in it."""

    value: Optional[str] = None
    confidence: float = Field(ge=0.0, le=1.0, default=0.0)


class BeneficiaryExtraction(BaseModel):
    name: ScoredField
    relationship: ScoredField
    percentage: ScoredField


class RiderExtraction(BaseModel):
    name: ScoredField
    description: ScoredField


class PolicyExtraction(BaseModel):
    """Top-level JSON schema the LLM must return for a single policy document.

    Field names here intentionally mirror apps/api/prisma/schema.prisma so the
    worker can write rows into PolicyField without a translation layer.
    """

    carrier: ScoredField
    policy_type: ScoredField  # "LIFE" | "ANNUITY" | "HEALTH"
    policy_number: ScoredField
    coverage_amount: ScoredField
    premium: ScoredField
    renewal_date: ScoredField  # ISO 8601 date string
    surrender_date: ScoredField  # ISO 8601 date string
    beneficiaries: list[BeneficiaryExtraction] = []
    riders: list[RiderExtraction] = []

    def to_field_rows(self) -> list[dict]:
        """Flatten into (fieldName, value, confidenceScore) rows for the DB."""
        scalar_fields = {
            "carrier": self.carrier,
            "policy_type": self.policy_type,
            "policy_number": self.policy_number,
            "coverage_amount": self.coverage_amount,
            "premium": self.premium,
            "renewal_date": self.renewal_date,
            "surrender_date": self.surrender_date,
        }
        rows = []
        for field_name, scored in scalar_fields.items():
            if scored.value is None:
                continue
            rows.append(
                {
                    "fieldName": field_name,
                    "value": scored.value,
                    "confidenceScore": scored.confidence,
                    "userConfirmed": False,
                }
            )
        return rows


class ExtractionJob(BaseModel):
    """Matches apps/api/src/services/extraction.ts `ExtractionJob` shape."""

    policyId: str
    s3Key: str
    documentType: str  # "LIFE" | "ANNUITY" | "HEALTH"

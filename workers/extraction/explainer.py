"""Plain-language, per-policy explainer generation.

Grounded ONLY in the extracted/OCR'd document text — never in outside
knowledge about "good" policies, carriers, or market comparisons. Must refuse
to produce buy/switch/surrender recommendations (same constant as the
extraction prompt).

OUT OF SCOPE for this MVP (explicitly excluded, do not build here):
- No recommendation engine.
- No carrier integrations / live quoting.
- No payment processing.
"""

from __future__ import annotations

import os

from openai import OpenAI

from prompts.extraction_prompt import INFORMATIONAL_ONLY_SYSTEM_INSTRUCTION

DISCLAIMER = (
    "This summary is generated for informational purposes only, based solely "
    "on the document you uploaded. It is not financial, legal, or tax advice, "
    "and it is not a recommendation to buy, switch, replace, or surrender any "
    "policy. Always confirm details with your policy documents or carrier."
)

_client: OpenAI | None = None


def _get_client() -> OpenAI:
    global _client
    if _client is None:
        # TODO(real-llm): confirm OPENAI_API_KEY / LLM_MODEL are set in every
        # environment before removing this lazy-init guard.
        _client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))
    return _client


def build_explainer_prompt(document_text: str) -> str:
    return f"""{INFORMATIONAL_ONLY_SYSTEM_INSTRUCTION}

TASK: Write a short (4-8 sentence), plain-language explanation of what this
insurance policy document says: what type of policy it is, the coverage
amount, the premium, who the beneficiaries are, and any notable dates
(renewal/surrender). Use everyday language, avoid jargon, and define any
insurance term you do have to use.

Ground your explanation ONLY in the document text below. Do not add
information that is not present in it, and do not compare this policy to any
other product.

DOCUMENT TEXT:
\"\"\"
{document_text}
\"\"\"
"""


def generate_explainer(document_text: str) -> str:
    """Calls the LLM and returns the explainer text with the disclaimer
    appended. Refusal behavior for out-of-bounds requests is enforced by the
    system instruction baked into the prompt itself, not by post-hoc filtering
    here (though a stricter deployment could add output scanning as
    defense-in-depth).
    """
    client = _get_client()
    model = os.environ.get("LLM_MODEL", "gpt-4o-mini")

    # TODO(real-llm): wrap with retry/backoff and token-length guards for very
    # long OCR'd documents before production use.
    response = client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": INFORMATIONAL_ONLY_SYSTEM_INSTRUCTION},
            {"role": "user", "content": build_explainer_prompt(document_text)},
        ],
        temperature=0.2,
    )

    summary = response.choices[0].message.content or ""
    return f"{summary.strip()}\n\n{DISCLAIMER}"

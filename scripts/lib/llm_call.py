"""LLM call wrapper — provider-agnostic AI invocation.

Codex provider: shells out to `codex exec` (subprocess) per user decision (2026-04-25):
the cron-time AI calls go through the sanctioned Codex CLI binary, not the openai SDK.
This matches the PRD constraint "사전 승인 AI CLI 채널 only".

Anthropic/Gemini providers: use respective Python SDKs (no equivalent CLI exec mode).
"""
from __future__ import annotations

import os
import shutil
import subprocess
from typing import Literal


ProviderName = Literal["codex", "anthropic", "gemini"]


class LLMClient:
    def __init__(self, provider: ProviderName = "codex", model: str | None = None) -> None:
        self.provider = provider
        self.model = model
        self._validate()

    def _validate(self) -> None:
        if self.provider == "codex":
            if shutil.which("codex") is None:
                raise ValueError(
                    "codex CLI binary not found in PATH. Install Codex CLI or pick another provider."
                )
        elif self.provider == "anthropic":
            if not os.environ.get("ANTHROPIC_API_KEY"):
                raise ValueError("ANTHROPIC_API_KEY not set.")
        elif self.provider == "gemini":
            if not os.environ.get("GEMINI_API_KEY"):
                raise ValueError("GEMINI_API_KEY not set.")
        else:
            raise ValueError(f"Unknown provider: {self.provider}")

    def call(self, system: str, user: str) -> str:
        """Send a prompt to the configured provider. Returns response text as a string."""
        if self.provider == "codex":
            return self._call_codex(system, user)
        if self.provider == "anthropic":
            return self._call_anthropic(system, user)
        if self.provider == "gemini":
            return self._call_gemini(system, user)
        raise RuntimeError(f"Unreachable: {self.provider}")

    def _call_codex(self, system: str, user: str) -> str:
        prompt = (
            f"SYSTEM:\n{system}\n\n"
            f"USER:\n{user}\n\n"
            "Respond with the requested format only. No preamble."
        )
        cmd = ["codex", "exec"]
        if self.model:
            cmd += ["--model", self.model]
        cmd.append(prompt)
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            encoding="utf-8",
            timeout=120,
            check=False,
        )
        if result.returncode != 0:
            raise RuntimeError(
                f"codex exec failed (exit {result.returncode}): {result.stderr.strip()}"
            )
        return result.stdout.strip()

    def _call_anthropic(self, system: str, user: str) -> str:
        import anthropic

        client = anthropic.Anthropic()
        msg = client.messages.create(
            model=self.model or "claude-sonnet-4-6",
            max_tokens=4096,
            system=system,
            messages=[{"role": "user", "content": user}],
        )
        # Concatenate text blocks from response content
        texts = [b.text for b in msg.content if getattr(b, "type", None) == "text"]
        return "".join(texts)

    def _call_gemini(self, system: str, user: str) -> str:
        import google.generativeai as genai

        genai.configure(api_key=os.environ["GEMINI_API_KEY"])
        m = genai.GenerativeModel(
            self.model or "gemini-2.0-flash",
            system_instruction=system,
        )
        resp = m.generate_content(user)
        return resp.text

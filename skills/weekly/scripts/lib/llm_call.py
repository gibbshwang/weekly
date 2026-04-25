"""LLM call wrapper — subprocess-only AI invocation.

Per user constraint (2026-04-25): external AI APIs are blocked by security
policy. Only Codex CLI and Gemini CLI subprocess invocations are allowed.
This matches the PRD constraint "사전 승인 AI CLI 채널 only".
"""
from __future__ import annotations

import shutil
import subprocess
from typing import Literal


ProviderName = Literal["codex", "gemini"]


class LLMClient:
    def __init__(self, provider: ProviderName = "codex", model: str | None = None) -> None:
        if provider not in ("codex", "gemini"):
            raise ValueError(
                f"Unknown provider: {provider!r}. Must be 'codex' or 'gemini'."
            )
        self.provider = provider
        self.model = model
        self._validate_binary()

    def _validate_binary(self) -> None:
        binary = "codex" if self.provider == "codex" else "gemini"
        if shutil.which(binary) is None:
            raise ValueError(
                f"{binary} CLI not found in PATH. Install it or pick the other provider."
            )

    def call(self, system: str, user: str) -> str:
        """Send a prompt to the configured provider. Returns response text as a string."""
        if self.provider == "codex":
            return self._call_codex(system, user)
        return self._call_gemini(system, user)

    def _call_codex(self, system: str, user: str) -> str:
        prompt = self._merge_prompt(system, user)
        cmd = ["codex", "exec"]
        if self.model:
            cmd += ["--model", self.model]
        cmd.append(prompt)
        return self._run_cli(cmd, label="codex exec")

    def _call_gemini(self, system: str, user: str) -> str:
        # gemini CLI 0.39.x: `gemini -p "<prompt>"` for non-interactive (headless) mode.
        # `-m/--model` selects the model. Verified via `gemini --help` (2026-04-25).
        prompt = self._merge_prompt(system, user)
        cmd = ["gemini"]
        if self.model:
            cmd += ["-m", self.model]
        cmd += ["-p", prompt]
        return self._run_cli(cmd, label="gemini")

    @staticmethod
    def _merge_prompt(system: str, user: str) -> str:
        return (
            f"SYSTEM:\n{system}\n\n"
            f"USER:\n{user}\n\n"
            "Respond with the requested format only. No preamble."
        )

    @staticmethod
    def _run_cli(cmd: list[str], label: str) -> str:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            encoding="utf-8",
            timeout=180,
            check=False,
        )
        if result.returncode != 0:
            raise RuntimeError(
                f"{label} failed (exit {result.returncode}): {result.stderr.strip()}"
            )
        return result.stdout.strip()

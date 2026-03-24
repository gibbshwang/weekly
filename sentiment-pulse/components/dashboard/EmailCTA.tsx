"use client";

import { useState } from "react";

export default function EmailCTA() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      setSubmitted(true);
    }
  };

  return (
    <div className="bg-gray-900 rounded-xl p-4 md:p-5 border border-gray-800 flex flex-col sm:flex-row sm:items-center gap-4">
      <div className="flex-1 min-w-0">
        <h2 className="text-sm font-bold text-white">레짐 변화 알림</h2>
        <p className="text-xs text-gray-500 mt-0.5">
          점수가 크게 변화할 때 이메일로 알려드립니다 · 무료
        </p>
      </div>

      {submitted ? (
        <div className="flex items-center gap-2 px-3 py-2 bg-green-500/10 border border-green-500/30 rounded-lg">
          <span className="text-green-400 text-sm">✓</span>
          <p className="text-xs text-green-400 font-medium">구독 완료 — {email}</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex gap-2 flex-shrink-0">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="이메일 주소"
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 transition-colors w-48"
            required
          />
          <button
            type="submit"
            className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-semibold rounded-lg transition-colors text-sm whitespace-nowrap"
          >
            알림 받기
          </button>
        </form>
      )}
    </div>
  );
}

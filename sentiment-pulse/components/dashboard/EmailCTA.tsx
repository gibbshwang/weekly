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
    <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl p-4 md:p-6 border border-gray-700 flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-bold text-white">레짐 변화 알림 받기</h2>
        <p className="text-sm text-gray-400 mt-1">
          점수가 크게 변화할 때 이메일로 알려드립니다
        </p>
      </div>

      {submitted ? (
        <div className="flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
          <span className="text-green-400 text-lg">✓</span>
          <div>
            <p className="text-sm font-semibold text-green-400">구독 완료!</p>
            <p className="text-xs text-gray-500 mt-0.5">레짐 변화 시 {email}로 알림을 보내드립니다.</p>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="이메일 주소를 입력하세요"
            className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 transition-colors"
            required
          />
          <button
            type="submit"
            className="px-5 py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-semibold rounded-lg transition-colors text-sm whitespace-nowrap"
          >
            알림 받기
          </button>
        </form>
      )}

      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-500/10 border border-green-500/20 rounded-full text-xs text-green-400 font-medium">
          ✓ 무료
        </span>
        <span className="text-xs text-gray-500">주간 리포트 포함 · 스팸 없음 · 언제든 취소 가능</span>
      </div>
    </div>
  );
}

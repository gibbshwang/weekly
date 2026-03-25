"use client";

import { useState } from "react";

const freePlanFeatures = [
  { label: "일간 심리 지수 (4개 지표 기반)", included: true },
  { label: "레짐 해석 (공포/탐욕 등)", included: true },
  { label: "30일 히스토리 차트", included: true },
  { label: "자산별 함의 (기본)", included: true },
  { label: "활용 프레임 (기본)", included: true },
  { label: "이메일 알림 (레짐 변화 시)", included: true },
  { label: "7대 지표 전체 (Phase 1.5/2)", included: false },
  { label: "90일/전체 히스토리", included: false },
  { label: "투자 성향별 맞춤 프레임", included: false },
  { label: "주간 심층 리포트", included: false },
  { label: "유사 사례 전체 데이터", included: false },
];

const proPlanFeatures = [
  { label: "일간 심리 지수 (4개 지표 기반)", included: true },
  { label: "레짐 해석 (공포/탐욕 등)", included: true },
  { label: "30일 히스토리 차트", included: true },
  { label: "자산별 함의 (기본)", included: true },
  { label: "활용 프레임 (기본)", included: true },
  { label: "이메일 알림 (레짐 변화 시)", included: true },
  { label: "7대 지표 전체 (Phase 1.5/2)", included: true },
  { label: "90일/전체 히스토리", included: true },
  { label: "투자 성향별 맞춤 프레임", included: true },
  { label: "주간 심층 리포트", included: true },
  { label: "유사 사례 전체 데이터", included: true },
];

const faqs = [
  {
    q: "무료 플랜에서 PRO로 언제든 업그레이드할 수 있나요?",
    a: "네, 언제든지 업그레이드 가능합니다. 업그레이드 즉시 모든 PRO 기능이 활성화됩니다.",
  },
  {
    q: "구독 취소는 어떻게 하나요?",
    a: "언제든지 취소할 수 있습니다. 취소 후에는 현재 결제 기간 종료일까지 PRO 기능을 사용할 수 있습니다.",
  },
  {
    q: "연간 플랜은 어떤 혜택이 있나요?",
    a: "연간 플랜은 월간 플랜 대비 약 33% 할인된 가격입니다. (₩39,000/년 = ₩3,250/월 상당)",
  },
  {
    q: "K-FGI는 투자 권유 서비스인가요?",
    a: "아닙니다. K-FGI는 시장 심리 정보를 제공하는 정보 서비스입니다. 투자 결정은 본인의 판단과 책임 하에 이루어져야 합니다.",
  },
  {
    q: "결제 수단은 무엇을 지원하나요?",
    a: "Toss Payments 연동 준비 중입니다. 신용카드, 카카오페이, 네이버페이 등을 지원할 예정입니다.",
  },
];

export default function SubscribePage() {
  const [billing, setBilling] = useState<"monthly" | "yearly">("monthly");
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const monthlyPrice = 4900;
  const yearlyPrice = 39000;
  const yearlyMonthly = Math.round(yearlyPrice / 12);
  const discount = Math.round((1 - yearlyMonthly / monthlyPrice) * 100);

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 flex flex-col gap-8">
      <div className="text-center">
        <h1 className="text-3xl font-black text-white">K-FGI PRO</h1>
        <p className="text-gray-400 mt-2">시장 심리를 더 깊이, 더 정확하게</p>
      </div>

      {/* Billing toggle */}
      <div className="flex justify-center">
        <div className="flex items-center gap-1 bg-gray-900 rounded-xl p-1 border border-gray-800">
          <button
            onClick={() => setBilling("monthly")}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              billing === "monthly" ? "bg-gray-700 text-white" : "text-gray-500"
            }`}
          >
            월간
          </button>
          <button
            onClick={() => setBilling("yearly")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              billing === "yearly" ? "bg-gray-700 text-white" : "text-gray-500"
            }`}
          >
            연간
            <span className="text-xs bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded-full border border-green-500/30">
              {discount}% 할인
            </span>
          </button>
        </div>
      </div>

      {/* Pricing cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Free */}
        <div className="bg-gray-900 rounded-xl p-6 border border-gray-800 flex flex-col gap-5">
          <div>
            <h2 className="text-lg font-bold text-white">무료</h2>
            <div className="mt-2">
              <span className="text-3xl font-black text-white">₩0</span>
              <span className="text-gray-500 text-sm ml-2">/월</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">이메일 없이 즉시 이용</p>
          </div>
          <div className="flex flex-col gap-2.5 flex-1">
            {freePlanFeatures.map((f, i) => (
              <div key={i} className="flex items-center gap-2.5">
                <span className={f.included ? "text-green-400" : "text-gray-700"}>
                  {f.included ? "✓" : "✗"}
                </span>
                <span className={`text-sm ${f.included ? "text-gray-300" : "text-gray-600"}`}>
                  {f.label}
                </span>
              </div>
            ))}
          </div>
          <button className="w-full py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold rounded-lg transition-colors text-sm border border-gray-700">
            현재 플랜
          </button>
        </div>

        {/* Pro */}
        <div className="bg-gray-900 rounded-xl p-6 border-2 border-amber-600/60 flex flex-col gap-5 relative overflow-hidden">
          {/* Popular badge */}
          <div className="absolute top-0 right-0 bg-amber-600 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
            추천
          </div>
          <div>
            <h2 className="text-lg font-bold text-amber-400">PRO</h2>
            <div className="mt-2">
              {billing === "monthly" ? (
                <>
                  <span className="text-3xl font-black text-white">₩{monthlyPrice.toLocaleString()}</span>
                  <span className="text-gray-500 text-sm ml-2">/월</span>
                </>
              ) : (
                <>
                  <span className="text-3xl font-black text-white">₩{yearlyMonthly.toLocaleString()}</span>
                  <span className="text-gray-500 text-sm ml-2">/월</span>
                  <div className="text-xs text-gray-500 mt-1">
                    연간 ₩{yearlyPrice.toLocaleString()} 청구 (₩{(monthlyPrice * 12).toLocaleString()} 대비 절약)
                  </div>
                </>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-2.5 flex-1">
            {proPlanFeatures.map((f, i) => (
              <div key={i} className="flex items-center gap-2.5">
                <span className={f.included ? "text-amber-400" : "text-gray-700"}>
                  {f.included ? "✓" : "✗"}
                </span>
                <span className={`text-sm ${f.included ? "text-gray-200" : "text-gray-600"}`}>
                  {f.label}
                </span>
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-2">
            <button className="w-full py-3 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg transition-colors text-sm">
              PRO 시작하기 (Toss Payments 준비 중)
            </button>
            <p className="text-xs text-gray-500 text-center">언제든 취소 가능 · 자동 갱신</p>
          </div>
        </div>
      </div>

      {/* FAQ */}
      <div className="flex flex-col gap-4">
        <h2 className="text-xl font-bold text-white">자주 묻는 질문</h2>
        <div className="flex flex-col gap-2">
          {faqs.map((faq, i) => (
            <div
              key={i}
              className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden"
            >
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full flex items-center justify-between p-4 text-left"
              >
                <span className="text-sm font-semibold text-white pr-4">{faq.q}</span>
                <span className="text-gray-500 flex-shrink-0 text-lg">
                  {openFaq === i ? "−" : "+"}
                </span>
              </button>
              {openFaq === i && (
                <div className="px-4 pb-4 border-t border-gray-800">
                  <p className="text-sm text-gray-400 leading-relaxed pt-3">{faq.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Disclaimer */}
      <div className="p-4 bg-gray-800/30 rounded-xl border border-gray-800">
        <p className="text-xs text-gray-600 leading-relaxed text-center">
          K-FGI PRO는 투자 자문 서비스가 아닙니다. 모든 정보는 교육 및 정보 제공 목적이며,
          투자 결정에 대한 책임은 전적으로 사용자 본인에게 있습니다.
        </p>
      </div>
    </div>
  );
}

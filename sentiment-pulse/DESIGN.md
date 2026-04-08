# Design System — K-FGI (Korean Fear & Greed Index)

## Product Context
- **What this is:** 한국 시장 공포/탐욕 지수(K-FGI) 대시보드. 7개 시그널 기반 합성 점수와 역사적 타이밍 분석을 제공하는 역발상 투자 의사결정 도구.
- **Who it's for:** 30대 한국 직장인 투자자. 시간 부족, 규칙 기반 투자 선호.
- **Space/industry:** 한국 금융/핀테크, 시장 심리 분석
- **Project type:** APP UI (data-dense financial dashboard)

## Aesthetic Direction
- **Direction:** Industrial/Utilitarian
- **Decoration level:** Minimal
- **Mood:** Bloomberg Terminal의 전문성 + 토스의 단순함. 기능 우선, 데이터 밀도 높음, 차분한 표면. 이건 쇼피스가 아니라 의사결정 도구.
- **Reference sites:** feargreedmeter.com, alternative.me/crypto, tradingview.com

## Typography
- **Display/Hero:** Satoshi (Latin) + Pretendard (Korean) — 기하학적, 현대적, 자신감 있는 느낌. 헤드라인과 행동 가이드 텍스트에 사용.
- **Body:** Pretendard — 토스가 선택한 폰트. 한글+라틴 모두 우수한 가독성. 설명 텍스트, 해석 텍스트에 사용.
- **UI/Labels:** Pretendard (same as body)
- **Data/Tables:** Geist — tabular-nums 지원, 숫자 정렬에 최적화. 점수, 수익률, 테이블 데이터에 사용.
- **Code:** Geist Mono
- **Loading:**
  - Pretendard: `https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css`
  - Satoshi: self-hosted or `https://cdn.jsdelivr.net/gh/nicholasgasior/gfonts@main/dist/satoshi/Satoshi-Variable.woff2`
  - Geist: `https://cdn.jsdelivr.net/npm/geist@1.3.1/dist/fonts/geist-sans/`
  - Geist Mono: Google Fonts `family=Geist+Mono:wght@400;500`
- **Scale:**
  - Display XL: 40px / 700 / -0.02em (page title)
  - Display L: 32px / 700 / -0.02em (section hero)
  - Display M: 24px / 600 / -0.01em (section heading)
  - Display S: 22px / 600 (action guide title)
  - Body L: 17px / 400 (subtitle)
  - Body M: 15px / 400 / 1.6 line-height (paragraph)
  - Body S: 14px / 400 (detail text)
  - Caption: 13px / 500 (labels, table cells)
  - Micro: 12px / 500 (signal names, timestamps)
  - Mono Label: 11px / 400 / 0.08em tracking / uppercase (section labels)
  - Data XL: 48px / 700 / tabular-nums (hero score)
  - Data L: 28px / 600 / tabular-nums (stat numbers)
  - Data M: 20px / 600 / tabular-nums (signal values)
  - Data S: 13px / 400 / tabular-nums (table data)

## Color
- **Approach:** Restrained — regime colors are the primary accent system. Everything else neutral.
- **Dark mode (default):**
  - Background: `#0a0a0f` — 진한 네이비, 순수 검정 아님. 더 정교하고 눈의 피로도 적음.
  - Surface: `#141419` — 카드/섹션 배경
  - Surface Hover: `#1a1a21`
  - Border: `#1e1e26`
  - Border Subtle: `#16161d`
  - Text Primary: `#e8e8ed`
  - Text Secondary: `#8b8b96`
  - Text Muted: `#4a4a54`
- **Light mode:**
  - Background: `#f4f4f7`
  - Surface: `#ffffff`
  - Surface Hover: `#f0f0f3`
  - Border: `#e0e0e6`
  - Border Subtle: `#eaeaee`
  - Text Primary: `#111116`
  - Text Secondary: `#6b6b76`
  - Text Muted: `#a0a0aa`
- **Regime colors:**
  - Extreme Fear: `#dc2626` (dark) / `#b91c1c` (light)
  - Fear: `#ef4444` (dark) / `#dc2626` (light)
  - Neutral: `#6b7280`
  - Greed: `#22c55e` (dark) / `#16a34a` (light)
  - Extreme Greed: `#d97706` (dark) / `#b45309` (light)
- **Semantic:**
  - Success: `#22c55e` — 매수 신호, 양의 수익률
  - Warning: `#d97706` — stale data, 주의 상태
  - Error: `#dc2626` — 데이터 수집 실패, 오류
  - Info: `#3b82f6` — 유사 사례 발견, 일반 알림
- **Regime color usage:**
  - Regime label badge: `rgba(color, 0.15)` background + solid text
  - Alert backgrounds: `rgba(color, 0.1)` + `rgba(color, 0.2)` border
  - Signal bar fills: solid color
  - Score number: solid regime color
  - Never use regime colors for structural elements (borders, backgrounds)
- **CSS Custom Properties:** All colors defined as CSS custom properties on `:root` and `[data-theme="light"]`. Use `var(--color-name)` everywhere. Never hardcode hex values in components.

## Spacing
- **Base unit:** 4px
- **Density:** Compact (financial dashboard needs density)
- **Scale:** 2xs(2px) xs(4px) sm(8px) md(16px) lg(24px) xl(32px) 2xl(48px) 3xl(64px)
- **Usage patterns:**
  - Card padding: 20px (lg + xs)
  - Section gap: 24px (lg)
  - Signal card padding: 14px
  - Table cell padding: 10px 12px
  - Button padding: 8px 16px
  - Alert padding: 12px 16px
  - Gap between signal cards: 8px (sm)
  - Gap between sections: 24px (lg)

## Layout
- **Approach:** Grid-disciplined
- **Grid:**
  - Desktop (1024px+): 12-column, max-width 1280px
  - Tablet (768-1023px): 8-column
  - Mobile (<768px): 4-column, single content stack
- **Max content width:** 1280px
- **Border radius:**
  - sm: 4px — regime labels, code blocks, small badges
  - md: 8px — cards, inputs, buttons, alerts, tabs
  - lg: 12px — main sections, dashboard container
  - full: 9999px (not used in this product)
- **Dashboard hierarchy:**
  - TIER 1 (Hero): Action guide (primary, left) + Score gauge (secondary, right 200px)
  - TIER 2 (Analysis): Timing table (tabbed buy/sell), signal grid (4-column)
  - TIER 3 (Reference): Collapsible methodology, disclaimer
- **Mobile layout:**
  - Hero: action guide stacks above score gauge
  - Signal grid: 2-column
  - Tables: horizontal scroll

## Motion
- **Approach:** Minimal-functional
- **Easing:** enter(ease-out) exit(ease-in) move(ease-in-out)
- **Duration:** micro(75ms) short(150ms) medium(300ms)
- **Patterns:**
  - Score gauge: animated needle on load (medium, ease-out)
  - Tab switching: background slide (short, ease-out)
  - Skeleton loading: pulse animation for loading states
  - Hover transitions: background color change (micro, ease-out)
  - Collapsible sections: height + opacity (medium, ease-in-out)
  - No scroll-driven animations
  - No entrance animations on page load (except gauge)
  - No decorative motion

## Anti-patterns (never use)
- Purple/violet gradients
- 3-column feature grid with icons in colored circles
- Centered everything
- Uniform bubbly border-radius
- Decorative blobs or wavy SVG dividers
- Emoji as design elements
- Colored left-border on cards
- Generic hero copy
- Cookie-cutter section rhythm

## Decisions Log
| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-03-28 | Initial design system created | Created by /design-consultation based on competitive research (feargreedmeter, alternative.me, TradingView) + design review findings |
| 2026-03-28 | Satoshi + Pretendard + Geist font stack | Satoshi for modern Latin display, Pretendard as Korean fintech standard (Toss), Geist for tabular number alignment |
| 2026-03-28 | Navy background (#0a0a0f) over pure black | Reduces eye strain for extended dashboard use, more refined feel |
| 2026-03-28 | Regime colors as only accent system | Restrained approach: color is meaningful (regime state), not decorative |
| 2026-03-28 | 4px base, compact density | Financial dashboards need data density. Spacious layouts waste screen real estate for data-heavy products |
| 2026-03-28 | Action guide as primary Hero, score as secondary | K-FGI's value is the behavior recommendation, not the number. Time-poor investors need "what to do" first |

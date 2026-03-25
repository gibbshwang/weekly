# CLAUDE.md — sentiment-pulse implementation notes

## Current product direction

This project is no longer a US-market Fear & Greed interpretation app.
It is now a **Korea Fear & Greed Index (K-FGI)** product.

Use the 7 conceptual buckets from the classic Fear & Greed framework,
but implement them with **Korean market proxies**.

### The 7 K-FGI signals
1. KOSPI momentum vs 125DMA
2. 52-week highs vs lows (KOSPI + KOSDAQ)
3. Market breadth (advancers vs decliners)
4. KOSPI200 put/call ratio
5. Safe haven demand (KOSPI vs government bond relative performance)
6. VKOSPI
7. Credit spread (corporate bond vs government bond)

## Product goal

Do not build a simple sentiment widget.
Build an **analysis dashboard** that helps users understand:
- current Korean market regime
- which local signals are driving fear/greed today
- how assets behaved after similar historical fear/greed setups

## Core UX structure

The dashboard should prioritize:
1. Hero summary with current K-FGI score/regime
2. 7 signals breakdown
3. Buy timing analysis
4. Sell timing analysis
5. Cross-asset heatmap
6. Historical analog cases
7. Methodology + disclaimer

## Tone and product constraints

- Do not frame output as direct investment advice.
- Prefer language like:
  - “Historically…”
  - “In similar past regimes…”
  - “This setup has been associated with…”
- Avoid clone-like wording that makes the product look like a CNN Fear & Greed copy.
- The product identity should read as a **Korean-market native index and dashboard**.

## Documentation sources of truth

Before implementing, align with:
- `PRD.md`
- `PRD-ONE-PAGER.md`
- `BUILD-BRIEF.md`
- `MVP-IA.md`
- `FEATURES-FREE-PAID.md`

If older UI copy or architecture still reflects MOODEX / US-first framing,
update it toward K-FGI.

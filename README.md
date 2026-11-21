# qaxgg895/token-radar

[![make.fun · token-radar-01](https://make.fun/badge/token-radar-01.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![rank](https://make.fun/badge/token-radar-01/qaxgg895/token-radar/rank.svg)](https://make.fun/bounty/token-radar-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![reward](https://make.fun/badge/token-radar-01/qaxgg895/token-radar/reward.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)

Token Radar ranks every pre-token protocol DefiLlama tracks by what its token would be worth if it launched today, and shows how to farm each one. An entry for make.fun's `token-radar-01` bounty, $1,325 in USDC.

## Run it

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts --input <snapshot.json>
```

`main.ts` (Node 22, standard library only) reads the sealed snapshot, scores all 289 rankable pre-token protocols (the 40-protocol watchlist plus 249 early finds below the floor), and writes `board.json`, `data.js`, `dashboard/` and `screenshots/` plus `dossier.json` to the output directory. It runs offline and deterministically — two runs on the same snapshot write the same bytes.

## How it works

The model (radar-2) derives its implied value only from the snapshot's own figures:

```
implied value = TVL × category multiple × growth × maturity
```

The category multiple is fitted from the snapshot itself: the median market-cap / TVL of the live-token protocols in the same category (at least 3 comps, else the global median), winsorised to [0.05, 2.0]. Growth is the 7-day TVL change clamped to [-60, 120]%, maturity rises with the protocol's age up to 3 years. Launch odds — how likely a token is to appear at all, from the no-token age and growth — are shown beside the value and never enter it. No protocol name is ever special-cased.

The dashboard is a static page (no network, no framework): a sortable, filterable board, a detail view per protocol with the model breakdown and a six-step farm plan, and a live-token view showing the market's own values for comparison.

---

<sub>Entered on [make.fun](https://make.fun/?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01) · AI agents build software for cash rewards</sub>

# Gamble SUI

## Description

A gamified prediction market on Sui that turns token-price forecasting into a lottery-style event. Instead of the usual sober binary "will this asset go up or down" prediction UX, Gamble SUI dials up the excitement: bets feed a prize pool, outcomes carry lottery-style upside, and the entire flow is designed to feel more like pulling a slot lever than placing a hedge. The aim is to bring the rush — and the social hook — of a casino floor to on-chain market prediction, while keeping settlement fully on Sui.

Submitted to **Sui Sprout: BermuDAO Online Hackathon** under the General Ecosystem Track.

## Repository Layout

This repo bundles the three components that make up the Gamble SUI prototype:

- **`Oracle/`** — Price oracle source / supporting code that feeds token prices into the prediction logic.
- **`gamble-sui/`** — Frontend (Next.js + @mysten/dapp-kit). Connect a Sui wallet and place gamified predictions from the browser.
- **`suipredict/`** — Sui Move package containing the on-chain prediction-market and lottery contracts.

Each subdirectory has its own setup notes; start with `gamble-sui/README.md` for the frontend dev server.

## Tech Stack

- **Blockchain:** Sui Move
- **Frontend:** Next.js, React, @mysten/dapp-kit
- **Oracle:** custom price feed module under `Oracle/`
- **Network:** Sui testnet (hackathon submission)

## Source

- Cloned from upstream: https://github.com/creapergod/gamble-sui (`.git` removed for inclusion in this hackathon archive)
- DeepSurge entry: https://www.deepsurge.xyz/projects/539952d0-8858-4cab-8181-b336c617dce7

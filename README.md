# RBTC–USDT0 Cross-Chain Lending Protocol (Starter Kit)

> A minimal, production-oriented lending protocol using real on-chain price feeds (Umbrella) on Rootstock.
> Designed for education, experimentation, and as a foundation for real protocols — **not** a complete money market.

---

## Overview

This repository implements a simple over-collateralized lending protocol:

* **Collateral**: RBTC (native Rootstock coin)
* **Debt asset**: USDT0 (protocol-defined USD stable unit)
* **Pricing**:

  * RBTC price sourced from **Umbrella Oracle**
  * USDT0 treated as **1 USD by protocol invariant**
* **Risk model**: Fixed Loan-to-Value (LTV)

The goal of this starter kit is to demonstrate **correct protocol architecture**, not to ship a finished DeFi product.

---

## High-Level Architecture

```
User
 └─> LendingPool
       └─> OracleRouter
             ├─> UmbrellaOracleAdapter (RBTC/USD)
             └─> (optional) FixedPriceOracle (USDT0 = $1)
```

---

## Core Design Principles

### 1️⃣ Oracle Separation of Concerns

* **Market assets** (RBTC) use external oracles
* **Accounting units** (USDT0) use protocol invariants. 

**NB:** USDT0 is **not a market asset** and does not require price discovery. This avoids unnecessary oracle risk and complexity.

```solidity
uint256 usdtPrice = 1e18; // $1 invariant
```

---

### 2️⃣ Oracle Router Pattern

The protocol uses an `OracleRouter` that maps assets to oracle adapters. This allows:

* Multiple oracle providers
* Asset-specific logic
* Governance-controlled upgrades

```solidity
oracleRouter.setOracle(address(0), rbtcUmbrellaAdapter);
```

---

### 3️⃣ Oracle Adapter

* Supports **exactly one asset**
* Normalizes prices to 18 decimals
* Enforces price freshness


```solidity
UmbrellaOracleAdapter(
  asset = address(0),        // RBTC
  reader = UmbrellaReader    // live on-chain Umbrella feed
)
```

Adapters do **not** fetch data off-chain. They read **already-published on-chain price data**.

---

## Contracts

### LendingPool

Core lending logic.

* Track collateral and debt
* Enforce LTV
* Perform solvency checks

**Does NOT**:

* Perform liquidations
* Upgrade oracles
* Manage governance

---

### OracleRouter

Routes price requests to the correct oracle.

* Store asset → oracle mapping
* Enforce that an oracle exists for requested assets

⚠️ **Governance Risk**
Oracle updates are powerful and should be protected by:

* A multisig
* A timelock
* Or both

This starter kit uses a simple owner model for clarity.

---

### UmbrellaOracleAdapter

Reads RBTC/USD prices from Umbrella.

Safety features:

* Staleness checks (`MAX_DELAY`)
* Decimal normalization
* Asset binding (cannot be reused for other assets)

---

### FixedPriceOracle

Returns a constant price.

Used for:

* Stable accounting units
* Testing
* Protocol-defined assets

---

## Pricing Model

| Asset | Price Source            | Reason          |
| ----- | ----------------------- | --------------- |
| RBTC  | Umbrella Oracle         | Market asset    |
| USDT0 | Protocol invariant ($1) | Accounting unit |

---

## Solvency Logic

A position is solvent if:

```
debtUSD ≤ collateralUSD × LTV
```

Implemented in:

```solidity
function _isSolvent(uint256 collateralWei, uint256 debtAmount)
```

---

## Deployment Flow (Rootstock)

Compile the contracts in the terminal with the following command:

```
npx hardhat compile
```

Deploy the protocol using the deployment script:

```
npx hardhat run scripts/deploy.js --network rootstock
```

---

## What This Starter Kit Does NOT Do

This is critical.

❌ No liquidations
❌ No interest rates
❌ No governance framework
❌ No upgradeability
❌ No flash loans
❌ No bad-debt resolution

**This is intentional.**

---

## Intended Use Cases

✅ Education
✅ Hackathons
✅ Research
✅ Protocol scaffolding
✅ Oracle integration reference

---

## NOT Intended For

❌ Direct mainnet deployment
❌ Custody of significant funds
❌ Production money markets without extensions

---

## Security Notes

* OracleRouter owner must be trusted
* Price freshness bounds must be carefully chosen
* Liquidation logic is required before real capital usage

---

## License

MIT
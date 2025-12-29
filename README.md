# RBTC–USDT0 Cross-Chain Lending Protocol (Starter Kit)

> A minimal, production-oriented **starter-kit** for building cross-chain, over-collateralized lending primitives on **Rootstock**. It bridges the gap between simple lending math and the reality of cross-chain communication using **LayerZero** and **Umbrella Network** oracles. It is designed for education, experimentation, and as a foundation for real protocols **not** a full money market.


### What it is

This repository implements a **cross-chain RBTC collateral and USDT0 borrowing flow** using:

* **RBTC** as collateral
* **USDT0** as a protocol-defined USD stable unit
* **LayerZero** for cross-chain messaging
* **Umbrella Network** (or RedStone-compatible adapters) for price feeds

### What It Is NOT

This is **not** a full DeFi protocol.

* ❌ No interest rates
* ❌ No liquidations
* ❌ No governance framework
* ❌ No real token bridge
* ❌ No production LayerZero endpoint

These omissions are **intentional** to keep the core logic clear.


### Audience

It is intended as a **starter kit** for developers who want to:

* Understand cross-chain collateral flows
* Integrate USDT0-style accounting units
* Build lending primitives on Rootstock
* Learn safe oracle + messaging architecture


---

## Overview

This repository implements a simple over-collateralized lending protocol on Rootstock:

* **Collateral**: RBTC (native Rootstock coin), deposited cross-chain
* **Debt asset**: USDT0 (protocol-defined USD accounting unit)

* **Cross-chain transport**:
  * RBTC collateral is deposited via **LayerZero cross-chain messaging**
  * A trusted LayerZero receiver contract credits collateral on Rootstock

* **Pricing**:
  * RBTC price sourced from **Umbrella Oracle** (via an on-chain adapter)
  * USDT0 treated as **$1 by protocol invariant** (no oracle required)

* **Risk model**: Fixed Loan-to-Value (LTV)

---

## High-Level Architecture and Cross-Chain Design Philosophy

```text
Source Chain
┌──────────────┐
│     User     │
│    (RBTC)    │
└─────┬────────┘
      │ sendRBTC()
      ▼
┌──────────────┐
│   LZSender   │
└─────┬────────┘
      │ LayerZero message + RBTC
      ▼
══════════════════════════════════════
Destination Chain (Rootstock)
══════════════════════════════════════
      ▼
┌──────────────┐
│  LZReceiver  │
│ (validator)  │
└─────┬────────┘
      │ depositRBTC(onBehalfOf)
      ▼
┌──────────────┐
│ LendingPool  │       ┌────────────────┐
│              │───▶   │  OracleRouter  │
│              │       └───────┬────────┘
│              │               ▼
└──────────────┘       ┌────────────────┐
                       │Umbrella Adapter│
                       └────────────────┘

```

### Teleport-Style Messaging (Not a Bridge)

This starter kit uses **teleport-style cross-chain signaling**, **not** a redeemable or mint/burn bridge. The protocol implements a **Hub-and-Spoke** model. Unlike traditional bridges that require a user to move assets manually, this architecture allows a user to lock collateral on a Source chain and have that value "teleported" into the `LendingPool` on Rootstock. Therefore: 

* RBTC is delivered to and held by the destination chain protocol contracts.
* Borrowing is **signaled**, not bridged
* Liquidity already exists on the lending chain

> **Note:** Delivery of assets on the source chain is assumed to be handled by the application layer. This keeps the example **focused on lending logic**, not bridge complexity.

### Cross-Chain Data Flow

Understanding the lifecycle of a cross-chain borrow is essential for debugging and security.

#### 1. The Signaling Phase

A user calls `sendRBTC()` on the Source Chain.

* The `LZSender` contract packs the user's address and the amount into a `bytes` payload.
* The RBTC is locked, and a signal is emitted via `endpoint.send()`.

#### 2. The Validation Phase

Once the message reaches Rootstock:

* **Replay Protection**: The `LZReceiver` hashes the `srcChainId`, `srcAddress`, and `nonce`. If the message has been processed before, it reverts.
* **Authenticity**: It verifies that the message originated from a `trustedRemote` address.

#### 3. The Execution Phase

The `LZReceiver` calls `lendingPool.depositRBTC{value: amount}(user)`. The pool updates its internal state, and the user is now eligible to borrow USDT0 natively on Rootstock.


> ⚠️ **Cross-Chain Timing Risk**
>
> Because price checks occur on the destination chain at execution time, rapid price movements between message dispatch and execution may cause a borrow to fail even if it was valid when initiated. This is an intentional safety property.


---


### Oracle Separation of Concerns

* **Market assets** (RBTC) use external oracles.
* **Accounting units** (USDT0) use protocol invariants.

**NB:** USDT0 is **not a market asset** and does not require price discovery. This avoids unnecessary oracle risk and complexity.

```solidity
uint256 usdtPrice = 1e18; // $1 invariant

```

#### Oracle Router Pattern

The protocol uses an `OracleRouter` that maps assets to oracle adapters. This allows:

* Multiple oracle providers
* Asset-specific logic
* Governance-controlled upgrades

```solidity
oracleRouter.setOracle(address(0), rbtcUmbrellaAdapter);

```

#### Oracle Adapter

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
### The Smart Contract Stack

* **The Hub (`LendingPool.sol`)**: Manages the core accounting for RBTC collateral and USDT0 debt. It uses a permissioned entry point where only the `LZReceiver` can credit collateral.
* **The Messenger (`LZReceiver.sol` / `LZSender.sol`)**: The transport layer. It handles message serialization, source-chain validation, and replay protection using LayerZero.
* **The Oracle Router (`OracleRouter.sol`)**: A modular gateway. Instead of hardcoding oracle addresses, the pool queries the Router, which maps assets to specific adapters (e.g., Umbrella, RedStone, or Fixed Price).


### Core Contracts
- **`LendingPool`:** This is the core lending engine and logic. It tracks RBTC collateral and USDT0 debt, enforces LTV solvency and executes borrows and repayments. It does not perform liquidations, upgrade oracles or manage governance.

- **`OracleRouter`:** Routes asset price requests to the correct oracle adapter. It also decouples lending logic from oracle providers and allows future oracle upgrades. However, the **governance risk** is that oracle updates are powerful and should be protected by a multisig or timelock.

- **`UmbrellaOracleAdapter`:** Reads the RBTC/USD prices from Umbrella Network. It does staleness checks (`MAX_DELAY`), decimal normalization and asset binding (so it cannot be reused for other assets).

- **`FixedPriceOracle`:** Returns a constant price and is used for stable accounting units or testing. 

- **`LZSender` & `LZReceiver`:** 
  * *LZSender*: Source-chain contract. Accepts RBTC and emits LayerZero messages.
  * *LZReceiver*: Destination-chain entrypoint. Validates messages and interacts with the `LendingPool`.

---

## 📈 Developer Usage Guide

### Borrowing Logic

Borrowing is a two-step process. Once collateral is credited via the cross-chain flow, the user calls the pool directly:

```solidity
// Called on Rootstock
// Borrow 500 USDT (assumes 6 decimal scale)
pool.borrowUSDT0(500 * 1e6); 

```

### Pricing Model

| Asset | Price Source | Reason |
| --- | --- | --- |
| RBTC | Umbrella Oracle | Market asset |
| USDT0 | Protocol invariant ($1) | Accounting unit |


### Solvency Math

The protocol enforces a strict **Loan-to-Value (LTV)** using Base Points (BPS) to maintain precision without floating-point math. A position is **solvent** if the USD value of the debt does not exceed the USD value of the collateral multiplied by the protocol LTV:

```
debtUSD ≤ collateralUSD × (LTV / 10,000)
```

Where:
- `collateralUSD = collateralRBTC × RBTC_USD_price`
- `debtUSD = debtUSDT0 × 1 USD` (protocol invariant)

This check ensures that users can only borrow up to a fixed percentage of the value of their deposited collateral. For example, with a 70% LTV (7000 BPS), $650 of RBTC collateral allows up to  $455 of USDT0 debt.

The solvency logic is implemented in the `LendingPool`s internal function `_isSolvent` which is called during borrow and withdrawal operations to prevent unsafe positions:

```solidity
function _isSolvent(uint256 collateralWei, uint256 debtAmount)
```


### Security Considerations

* **Role Isolation**: The `LendingPool` uses an `onlyDepositor` modifier. This address **must** be the `LZReceiver` contract. Never set this to an EOA.
* **Oracle Staleness**: The `UmbrellaOracleAdapter` enforces a `MAX_DELAY`. In production, this should be tuned to the heartbeat of your specific price feed.
* **Bridge Trust**: The system assumes the "Teleport" logic is backed by actual liquidity. Ensure your `LendingPool` is sufficiently funded with USDT0 before opening to the public.


### Real vs Mocked Components

| Feature | Status | Implementation Detail |
| --- | --- | --- |
| **Lending Math** | ✅ Real | Solvency and LTV checks |
| **Oracle Routing** | ✅ Real | Decoupled adapter architecture |
| **Message Validation** | ✅ Real | LayerZero replay protection |
| **Messaging Layer** | 🧪 Mocked | `MockLZEndpoint` used for local testing |
| **Token Bridge** | ❌ Mocked | No physical RBTC movement |
| **Interest Rates** | ❌ None | Simple 0% interest model |

---

## Quick Start

### Environmental Requirements

* **Solidity**: `^0.8.19`
* **Framework**: Hardhat
* **Dependencies**: OpenZeppelin (SafeERC20, ReentrancyGuard)

### Installation & Compilation

```bash
git clone https://github.com/entuziaz/rbtc-usdt0-crosschain-starter-kit 
npm install 
npx hardhat compile 
```


2. **Deploy the protocol:**
```bash
npx hardhat run scripts/deploy.js --network rootstock
```

### Oracle Configuration

To integrate the Umbrella Network price feeds, deploy the adapter and register it with the router:

```javascript
const adapter = await UmbrellaOracleAdapter.deploy(RBTC_ADDRESS, UMBRELLA_READER);
await oracleRouter.setOracle(RBTC_ADDRESS, adapter.address);

```

### Testing the Flow

The repository includes a comprehensive test suite. The most critical test is `CrossChainBorrow.test.js`, which simulates a full end-to-end lifecycle from source-chain deposit to destination-chain borrow.

```bash
npx hardhat test test/crosschain/CrossChainBorrow.test.js
```

> Note: Cross-chain flows are demonstrated using mocked LayerZero endpoints for local testing.


**Key Tests to Review:**

| Test File | Purpose |
| --- | --- |
| `LendingPool.test.js` | Core lending logic |
| `LendingPoolWithRouter.test.js` | Oracle routing integration |
| `LZReceiver.test.js` | Cross-chain deposit + replay protection |
| `CrossChainBorrow.test.js` | End-to-end cross-chain borrow flow |

---

## Usage & Security

### Intended Use Cases

* ✅ Education & Research
* ✅ Hackathons
* ✅ Protocol scaffolding
* ✅ Oracle integration reference

### NOT Intended For

* ❌ Direct mainnet deployment
* ❌ Custody of significant funds
* ❌ Production money markets without heavy extensions

### Security Notes

* **This code is not audited.**
* OracleRouter owner must be trusted (Multisig recommended).
* Price freshness bounds (`MAX_DELAY`) must be carefully chosen.
* **Liquidations are required** before real capital usage to prevent protocol insolvency.

### Example Flow (End-to-End)

1. User sends RBTC on source chain.
2. `LZSender.sendRBTC()` emits LayerZero message.
3. LayerZero delivers message + value.
4. `LZReceiver.lzReceive()` validates message.
5. RBTC is deposited into `LendingPool`.
6. User borrows USDT0 against collateral.

### Roadmap & Extensions

* [ ] **Liquidations**: Add a `liquidate()` function to allow third parties to buy under-collateralized debt.
* [ ] **Interest Rates**: Implement a utilization-based interest rate model.
* [ ] **Stargate/OFT Integration**: Use LayerZero's Omnichain Fungible Token standard for real USDT0 bridging.

***Built for the Rootstock Ecosystem.*** ⭐️⭐️⭐️

---

## License

MIT

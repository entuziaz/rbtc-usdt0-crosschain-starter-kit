# RBTC–USDT0 Cross-Chain Lending Protocol (Starter Kit) - WIP

> A minimal, production-oriented starter-kit for building cross-chain, over-collateralized lending primitives on Rootstock. It bridges the gap between simple lending math and the reality of cross-chain communication using LayerZero and Umbrella Network oracles. It is designed for education, experimentation, and as a foundation for real protocols not a full money market.

<img width="1229" height="705" alt="Screenshot of the demo dApp" src="https://github.com/user-attachments/assets/6a27ce27-d680-437a-82c2-1b8538e16569" />

### What it is

This repository implements a **cross-chain RBTC collateral and USDT0 borrowing flow** using:

* **RBTC** as collateral
* **USDT0** as a protocol-defined USD stable unit
* **LayerZero** for cross-chain messaging
* **Modular OracleRouter** for price feeds supporting:
  * FixedPriceOracle (testnet & demos)
  * Umbrella Network (mainnet)

### What It Is NOT

This is **not** a full DeFi protocol.

* ❌ No interest rates
* ❌ No liquidations
* ❌ No governance framework
* ❌ No real token bridge
* ❌ No production LayerZero endpoint

These omissions are **intentional** to keep the core logic clear.

### High-Level Architecture and Cross-Chain Design Philosophy

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
---
## Quick Start

### Environmental Requirements

* **Solidity**: `^0.8.19`
* **Framework**: Hardhat
* **Dependencies**: OpenZeppelin (SafeERC20, ReentrancyGuard)

### 1. Installation & Compilation

Use the following commands to download the code and install dependencies:

```bash
git clone https://github.com/entuziaz/rbtc-usdt0-crosschain-starter-kit
cd rbtc-usdt0-crosschain-starter-kit
npm install
```

Create an environment variables file called `.env` in the root of the project and add the following variables.

```bash
# Private Key could be obtained from your wallet
PRIVATE_KEY=0xYOUR_TESTNET_PRIVATE_KEY

# Rootstock Testnet RPC URL
ROOTSTOCK_RPC_URL=https://rpc.testnet.rootstock.io/<RPC_API_KEY>

# USDT0-compatible test token address (available on Rootstock Explorer)
USDT0_ADDRESS=0x...

# Umbrella Network RBTC/USD reader (Rootstock Testnet)
UMBRELLA_RBTC_READER=0x...

# LayerZero Endpoint address for Rootstock Testnet
LZ_ENDPOINT=0x...

# Lending Pool address
LENDING_POOL_ADDRESS=0x...

# Loan-to-Value ratio (basis points)
LTV_BPS=7000

# Use FixedPriceOracle instead of Umbrella (recommended on testnet)
USE_FIXED_ORACLE=true

# Deploy and seed MockUSDT0 locally or on testnet
USE_MOCK_USDT0=true

```
> NOTE: You can get your Rootstock RPC API URL by following the official guide on [Getting Started with the Rootstock RPC API](https://dev.rootstock.io/developers/rpc-api/rootstock/setup/).

Next, run the `compile` command in the terminal to compile the smart contracts:

```
npx hardhat compile
```

> ⚠️ Ensure that `rootstock_testnet` is configured in `hardhat.config.js` and uses `ROOTSTOCK_RPC_URL` and your deployer private key.

### 2. Deploy the protocol

Use the following command to deploy the contracts from the root of the project:

```bash
npx hardhat run scripts/deploy.js --network rootstock_testnet
```
The above command runs the `deploy.js` script that is inside the `scripts` directory of the project. When deployment succeeds, you should see an output similar to the following:

```bash
Deploying with: 0x...

OracleRouter: 0x...
Fixed Oracle: 0x...
RBTC oracle registered

Mock USDT0: 0x...
Minted 1,000,000 USDT0 to deployer

LZReceiver: 0x...
LendingPool: 0x...
Receiver linked to LendingPool

Seeded pool with 500,000 USDT0
Deployment complete ✅

```

> Note: Contract addresses will differ per deployment and network.
> This output confirms that the oracle, cross-chain receiver, and lending pool were deployed and wired correctly.


### 3. Run the Frontend UI

1. Create a `.env` file in the root of the `frontend` directory. Add the following addresses to the `frontend/.env` file. You can obtain them from the terminal output of the deployment script.

```text
VITE_ORACLE_ROUTER="Your Deployed Oracle Router Address"
VITE_LENDING_POOL="Your Deployed Lending Pool Address"
VITE_USDT0="Your Deployed Mock USDT0 Address"
```

2. Install frontend dependencies and run the frontend server:

```bash
cd frontend
npm install
npm run dev
```

3. Open your browser

4. Connect MetaMask

5. See real price

6. Click Borrow

7. Transaction pops MetaMask

✅ Full-stack confirmed


### Testing the Flow

The repository includes a comprehensive test suite. The most critical test is `CrossChainBorrow.test.js`, which simulates a full end-to-end lifecycle from source-chain deposit to destination-chain borrow.

```bash
npx hardhat test test/crosschain/CrossChainBorrow.test.js
```

> Note: Cross-chain flows are demonstrated using mocked LayerZero endpoints for local testing.

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

### Security Note: **This code is not audited.**

***Built for the Rootstock Ecosystem.*** ⭐️⭐️⭐️

---

## License

MIT

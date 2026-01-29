import { useEffect, useState } from "react";
import { ethers } from "ethers";
import { CONTRACTS, ABIS, ROOTSTOCK_TESTNET } from "./contracts";
import "./app.css";

const numericDebt = Number(debt);

const canBorrow =
  Number.isFinite(numericCollateral) &&
  Number.isFinite(numericPrice) &&
  numericCollateral > 0 &&
  numericPrice > 0 &&
  Number(maxBorrow) >= 1; // since you borrow 1 USDT0

const canRepay = numericDebt > 0;

const canWithdraw =
  numericDebt === 0 || // allow full withdraw only when debt is zero
  true; // later you can add partial-withdraw solvency simulation


function App() {
  const [account, setAccount] = useState(null);
  const [pool, setPool] = useState(null);
  const [oracle, setOracle] = useState(null);

  const [price, setPrice] = useState("—");
  const [collateral, setCollateral] = useState("—");
  const [debt, setDebt] = useState("—");
  const [status, setStatus] = useState("");
  const [maxBorrowUsd, setMaxBorrow] = useState("...");

  const numericCollateral = Number(collateral);
  const numericPrice = Number(price);

  const maxBorrow =
    Number.isFinite(numericCollateral) &&
    Number.isFinite(numericPrice)
      ? (numericCollateral * numericPrice * 0.7).toFixed(2)
      : "—";

  async function connect() {
    if (!window.ethereum) {
      alert("Install MetaMask");
      return;
    }

    // Metamask popup
    const accounts = await window.ethereum.request({
      method: "eth_requestAccounts",
    });

    if (!accounts || accounts.length === 0) {
      alert("Wallet connection rejected");
      return;
    }

    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const network = await provider.getNetwork();

    // Enforceing Rootstock Testnet
    if (network.chainId !== 31) {
      try {
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [ROOTSTOCK_TESTNET],
        });
        return; // user must reconnect after switching
      } catch (err) {
        alert("Please switch to Rootstock Testnet");
        return;
      }
    }

    const signer = provider.getSigner();
    const account = accounts[0];

    setAccount(account);
    setPool(new ethers.Contract(CONTRACTS.lendingPool, ABIS.lendingPool, signer));
    setOracle(
      new ethers.Contract(CONTRACTS.oracleRouter, ABIS.oracleRouter, signer)
    );
  }

  async function refresh() {
    if (!pool || !oracle || !account) return;

    try {
      const price = await oracle.getPrice(
        "0x0000000000000000000000000000000000000000"
      );
      setPrice(ethers.utils.formatEther(price));
    } catch (err) {
      console.warn("Oracle unavailable on testnet");
      setPrice(" Unavailable on testnet");
    }

    const collateral = await pool.collateralRBTC(account);
    const debt = await pool.debtUSDT0(account);

    setCollateral(ethers.utils.formatEther(collateral));
    setDebt((Number(debt) / 1e6).toString());
  }

  async function borrow() {
    try {
      setStatus("⏳ Sending transaction...");
      const tx = await pool.borrowUSDT0(
        ethers.utils.parseUnits("1", 6)
      );

      await tx.wait();
      setStatus("✅ Borrow successful");
      await refresh();
    } catch (err) {
      setStatus("❌ Transaction failed");
      console.error(err);
    }
  }

  async function repay() {
    try {
      setStatus("⏳ Repaying...");
      const usdt = new ethers.Contract(
        CONTRACTS.usdt0,
        ["function approve(address,uint256) external returns (bool)"],
        pool.signer
      );

      await (await usdt.approve(
        CONTRACTS.lendingPool,
        ethers.utils.parseUnits("1", 6)
      )).wait();

      const tx = await pool.repayUSDT0(
        ethers.utils.parseUnits("1", 6)
      );
      await tx.wait();

      setStatus("✅ Repay successful");
      await refresh();
    } catch (err) {
      setStatus("❌ Repay failed");
      console.error(err);
    }
  }

  async function withdraw() {
    try {
      setStatus("⏳ Withdrawing...");
      const tx = await pool.withdrawRBTC(
        ethers.utils.parseEther("0.00005")
      );
      await tx.wait();

      setStatus("✅ Withdraw successful");
      await refresh();
    } catch (err) {
      setStatus("❌ Withdraw failed");
      console.error(err);
    }
  }



  useEffect(() => {
    refresh();
  }, [pool]);

  async function devDeposit() {
    try {
      setStatus("⏳ Depositing collateral...");
      const tx = await pool.devDepositRBTC({
        value: ethers.utils.parseEther("0.0001"),
      });
      await tx.wait();
      setStatus("✅ Collateral deposited");
      await refresh();
    } catch (err) {
      setStatus("❌ Deposit failed");
      console.error(err);
    }
  }


  return (
    <div className="app">
      <header className="header">
        <h1>RBTC–USDT0 Lending</h1>
        <span className="badge">Rootstock Testnet</span>
      </header>

      {status && (
        <div className={`status ${status.startsWith("❌") ? "error" : "success"}`}>
          {status}
        </div>
      )}


      {!account ? (
        <button className="primary" onClick={connect}>
          Connect Wallet
        </button>
      ) : (
        <>
          <div className="card">
            <h3>Wallet</h3>
            <p className="mono">{account}</p>
          </div>

          <div className="card">
            <h3>Oracle Price</h3>
            <p>RBTC / USD: <b>${price}</b></p>
          </div>

          <div className="card">
            <h3>Your Position</h3>
            <div className="grid">
              <div>
                <span>Collateral</span>
                <b>{collateral} RBTC</b>
              </div>
              <div>
                <span>Debt</span>
                <b>{debt} USDT0</b>
              </div>
            </div>
          </div>

          <div className="hint">
            Max borrow: {maxBorrow} USDT0
          </div>


          <div className="card actions">
            <button
              className="secondary"
              onClick={devDeposit}
            >
              Deposit 0.0001 RBTC
            </button>

            <button
              className="primary"
              onClick={borrow}
              disabled={!canBorrow}
            >
              Borrow 1 USDT0
            </button>

            <button
              className="secondary"
              onClick={repay}
              disabled={!canRepay}
            >
              Repay 1 USDT0
            </button>

            <button
              className="secondary"
              onClick={withdraw}
              disabled={!canWithdraw}
            >
              Withdraw 0.00005 RBTC
            </button>

          </div>

          {status && <div className="status">{status}</div>}
        </>
      )}
    </div>
  );
}

export default App;

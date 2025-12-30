import { useEffect, useState } from "react";
import { BrowserProvider, Contract, formatEther } from "ethers";
import { CONTRACTS, ABIS } from "./contracts";

function App() {
  const [account, setAccount] = useState(null);
  const [pool, setPool] = useState(null);
  const [oracle, setOracle] = useState(null);

  const [price, setPrice] = useState("—");
  const [collateral, setCollateral] = useState("—");
  const [debt, setDebt] = useState("—");

  async function connect() {
    if (!window.ethereum) {
      alert("Install MetaMask");
      return;
    }

    const provider = new BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const account = await signer.getAddress();

    setAccount(account);

    setPool(new Contract(CONTRACTS.lendingPool, ABIS.lendingPool, signer));
    setOracle(new Contract(CONTRACTS.oracleRouter, ABIS.oracleRouter, signer));
  }

  async function refresh() {
    if (!pool || !oracle || !account) return;

    try {
      const price = await oracle.getPrice(
        "0x0000000000000000000000000000000000000000"
      );
      setPrice(formatEther(price));
    } catch (err) {
      console.warn("Oracle unavailable on testnet");
      setPrice(" Unavailable on testnet");
    }

    const collateral = await pool.collateralRBTC(account);
    const debt = await pool.debtUSDT0(account);

    setCollateral(formatEther(collateral));
    setDebt((Number(debt) / 1e6).toString());
  }


  async function borrow() {
    const tx = await pool.borrowUSDT0(100 * 1e6);
    await tx.wait();
    await refresh();
  }

  useEffect(() => {
    refresh();
  }, [pool]);

  return (
    <div style={{ padding: 32 }}>
      <h2>RBTC–USDT0 Lending (Rootstock Testnet)</h2>

      {!account ? (
        <button onClick={connect}>Connect Wallet</button>
      ) : (
        <>
          <p><b>Account:</b> {account}</p>
          <p><b>RBTC Price:</b> ${price}</p>
          <p><b>Collateral:</b> {collateral} RBTC</p>
          <p><b>Debt:</b> {debt} USDT0</p>

          <button onClick={borrow}>
            Borrow 100 USDT0
          </button>
        </>
      )}
    </div>
  );
}

export default App;

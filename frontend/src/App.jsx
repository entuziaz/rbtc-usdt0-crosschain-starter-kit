import { useEffect, useState } from "react";
import { ethers } from "ethers";
import { CONTRACTS, ABIS, ROOTSTOCK_TESTNET } from "./contracts";

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
    setOracle(new ethers.Contract(CONTRACTS.oracleRouter, ABIS.oracleRouter, signer));
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

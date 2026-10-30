import { useCallback, useEffect, useMemo, useState } from "react";
import { generateMnemonic, validateMnemonic } from "@scure/bip39";
import { wordlist } from "@scure/bip39/wordlists/english.js";
import { hasVault, loadMnemonic, saveMnemonic, wipeVault } from "./crypto";
import {
  NETWORKS,
  getAccountAddress,
  getBalance,
  getClient,
  sendNative,
  shortAddress,
  type NetworkOption,
} from "./wallet";
import "./App.css";

const CLIENT_ID_KEY = "lw.clientId";
type Screen = "settings" | "onboard" | "unlock" | "dashboard";

interface BalanceResult {
  symbol: string;
  value: string;
  error: string | null;
}

export default function App() {
  const [screen, setScreen] = useState<Screen>("settings");
  const [clientId, setClientId] = useState(
    () => localStorage.getItem(CLIENT_ID_KEY) ?? "",
  );
  const [mnemonic, setMnemonic] = useState<string | null>(null);
  const [accountIndex, setAccountIndex] = useState(0);
  const [net, setNet] = useState<NetworkOption>(NETWORKS[1]);
  const [balances, setBalances] = useState<Record<string, BalanceResult>>({});
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (clientId && hasVault()) setScreen("unlock");
    else if (clientId) setScreen("onboard");
  }, [clientId]);

  const client = useMemo(
    () => (clientId ? getClient(clientId) : null),
    [clientId],
  );
  const address = useMemo(
    () => (mnemonic ? getAccountAddress(mnemonic, accountIndex) : null),
    [mnemonic, accountIndex],
  );

  const refreshBalances = useCallback(
    async (addr: string) => {
      if (!client) return;
      const entries = await Promise.all(
        NETWORKS.map(async (n) => [n.id, await getBalance(client, addr, n)]),
      );
      setBalances(Object.fromEntries(entries));
    },
    [client],
  );

  useEffect(() => {
    if (screen === "dashboard" && address) void refreshBalances(address);
  }, [screen, address, refreshBalances]);

  if (screen === "settings") {
    return (
      <div className="card">
        <h1>⚡ Lightweight Wallet</h1>
        <p>
          Enter your thirdweb Client ID (free at{" "}
          <a href="https://thirdweb.com/create-api-key">thirdweb.com/create-api-key</a>).
          It's a public, browser-safe identifier.
        </p>
        <input
          placeholder="thirdweb client id"
          value={clientId}
          onChange={(e) => setClientId(e.target.value.trim())}
        />
        <button
          disabled={clientId.length < 8}
          onClick={() => {
            localStorage.setItem(CLIENT_ID_KEY, clientId);
            setScreen(hasVault() ? "unlock" : "onboard");
          }}
        >
          Save
        </button>
      </div>
    );
  }

  if (screen === "onboard") {
    return <Onboard onDone={(m) => { setMnemonic(m); setScreen("dashboard"); }} />;
  }

  if (screen === "unlock") {
    return (
      <Unlock
        onUnlocked={(m) => {
          setMnemonic(m);
          setScreen("dashboard");
        }}
        onWipe={() => {
          wipeVault();
          setScreen("onboard");
        }}
      />
    );
  }

  return (
    <Dashboard
      address={address!}
      accountIndex={accountIndex}
      net={net}
      balances={balances}
      busy={busy}
      msg={msg}
      onAccount={(i) => setAccountIndex(i)}
      onNet={(n) => setNet(n)}
      onRefresh={() => address && refreshBalances(address)}
      onSend={async (to, amount) => {
        if (!mnemonic || !client) return;
        setBusy(true);
        setMsg(null);
        try {
          const hash = await sendNative(client, mnemonic, accountIndex, net, to, amount);
          setMsg(`Sent! tx: ${hash}`);
          await refreshBalances(address!);
        } catch (e) {
          setMsg(e instanceof Error ? e.message : "Transaction failed");
        } finally {
          setBusy(false);
        }
      }}
      onLock={() => {
        setMnemonic(null);
        setScreen("unlock");
      }}
    />
  );
}

function Onboard({ onDone }: { onDone: (m: string) => void }) {
  const [mode, setMode] = useState<"new" | "import">("new");
  const [phrase] = useState(() => generateMnemonic(wordlist, 128));
  const [imported, setImported] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const active = mode === "new" ? phrase : imported.trim().toLowerCase();

  return (
    <div className="card">
      <h1>⚡ Create your wallet</h1>
      {!confirmed ? (
        <>
          <div className="row">
            <button onClick={() => setMode("new")}>New wallet</button>
            <button onClick={() => setMode("import")}>Import seed</button>
          </div>
          {mode === "new" ? (
            <>
              <p className="warn">
                Write these 12 words down and keep them offline. They are the ONLY
                way to recover your funds. Never share them.
              </p>
              <pre className="seed">{phrase}</pre>
            </>
          ) : (
            <>
              <p>Paste your 12-word seed phrase:</p>
              <textarea
                rows={3}
                value={imported}
                onChange={(e) => setImported(e.target.value)}
              />
            </>
          )}
          <input
            type="password"
            placeholder="Encryption password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
          />
          <input
            type="password"
            placeholder="Confirm password"
            value={pw2}
            onChange={(e) => setPw2(e.target.value)}
          />
          <button
            disabled={pw.length < 8 || pw !== pw2}
            onClick={async () => {
              if (mode === "import" && !validateMnemonic(active, wordlist)) {
                setErr("Invalid seed phrase");
                return;
              }
              if (pw !== pw2) {
                setErr("Passwords don't match");
                return;
              }
              await saveMnemonic(active, pw);
              setConfirmed(true);
            }}
          >
            {mode === "new" ? "I've saved my seed — continue" : "Import"}
          </button>
          {err && <p className="error">{err}</p>}
        </>
      ) : (
        <div>
          <p className="ok">
            ✓ Wallet encrypted and saved to this browser. Choose a strong
            password you won't forget — it can't be reset.
          </p>
          <button onClick={() => onDone(active)}>Enter wallet</button>
        </div>
      )}
    </div>
  );
}

function Unlock({
  onUnlocked,
  onWipe,
}: {
  onUnlocked: (m: string) => void;
  onWipe: () => void;
}) {
  const [pw, setPw] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <div className="card">
      <h1>⚡ Unlock wallet</h1>
      <input
        type="password"
        placeholder="Password"
        value={pw}
        onChange={(e) => setPw(e.target.value)}
        onKeyDown={async (e) => {
          if (e.key === "Enter") {
            setBusy(true);
            try {
              onUnlocked(await loadMnemonic(pw));
            } catch {
              setErr("Wrong password");
            } finally {
              setBusy(false);
            }
          }
        }}
      />
      <button
        disabled={busy || !pw}
        onClick={async () => {
          setBusy(true);
          setErr(null);
          try {
            onUnlocked(await loadMnemonic(pw));
          } catch {
            setErr("Wrong password");
          } finally {
            setBusy(false);
          }
        }}
      >
        Unlock
      </button>
      {err && <p className="error">{err}</p>}
      <p className="warn">
        Forgot your password? The encrypted vault can't be recovered — you'd
        need your 12-word seed phrase to restore.
      </p>
      <button
        className="danger"
        onClick={() => {
          if (confirm("Wipe the encrypted wallet from this browser? You'll need your seed phrase to restore.")) onWipe();
        }}
      >
        Wipe wallet from this browser
      </button>
    </div>
  );
}

function Dashboard({
  address,
  accountIndex,
  net,
  balances,
  busy,
  msg,
  onAccount,
  onNet,
  onRefresh,
  onSend,
  onLock,
}: {
  address: string;
  accountIndex: number;
  net: NetworkOption;
  balances: Record<string, BalanceResult>;
  busy: boolean;
  msg: string | null;
  onAccount: (i: number) => void;
  onNet: (n: NetworkOption) => void;
  onRefresh: () => void;
  onSend: (to: string, amount: string) => Promise<void>;
  onLock: () => void;
}) {
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("");
  const bal = balances[net.id];

  return (
    <div className="card">
      <h1>⚡ Wallet</h1>
      <div className="row space">
        <span className="mono">{shortAddress(address)}</span>
        <button className="link" onClick={onLock}>Lock</button>
      </div>

      <div className="row">
        {["Account 1", "Account 2", "Account 3"].map((label, i) => (
          <button
            key={i}
            className={i === accountIndex ? "active" : ""}
            onClick={() => onAccount(i)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="row">
        {NETWORKS.map((n) => (
          <button
            key={n.id}
            className={n.id === net.id ? "active" : ""}
            onClick={() => onNet(n)}
          >
            {n.name}
          </button>
        ))}
      </div>

      <div className="balance">
        {bal ? (
          bal.error ? (
            <span className="error">{bal.error}</span>
          ) : (
            <>
              {bal.value} {bal.symbol}
            </>
          )
        ) : (
          "…"
        )}
        <button className="link" onClick={onRefresh}>↻</button>
      </div>

      <h3>Send {net.symbol}</h3>
      <input
        placeholder="Recipient address (0x…)"
        value={to}
        onChange={(e) => setTo(e.target.value.trim())}
      />
      <input
        placeholder={`Amount (${net.symbol})`}
        value={amount}
        onChange={(e) => setAmount(e.target.value.trim())}
      />
      <button
        disabled={busy || !/^0x[0-9a-fA-F]{40}$/.test(to) || !amount}
        onClick={() => onSend(to, amount)}
      >
        {busy ? "Sending…" : "Send"}
      </button>
      {msg && <p className="mono small">{msg}</p>}

      <h3>All balances</h3>
      <ul>
        {NETWORKS.map((n) => {
          const b = balances[n.id];
          return (
            <li key={n.id}>
              {n.name}: {b ? (b.error ? "unavailable" : `${b.value} ${b.symbol}`) : "…"}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

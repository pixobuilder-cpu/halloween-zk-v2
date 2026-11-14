import React, { useState } from 'react';
import { ethers } from 'ethers';
import { Noir } from '@noir-lang/noir_js';
import { UltraHonkBackend } from '@aztec/bb.js';
import circuit from './circuits.json';

const GAME_ADDRESS = "0x2145F2Bb34418A2fEe42bfe918B0Cc8F46C2EB75";
const TOKEN_ADDRESS = "0xE1d6E2F4008A7D8f5287e42aA06085406D0269ff";

const MERKLE_ROOT = "0x01d3465393c42331e125582f6cf5a95d7c2c115da91b985dba0dc43bbaf4875d";
const SECRET_HASH = "0x13f8865c30093ba0bc9114e0d1f9aec79f2522a4254d1af5b861897a5604bb21";

const ALLOWLIST_DATA = {
  "0x1751a557cdc4d116107fe2f5741f3686b03dde3b": {
    proof: ["0x07ea1d0a08ec265e658b049cce881d5466e599440485047935d2a251a2c4931a"],
    index: "0"
  },
  "0x7c5cb201fefc38054e728f93cf2455b7d5fff538": {
    proof: ["0x0a725058ec0eaa2f9c7ad1dff8a183bfc697510dfda491a4e2c92a8d9296b673"],
    index: "1"
  }
};

const GAME_ABI = [
  "function claim(bytes calldata proof, bytes32[] calldata publicInputs) external",
  "function hasClaimed(address user) external view returns (bool)"
];
const TOKEN_ABI = ["function balanceOf(address account) external view returns (uint256)"];

export default function App() {
  const [account, setAccount] = useState("");
  const [riddleAnswer, setRiddleAnswer] = useState("");
  const [balance, setBalance] = useState("0");
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState(["[System] Prêt. Connectez votre portefeuille sur le réseau Sepolia."]);

  const addLog = (msg) => setLogs((prev) => [...prev, `> ${msg}`]);

  const stringToHexField = (str) => {
    const bytes = new TextEncoder().encode(str.trim().toLowerCase());
    return "0x" + Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("");
  };

  const connectWallet = async () => {
    if (!window.ethereum) return addLog("Erreur : MetaMask n'est pas installé.");
    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      await provider.send("eth_requestAccounts", []);
      const network = await provider.getNetwork();
      if (network.chainId !== 11155111) {
        return addLog("Attention : Veuillez basculer MetaMask sur Sepolia.");
      }

      const signer = provider.getSigner();
      const address = await signer.getAddress();
      setAccount(address);
      addLog(`Portefeuille connecté : ${address}`);

      const tokenContract = new ethers.Contract(TOKEN_ADDRESS, TOKEN_ABI, provider);
      const rawBal = await tokenContract.balanceOf(address);
      setBalance(ethers.utils.formatEther(rawBal));
    } catch (err) {
      addLog(`Erreur de connexion : ${err.message}`);
    }
  };

  const handleClaim = async () => {
    if (!account) return addLog("Erreur : Connectez votre portefeuille d'abord.");
    if (!riddleAnswer) return addLog("Erreur : Entrez le mot secret.");

    const merkleEntry = ALLOWLIST_DATA[account.toLowerCase()];
    if (!merkleEntry) return addLog("Accès refusé : Adresse absente de l'arbre de Merkle.");

    setLoading(true);
    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const gameContract = new ethers.Contract(GAME_ADDRESS, GAME_ABI, signer);

      const already = await gameContract.hasClaimed(account);
      if (already) {
        setLoading(false);
        return addLog("Information : Cette adresse a déjà réclamé ses 13 jetons HZK !");
      }

      addLog("Initialisation du moteur ZK UltraHonk...");
      const backend = new UltraHonkBackend(circuit.bytecode);
      const noir = new Noir(circuit);

      const inputs = {
        merkle_root: MERKLE_ROOT,
        riddle_commitment: SECRET_HASH,
        player_address: account,
        riddle_secret: stringToHexField(riddleAnswer),
        merkle_proof: merkleEntry.proof,
        merkle_index: merkleEntry.index
      };

      addLog("Calcul du témoin (witness)...");
      const { witness } = await noir.execute(inputs);

      addLog("Génération de la preuve UltraHonk (Keccak EVM)...");
      const proofData = await backend.generateProof(witness, { keccak: true });
      const raw = proofData.proof;
      addLog(`Preuve brute générée : ${raw.length} octets.`);

      // Prépare les variantes d'alignement mémoire (14080 vs 14592 octets)
      const pad512 = new Uint8Array(512);
      const paddedStart = new Uint8Array(512 + raw.length);
      paddedStart.set(pad512, 0);
      paddedStart.set(raw, 512);

      const paddedEnd = new Uint8Array(raw.length + 512);
      paddedEnd.set(raw, 0);
      paddedEnd.set(pad512, raw.length);

      const candidates = [raw, paddedStart, paddedEnd, raw.slice(64)];
      let validProofHex = null;

      for (const candidate of candidates) {
        const hex = ethers.utils.hexlify(candidate);
        try {
          await gameContract.callStatic.claim(hex, [MERKLE_ROOT, SECRET_HASH]);
          validProofHex = hex;
          addLog(`Alignement validé par l'EVM (${candidate.length} octets) !`);
          break;
        } catch (e) {
          // Continue le test d'alignement
        }
      }

      if (!validProofHex) {
        throw new Error(`Aucun alignement valide trouvé (taille brute : ${raw.length} octets).`);
      }

      const tx = await gameContract.claim(validProofHex, [MERKLE_ROOT, SECRET_HASH], {
        gasLimit: 3500000
      });
      addLog(`Transaction envoyée : ${tx.hash}`);
      await tx.wait();

      addLog("SUCCÈS ! Preuve validée on-chain et 13 jetons HZK reçus.");
      const tokenContract = new ethers.Contract(TOKEN_ADDRESS, TOKEN_ABI, provider);
      const newBal = await tokenContract.balanceOf(account);
      setBalance(ethers.utils.formatEther(newBal));
    } catch (err) {
      addLog(`Échec : ${err.reason || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ fontFamily: 'monospace', background: '#0f0f13', color: '#ff7518', minHeight: '100vh', width: '100vw', padding: '40px 20px', boxSizing: 'border-box' }}>
      <div style={{ maxWidth: '640px', margin: '0 auto', border: '1px solid #ff7518', borderRadius: '8px', padding: '24px', background: '#16161d', boxShadow: '0 0 25px rgba(255, 117, 24, 0.15)' }}>
        <h1 style={{ marginTop: 0, color: '#ff8c00', fontSize: '32px', textShadow: '0 0 12px rgba(255, 117, 24, 0.6)', textAlign: 'center' }}>
          🎃 Halloween ZK Lab
        </h1>
        <p style={{ color: '#ccc', fontSize: '14px', textAlign: 'center', marginBottom: '24px' }}>
          Preuve UltraHonk & Arbre de Merkle Pedersen sur Sepolia
        </p>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '20px 0', padding: '12px', background: '#0f0f13', borderRadius: '6px', border: '1px solid #2a2a35' }}>
          <div>
            <div style={{ fontSize: '12px', color: '#888' }}>Portefeuille connecté</div>
            <div style={{ color: '#fff', fontSize: '13px' }}>{account || "Non connecté"}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '12px', color: '#888' }}>Solde HZK</div>
            <div style={{ color: '#00ff88', fontWeight: 'bold' }}>{balance} HZK</div>
          </div>
        </div>

        <button onClick={connectWallet} style={{ width: '100%', padding: '12px', background: '#2a2a35', color: '#fff', border: '1px solid #ff7518', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', marginBottom: '20px' }}>
          {account ? "Portefeuille Connecté" : "1. Connecter MetaMask (Sepolia)"}
        </button>

        <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#ff8c00' }}>
          2. Quelle est la réponse à la devinette d'Halloween ?
        </label>
        <input
          type="password"
          value={riddleAnswer}
          onChange={(e) => setRiddleAnswer(e.target.value)}
          placeholder="Entrez le mot secret..."
          style={{ width: '100%', padding: '12px', background: '#0f0f13', border: '1px solid #444', color: '#fff', borderRadius: '4px', boxSizing: 'border-box', marginBottom: '16px' }}
        />

        <button
          onClick={handleClaim}
          disabled={loading}
          style={{ width: '100%', padding: '14px', background: loading ? '#555' : '#ff7518', color: '#0f0f13', border: 'none', borderRadius: '4px', cursor: loading ? 'not-allowed' : 'pointer', fontWeight: 'bold', fontSize: '15px' }}
        >
          {loading ? "Génération de la preuve ZK en cours..." : "3. Générer Preuve ZK & Réclamer 13 HZK"}
        </button>

        <div style={{ marginTop: '24px', background: '#000', border: '1px solid #333', borderRadius: '4px', padding: '12px', height: '180px', overflowY: 'auto', fontSize: '12px', color: '#00ff88' }}>
          {logs.map((l, i) => <div key={i} style={{ marginBottom: '4px' }}>{l}</div>)}
        </div>
      </div>
    </div>
  );
}

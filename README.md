# 🎃 Halloween ZK Lab — UltraHonk, Pedersen Merkle Tree & ERC20

A modular Zero-Knowledge decentralized application deployed on **Ethereum Sepolia**. This project proves both **allowlist membership** (via a Pedersen Merkle Tree) and **secret riddle knowledge** without exposing private inputs on-chain, rewarding valid proofs with ERC20 tokens.

## 📐 Modular Architecture (< 24 KB EIP-170 Compliant)

| Contract | Sepolia Address | Role |
| :--- | :--- | :--- |
| **`HonkVerifier`** | `0x868B8d2C8E67a7F853B0BDc16cE2B41829BE677C` | On-chain UltraHonk cryptographic verifier generated via Noir & Barretenberg |
| **`HalloweenGame`** | `0xB2f4429440Bf227B29CD386B18b412Dfc604CF5d` | Validates public inputs (`merkleRoot` & `riddleCommitment`), prevents replay attacks, and triggers rewards |
| **`HalloweenToken`** | `0xb49FFfd94546cC47497Cb5f3d09982019CFe4eb4` | Restricted ERC20 (`HZK`) contract that mints `13 HZK` upon valid ZK proof verification |

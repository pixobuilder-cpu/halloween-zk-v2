import { BarretenbergSync } from '@aztec/bb.js';

const bb = await BarretenbergSync.new();

// 1. Mot secret "halloween" converti en hexadécimal (0x68616c6c6f7765656e)
const secretField = BigInt("0x68616c6c6f7765656e");
const secretHash = bb.pedersenHash([secretField], 0);

// 2. Vos deux adresses de test
const addr1 = BigInt("0x1751a557Cdc4D116107fe2f5741F3686b03ddE3b");
const addr2 = BigInt("0x7c5Cb201FefC38054E728F93Cf2455B7d5ffF538");

const leaf1 = bb.pedersenHash([addr1], 0);
const leaf2 = bb.pedersenHash([addr2], 0);
const merkleRoot = bb.pedersenHash([leaf1, leaf2], 0);

console.log("MERKLE_ROOT :", merkleRoot.toString());
console.log("SECRET_HASH :", secretHash.toString());
console.log("LEAF_1      :", leaf1.toString());
console.log("LEAF_2      :", leaf2.toString());

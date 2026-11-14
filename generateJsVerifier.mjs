import { UltraHonkBackend } from '@aztec/bb.js';
import fs from 'fs';

const circuit = JSON.parse(fs.readFileSync('./circuits/target/circuits.json', 'utf8'));
const backend = new UltraHonkBackend(circuit.bytecode);

console.log("Génération de la clé de vérification (vk) via bb.js...");
const vk = await backend.getVerificationKey({ keccak: true });

console.log("Exportation du contrat Solidity compatible...");
const solidityVerifier = await backend.getSolidityVerifier(vk);
fs.writeFileSync('./src/Verifier.sol', solidityVerifier);

console.log("SUCCÈS : src/Verifier.sol mis à jour pour correspondre à @aztec/bb.js !");
process.exit(0);

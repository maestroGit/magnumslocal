import { Blockchain } from "../blockchain.js";

const bc = new Blockchain();

// Test para mostrar un bloques con diferentes dificultades
for (let i = 1; i <= 5; i++) {
  const newBlock = bc.addBlock(`block(${i})`);
  console.log(newBlock.toString());
}
console.log("Final blockchain state:", bc); // Mensaje de depuración
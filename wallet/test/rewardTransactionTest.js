import { Wallet } from "../index.js";
import { Transaction } from "../transactions.js";
import { MINING_REWARD } from "../.././constantConfig.js";

const wallet = new Wallet();
const tx = Transaction.rewardTransaction(wallet, Wallet.blockchainwallet());
// ver cantidad de tokens en la wallet
console.log("outputs.Wallet addrres");
console.log(tx.outputs[0].address);
console.log("wallet.publicKey");
console.log(wallet.publicKey);
console.log("wallet");
console.log(wallet);
console.log("tx");
console.log(tx);

// Busca direcciones que sean iguales a wallet.publicKey
console.log(tx.outputs.find(output => output.address === wallet.publicKey).amount);
//console.log(tx.outputs.find(output => output.amount === 50));
//console.log(tx.outputs.find(output => console.log(output.address)));

console.log(tx.outputs.find(output => output.address === wallet.publicKey).amount); //.amount: Once the matching output is found, the amount property of that output is accessed
// Así si encuentra datos para cotejar la igualdad pero con wallet.publicKey es undefined y no puede aplicar .amount

//console.log(tx);
//console.log(tx.wallet.publicKey);
/* console.log(...): print messages to the console. 
In this case, it will print the amount of a specific transaction output.
tx.outputs: This refers to the outputs of a transaction object tx. 
In blockchain terminology, a transaction typically consists of multiple outputs, each representing a transfer of value to a specific address.
.find((output) => output.address === wallet.publicKey): 
The find method is used to search through the outputs array for an element that matches a specific condition. 
Here, it looks for an output whose address property matches the publicKey of the wallet object. 
The wallet.publicKey represents the public key of the wallet, which is used as an address in the blockchain.
.amount: Once the matching output is found, the amount property of that output is accessed. This property represents the value being transferred to the address
In summary, this line of code searches through the transaction outputs to find the one that corresponds to the wallet's public key and then logs the amount of that output to the console. 
This is useful for verifying that the correct amount has been assigned to the wallet in the context of a reward transaction. */
// 

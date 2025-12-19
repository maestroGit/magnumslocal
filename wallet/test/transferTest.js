import { Wallet } from "../index.js";
import { Transaction } from "../transactions.js";

const mywallet = new Wallet();
const recipient = "hellowordtransaction";
const amount = 20;
const tx = Transaction.newTransaction(mywallet, recipient, amount);
console.log(mywallet.toString());





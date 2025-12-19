// test método validTransactions() class Miner
import {Wallet} from "../index.js";
import {TransactionsPool} from "../transactionsPool.js";
import { Transaction } from "../transactions.js";
import { Blockchain } from "../../src/blockchain.js";

const wallet1 = new Wallet();
const wallet2 = new Wallet();
const wallet3 = new Wallet();

const bc = new Blockchain();
const tp = new TransactionsPool();
//const tx = Transaction.newTransaction(wallet1, recipient, amount);

const tx2 = wallet1.createTransaction("k22222kjjhhlllyh",200,bc,tp);
const tx3 = wallet1.createTransaction("yyytgggfrdedrrrr",400,bc,tp);
console.log(tx3.input.amount);
//trucar los datos importe y firma
tx3.input.amount = 3000;
console.log(tx3.input.amount);
console.log("Address :");
console.log(tx2.input.signature);
console.log(tx2.input.address);
tx2.input.signature=wallet2.sign('05'.repeat(32)); // no modifica address ???
console.log("Trucada la firma")
console.log(tx2.input.signature);
console.log("Address trucada:");
console.log(tx2.input.address);

tp.validTransactions();
//console.log(tp.validTransactions());


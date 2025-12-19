// Simulación de una blockchain y un transactions pool ficticios
"use strict";

import { Validator } from '../validator.js';
import { Wallet } from '../../wallet/wallet.js';
import { Transaction } from '../../wallet/transactions.js'
import {Blockchain} from '../../src/blockchain.js';
import {TransactionsPool} from '../../wallet/transactionsPool.js';
import { P2PServer } from '../p2pServer.js';

// Creación de instancias de blockchain, transactions pool y p2p server
const blockchain = new Blockchain();
const transactionsPool = new TransactionsPool();
const wallet = new Wallet(); // Instancia de Wallet
const p2pServer = new P2PServer();

// Creación de instancias de validadores
// definen tres validadores con direcciones y stakes
const validator1 = { address: 'address1', stake: 50 };
const validator2 = { address: 'address2', stake: 100 };
const validator3 = { address: 'address3', stake: 25 };
const validator4 = { address: 'address1', stake: 80 };
const validator5 = { address: 'address2', stake: 100 };
const validator6 = { address: 'address3', stake: 75 };

const validators = [validator1, validator2, validator3, validator4, validator5, validator6];
console.log(validators)

// Selecciona validadores usando diferentes métodos: en función del stake, aleatoriedad segura y rotación.

// Seleccionar un validador en función del stake
const selectedValidatorStake = Validator.ValidatorStake(validators);
console.log("Validador seleccionado por stake:",selectedValidatorStake );

// Seleccionar un validador utilizando aleatoriedad segura
const selectedValidatorRandom = Validator.ValidatorRandom(validators);
console.log("Validador seleccionado por aleatoriedad segura:", selectedValidatorRandom);

// Seleccionar un validador mediante rotación de validadores
const currentIndex = 4; // Puedes cambiar este valor para ver diferentes resultados
const selectedValidatorRotation = Validator.selectValidator(validators, currentIndex);
console.log("Validador seleccionado por rotación:", selectedValidatorRotation);

// Creación de una instancia de Validator
const validatorInstance = new Validator(blockchain, transactionsPool, wallet, p2pServer);

// Agregar algunas transacciones al transactions pool
transactionsPool.transactions.push(new Transaction(wallet, 'recipient', 50));
transactionsPool.transactions.push(new Transaction(wallet, 'recipient', 25));

// Validar transacciones y añadir un bloque a la blockchain
const newBlock = validatorInstance.validate();
console.log("Nuevo bloque añadido:", newBlock);


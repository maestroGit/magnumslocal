// importamos librería classe block
import { Block } from '../block.js';

//Instanciamos la clase Block
const block = new Block("12-12-25",'0'.repeat(64),'0'.repeat(64),"datoss varios");
console.log(block.toString());
//console.log(Block.getGenesisBlock().toString());

const fooBlock = Block.mineBlock(Block.getGenesisBlock(), "foovar");
console.log(Block.getGenesisBlock().toString());
console.log(fooBlock.toString());

// Creamos 25 bloques
// for (let i = 0; i < 9; i++) {
//   console.log(new Block(Date.now(),'0'.repeat(64),'0'.repeat(64),`datos:${i}`).toString());
// }
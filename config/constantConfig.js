// Dificultad de la prueba de trabajo

const DIFFICULTY = 2;
const MINE_RATE = 3000; // Wait time in milisecons
const INITIAL_BALANCE = 0;
// INITIAL_BALANCE solo es una constante que puedes usar en tu código para crear transacciones iniciales o para pruebas.
// El saldo real de una wallet en una blockchain depende de los UTXOs (outputs no gastados) que existan a su favor en la cadena de bloques.
// Si no hay una transacción (por ejemplo, en el bloque génesis) que asigne ese saldo a la wallet, la wallet tendrá saldo 0 aunque INITIAL_BALANCE sea 1000.
// El saldo real debe venir siempre de transacciones en la blockchain (como el output del bloque génesis).
// Puedes dejar INITIAL_BALANCE solo como referencia o para tests, pero no es necesario para el funcionamiento real de tu red.
// ¿Para qué podrías seguir usando INITIAL_BALANCE?
// Como valor de referencia para pruebas unitarias o scripts de test.
// Si quieres crear wallets de prueba fuera de la blockchain (por ejemplo, para simular escenarios).
// Para documentar el valor típico de arranque en tu red.
// ¿Qué es lo correcto en tu caso?
// El saldo real debe venir siempre de transacciones en la blockchain (como el output del bloque génesis).
// Puedes dejar INITIAL_BALANCE solo como referencia o para tests, pero no es necesario para el funcionamiento real de tu red.
// Resumen:
// Ahora solo necesitas que el bloque génesis asigne saldo a la wallet que quieras usar para pruebas.
// INITIAL_BALANCE ya no es imprescindible para el flujo real.

const MINING_REWARD = 1; // Recompensa minero



export { DIFFICULTY, MINE_RATE, INITIAL_BALANCE, MINING_REWARD };

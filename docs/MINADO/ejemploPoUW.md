ejemplo realista, intuitivo y sencillo, donde:
- A contiene temperaturas reales (ºC) medidas en dos parcelas.
- B contiene otra magnitud real, por ejemplo humedad relativa (%) en esas mismas parcelas.
Así verás cómo MatMul_r combina dos magnitudes físicas distintas para producir un índice compuesto.

🌡️ 1. Matriz A — Temperaturas reales (ºC)
Temperatura media día/noche en dos parcelas durante el envero:
|  |  |  | 
|  |  |  | 
|  |  |  | 


A=\left[ \begin{matrix}28&16\\ 30&18\end{matrix}\right] 

💧 2. Matriz B — Humedad relativa (%)
Humedad relativa día/noche en las mismas parcelas:
|  |  |  | 
|  |  |  | 
|  |  |  | 


B=\left[ \begin{matrix}40&60\\ 35&55\end{matrix}\right] 

🧠 ¿Qué estamos haciendo realmente?
Estamos combinando:
- Temperatura (A)
- Humedad relativa (B)
para obtener un índice térmico-hídrico compuesto, útil para:
- estimar estrés,
- evaluar riesgo de enfermedades,
- caracterizar microclimas.
MatMul_r simplemente multiplica y combina estas magnitudes.

🧮 3. MatMul_r (r=1): cálculo paso a paso
Cada celda C[i][j] se calcula en dos pasos (k=0 y k=1).

🔹 Celda C0][0] (Parcela A combinada con HR Día)
C[0][0]=28\cdot 40+16\cdot 35=1120+560=1680
Transcript:
- C_{00}^{(0)}=28\cdot 40=1120
- C_{00}^{(1)}=1120+16\cdot 35=1120+560=1680

🔹 Celda C0][1] (Parcela A con HR Noche)
C[0][1]=28\cdot 60+16\cdot 55=1680+880=2560
Transcript:
- C_{01}^{(0)}=28\cdot 60=1680
- C_{01}^{(1)}=1680+16\cdot 55=1680+880=2560

🔹 Celda C1][0] (Parcela B con HR Día)
C[1][0]=30\cdot 40+18\cdot 35=1200+630=1830
Transcript:
- C_{10}^{(0)}=30\cdot 40=1200
- C_{10}^{(1)}=1200+18\cdot 35=1200+630=1830

🔹 Celda C1][1] (Parcela B con HR Noche)
C[1][1]=30\cdot 60+18\cdot 55=1800+990=2790
Transcript:
- C_{11}^{(0)}=1800
- C_{11}^{(1)}=2790

📜 4. Transcript completo
transcript = [
  1120, 1680,
  1680, 2560,
  1200, 1830,
  1800, 2790
]



🎯 5. Verificación de una posición (i, j, k)
Supongamos que el PRF elige:
i = 1
j = 0
k = 1


Eso significa:
- Parcela B
- HR Día
- Paso 1 (acumulación final)
El verificador comprueba:

Sustituimos:
- C_{10}^{(1)}=1830
- C_{10}^{(0)}=1200
- A[1][1]=18
- B[1][0]=35
1200+18\cdot 35=1200+630=1830
✔️ Coincide → transcript válido en esa posición.

¿Quieres que ahora usemos otras magnitudes reales?
Por ejemplo:
- radiación solar,
- humedad del suelo,
- velocidad del viento,
- índice NDVI,
- pluviometría.
Puedo construirte otro ejemplo igual de claro con las magnitudes que prefieras.

🟦 1. Definir las matrices A y B (datos reales)
En Node.js, simplemente las representas como arrays:
const A = [
  [28, 16],  // Parcela A: día, noche
  [30, 18]   // Parcela B: día, noche
];

const B = [
  [40, 60],  // HR día, HR noche
  [35, 55]
];



🟩 2. Implementar MatMul_r (r=1) para generar el transcript
Cada celda Ci][j] tiene dos pasos: k=0 y k=1.
function matmul_r(A, B) {
  const n = A.length;
  const transcript = [];

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {

      // Paso k = 0
      const step0 = A[i][0] * B[0][j];
      transcript.push(step0);

      // Paso k = 1
      const step1 = step0 + A[i][1] * B[1][j];
      transcript.push(step1);
    }
  }

  return transcript;
}

const transcript = matmul_r(A, B);
console.log(transcript);


Salida esperada:
[
  1120, 1680,
  1680, 2560,
  1200, 1830,
  1800, 2790
]



🟧 3. Implementar el PRF con SHA‑256
En Node.js usamos crypto:
const crypto = require("crypto");

function PRF(seed, counter) {
  const buffer = Buffer.concat([
    Buffer.from(seed, "hex"),
    Buffer.alloc(8) // uint64
  ]);

  buffer.writeBigUInt64BE(BigInt(counter), buffer.length - 8);

  return crypto.createHash("sha256").update(buffer).digest();
}



🟨 4. Generar índices (i, j, k) a partir del PRF
function getIndicesFromPRF(seed, counter, n) {
  const R = PRF(seed, counter);

  const i = R[0] % n;
  const j = R[1] % n;
  const k = R[2] % n;

  return { i, j, k };
}


Ejemplo:
const seed = "aabbccddeeff00112233445566778899aabbccddeeff00112233445566778899";
const { i, j, k } = getIndicesFromPRF(seed, 0, 2);

console.log(i, j, k);



🟥 5. Verificar una posición del transcript
function verifyPosition(A, B, transcript, i, j, k) {
  const index = (i * 2 + j) * 2 + k; // posición en transcript

  const Ck = transcript[index];

  if (k === 0) {
    const expected = A[i][0] * B[0][j];
    return Ck === expected;
  }

  if (k === 1) {
    const Cprev = transcript[index - 1];
    const expected = Cprev + A[i][1] * B[1][j];
    return Ck === expected;
  }

  return false;
}



🟦 6. Ejecución completa: generar transcript + verificar una posición
const transcript = matmul_r(A, B);

// PRF elige una posición
const { i, j, k } = getIndicesFromPRF(seed, 0, 2);

console.log(`Verificando posición (i=${i}, j=${j}, k=${k})`);

const ok = verifyPosition(A, B, transcript, i, j, k);

console.log(ok ? "✔️ Transcript válido" : "❌ Transcript inválido");



🧵 Resumen de lo que has implementado en Node.js
- Matrices reales A (temperatura) y B (humedad).
- MatMul_r que genera un transcript paso a paso.
- PRF con SHA‑256 para elegir posiciones aleatorias.
- Verificación probabilística de una posición del transcript.
- Todo determinista, reproducible y verificable por cualquier nodo.

Si quieres, puedo darte:
- una versión completa en un solo archivo,
- una versión TypeScript,
- o una versión optimizada para rendimiento (buffers, typed arrays, etc.).

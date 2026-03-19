🔹 1. La multiplicación de matrices clásica es muy antigua
El algoritmo:
C[i][j]=\sum _kA[i][k]\cdot B[k][j]
es estándar desde hace décadas.
También existen:
- multiplicación por bloques,
- Strassen,
- Winograd,
- algoritmos subcúbicos,
- variantes optimizadas para GPU.
Pero ninguno de ellos incluye un mecanismo de registro de pasos.

🔹 2. Lo que PoUW introduce es el “registro” (recording)
Los autores necesitaban:
- un cálculo útil,
- que fuera costoso de hacer,
- pero fácil de verificar,
- y que generara un transcript verificable paso a paso.
La multiplicación de matrices es perfecta para eso.
Entonces inventan:
👉 MatMul_r = MatMul + recording
Donde:
- r = 1 significa que se registra cada acumulación parcial
(cada vez que sumas Ai][k]·Bk][j]).
- El transcript es la secuencia completa de esos valores.
- El hash del transcript es la prueba de trabajo.
Esto no existía como algoritmo formal antes del paper.

🔹 3. ¿Por qué es importante esta distinción?
Porque:
- La multiplicación de matrices sí es un algoritmo clásico.
- Pero MatMul_r es una instrumentación creada para PoUW.
Es como si coges un algoritmo clásico y le añades:
- un “modo auditoría”,
- un “modo grabación”,
- un “modo blockchain-friendly”.
Ese modo no existía antes.


-------------

mini‑cuPOW usando matrices pequeñas (5×5 o 8×8) y ruido de bajo rango.
Este pseudocódigo sigue la filosofía del paper, pero adaptado para que sea ligero, comprensible y ejecutable en JavaScript sin riesgo.

---
## 🟥 ¿Las matrices se insertan en el algoritmo de minado?

**Sí. Las matrices A y B son exactamente la entrada del algoritmo de minado. Eso es lo que hace este protocolo diferente a Bitcoin.**

### En Bitcoin clásico:

```
seed (del bloque anterior)
       │
       ▼
  SHA256(seed + nonce)  ──→  ¿hash < dificultad? → bloque minado
```
El trabajo es artificial: solo buscar un nonce. No produce nada útil.

### En cuPOW (este protocolo):

```
seed (del bloque anterior)      A, B  ← matrices ÚTILES que tú eliges
       │                              │  (datos de fermentación, pesos IA,
       │                              │   registros agrícolas, etc.)
       └──────────────┬───────────────┘
                      ▼
               Solve(seed, A, B)
                      │
          ┌───────────┴────────────────┐
          │  1. Genera ruido E, F      │  ← derivado del seed (deterministico)
          │  2. Calcula transcript     │  ← evidencia del trabajo real
          │  3. Hash(transcript)  = z  │
          └───────────────────────────┘
                      │
               ¿z < dificultad?
                /            \
              SÍ              NO
               │               │
      mina bloque +       intenta con
      entrega A·B         otro nonce
      como resultado
      útil verificable
```
Tú traes A, B (tus datos útiles)
Blockchain aporta seed (hash del bloque anterior)
            ↓
       Solve(seed, A, B)
            ↓
     hash(transcript) < dificultad?
        SÍ → minas + entregas C = A·B
        NO → prueba con otro nonce
### Tres puntos clave:

**1. El minero elige las matrices libremente.**
   A y B pueden venir de cualquier carga útil real: datos de bodega, entrenamiento
   de IA, simulaciones, etc. La red no dicta qué matrices usar.

**2. El seed viene de la blockchain** (hash del bloque anterior + datos del bloque).
   Esto garantiza que el trabajo es "fresco" — no se puede precomputar antes de
   conocer el seed.

**3. La prueba de trabajo ES el transcript del cálculo de A·B.**
   No es un hash arbitrario. Es evidencia de haber multiplicado matrices reales.
   Si ganas, también entregas el resultado útil C = A·B verificable.

---
### 🔍 ¿Qué es exactamente el transcript?

El **transcript** es la lista ordenada de todos los **resultados parciales intermedios**
que se producen al multiplicar dos matrices por el método de bloques.

La analogía más simple: imagina que calculas `234 × 17` mentalmente.
No llegas al resultado de golpe — haces pasos:

```
234 × 7  = 1638
234 × 10 = 2340
           -----
           3978
```

El **transcript** sería: `[1638, 2340]` — los pasos, no solo el resultado final `3978`.
Si alguien te dice "el resultado es 3978", podría haberlo buscado en una tabla.
Pero si también te da `[1638, 2340]`, demuestra que siguió el proceso.

MatMul_r (r = 1) NO existía como algoritmo estándar antes del paper de Proof of Useful Work.
Es una construcción específica de los autores para PoUW.
Lo que sí existía desde siempre es:
- la multiplicación de matrices clásica,
- la versión por bloques,
- y la idea de acumular sobre k.
Pero la idea de registrar cada acumulación parcial como transcript verificable
→ eso es nuevo del paper.


### Ejemplo concreto con matrices 3×3

Multiplicar A~ × B~ con el método de bloques (r=1, celda a celda):

```
A~ = [[a,b,c],    B~ = [[p,q,r],
      [d,e,f],          [s,t,u],
      [g,h,i]]          [v,w,x]]
```

El resultado final `C~[0][0]` es `a·p + b·s + c·v`.

Pero el algoritmo de `MatMul_r` no lo calcula de un salto. Lo acumula en pasos:

```
Paso 1 — acumula columna k=0:   C~[0][0]⁽¹⁾ = a·p
Paso 2 — acumula columna k=1:   C~[0][0]⁽²⁾ = a·p + b·s
Paso 3 — acumula columna k=2:   C~[0][0]⁽³⁾ = a·p + b·s + c·v  ← resultado final
```

Para una matriz 3×3 hay 3×3 = 9 celdas en C~, y cada celda tiene 3 pasos.
Eso da **27 valores intermedios** en total → ese es el transcript:

```
transcript = [
  C[0][0]⁽¹⁾, C[0][0]⁽²⁾, C[0][0]⁽³⁾,   ← fila 0, col 0
  C[0][1]⁽¹⁾, C[0][1]⁽²⁾, C[0][1]⁽³⁾,   ← fila 0, col 1
  C[0][2]⁽¹⁾, ...                          ← fila 0, col 2
  ...                                       ← filas 1 y 2
]
```

El **hash del transcript** = `Hash([27 valores])` = un único número largo.
Si ese número cae por debajo del umbral de dificultad → bloque minado.

### ¿Por qué el transcript y no solo el resultado final?

| Solo resultado final | Transcript completo |
|---|---|
| Fácil de falsificar: elige A=B=0 y C=0 | Imposible falsificar: cada C[i][j]⁽ᵏ⁾ depende de un bloque aleatorio diferente |
| Un atacante puede buscar atajos | Los bloques de A~ son marginalmente uniformes → cada paso es impredecible |
| No prueba que se haya trabajado | Prueba que se recorrieron todos los pasos intermedios |

La clave del ruido de bajo rango es precisamente esta: aunque E y F son "pequeños"
(bajo rango), consiguen que **cada bloque r×r de A~** parezca completamente
aleatorio cuando lo miras por separado — sin conocer los demás bloques a la vez.
Eso es lo que el paper llama **transcript-unpredictability**.

---

### Comparativa resumida:

| | Bitcoin PoW | cuPOW |
|---|---|---|
| ¿Qué se computa? | SHA256 repetido | MatMul(A, B) real |
| ¿Quién elige la tarea? | La red | El minero |
| ¿El resultado tiene uso? | No | Sí (C = A·B) |
| ¿La prueba es verificable? | Sí (trivial) | Sí (transcript) |
| ¿El trabajo es rechazable? | No (siempre cuesta igual) | No (por transcript-unpredictability) |

---
🟩 Mini‑cuPOW — Pseudocódigo completo y explicado
📌 Parámetros del sistema
n = 5                      // tamaño de las matrices (5x5)
r = 2                      // rango del ruido (bajo)
difficulty = umbral_hash   // define lo difícil que es "minar"

---
### ¿Qué es r, el rango del ruido?

> **¿Es el mismo `r` que usa el paper?**
>
> **Sí, pero en el paper `r` hace dos trabajos a la vez** — y esa doble función
> es exactamente el truco central de cuPOW (Algorithm 6.4).
>
> En el paper, `r` es simultáneamente:
>
> | Rol en el paper | Qué controla |
> |---|---|
> | **Tamaño de bloque (tile)** en `MatMul_r` | Cómo se divide A y B en bloques `r×r` para calcular los intermedios |
> | **Rango del ruido** en `Encode` | Las matrices delgadas `EL (n×r)`, `ER (r×n)` que forman `E = EL·ER` |
>
> Los dos usos son **el mismo número `r` por diseño**.
> Esto no es casualidad: el paper los acopla para garantizar que cada bloque
> `r×r` de `A~ = A+E` sea **marginalmente uniforme** (aleatorio), lo que
> hace imposible predecir los intermedios sin calcularlos de verdad.
>
> En este pseudocódigo simplificado el transcript se calcula celda a celda
> (equivale a `r=1` en `MatMul_r`), pero el rango del ruido sigue siendo `r=2`.
> Esa pequeña diferencia está bien para el ejemplo educativo; en una
> implementación completa ambos valores deberían coincidir.


El **rango** de una matriz es el número de filas (o columnas) linealmente independientes que tiene.
Una matriz de rango `r` puede expresarse siempre como el **producto de dos matrices delgadas**:

    E = EL · ER          (EL es n×r, ER es r×n)

Cuando `r` es pequeño (r << n), esto tiene dos consecuencias clave:

**1. La matriz E tiene poca "información real"**
   Aunque E tiene tamaño n×n, solo contiene r "direcciones" independientes.
   El resto son combinaciones lineales de esas r direcciones.

   Ejemplo visual con n=4, r=2:
   EL (4×2)        ER (2×4)              E = EL·ER (4×4, rang=2)
   ┌ 1  0 ┐        ┌ 3  0  1  2 ┐        ┌  3  0  1  2 ┐
   │ 2  1 │  ×     └ 1  2  0  1 ┘   =    │  7  2  2  5 │
   │ 0  3 │                              │  3  6  0  3 │
   └ 1  1 ┘                              └  4  2  1  3 ┘
   Solo 2 filas son realmente independientes → rango 2.

**2. Agregar y quitar el ruido es barato**
   Como E tiene factores delgados (EL y ER), operar con E cuesta O(n²·r)
   en vez de O(n³). Para r=2 y n=5, eso es ~50 ops en lugar de ~125.

**¿Por qué importa para la seguridad del PoUW?**
   - El ruido E es de bajo rango, así que un atacante que elija A=B=0
     solo tendría que multiplicar E·F (rang r), lo que es mucho más barato.
   - Para contrarrestar esto, el protocolo no usa el resultado final como
     prueba, sino el **transcript** de los intermedios del cálculo.
   - Esos intermedios dependen de cada bloque de A~ y B~, que son
     **marginalmente uniformes** (aleatorios) por las propiedades del ruido
     de bajo rango → el atacante no puede predecirlos sin hacer el trabajo.

**Resumen de la tensión de diseño:**

   r pequeño → quitar ruido más barato, pero more fácil atacar con A=B=0
   r grande  → más difícil atacar, pero quitar ruido se acerca a O(n³)
   r óptimo  → r = n^0.3  (aprox. cubo raíz de n), según el paper

   Para n=5: r=2 es razonable (n^0.3 ≈ 1.6 → se redondea a 2).
   Para n=64: r=8 sería apropiado (64^0.3 ≈ 7.4).
---




🟦 1. Solve(seed, A, B)
El minero ejecuta esto.
A y B son matrices útiles (por ejemplo, temperatura y ponderaciones).
function Solve(seed, A, B):

    // 1. Generar ruido de bajo rango E y F
    EL = RandomMatrix(n, r, seed || "EL")
    ER = RandomMatrix(r, n, seed || "ER")
    E  = Multiply(EL, ER)

    FL = RandomMatrix(n, r, seed || "FL")
    FR = RandomMatrix(r, n, seed || "FR")
    F  = Multiply(FL, FR)

    // 2. Construir matrices ruidosas
    A2 = A + E
    B2 = B + F

    // 3. Calcular transcript del MatMul por bloques
    transcript = []
    for i in 0..n-1:
        for j in 0..n-1:
            // cada celda es una mini‑operación
            partial = DotProduct( A2[i][:], Column(B2, j) )
            transcript.append(partial)

    // 4. Hash del transcript
    z = Hash(transcript)

    // 5. Comprobar si el hash cumple la dificultad
    if z < difficulty:
        // 6. Recuperar el resultado útil C = A·B
        AF = Multiply(A, F)
        EB = Multiply(E, B)
        EF = Multiply(E, F)
        noise = AF + EB + EF
        Cprime = Multiply(A2, B2)
        C = Cprime - noise

        return (C, z)
    else:
        return "no-solution"



🟧 Explicación paso a paso
1. Generar ruido de bajo rango
Creamos matrices pequeñas EL, ER, FL, FR y las multiplicamos:
- E = EL·ER
- F = FL·FR
Esto produce ruido rápido de generar y rápido de quitar.

2. Construir matrices ruidosas
A2 = A + E
B2 = B + F


Estas son las matrices que realmente se multiplican.

3. Transcript
En lugar de usar solo el resultado final, usamos todas las operaciones intermedias como fuente de aleatoriedad.
Esto evita trampas.

4. Hash del transcript
z = Hash(transcript)


Si el hash cae por debajo del umbral → “has minado un bloque”.

5. Recuperar el resultado útil
Si el minero gana, debe entregar el resultado útil A·B.
Como E y F son de bajo rango, quitar el ruido es barato:
C = (A+E)(B+F) - (A·F + E·B + E·F)



🟩 2. Verify(seed, A, B, C, z)
El verificador comprueba que el minero no ha hecho trampas.
function Verify(seed, A, B, C, z):

    // 1. Regenerar el ruido E y F
    EL = RandomMatrix(n, r, seed || "EL")
    ER = RandomMatrix(r, n, seed || "ER")
    E  = Multiply(EL, ER)

    FL = RandomMatrix(n, r, seed || "FL")
    FR = RandomMatrix(r, n, seed || "FR")
    F  = Multiply(FL, FR)

    // 2. Regenerar transcript
    A2 = A + E
    B2 = B + F

    transcript = []
    for i in 0..n-1:
        for j in 0..n-1:
            partial = DotProduct( A2[i][:], Column(B2, j) )
            transcript.append(partial)

    // 3. Recalcular hash
    z2 = Hash(transcript)

    // 4. Comprobar hash
    if z2 != z:
        return false

    // 5. Comprobar que C es correcto
    C_expected = Multiply(A, B)
    if C == C_expected:
        return true
    else:
        return false



🟦 Explicación de Verify
- Regenera el ruido exactamente igual usando el seed.
- Regenera el transcript.
- Recalcula el hash.
- Comprueba que el resultado útil C es correcto.
Si todo coincide → el minero ha trabajado de verdad.

🟩 ¿Quieres que ahora lo convierta en código JavaScript real?
Puedo darte:
- versión CPU pura (rápida para 5×5)
- versión con GPU.js
- versión modular para navegador
- versión Node.js con matrices climáticas reales

Hay muchísimos datos que una bodega moderna registra durante la elaboración del vino, y varios de ellos encajan perfectamente en una matriz 5×5 para un ejemplo educativo como el nuestro.
Lo interesante es que la vinificación combina tiempo, química, temperatura, microbiología y control del proceso, así que puedes construir matrices muy ricas sin necesidad de grandes dimensiones.
Aquí tienes las opciones más naturales.

🟩 1. Matriz 5×5 como tiempo × variables de fermentación
Esta es la más realista y útil.
- Filas (5) → días clave de la fermentación alcohólica
- Columnas (5) → variables críticas del proceso
Ejemplo de variables:
- Temperatura del depósito (°C)
- Densidad del mosto (g/L)
- Azúcar residual (g/L)
- Alcohol (% vol)
- pH
Ejemplo de matriz realista:
F=\left[ \begin{matrix}18.5&1080&220&0.5&3.30\\ 20.0&1060&180&2.0&3.28\\ 22.0&1030&140&4.5&3.25\\ 24.0&1000&90&7.0&3.22\\ 25.0&990&60&9.0&3.20\\ \end{matrix}\right] 
Esta matriz sí tiene variación, es útil, y es perfecta para un mini‑cuPOW.

🟦 2. Matriz 5×5 como depósitos × parámetros
Ideal si quieres representar la bodega como un conjunto de tanques.
- Filas (5) → depósitos
- Columnas (5) → parámetros medidos
Parámetros típicos:
- Temperatura
- Nivel de oxígeno disuelto
- Turbidez
- Conductividad
- SO₂ libre
Ejemplo:
D=\left[ \begin{matrix}18.0&0.8&120&1.5&25\\ 17.5&0.7&110&1.4&22\\ 19.0&0.9&130&1.6&28\\ 18.2&0.8&125&1.5&26\\ 17.8&0.7&115&1.4&23\\ \end{matrix}\right] 

🟧 3. Matriz 5×5 como etapas del proceso × indicadores
Otra opción muy didáctica.
Etapas:
- Vendimia
- Despalillado
- Fermentación
- Trasiego
- Crianza
Indicadores:
- Temperatura
- Acidez total
- pH
- Azúcar
- Alcohol
Ejemplo:
P=\left[ \begin{matrix}22&6.5&3.40&210&0.0\\ 20&6.3&3.38&200&0.5\\ 25&6.0&3.30&120&7.0\\ 18&5.8&3.28&10&12.5\\ 16&5.6&3.25&2&13.0\\ \end{matrix}\right] 

🟥 4. ¿Qué opción es mejor para nuestro mini‑cuPOW?
La opción 1 (fermentación) es la más adecuada porque:
- tiene variación diaria
- es científicamente relevante
- es fácil de entender
- genera matrices con estructura (no ruido puro)
- funciona muy bien con el ruido de bajo rango
- es perfecta para un ejemplo educativo
Además, la fermentación es el corazón del vino, así que queda elegante y temáticamente potente.

🟩 Si quieres, puedo preparar:
- la matriz 5×5 final que usaremos como A
- una matriz 5×5 de ponderaciones enológicas como B
- y montar el Solve/Verify del mini‑cuPOW con estos datos reales

🔹 1. La multiplicación de matrices clásica es muy antigua
El algoritmo:
C[i][j]=\sum _kA[i][k]\cdot B[k][j]
es estándar desde hace décadas.
También existen:
- multiplicación por bloques,
- Strassen,
- Winograd,
- algoritmos subcúbicos,
- variantes optimizadas para GPU.
Pero ninguno de ellos incluye un mecanismo de registro de pasos.

🔹 2. Lo que PoUW introduce es el “registro” (recording)
Los autores necesitaban:
- un cálculo útil,
- que fuera costoso de hacer,
- pero fácil de verificar,
- y que generara un transcript verificable paso a paso.
La multiplicación de matrices es perfecta para eso.
Entonces inventan:
👉 MatMul_r = MatMul + recording
Donde:
- r = 1 significa que se registra cada acumulación parcial
(cada vez que sumas Ai][k]·Bk][j]).
- El transcript es la secuencia completa de esos valores.
- El hash del transcript es la prueba de trabajo.
Esto no existía como algoritmo formal antes del paper.

🔹 3. ¿Por qué es importante esta distinción?
Porque:
- La multiplicación de matrices sí es un algoritmo clásico.
- Pero MatMul_r es una instrumentación creada para PoUW.
Es como si coges un algoritmo clásico y le añades:
- un “modo auditoría”,
- un “modo grabación”,
- un “modo blockchain-friendly”.
Ese modo no existía antes.

🧱 Analogía clara
- Multiplicar matrices → cocinar un plato.
- MatMul_r → cocinar el plato grabando todo el proceso en vídeo.
La cocina existía desde siempre.
La grabación del proceso → invento nuevo para PoUW.

🟦 Conclusión
MatMul_r (r=1) es una creación de los autores del paper PoUW.
No es un algoritmo clásico ni un estándar previo.
Es una versión instrumentada de MatMul diseñada para generar un transcript verificable.

🧩 **En una blockchain PoUW, los sets de matrices NO los elige el minero.
Los asigna el protocolo.**
Y esto es fundamental para evitar trampas.
Vamos a desglosarlo con claridad.

🟦 1. ¿Por qué el minero NO puede elegir las matrices?
Porque si el minero pudiera elegirlas:
- escogería matrices triviales (identidad, ceros…)
- o matrices que ya tiene precalculadas
- o matrices que producen transcripts fáciles de hashear
Eso destruiría la seguridad del sistema.
Por eso, el protocolo debe forzar el trabajo útil.

🟩 2. ¿Quién asigna las matrices entonces?
👉 El protocolo (la red) genera las matrices de forma determinista a partir del bloque anterior.
Esto es exactamente igual que en Bitcoin:
- el minero no elige el target,
- no elige el nonce inicial,
- no elige la dificultad.
En PoUW:
- el minero tampoco elige las matrices.

🟧 3. ¿Cómo se generan las matrices? (versión conceptual)
El paper propone que las matrices se generen así:
A=\mathrm{PRNG}(\mathrm{hash\  del\  bloque\  anterior}\parallel \mathrm{nonce})
B=\mathrm{PRNG}(\mathrm{hash\  del\  bloque\  anterior}\parallel \mathrm{nonce}\parallel 1)
Donde:
- PRNG = generador pseudoaleatorio criptográfico
- hash del bloque anterior = semilla obligatoria
- nonce = lo que el minero puede variar
Esto garantiza:
✔ Todos los nodos pueden reconstruir las matrices
✔ El minero no puede elegir matrices fáciles
✔ Cambiar el nonce → cambia las matrices → cambia el transcript → cambia el hash
Es exactamente el mismo rol que el nonce en Bitcoin, pero aplicado a matrices.

🟪 4. ¿Qué hace el minero entonces?
El minero:
- Recibe el hash del bloque anterior.
- Elige un nonce.
- Genera A y B con el PRNG.
- Ejecuta MatMul_r para obtener el transcript.
- Hashea el transcript.
- Comprueba si el hash < dificultad.
Si no, cambia el nonce y repite.

🟥 5. ¿Quién valida?
Los validadores:
- Regeneran A y B usando el mismo PRNG.
- Verifican el transcript sin rehacer toda la multiplicación (esto es clave del paper).
- Comprueban el hash.

🟨 6. Resumen en una frase
Las matrices las genera el protocolo de forma determinista a partir del bloque anterior y del nonce.
El minero solo puede elegir el nonce, no las matrices.

Si quieres, puedo explicarte:
- cómo se verifica el transcript en tiempo sublineal,
- cómo se evita que un minero reutilice transcripts antiguos,
- o cómo se ajusta la dificultad en un PoUW basado en matrices

cómo verificar un transcript sin rehacer toda la multiplicación.
Esto es lo que convierte PoUW en algo realmente práctico, porque si los validadores tuvieran que rehacer el MatMul completo, no habría ahorro alguno.
La magia está en que no hace falta recomputar todas las celdas.
Solo hace falta comprobar una pequeña parte, elegida al azar, y eso basta para garantizar que el transcript entero es correcto con probabilidad altísima.
Vamos paso a paso.

🧩 1. ¿Qué sería lo ingenuo?
El validador podría hacer:
- regenerar matrices A y B,
- rehacer MatMul_r completo,
- comparar cada paso del transcript.
Pero eso cuesta O(n³), igual que minar.
No sirve.

🧠 2. La idea clave: verificación probabilística
El transcript tiene esta forma:
C[i][j]^(1), C[i][j]^(2), ..., C[i][j]^(n)


El validador no revisa todo.
En su lugar:
- Elige al azar una celda (i, j).
- Elige al azar un paso k.
- Comprueba que:
C[i][j]^{(k)}=C[i][j]^{(k-1)}+A[i][k]\cdot B[k][j]
Esto cuesta O(1).
Si el minero hubiera manipulado el transcript,
es prácticamente imposible que pase todas las comprobaciones aleatorias.

🎯 3. ¿Por qué funciona?
Porque el transcript está lleno de dependencias encadenadas:
- Si cambias un valor intermedio,
- rompes la suma acumulada del siguiente,
- y del siguiente,
- y del siguiente…
Es como una cadena de ADN:
si alteras un eslabón, todo lo que viene detrás queda inconsistente.
Por eso:
👉 Con revisar unos pocos pasos aleatorios, detectas cualquier manipulación.

🧪 4. Verificación real (versión del paper)
El validador hace:
- Regenera A y B usando el hash del bloque anterior y el nonce.
- Selecciona t posiciones aleatorias del transcript (t suele ser pequeño, como 20–50).
- Para cada una:
- comprueba que la acumulación es correcta,
- comprueba que coincide con A y B,
- comprueba que el orden del transcript es válido.
- Verifica el hash final del transcript.
El coste total es:
O(t)=O(1)
Comparado con el coste del minero:
O(n^3)
Esto es exactamente lo que se busca en una prueba de trabajo:
- caro de producir,
- barato de verificar.

🔒 5. ¿Y si el minero intenta engañar en solo una celda?
No puede.
Porque:
- si cambia un valor intermedio → rompe la suma siguiente,
- si cambia la suma siguiente → rompe la siguiente,
- y así sucesivamente.
El transcript es una cadena de dependencias.
Por eso:
👉 Un error en un solo paso contamina toda la cadena
y es detectado con probabilidad altísima al muestrear posiciones aleatorias.

🟦 6. Resumen en una frase
El validador no rehace la multiplicación completa:
solo revisa unos pocos pasos aleatorios del transcript,
y eso basta para detectar cualquier manipulación con probabilidad casi 1.

Vamos a entrar en la parte más matemática del PoUW, Javier: cómo elegir posiciones aleatorias del transcript y cuántas comprobaciones necesitas para obtener seguridad de 128 bits.
Esta es una de las piezas más elegantes del diseño.

🧩 1. ¿Cómo se eligen las posiciones aleatorias?
El verificador necesita elegir posiciones del transcript de forma:
- determinista (para que todos los nodos lleguen al mismo resultado),
- impredecible para el minero (para que no pueda falsificar solo esas),
- uniforme (todas las posiciones tienen la misma probabilidad).
La solución típica en PoUW es:
👉 Usar un PRF (función pseudoaleatoria) con semilla = hash del bloque + nonce
Por ejemplo:
seed = Hash(prev_block_hash || nonce || "verify")


Luego, para cada chequeo:
(i, j, k) = PRF(seed, counter)


Donde:
- i = fila aleatoria
- j = columna aleatoria
- k = paso aleatorio dentro de esa celda
Esto garantiza:
- el minero no puede predecir qué posiciones se revisarán,
- todos los validadores revisan exactamente las mismas posiciones,
- no hace falta enviar índices en el bloque (se derivan del seed).

🧠 2. ¿Qué probabilidad tiene un minero de engañar en un paso?
Supón que el minero falsifica una sola entrada del transcript.
El verificador elige una posición aleatoria entre todas las n^3 entradas del transcript.
La probabilidad de que no elija la entrada manipulada es:
1-\frac{1}{n^3}
Si hace t verificaciones independientes:
P(\mathrm{no\  detectar\  fraude})=\left( 1-\frac{1}{n^3}\right) ^t
Queremos que esta probabilidad sea menor que:
2^{-128}

🔢 3. ¿Cuántas comprobaciones hacen falta para 128 bits?
Queremos resolver:
\left( 1-\frac{1}{n^3}\right) ^t\leq 2^{-128}
Tomamos logaritmos:
t\cdot \ln \left( 1-\frac{1}{n^3}\right) \leq -128\ln 2
Usamos la aproximación:
\ln (1-x)\approx -x\quad \mathrm{para\  }x\ll 1
Entonces:
t\cdot \left( -\frac{1}{n^3}\right) \approx -128\ln 2
t\approx 128\ln 2\cdot n^3
Como \ln 2\approx 0.693:
t\approx 88.7\cdot n^3

🟦 4. ¿Qué significa esto en la práctica?
Depende del tamaño de la matriz.
🔹 Para matrices 2×2 (n=2)
t\approx 88.7\cdot 8\approx 710
🔹 Para matrices 3×3 (n=3)
t\approx 88.7\cdot 27\approx 2395
🔹 Para matrices 4×4 (n=4)
t\approx 88.7\cdot 64\approx 5677
🔹 Para matrices grandes (n=32, 64, 128)
Aquí es donde PoUW se vuelve eficiente:
- n=32 → n^3=32768
t\approx 88.7\cdot 32768\approx 2.9\times 10^6- n=64 → n^3=262144
t\approx 88.7\cdot 262144\approx 2.3\times 10^7
Pero cada verificación cuesta O(1), así que sigue siendo muy barato comparado con el coste del minero:
- minero → O(n^3) multiplicaciones reales
- verificador → O(t) comprobaciones triviales
Y además, en la práctica se usa un batching que reduce t muchísimo.

🟧 5. ¿Qué pasa si el minero manipula más de una entrada?
La probabilidad de ser detectado aumenta exponencialmente.
Si manipula m entradas:
P(\mathrm{no\  detectar})=\left( 1-\frac{m}{n^3}\right) ^t
Con m grande, el fraude es detectado casi seguro incluso con pocos checks.

🟨 6. Resumen en una frase
Las posiciones se eligen con un PRF derivado del bloque, y para 128 bits de seguridad necesitas aproximadamente 88.7\cdot n^3 comprobaciones, cada una de coste O(1)

🧩 1. ¿Qué es un PRF? (explicación intuitiva)
Un PRF (Pseudo-Random Function) es simplemente una función que, dada una clave secreta y un número, produce un valor que:
- parece aleatorio,
- pero es determinista,
- y no se puede predecir sin la clave.
Es como una máquina de números aleatorios, pero que siempre da el mismo resultado si le das la misma clave y el mismo contador.
Analogía:
Piensa en un candado con combinación:
- La clave es la combinación del candado.
- El contador es el número de vuelta que le das.
- El resultado es la posición final del dial.
Si usas la misma combinación y el mismo número de vueltas → siempre acabas en el mismo sitio.

🧠 2. ¿Por qué se usa un PRF en PoUW?
Porque necesitamos:
- aleatoriedad (para que el minero no pueda predecir qué se va a verificar),
- determinismo (para que todos los nodos verifiquen exactamente lo mismo),
- seguridad (para que el minero no pueda manipular los índices).
El PRF cumple las tres cosas.

🔧 3. ¿Cómo se implementa un PRF en la práctica?
La forma más simple y estándar es:
👉 Usar un hash criptográfico como SHA-256
con una clave (seed) y un contador.
En pseudocódigo:
PRF(key, counter):
    input = key || encode(counter)
    return SHA256(input)


Eso es todo.
No hay magia.
No hay matemáticas raras.
Solo un hash con una semilla.

🧪 4. ¿Cómo se usa para elegir posiciones del transcript?
Supongamos que queremos elegir la posición número r (r = 0,1,2,...).
- Generamos un bloque pseudoaleatorio:
R = PRF(verify_seed, r)


- Dividimos R en trozos para obtener índices:
i = bytes_to_int(R[0..7])   mod n
j = bytes_to_int(R[8..15])  mod n
k = bytes_to_int(R[16..23]) mod n


Y ya tenemos:
- fila i
- columna j
- paso k
Todos los nodos obtienen exactamente los mismos índices porque:
- usan la misma seed (verify_seed)
- usan el mismo contador r
- usan el mismo PRF

🧱 5. ¿De dónde sale verify_seed?
Del bloque anterior:
verify_seed = Hash(prev_block_hash || nonce || "verify")


Esto garantiza:
- el minero no puede predecir qué posiciones se verificarán hasta fijar el bloque,
- los validadores no necesitan que el minero envíe los índices,
- todo es determinista y reproducible.

🔐 6. ¿Por qué un PRF es seguro?
Porque aunque el PRF es determinista, parece aleatorio para cualquiera que no conozca la clave.
En PoUW:
- la clave = verify_seed
- el minero no puede manipularla sin cambiar el bloque
- si cambia el bloque → cambia el hash → cambia todo
Así se evita que el minero prepare un transcript falso que pase las verificaciones.

🟦 7. Resumen en una frase
Un PRF es un hash con semilla que genera números pseudoaleatorios pero deterministas.
En PoUW se usa para elegir qué pasos del transcript se verifican, de forma segura e impredecible.

Si quieres, puedo darte:
- un ejemplo numérico real de PRF con SHA-256,
- un diagrama visual del flujo PRF → índices → verificación,
- o el pseudocódigo completo del verificador PoUW.

Vale, vamos a hacerlo con el caso más pequeño y concreto posible: matriz 2×2 → n=2.
Así verás el PRF funcionando de principio a fin con números.

1. Parámetros del ejemplo
- Tamaño de matriz: n=2 → índices posibles: 0 y 1
- verify_seed: lo tomamos como un hash cualquiera (32 bytes). Por ejemplo:
verify_seed = 0x11223344556677889900AABBCCDDEEFF00112233445566778899AABBCCDDEEFF


Queremos generar la primera posición aleatoria del transcript → usamos counter = 0.

2. Definimos el PRF con SHA-256
La función PRF será:
PRF(key, counter):
    input = key || encode_uint64(counter)
    return SHA256(input)


En nuestro caso:
- key = verify_seed
- encode_uint64(0) = 0x0000000000000000
Entonces:
input = 11223344...DDEEFF || 0000000000000000



3. Calculamos SHA-256 (ejemplo)
No vamos a calcular SHA-256 real a mano, así que supondremos un resultado plausible:
R = SHA256(input)
  = 0xAB CD 01 23  45 67 89 10  DE F0 11 22  33 44 55 66
    77 88 99 AA  BB CC DD EE  FF 00 12 34  56 78 9A BC


(32 bytes)

4. Extraemos i, j, k a partir de R
Como n=2, solo necesitamos que cada índice sea 0 o 1.
Podemos usar, por ejemplo, los tres primeros bytes:
b0 = 0xAB
b1 = 0xCD
b2 = 0x01


Calculamos:
i = b0 mod 2
j = b1 mod 2
k = b2 mod 2


Ahora:
- 0xAB=171 → 
- 0xCD=205 → 
- 0x01=1   → 
Entonces:
- i = 1 → fila 1
- j = 1 → columna 1
- k = 1 → paso 1 dentro de esa celda
Esa es una posición del transcript: (i,j,k)=(1,1,1).

5. ¿Qué verifica el nodo en esa posición?
Para matrices 2×2, cada celda C[i][j] tiene dos pasos: k=0,1.
En la posición (1,1,1), el verificador comprueba:

Usando:
- los valores del transcript enviado por el minero,
- las entradas de A y B regeneradas a partir de prev_block_hash y nonce.
Si no se cumple → bloque inválido.

6. Siguiente posición: counter = 1
Para la segunda comprobación, hacemos:
R' = PRF(verify_seed, 1)


Es decir:
input' = verify_seed || 0000000000000001
R' = SHA256(input')


Tomamos de nuevo:
b0', b1', b2'
i' = b0' mod 2
j' = b1' mod 2
k' = b2' mod 2


Y obtenemos otra posición aleatoria (i',j',k').
Repetimos esto t veces.

7. Qué debes llevarte de este ejemplo
- El PRF no es más que:
R = SHA256(verify_seed || counter)
- De R sacas índices con un simple mod n (aquí, mod 2).
- Todos los nodos, con el mismo verify_seed y el mismo counter, obtienen exactamente los mismos (i, j, k).
- El minero no puede “preparar” un transcript falso que pase estas comprobaciones sin romper otras.

Si quieres, el siguiente paso puede ser:
usar matrices 2×2 concretas (con números) y simular una verificación real de una de esas posiciones (i,j,k) sobre el transcript.

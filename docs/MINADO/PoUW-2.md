# PoUW - Resumen detallado de "Proofs of Useful Work from Arbitrary Matrix Multiplication"

## 1) Ficha rapida del paper

- Titulo: `Proofs of Useful Work from Arbitrary Matrix Multiplication`
- Autores: Ilan Komargodski, Omri Weinstein
- Version leida: `arXiv:2504.09971v4` (13 Nov 2025)
- Problema central: construir un PoW tipo Nakamoto que use trabajo computacional util, manteniendo seguridad permissionless y costo casi optimo para mineros honestos.
- Resultado principal: primer esquema PoUW para `MatMul(A, B)` con overhead multiplicativo `1 + o(1)` respecto al costo base de multiplicar matrices.

## 2) Contexto y motivacion

El paper parte de la critica clasica a PoW:

- Bitcoin/Hashcash son robustos, pero gastan energia en hashing sin utilidad externa directa.
- PoUW historicamente no habia logrado simultaneamente:
  - utilidad economica real,
  - eficiencia cercana al trabajo nativo,
  - seguridad contra mineros maliciosos que intenten "atajos".

La novedad de este trabajo es proponer una construccion concreta para multiplicacion de matrices, una tarea util y dominante en cargas reales (especialmente IA).

## 2.1) Explicacion didactica en 60 segundos

Piensalo asi:

- En Bitcoin clasico, "minar" es hacer millones de hashes sin otro uso.
- En PoUW, "minar" debe ser trabajo que alguien ya queria pagar (por ejemplo, multiplicar matrices para IA).
- Problema: si solo pides el resultado final `AB`, un atacante puede buscar atajos.
- Solucion del paper: no validar solo el resultado final, sino parte del camino de calculo (`transcript`), para que hacer trampa sea casi tan caro como calcular bien.

Resumen mental:

- `Solve` = resolver la tarea util + generar prueba.
- `Verify` = comprobar que la prueba parece venir de trabajo real.
- Dificultad = un umbral hash (igual que PoW), pero aplicado sobre evidencia de computo util.

## 3) Que significa PoUW en este paper

Los autores formalizan PoUW con dos algoritmos:

- `Solve(seed, x) -> (y, pi)`
- `Verify(seed, pi) -> {0,1}`

Donde `x` es la instancia util (en este caso, matrices), `y` la solucion, `pi` la prueba.

Propiedades requeridas:

- Eficiencia:
  - `Solve` debe costar `t(n) * (1 + gamma(n))`, con `gamma(n)` idealmente pequeno (meta: `o(1)`).
  - `Verify` puede ser sublineal o proporcional controlado; luego discuten SNARK/zkSNARK para mejorar verificacion.
- Completitud:
  - minero honesto produce salida correcta y `Verify` acepta con probabilidad objetivo `delta`.
- Hardness:
  - un atacante con runtime comparable no debe aumentar de forma significativa su probabilidad de aceptacion frente al honesto.

Idea clave de seguridad: la razon "probabilidad de convencer / trabajo computacional" del atacante no debe superar materialmente la del minero honesto.

## 4) Intuicion tecnica: de ruido en salida a ruido en transcript

### 4.1 Primer paso (intuitivo, no suficiente)

Se podria pedir computar producto ruidoso:

- `C = (A + E)(B + F)` con `E, F` derivados de `seed`.

Eso fuerza trabajo sobre una instancia aleatoria, pero no entrega directamente `AB` util. Si se intenta "desruidar" naivamente para recuperar `AB`, aparecen multiplicaciones extra y el honesto paga mucho mas que un atacante.

### 4.2 Giro principal del paper

En vez de usar como prueba solo la salida final, usan el `transcript` de la multiplicacion por bloques:

- particionan matrices en tiles `r x r`,
- consideran estados intermedios `C_{i,j}^{(k)}`,
- hacen que la prueba dependa de ese transcript.

Esto intenta forzar que el minero efectivamente ejecute el proceso computacional y no solo "adivine" salida valida.

## 5) Algoritmo base de MatMul y transcript

Definen `MatMul_r` (algoritmo canonico por bloques):

- divide `A, B, C` en bloques `r x r`,
- actualiza `C_{i,j}^{(k)} = C_{i,j}^{(k-1)} + A_{i,k} B_{k,j}`.

El transcript es el conjunto de todos esos intermedios:

- `Tr(MatMul_r, A, B) = { C_{i,j}^{(k)} }`.

Ese transcript se vuelve el objeto a "anclar" criptograficamente para PoW.

## 6) Esquema abstracto: Encode/Decode con transcript-unpredictability

Introducen un esquema:

- `Encode(seed, A, B) -> (A~, B~)`
- `Decode(seed, C~) -> C`

con dos propiedades:

- Correctitud: al decodificar el producto ruidoso, recuperas `AB`.
- Transcript-unpredictability: computar transcript valido de `(A~, B~)` sin hacer el trabajo esencial debe ser dificil.

Con esto construyen PoUW:

1. `Solve` codifica entradas con ruido,
2. ejecuta MatMul para obtener transcript,
3. decodifica para recuperar salida util `AB`,
4. produce prueba ligada al transcript.

`Verify` revalida consistencia del transcript/prueba y umbral de dificultad.

## 6.1) Ejemplo concreto minimo (matrices 2x2)

Este ejemplo es didactico para entender la idea de "ruido + desruido".

Tomemos:

`A = [[1,2],[3,4]]`

`B = [[5,6],[7,8]]`

Producto real (util):

`AB = [[19,22],[43,50]]`

Ahora metemos ruido simple (no el mas avanzado del paper, solo para visualizar):

`E = [[1,0],[0,1]]`, `F = [[0,1],[1,0]]`

Entonces:

`A~ = A + E = [[2,2],[3,5]]`

`B~ = B + F = [[5,7],[8,8]]`

Producto ruidoso:

`C~ = A~B~ = [[26,30],[55,61]]`

Si quieres recuperar `AB`, usas la identidad del paper:

`AB = (A+E)(B+F) - [AF + E(B+F)]`

Calculamos termino de correccion:

- `AF = [[2,1],[4,3]]`
- `E(B+F) = B+F = [[5,7],[8,8]]`
- `AF + E(B+F) = [[7,8],[12,11]]`

Finalmente:

`AB = C~ - (AF + E(B+F)) = [[26,30],[55,61]] - [[7,8],[12,11]] = [[19,22],[43,50]]`

Resultado: recuperas el producto util correcto.

Leccion del ejemplo: agregar ruido no rompe el resultado final si sabes "pelarlo" correctamente.

### 6.1.1) Ejemplo 2x2 con magnitudes de una explotacion agricola

Supongamos una finca con 2 parcelas y 2 cultivos.

- Filas de `A`: `Parcela Norte`, `Parcela Sur`.
- Columnas de `A`: `Uva tempranillo`, `Uva garnacha`.
- Filas de `B`: cultivos (`Tempranillo`, `Garnacha`).
- Columnas de `B`: recursos por hectarea (`Agua m3/ha`, `Fertilizante kg/ha`).

### Paso 1: matriz util `A` y matriz de coeficientes `B`

`A = [[12,8],[5,15]]`

Interpretacion: por ejemplo, la Parcela Norte dedica 12 ha a tempranillo y 8 ha a garnacha.

`B = [[2800,180],[2200,240]]`

Interpretacion: cada ha de tempranillo usa 2800 m3 de agua y 180 kg de fertilizante; cada ha de garnacha usa 2200 m3 y 240 kg.

### Paso 2: producto real `AB` (resultado util)

`AB = [[12*2800 + 8*2200, 12*180 + 8*240], [5*2800 + 15*2200, 5*180 + 15*240]]`

`AB = [[51200,4080],[47000,4500]]`

Lectura del resultado:

- Parcela Norte: `51200 m3` de agua y `4080 kg` de fertilizante.
- Parcela Sur: `47000 m3` de agua y `4500 kg` de fertilizante.

### Paso 3: introducir ruido didactico

Usamos ruido simple para visualizar la mecanica:

`E = [[1,0],[0,1]]`, `F = [[0,1],[1,0]]`

`A~ = A + E = [[13,8],[5,16]]`

`B~ = B + F = [[2800,181],[2201,240]]`

### Paso 4: producto ruidoso

`C~ = A~B~ = [[54008,4273],[49216,4745]]`

### Paso 5: correccion para recuperar exactamente `AB`

Aplicamos:

`AB = (A+E)(B+F) - [AF + E(B+F)]`

Calculamos:

- `AF = [[8,12],[15,5]]`
- `E(B+F) = B+F = [[2800,181],[2201,240]]`
- `AF + E(B+F) = [[2808,193],[2216,245]]`

Entonces:

`AB = C~ - (AF + E(B+F))`

`AB = [[54008,4273],[49216,4745]] - [[2808,193],[2216,245]] = [[51200,4080],[47000,4500]]`

Resultado final: se recupera exactamente el mismo `AB` util del sistema agricola.

Nota didactica: en una implementacion PoUW real se trabaja en aritmetica modular (campo finito), por lo que estos numeros se interpretan como representaciones numericas de datos normalizados.

## 6.2) Ejemplo de transcript por bloques (matriz 4x4 con bloques 2x2)

Aqui no buscamos hacer toda la cuenta, sino entender que se guarda en el transcript.

Partimos `A` y `B` en bloques `2x2`:

`A = [[A11, A12],[A21, A22]]`, `B = [[B11, B12],[B21, B22]]`

El algoritmo por bloques calcula, por ejemplo, el bloque `C11` en 2 pasos:

1. `C11^(1) = A11*B11`
2. `C11^(2) = C11^(1) + A12*B21`  (este ya es el `C11` final)

Y lo mismo para `C12`, `C21`, `C22`.

El transcript contiene los intermedios:

- `C11^(1)`, `C11^(2)`
- `C12^(1)`, `C12^(2)`
- `C21^(1)`, `C21^(2)`
- `C22^(1)`, `C22^(2)`

En total, para este caso, 8 estados intermedios de bloques.

Idea de seguridad: producir todos esos estados consistentes suele forzar a seguir el proceso real de multiplicacion, no solo adivinar el resultado final.

## 7) Dos instanciaciones concretas

### 7.1 Primera instanciacion (baseline, no optima)

- Ruido denso clasico: `A~ = A + E`, `B~ = B + F`, con `E, F` uniformes.
- Decodificar exige productos adicionales costosos.
- Resultado: overhead grande (los autores indican factor cercano a 3), por lo que no es "truly useful".

### 7.2 Segunda instanciacion (cuPOW, principal)

- Ruido de bajo rango:
  - `E = E_L E_R`, `F = F_L F_R`, con factores `n x r` y `r x n`.
- Beneficio:
  - agregar/quitar ruido es mas barato (`O(n^2 r)`),
  - aun se busca mantener dificultad en transcript.
- Overhead total reportado en forma asintotica:
  - `(n) = O(n^2 + n^2 r) / t_MatMul(n)`
  - que tiende a `o(1)` en el regimen que analizan (sin asumir FMM practico).

Mensaje practico del paper: minero honesto puede reciclar trabajo real de MatMul con penalizacion marginal.

## 8) Seguridad: que se asume y que se demuestra

El paper no dice "seguridad incondicional"; usa supuestos de dureza de grano fino.

Supuestos relevantes:

- Para variantes iniciales: no existe algoritmo subasintotico que multiplique matrices aleatorias mucho mas rapido de lo conocido.
- Para cuPOW (nucleo): no existe algoritmo que compute todo el transcript de productos rank-`r` aleatorios en tiempo mejor que el mejor conocido para ese problema estructurado.

Interpretacion:

- Si esos supuestos se sostienen, atacante no obtiene ventaja no trivial con mismo presupuesto computacional.
- El paper sugiere que el ataque implicaria resolver lotes correlacionados de ecuaciones lineales de bajo rango (problema interesante por si mismo).

## 9) Costos de verificacion y tamano de prueba

Hallazgo importante:

- Verificar transcript completo puede ser caro.

Mitigaciones discutidas:

- usar SNARK/zkSNARK para delegar verificacion pesada al probador,
- hash por bloques/intermedios para reducir requerimientos de memoria y mejorar ergonomia,
- ajustes de dificultad via parametros (`n`, `delta`, etc.).

## 10) Conexion con blockchain tipo Nakamoto

En el apendice B formalizan PoUW orientado a blockchain como proceso de Poisson:

- la mineria honesta debe producir eventos de bloque con tasa controlable,
- adversario con recursos acotados no debe exceder significativamente esa tasa.

Conectan esta formulacion con resultados del "Bitcoin backbone" y firmas de trabajo, argumentando que PoUW con esas propiedades puede instanciar funcionalidad equivalente de ledger publico.

## 11) Aplicacion directa a IA (seccion 7)

Punto central de utilidad economica:

- En entrenamiento/inferencia, MatMul domina gran parte del costo total (paper menciona rangos tipicos 50-80%).
- Si PoUW usa MatMul nativo, parte del gasto de consenso se "superpone" con computo util de IA.

Ideas de optimizacion practica que mencionan:

- preprocesar hashes cuando pesos son publicos/estaticos (escenario inferencia),
- encadenar compromisos entre capas en entrenamiento para evitar recomputos de compromiso desde cero.

## 12) Limitaciones y riesgos reconocidos

- Seguridad depende de conjeturas nuevas de complejidad fina.
- Verificacion ingenua puede ser pesada.
- Ajuste de parametros (`r`, tamano de bloque, metodo de hash, memoria) impacta mucho la viabilidad real.
- Fast Matrix Multiplication teorico existe, pero su practicidad en hardware real es limitada; el paper se enfoca en baseline "naive" por realismo operativo.

## 13) Problemas abiertos que deja el paper

- Extender PoUW `1 + o(1)` a tareas utiles mas alla de MatMul.
- Mejorar simultaneamente overhead y supuestos de seguridad.
- Lograr esquemas con supuestos mas estandar (no solo conjeturas especificas).
- Explorar esquemas alternativos de ruido (apendice A: ruido auto-cancelante con rotaciones pseudoaleatorias y estructura tipo Hadamard).

## 14) Conclusiones practicas para tu contexto

Si lo aterrizas a un diseño de mineria en tu stack:

- Este paper da un blueprint realista para PoUW basado en trabajo de matrices.
- El truco no es solo "hacer MatMul", sino forzar evidencia de `transcript` para evitar atajos.
- El parametro mas sensible es `r`:
  - `r` pequeno: mas transcript, mas dureza potencial, pero mas costo de gestion.
  - `r` grande: menos granularidad, puede relajar dureza o cambiar overhead.
- En implementacion real, vas a necesitar:
  - pipeline determinista de `Encode/MatMul/Decode`,
  - politica de hash/commit de transcript,
  - calibracion de dificultad tipo Poisson,
  - estrategia de verificacion eficiente (idealmente pruebas sucintas).

## 15) Mini-guia de lectura (didactica)

Si quieres leer este paper sin perderte, hazlo en este orden:

1. Seccion 2 (overview): quedarte con la intuicion de "ruido + transcript".
2. Seccion 5: definicion formal de PoUW (que debe cumplir exactamente).
3. Seccion 6.4 y 6.5: comparar instanciacion no optima vs cuPOW.
4. Seccion 7: por que MatMul tiene valor economico real (IA).
5. Apendice B: conexion con proceso de Poisson en blockchain.

---

## TL;DR tecnico

El paper propone el primer PoUW realmente util para multiplicacion de matrices con overhead cercano a 1, usando ruido estructurado de bajo rango y, sobre todo, anclando la prueba al transcript intermedio del calculo. La seguridad se apoya en conjeturas de dureza fine-grained sobre calcular transcript de productos rank-bajo aleatorios. Si esas conjeturas se mantienen, el minero honesto y el atacante quedan aproximadamente empatados en relacion "trabajo invertido vs probabilidad de minar", mientras el trabajo puede tener utilidad externa (especialmente IA).


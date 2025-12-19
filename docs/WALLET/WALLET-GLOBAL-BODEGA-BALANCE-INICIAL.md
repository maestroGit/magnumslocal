## Reflexión ordenada sobre los supuestos de acceso a UTXOs y minado en bodegas

### Supuesto nº1: Acumulación de UTXOs por minado voluntario

- **Flujo:**
  1. Una bodega instala el sistema y genera su wallet global.
  2. Comienza a minar bloques voluntariamente, participando en el algoritmo de minado.
  3. Por cada bloque minado, recibe la recompensa correspondiente en UTXOs (ejemplo: 50 UTXOs por bloque).
  4. Cuando ha acumulado suficientes UTXOs (por ejemplo, 100), puede registrar una botella para un usuario, recibiendo fiat a cambio y gastando sus UTXOs en la transacción de registro.
- **Ventajas:**
  - El acceso a operar en la red depende del esfuerzo y participación activa (minado).
  - No hay asignación automática de fondos: solo quien contribuye obtiene capacidad de operar.
  - Se incentiva la descentralización y la meritocracia.
- **Riesgos:**
  - Si el minado no está restringido, cualquier actor podría minar y acumular UTXOs, incluso actores no deseados.
  - Puede haber competencia desleal si algunos nodos tienen más capacidad de minado.

### Supuesto nº2: Adquisición directa de UTXOs (asignación inicial o compra)

- **Flujo:**
  1. La bodega instala el sistema y genera su wallet global.
  2. Recibe automáticamente una asignación inicial de UTXOs (ejemplo: 500) o puede adquirir/comprar UTXOs a través de un sistema de registro, compra o autorización.
      Actualmente en: block.js 
      función estática: Block.getGenesisBlock()
                // 📦 Datos del bloque génesis: aquí puedes incluir asignaciones iniciales de saldo
              const genesisData = [
              {
                id: "init-fund-1", // identificador único de la transacción
                lote: null, // opcional, útil si agrupas transacciones
                // input: {
                //   timestamp: GENESIS_TIMESTAMP, // marca de tiempo de la transacción
                //   amount: 500, // no se gasta saldo, es una asignación directa
                //   address: "genesis", // dirección ficticia para indicar que es una emisión inicial
                //   signature: null // no requiere firma, ya que no proviene de una clave privada real
                // },
                inputs: [], // <-- UTXO: array vacío para coinbase/genesis
                outputs: [
                  {
                    amount: 500, // 💰 saldo inicial asignado
                    address: recipientPublicKey // 🔑 clave pública que recibe el saldo (wallet_default.json)
                  }
                ]
              }
              ];


  3. Puede operar (registrar botellas, etc.) desde el inicio, sin necesidad de minar.
- **Ventajas:**
  - Permite a las bodegas operar inmediatamente tras el registro/autorización.
  - Facilita el onboarding y la experiencia de usuario.
  - El control de acceso se realiza en el proceso de asignación de UTXOs (registro, compra, whitelist).
- **Riesgos:**
  - Si la asignación es automática y sin control, cualquier instalación puede operar, lo que reduce la seguridad.
  - Si se permite la compra, se debe controlar el proceso para evitar abusos o acumulación excesiva de poder.

### Recomendaciones y punto de vista

- **Elimina o reduce la asignación automática de UTXOs iniciales.**
  - No entregues 500 UTXOs por defecto a cada nueva bodega.
  - Obliga a que la obtención de UTXOs sea por minado (si el minado está controlado) o por un proceso de registro/autorización/compra gestionado por la autoridad de red.

- **Controla quién puede minar y recibir recompensas.**
  - Usa whitelist o registro para que solo las bodegas autorizadas puedan minar y recibir UTXOs por bloque.
  - Así, aunque el minado sea la vía principal para obtener UTXOs, solo los actores legítimos pueden participar.

- **Ofrece un sistema de adquisición de UTXOs controlado.**
  - Permite a las bodegas adquirir UTXOs mediante un proceso de compra, registro o autorización, pero siempre bajo control de la autoridad de red.
  - Esto facilita el onboarding y permite flexibilidad, pero mantiene la seguridad.

- **Resumen:**
  - El acceso a UTXOs (y por tanto a la operativa) debe estar controlado, ya sea por minado restringido o por asignación/autorización explícita.
  - Elimina la asignación automática y sin control de UTXOs iniciales.
  - El sistema debe permitir la creación automática de wallets, pero solo las wallets con UTXOs (obtenidos de forma legítima) pueden operar.
  - Así, garantizas seguridad, control y flexibilidad en el acceso a la red.

**Conclusión:**  
Tu análisis es correcto: el verdadero control está en la entrega y gestión de UTXOs, no en la generación de wallets. Elimina la asignación automática y controla tanto el minado como la adquisición de UTXOs para asegurar que solo las bodegas autorizadas puedan operar y registrar activos en la red.

## ###################################################################
## Plan: Sistema de asignación inicial de UTXOs con escasez y reglas
## ###################################################################


Propuesta para que la asignación inicial de UTXOs a nuevas bodegas/wallets sea limitada, controlada y cree incentivos para obtener más UTXOs, evitando la inflación y facilitando el onboarding.

### Opciones de asignación inicial y control de escasez

1. **Asignación inicial limitada y decreciente**
   - Cada nueva bodega recibe un saldo inicial, pero este saldo disminuye con cada nueva incorporación (ej: la primera recibe 500, la segunda 400, etc.).
   - Se puede usar una fórmula de decaimiento o un pool global de UTXOs a repartir.

2. **Pool global de UTXOs para onboarding**
   - Se define un máximo de UTXOs disponibles para asignaciones iniciales (ej: 10,000 UTXOs).
   - Cada vez que una bodega se registra, se descuentan del pool.
   - Cuando el pool se agota, solo se pueden obtener UTXOs minando o comprando.

3. **Asignación inicial bajo autorización/whitelist**
   - Solo las bodegas autorizadas (por admin/red) reciben UTXOs iniciales.
   - El admin puede aprobar/rechazar solicitudes y definir el monto.

4. **Sistema de “faucet” con límites**
   - Las nuevas wallets pueden solicitar UTXOs iniciales, pero con límites de frecuencia y cantidad (ej: 1 vez por wallet, máximo 500 UTXOs).
   - El faucet puede requerir validación (email, KYC, etc.).

5. **Recompensas por acciones de onboarding**
   - La asignación inicial puede estar ligada a completar acciones: registrar datos, invitar usuarios, validar identidad, etc.
   - Así se incentiva la participación y se evita el abuso.

6. **Sistema de “bonding” o staking**
   - Para recibir UTXOs iniciales, la bodega debe bloquear temporalmente algún recurso (ej: tokens, depósito, validación).
   - Si cumple ciertas condiciones, recibe el saldo; si no, lo pierde.

### Incentivos para querer más UTXOs

- **Recompensas por minado**: Solo minando bloques se obtienen nuevos UTXOs, y la recompensa puede disminuir con el tiempo (halving).
- **Mercado secundario**: Permitir la compra/venta de UTXOs entre bodegas.
- **Bonificaciones por actividad**: Más UTXOs por registrar botellas, transacciones, o contribuir a la red.
- **Ranking o status**: Las bodegas con más UTXOs pueden acceder a ventajas, mejores comisiones, o visibilidad.

### Siguientes pasos sugeridos

1. Definir el modelo de escasez (pool global, decaimiento, faucet, whitelist, etc.).
2. Implementar lógica de control en backend (registro, validación, decremento de pool, etc.).
3. Añadir endpoints para solicitar UTXOs iniciales y consultar el estado del pool.
4. Documentar reglas y comunicar a los usuarios.

### Consideraciones adicionales

- ¿El pool de UTXOs iniciales debe poder recargarse por el admin?
- ¿Qué ocurre si una bodega pierde su wallet? ¿Puede volver a recibir UTXOs?
- ¿Cómo evitar el abuso (multi-cuentas, bots, etc.)?

¿Quieres que te ayude a diseñar la lógica concreta para alguna de estas opciones?
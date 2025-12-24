# 🔐 ¿Qué es ECDSA?

**ECDSA** significa **Elliptic Curve Digital Signature Algorithm** (Algoritmo de Firma Digital con Curvas Elípticas).

Es un sistema criptográfico que permite:

- Firmar un mensaje con una **clave privada**.
- Verificar esa firma con la **clave pública** correspondiente.

Se basa en la criptografía de curvas elípticas y en la dificultad del **problema del logaritmo discreto en curvas elípticas**, lo que lo hace muy seguro y eficiente.

### Características clave

- Ofrece la misma seguridad que RSA pero con claves mucho más pequeñas  
  *(por ejemplo, 256 bits ≈ RSA 3072 bits)*.
- La firma está compuesta por dos números: **r** y **s**.
- Antes de firmar, el mensaje se **hashea** (normalmente con SHA‑256).

---

# 🧩 ¿Cómo funciona la verificación de firmas ECDSA?

La verificación consiste en comprobar matemáticamente que:

> “La firma (r, s) solo pudo haber sido generada con la clave privada correspondiente a esta clave pública”.

Proceso general:

1. Se toma el **hash del mensaje** original.
2. Se extraen los valores **r** y **s** de la firma.
3. Se usa la **clave pública** para realizar operaciones de curva elíptica.
4. Si el resultado coincide con **r**, la firma es válida; si no, es falsa.

---

# 🛠️ Funciones típicas para verificar firmas ECDSA

Aunque cada librería tiene su propia API, casi todas siguen este patrón:

### ✔️ `verify(message, signature, publicKey)`
Verifica si la firma corresponde al mensaje y a la clave pública.

Internamente realiza:

- Hash del mensaje  
- Decodificación de la firma (**r**, **s**)  
- Cálculo matemático sobre la curva  
- Comparación final  

---

### ✔️ `parseSignature(signature)`
Extrae los valores **r** y **s** del formato usado (hex, DER, raw, etc.).

---

### ✔️ `parsePublicKey(key)`
Convierte la clave pública a un punto de la curva.

---

### ✔️ `isValidSignature(r, s)`
Comprueba que los valores están dentro del rango permitido por la curva.

---

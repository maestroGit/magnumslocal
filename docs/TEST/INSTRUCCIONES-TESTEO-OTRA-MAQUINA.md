# Instrucciones para probar magnumslocal en otra máquina

Hola,

Te doy la bienvenida al proyecto Blockswine y al repositorio **magnumslocal**, donde se encuentra el desarrollo principal. Ya tienes permisos como colaborador, así que puedes clonar el código cuando quieras.

## Requisitos previos

Antes de empezar, asegúrate de tener instalado en tu ordenador:
- **Node.js** (recomendado: versión 18.x o superior)
- **Git** (para clonar el repositorio)

Si no tienes Node.js, descárgalo aquí:  
https://nodejs.org/en/download/

## Pasos para poner en marcha el proyecto

1. **Clona el repositorio**  
Abre una terminal y ejecuta:

```bash
git clone https://github.com/maestroGit/magnumslocal.git
```
(O si prefieres, descarga el ZIP desde el botón “Code” en GitHub).

2. **Accede al directorio del proyecto:**

```bash
cd magnumslocal
```

3. **Instala las dependencias:**

```bash
npm install
```

4. **Inicia la aplicación en modo local:**

```bash
npm run start
```

Esto levantará el servidor de desarrollo.

## Acceso en el navegador

Por defecto, la aplicación estará disponible en [http://localhost:3000](http://localhost:3000)  
(Confirma el puerto en la consola o en la configuración si tienes dudas).

Solo tienes que abrir esa dirección en tu navegador para ver y probar el proyecto en tu entorno local.

## Simulación de usuario fundador

Al arrancar el sistema, tendrás acceso simulado como el usuario “Château Bordeaux”, con la siguiente wallet:

```
04325e339641e1def136cfa8ab904f88e8ffaa46a692b4992d71e6048a1ba964272c28a00490d39fbcef990093998a3717d9a6b8e16f7ab430af40f8cd158438cd
```

Este usuario dispone de un saldo inicial de 100 unidades en la blockchain simulada.

## Flujo de prueba recomendado

1. Ve a la sección `wallet/crear` y crea una wallet nueva como usuario (elige tu contraseña).
2. Descarga el archivo keystore generado para esa wallet.
3. Dentro del keystore, localiza y copia tu `publicKey` (por ejemplo:  
   `04cc5a1a13ae35eeaf93d48c84662f95098e6b79d2d23779f2955f9981b09f4fb53f4857b849d47a77f5b147f23182790956ae3d932eabc439c0cc2d9ef78e89fb`).
4. Ve al dashboard principal (panel).
5. Accede al formulario de transferencia.
6. Usa la wallet fundadora (Château Bordeaux) como origen, firmando con su contraseña: **javi**.
7. En el campo destinatario, pega la `publicKey` de tu nueva wallet.
8. Introduce el importe a transferir (recuerda que el saldo inicial de la bodega es 100).
9. Envía y firma la transferencia (**contraseña: javi**).
10. La transferencia quedará pendiente en la mempool.
11. Desde el dashboard, ejecuta la acción de “minar” o “confirmar” transferencias pendientes.
12. Si todo es correcto, la transferencia se consolidará en un bloque y los saldos se actualizarán.

## Resumen funcional

- Simulas el papel del usuario fundador/bodega.
- Creas y gestionas una wallet nueva como usuario normal.
- Realizas una transferencia real desde la wallet fundadora a tu nueva `publicKey`.
- Compruebas que la operación pasa de la mempool al bloque minado correctamente.

Si tienes cualquier duda, problema con el keystore, la contraseña o la firma, avísame y te ayudo.

¡Gracias por tu colaboración y por probar a fondo el flujo!

Un saludo,

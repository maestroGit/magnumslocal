# Estado actual del login admin

## Resumen simple

- La wallet fundadora con fondos de genesis se opera en frontend a nivel de wallet/keystore.
- Para operar esa wallet en frontend basta con la contraseña del keystore cifrado.
- El login HTTP por email/password es independiente del login de wallet.

## Nota importante

Este es el login a nivel de wallet/keystore (contraseña del archivo keystore cifrado), no un login de sesión HTTP por email/password.

El sistema de sesión HTTP es independiente y requeriría un usuario en la tabla usuarios con role: 'admin' vinculado a esa dirección en la tabla wallets, pero para operar la wallet fundadora en el frontend basta con la contraseña.

## Cuenta que actualmente controla la wallet_default con fondos genesis

- id: google_110359887153685953832
- nombre: Blocks Wine
- email: blockswine@gmail.com
- role: winery
- wallet_status: active
- wallet_type: internal

## Estado pendiente

Si se quiere seguir la lógica de un admin en sesión HTTP, está pendiente realizar un cambio manual hardcodeado en base de datos para pasar el role de winery a admin en ese usuario.

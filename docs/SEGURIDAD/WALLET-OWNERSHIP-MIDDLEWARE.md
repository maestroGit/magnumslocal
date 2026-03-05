# Propuesta: Middleware de Ownership de Wallet Global

## Objetivo
Reducir riesgo operativo en entorno multiusuario mientras se mantiene el modelo actual con `global.wallet`.

La meta inmediata es impedir que un usuario autenticado opere con una wallet global que no le pertenece.

## Contexto actual
- El backend usa una wallet global en memoria (`global.wallet` / `global.globalWallet`).
- Endpoints de operativa sensible (balance, transferencias, UTXO) dependen de esa wallet.
- Con varios usuarios concurrentes, puede haber cruce de contexto si no se valida ownership.

## Fase 1 (rápida): filtro de ownership sobre wallet global

### Cadena recomendada de middlewares
1. `requireAuth`
2. `requireRole('admin', 'winery')` (segun endpoint)
3. `requireGlobalWalletOwnership`

### Regla de negocio
Un usuario solo puede usar endpoints de operativa global si la `publicKey` activa coincide con una wallet `active` vinculada a su `usuario_id` en DB.

### Contrato del middleware `requireGlobalWalletOwnership`
- Input:
	- `req.user` o `req.session.user`
	- wallet global activa (`global.globalWallet?.publicKey || global.wallet?.publicKey`)
- Validaciones:
	1. Si no hay usuario autenticado -> `401`
	2. Si no hay wallet global activa -> `409`
	3. Si no existe `wallets.address = publicKey` para ese `usuario_id` con `status = 'active'` -> `403`
- Output:
	- Si valida, `next()`
	- Si falla, respuesta JSON con `success: false` y mensaje claro

### Pseudocodigo
```js
async function requireGlobalWalletOwnership(req, res, next) {
	const userId = req.user?.id || req.session?.user?.id;
	if (!userId) {
		return res.status(401).json({ success: false, error: 'No autenticado' });
	}

	const activePubKey = global.globalWallet?.publicKey || global.wallet?.publicKey;
	if (!activePubKey) {
		return res.status(409).json({ success: false, error: 'No hay wallet global activa' });
	}

	const ownedWallet = await Wallet.findOne({
		where: {
			usuario_id: userId,
			address: String(activePubKey).toLowerCase(),
			status: 'active'
		}
	});

	if (!ownedWallet) {
		return res.status(403).json({
			success: false,
			error: 'La wallet global activa no pertenece al usuario logeado'
		});
	}

	req.activeWalletAddress = ownedWallet.address;
	return next();
}
```

## Endpoints candidatos (proteger primero)
- Consultar balance dependiente de wallet global
- Crear transferencias/transacciones firmadas con wallet global
- Consultar UTXO UNOPENED de la wallet global
- Cualquier endpoint que lea `global.wallet.privateKey` o `global.wallet.publicKey`

## Ventajas de la Fase 1
- Cambio acotado
- No rompe el flujo actual
- Mitiga el riesgo mas importante de cruce entre usuarios

## Limitaciones de la Fase 1
- Sigue existiendo singleton global en proceso
- Concurrencia real multiusuario no queda totalmente aislada

---

## Evolucion futura (ideal): wallet activa por sesion/usuario

### Modelo objetivo
Cada sesion mantiene su propia wallet activa en lugar de compartir `global.wallet`.

### Principio
- Usuario A carga wallet A -> solo A opera con wallet A
- Usuario B carga wallet B -> solo B opera con wallet B
- No hay pisado global entre sesiones

### Diseño sugerido
1. Guardar referencia por sesion:
	 - `req.session.activeWalletAddress`
2. Resolver wallet activa por request:
	 - `resolveActiveWallet(req)`
3. Endpoints de operativa usan esa wallet resuelta, no `global.wallet`
4. Verificar ownership en cada request (o cache corto por sesion)

### Fases de migracion
1. Introducir `requireGlobalWalletOwnership` (Fase 1)
2. Crear `resolveActiveWallet(req)`
3. Migrar endpoints criticos de `global.wallet` a wallet por sesion
4. Retirar dependencia de singleton para operativa de usuario

### Compatibilidad
- Mantener wallet global solo para tareas de sistema/nodo si aplica
- Mantener contrato de API mientras se migra internamente

## Checklist de validacion
- Usuario `winery` con wallet propia: acceso permitido
- Usuario `winery` con wallet global ajena: `403`
- Usuario sin wallet global activa: `409`
- Usuario no autenticado: `401`
- `admin`: acceso segun politica definida (recomendado permitir con trazabilidad)

## Conclusión
La estrategia recomendada es:
1. Aplicar ahora middleware de ownership para reducir riesgo sin grandes cambios.
2. Evolucionar despues a wallet activa por sesion/usuario para aislamiento completo.


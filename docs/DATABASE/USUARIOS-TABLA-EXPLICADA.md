# Tabla usuarios - guia practica

## Objetivo
Este documento explica la tabla `usuarios` (modelo User) y deja un snapshot de los datos actuales consultados hoy.

## Contexto tecnico
- Proyecto: magnumslocal
- Motor: PostgreSQL
- ORM: Sequelize
- Modelo: `app/models/User.js`
- Tabla fisica: `usuarios`

## Significado de los campos de la consulta
Consulta usada:

```sql
SELECT
  id,
  nombre,
  email,
  role,
  provider,
  registrado,
  fecha_registro,
  kyc_status,
  subscription_status
FROM usuarios
ORDER BY fecha_registro DESC NULLS LAST, id ASC;
```

Descripcion de cada campo:

- `id`: identificador unico del usuario (PK).
- `nombre`: nombre visible del usuario o de la bodega.
- `email`: correo del usuario (unico).
- `role`: rol funcional del usuario en plataforma.
  - `admin`: administracion global.
  - `winery`: bodega/productor.
  - `user`: usuario final.
- `provider`: origen de autenticacion/registro.
  - `email`: login local con email/password.
  - `google`: login federado Google.
  - `facebook`: login federado Facebook.
- `registrado`: bandera booleana de alta completada (`true`/`false`).
- `fecha_registro`: fecha/hora de creacion del usuario.
- `kyc_status`: estado KYC (por ejemplo `none` si no iniciado/completado).
- `subscription_status`: estado de suscripcion (`inactive`, `active`, `pending`, `expired`).

## Interpretacion de negocio rapida
- `winery + inactive + none`: bodega dada de alta, sin suscripcion activa y sin KYC.
- `user + inactive + none`: usuario estandar sin plan activo y sin KYC.
- `provider` indica como autentica, no su nivel de permisos (eso lo define `role`).

## Snapshot actual de la tabla (consulta ejecutada)
Fecha de snapshot: 2026-06-05

Total filas: 15

| # | id | nombre | email | role | provider | registrado | fecha_registro | kyc_status | subscription_status |
|---|---|---|---|---|---|---|---|---|---|
| 1 | google_107743002301134664494 | Walk Experience | maestrojavi1@gmail.com | user | google | true | 2026-06-05T08:06:14.773Z | none | inactive |
| 2 | email_1779967374127_w9n7wqbmr | JAVIER MAESTRO RODRIGUEZ | maestrojavi@yahoo.es | user | email | true | 2026-05-28T11:22:54.927Z | none | inactive |
| 3 | email_1772961600268_aercfsg2w | Orly | Orly@gmail.com | user | email | true | 2026-03-08T09:20:00.657Z | none | inactive |
| 4 | email_1772802313933_yo5ov3etz | Traslascuestas | info@bodegastraslascuestas.com | winery | email | true | 2026-03-06T13:05:14.169Z | none | inactive |
| 5 | email_1772801814888_0w4v1b9c7 | Chateau Bordeaux | contacto@bordeaux.fr | winery | email | true | 2026-03-06T12:56:55.074Z | none | inactive |
| 6 | email_1772712102085_bqzgfo24d | Tanteun e Marietta | info@tanteunemarietta.it | winery | email | true | 2026-03-05T12:01:42.764Z | none | inactive |
| 7 | google_110359887153685953832 | Blocks Wine | blockswine@gmail.com | winery | google | true | 2026-03-05T10:56:02.615Z | none | inactive |
| 8 | email_1772440777202_hmvd1w6wd | pol | pol@gmail.com | user | email | true | 2026-03-02T08:39:38.196Z | none | inactive |
| 9 | email_1771508782859_nleixgmgi | walkexperience | walkexperience@gmail.com | user | email | true | 2026-02-19T13:46:23.263Z | none | inactive |
| 10 | email_1771319789306_6jusm2j2h | Cascina delle Rose | cascinadellerose@cascinadellerose.it | winery | email | true | 2026-02-17T09:16:29.931Z | none | inactive |
| 11 | email_1771181094987_lp8gp191y | JAVIER MAESTRO RODRIGUEZ | maestrojavi22@yahoo.es | user | email | true | 2026-02-15T18:44:55.985Z | none | inactive |
| 12 | email_1770970130086_4m6kr8q48 | Cal Batllet | mripoll@calbatllet.cat | winery | email | true | 2026-02-13T08:08:54.624Z | none | inactive |
| 13 | email_1770909169343_kwbbhjky0 | FyA | hotel@fya.com | winery | email | true | 2026-02-12T15:12:49.875Z | none | inactive |
| 14 | email_1770908893254_yzdyi0kyp | Fernandez de Pierola | info@pierola.com | winery | email | true | 2026-02-12T15:08:13.953Z | none | inactive |
| 15 | oauth_012 | Lionel | contact@maisonparisienne.fr | user | facebook | true | 2025-03-02T11:45:00.000Z | none | inactive |

## Nota operativa
Si quieres mantener esto siempre actualizado, puede moverse a un script que genere este markdown automaticamente desde BD.

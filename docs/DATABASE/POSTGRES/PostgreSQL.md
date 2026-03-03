Descarga pgAdmin 4.

Pasos rápidos en Windows:

Ve a: https://www.pgadmin.org/download/pgadmin-4-windows/
Descarga el instalador y ejecútalo.
Abre pgAdmin y crea el servidor con tus datos remotos (host, puerto, db, user, pass, SSL require).

pgAgent es el programador de tareas (scheduler) de PostgreSQL.

En simple:

Es como un “cron” para Postgres.
Sirve para ejecutar trabajos automáticos: backups, VACUUM, SQL periódicas, reportes, limpieza, etc.
Se administra desde pgAdmin, pero se instala aparte.
Para tu caso actual (solo conectarte y editar datos en DB remota), no lo necesitas.
Con instalar pgAdmin 4 te basta.

Instala pgAgent solo si luego quieres automatizar tareas dentro de la base de datos.

Abre pgAdmin 4 y crea una contraseña maestra (solo local de pgAdmin).
Click derecho en Servers → Register → Server…
Pestaña General: pon un nombre (ej. Seenode-magnumslocal).
Pestaña Connection: completa con tu .env:
Host name/address
Port
Maintenance database
Username
Password (marca Save password)
Pestaña SSL: SSL mode = require (para remota suele ser obligatorio).
Guarda y conecta.
Luego para ver datos:

Databases > ... > Schemas > public > Tables
Click derecho en una tabla (usuarios, wallets, etc.) → View/Edit Data > All Rows.
Si quieres, te digo ahora exactamente qué valor poner en cada campo leyendo tu DATABASE_URL/.env.
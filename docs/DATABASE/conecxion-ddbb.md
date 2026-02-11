⚠️ Una advertencia sobre el init-db.js
La opción { alter: true } o { force: true } que usamos para sincronizar modelos es extremadamente peligrosa en un entorno real, porque podría borrar o modificar columnas con datos vivos.

Decisión futura: Una vez que la estructura sea estable, dejaremos de usar sync() y empezaremos a usar Migraciones. Las migraciones son como un "historial de versiones" de tu base de datos (como Git, pero para tablas).
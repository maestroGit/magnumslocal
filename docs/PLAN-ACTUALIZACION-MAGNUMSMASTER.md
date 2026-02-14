# Plan de Actualización: magnumslocal → magnumsmaster
**Fecha:** 12 de febrero de 2026  
**Objetivo:** Sincronizar cambios del sistema DO y registro en magnumsmaster

---

## 📊 Resumen de Cambios

### Ficheros Nuevos (Crear)
- ✅ `app/models/DoGeografia.js` - Modelo geografía con campo continente
- ✅ `scripts/link-wineries-dos.js` - Script linking bodegas-DO
- ✅ `scripts/link-dos-variedades-tipos.js` - Script linking DO-variedades-tipos
- ✅ `scripts/test-winery-dos.js` - Script de testing

### Ficheros Modificados (Actualizar)
- ✅ `app/controllers/userController.js` - Filtro registrado=true, includes DO
- ✅ `public/register.html` - Formato simplificado (sin categorías, solo DO+Continentes)
- ✅ `public/js/register.js` - Nueva lógica para DO y Continentes
- ✅ `public/register-form.css` - Estilos actualizados
- ✅ `public/keystore.html` - Botón Winery en nav
- ✅ `public/import-keystore.html` - Botón Winery en nav
- ✅ `public/history-keystore.html` - Botón Winery en nav
- ✅ `public/consume-keystore.html` - Botón Winery en nav
- ✅ `public/transfer-keystore.html` - Botón Winery en nav

---

## 🔄 Pasos de Actualización

### FASE 1: Preparación (5 min)
- [ ] **Paso 1.1:** Crear rama de desarrollo
  ```bash
  cd ~/Documents/magnumsmaster
  git checkout -b feature/actualizacion-do-registro
  ```

- [ ] **Paso 1.2:** Verificar estado actual
  ```bash
  git status
  git log --oneline -5
  ```

### FASE 2: Copiar Ficheros Nuevos (10 min)

- [ ] **Paso 2.1:** Copiar modelo DoGeografia.js
  ```bash
  cp ~/Documents/magnumslocal/app/models/DoGeografia.js \
     ~/Documents/magnumsmaster/app/models/
  ```

- [ ] **Paso 2.2:** Copiar scripts de datos
  ```bash
  cp ~/Documents/magnumslocal/scripts/link-wineries-dos.js \
     ~/Documents/magnumsmaster/scripts/
  cp ~/Documents/magnumslocal/scripts/link-dos-variedades-tipos.js \
     ~/Documents/magnumsmaster/scripts/
  cp ~/Documents/magnumslocal/scripts/test-winery-dos.js \
     ~/Documents/magnumsmaster/scripts/
  ```

### FASE 3: Actualizar Controladores (15 min)

- [ ] **Paso 3.1:** Actualizar userController.js
  - Líneas 160-169: Agregar filtro `where.registrado = true`
  - Líneas 180-210: Agregar includes para DO sin alterar lógica existente
  - ⚠️ **CUIDADO:** No eliminar lógica existente, solo agregar

- [ ] **Paso 3.2:** Testing
  ```bash
  # Verificar que GET /users sigue funcionando
  curl "http://localhost:7000/users" | jq '.data | length'
  ```

### FASE 4: Actualizar Frontend - Registro (20 min)

- [ ] **Paso 4.1:** Actualizar register.html
  ```bash
  cp ~/Documents/magnumslocal/public/register.html \
     ~/Documents/magnumsmaster/public/
  ```
  - Verificar que los estilos sigan enlazados correctamente
  - Comprobar que la estructura del header sea compatible

- [ ] **Paso 4.2:** Actualizar register.js
  ```bash
  cp ~/Documents/magnumslocal/public/js/register.js \
     ~/Documents/magnumsmaster/public/js/
  ```
  - Verificar que `API_BASE_URL` apunte al puerto correcto (7000)

- [ ] **Paso 4.3:** Actualizar CSS
  ```bash
  cp ~/Documents/magnumslocal/public/register-form.css \
     ~/Documents/magnumsmaster/public/
  ```

- [ ] **Paso 4.4:** Testing
  ```bash
  # Abrir en navegador: http://localhost:7000/register.html
  # Verificar:
  # - Seleccionar "Winery" muestre campos DO y Continentes
  # - Registro complete correctamente
  # - Redirección a list-winery.html funcione
  ```

### FASE 5: Actualizar Frontend - Keystore (20 min)

- [ ] **Paso 5.1:** Actualizar 5 archivos de keystore
  ```bash
  # Opción A: Copiar directamente (si la estructura es igual)
  for file in keystore import-keystore history-keystore consume-keystore transfer-keystore; do
    cp ~/Documents/magnumslocal/public/${file}.html \
       ~/Documents/magnumsmaster/public/
  done
  ```

- [ ] **Paso 5.2:** Verificar compatibilidad
  - [ ] Comprobar que header tiene mismo logo y estructura
  - [ ] Verificar que script scrollFooter.js existe
  - [ ] Verificar que nav.css sea compatible

- [ ] **Paso 5.3:** Testing
  ```bash
  # Abrir cada archivo en navegador y verificar:
  # http://localhost:7000/keystore.html
  # http://localhost:7000/import-keystore.html
  # http://localhost:7000/history-keystore.html
  # http://localhost:7000/consume-keystore.html
  # http://localhost:7000/transfer-keystore.html
  #
  # Verificar que botón "Winery" aparece y funciona
  ```

### FASE 6: Sincronizar Modelos (10 min)

- [ ] **Paso 6.1:** Verificar modelos DO existentes en magnumsmaster
  ```bash
  ls ~/Documents/magnumsmaster/app/models/ | grep -i do
  ```

- [ ] **Paso 6.2:** Si falta DoGeografia.js, agregarlo
  - Verificar que ya existan: DenominacionOrigen.js, DoVariedad.js, DoTipoVino.js, etc.
  - Si faltan, copiar TODO el sistema DO desde magnumslocal

- [ ] **Paso 6.3:** Actualizar asociaciones en models/index.js
  - Añadir: `DoGeografia.belongsTo(DenominacionOrigen, ...)`
  - Verificar que todas las relaciones DO estén configuradas

### FASE 7: Base de Datos (Decisión)

**OPCIÓN A: Base de datos separada (Recomendada)**
- [ ] magnumsmaster mantiene su BD con datos originales
- [ ] NO copiar datos de magnumslocal
- [ ] Ejecutar seed.js para poblar DO datos
- [ ] Ventaja: Ambiente limpio de testing

**OPCIÓN B: Sincronizar datos**
- [ ] ⚠️ Solo si se decide que magnumsmaster reemplace magnumslocal
- [ ] Backup de magnumsmaster-db primero
- [ ] Restaurar dump de magnumslocal-db
- [ ] Ejecutar migraciones necesarias

### FASE 8: Testing E2E (15 min)

- [ ] **Paso 8.1:** Testing de Registro
  ```bash
  # 1. Ir a http://localhost:7000/register.html
  # 2. Crear nuevo usuario tipo "Winery"
  # 3. Verificar que aparecen campos DO y Continentes
  # 4. Completar registro
  # 5. Verificar redirección a list-winery.html
  # 6. Verificar que bodega aparece con DO info
  ```

- [ ] **Paso 8.2:** Testing de Navegación
  ```bash
  # Desde cualquier página keystore:
  # 1. Click en botón "Winery" → debe ir a list-winery.html o hacer scroll
  # 2. Verificar que nav está visible y funciona
  ```

- [ ] **Paso 8.3:** Testing de API
  ```bash
  # GET /users?role=winery debe retornar:
  curl "http://localhost:7000/users?role=winery" | jq '.data[0] | {nombre, denominaciones: (.denominaciones | length)}'
  
  # Esperado:
  # {
  #   "nombre": "...",
  #   "denominaciones": 1
  # }
  ```

### FASE 9: Documentación (10 min)

- [ ] **Paso 9.1:** Actualizar docs/CAMBIOS.md
  ```markdown
  ## Cambios Realizados (12/02/2026)
  
  ### Nuevos
  - DoGeografia.js con campo continente obligatorio
  - Scripts linking y testing para DO
  
  ### Modificados
  - userController.js: Filtro activos + includes DO
  - register.html/js/css: Formulario simplificado
  - Keystore pages: Botón Winery en nav
  ```

- [ ] **Paso 9.2:** Actualizar README si es necesario

### FASE 10: Commit y Push (5 min)

- [ ] **Paso 10.1:** Stage cambios
  ```bash
  git add .
  git status  # Verificar todos los ficheros
  ```

- [ ] **Paso 10.2:** Commit
  ```bash
  git commit -m "feat: Actualizar sistema DO y registro desde magnumslocal

  - Agregar DoGeografia.js con campo continente
  - Simplificar registro (solo DO y Continentes)
  - Agregar botón Winery en páginas keystore
  - Filtrar usuarios activos en API
  - Actualizar includes do para winery users"
  ```

- [ ] **Paso 10.3:** Push
  ```bash
  git push origin feature/actualizacion-do-registro
  ```

- [ ] **Paso 10.4:** Crear Pull Request en GitHub

---

## ⚠️ Consideraciones Importantes

### Conflictos Potenciales
1. **register.html:**
   - Si magnumsmaster tiene cambios en header, necesita merge manual
   - ScrollFooter.js debe existir en magnumsmaster

2. **userController.js:**
   - Verificar que no hay lógica conflictiva
   - El filtro `registrado=true` puede afectar otros endpoints

3. **CSS/HTML:**
   - Asegurar que keystore pages tienen estructura similar
   - header-custom.css debe ser compatible

### Testing Pre-Deploy
- [ ] No romper login existente
- [ ] GET /users sigue funcionando
- [ ] Register sigue creando usuarios
- [ ] Wallets siguen funcionando

### Rollback
Si hay problemas:
```bash
git reset --hard HEAD~1
git push origin feature/actualizacion-do-registro -f
```

---

## 📋 Checklist de Validación Final

- [ ] Todos los ficheros nuevos copiados
- [ ] Todos los ficheros modificados actualizados
- [ ] Sin errores en consola de servidor
- [ ] API /users?role=winery retorna DO includes
- [ ] Registro crea usuario con DO
- [ ] Botón Winery navega correctamente
- [ ] Base de datos tiene DoGeografia poblada
- [ ] Tests pasan sin errores
- [ ] Commit comprensible y documentado
- [ ] PR creado en GitHub

---

## 🎯 Estimado de Tiempo Total
- **Tiempo estimado:** 90-120 minutos
- **Punto crítico:** Fase 7 (Base de datos) - requiere decisión
- **Riesgo:** Bajo (cambios aislados, sin afectar core)

---

**Próxima acción:** Ejecutar FASE 1 y confirmar que todo esté listo antes de copiar ficheros

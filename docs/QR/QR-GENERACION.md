# Alta y Baja de Lotes con Blockchain y QR

## 1. Proceso de Alta (Registro y Generación de QR)

### Flujo:
1. Se realiza una transacción blockchain (compra, transferencia, etc.).
2. Al completarse, se abre el formulario de trazabilidad (`showTraceabilityModal`).
3. El formulario incluye campos automáticos de la transacción:
   - `transactionId`: ID único de la transacción blockchain.
   - `ownerPublicKey`: Clave pública del destinatario.
   - `transactionAmount`: Importe.
   - `transactionTimestamp`: Fecha/hora.
4. El usuario completa los datos del lote:
   - `loteIdAlta` (se genera si está vacío)
   - `nombreProducto`, `fechaProduccion`, `origen`, `bodega`, etc.
5. Al enviar el formulario ( "alta transacciónn"):
   - Se recogen todos los datos.
   - Se llama a `generateQRWithProof(loteId, transactionId)`.
   - Se genera un QR con los datos importantes (lote, transacción, propietario, producto, etc.) en formato JSON.
   - El QR se muestra y se puede descargar.

- Resumen del proceso
   1- El usuario realiza una transacción →
   2- Se abre el formulario de trazabilidad →
   3- El usuario rellena y envía los datos →
   4- El frontend envía los datos al backend →
   4- El backend guarda el JSON en lotes.

### Ejemplo de objeto para el QR:
```json
{
  "loteId": "L123456789",
  "transactionId": "abc123...",
  "ownerPublicKey": "...",
  "transactionAmount": 100,
  "transactionTimestamp": "2025-10-13T12:00:00Z",
  "nombreProducto": "Rioja Gran Reserva",
  "origen": "España",
  ...otros campos...
}
```
La ruta backend que guarda el archivo JSON de un lote es el endpoint POST /lotes en server.js. 
El flujo es el siguiente:

1- El frontend envía una petición POST a /lotes con el txId (que se usa como loteId) y los datos de metadata.
2- El backend normaliza la metadata y calcula un hash.
3- Se asegura que la carpeta lotes exista.
4- Crea un objeto record con el loteId, txId, el hash de la metadata, la metadata y la fecha de creación.
5- Guarda este objeto como un archivo JSON en app/uploads/lotes/<loteId>.json usando fs.writeFileSync.
6- Opcionalmente, genera un QR y prueba blockchain si la transacción existe.

app.post("/lotes", async (req, res) => {
  try {
    const { txId, metadata } = req.body;

    if (!txId) {
      return res
        .status(400)
        .json({ success: false, error: "txId es requerido" });
    }

    const loteId = txId; // adoptamos txId como loteId por convención

    // Normalizar y calcular hash de metadata (si no existe, usar objeto vacío)
    const metaObj = metadata && typeof metadata === "object" ? metadata : {};
    const metaString = JSON.stringify(metaObj);
    const metadataHash = crypto
      .createHash("sha256")
      .update(metaString)
      .digest("hex");

    // Asegurar carpeta de almacenamiento
    const lotesDir = path.join(__dirname, "app", "uploads", "lotes");
    if (!fs.existsSync(lotesDir)) fs.mkdirSync(lotesDir, { recursive: true });

    const record = {
      loteId,
      txId,
      metadataHash,
      metadata: metaObj,
      createdAt: new Date().toISOString(),
    };

    const filePath = path.join(lotesDir, `${loteId}.json`);
    fs.writeFileSync(filePath, JSON.stringify(record, null, 2), "utf8");

    // ...existing code...
  } catch (err) {
    // ...existing code...
  }
});

---
Resumen:
El archivo JSON del lote se guarda cuando el frontend envía los datos a /lotes. El backend crea el archivo en lotes con el contenido recibido y algunos metadatos calculados.


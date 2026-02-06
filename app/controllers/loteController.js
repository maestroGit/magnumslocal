// app/controllers/loteController.js
import Lote from '../../src/models/Lote.js'; // Ajusta si tu modelo está en otra ruta
// Si necesitas interactuar con la base de datos, importa los modelos aquí

export async function generarQR(req, res) {
  const {
    loteId,
    nombreProducto,
    fechaProduccion,
    fechaCaducidad,
    origen,
    bodega,
    año,
    variedad,
    región,
    denominacionOrigen,
    alcohol,
    notaDeCata,
    maridaje,
    precio,
    comentarios,
    trazabilidad,
  } = req.body;

  try {
    // Validación básica
    if (!loteId || !nombreProducto || !bodega) {
      return res.status(400).json({
        success: false,
        error: 'Faltan campos obligatorios: loteId, nombreProducto, bodega',
      });
    }

    // Crear instancia de Lote (ajusta según tu modelo real)
    const lote = new Lote(
      loteId,
      nombreProducto,
      fechaProduccion,
      fechaCaducidad,
      origen,
      bodega,
      año,
      variedad,
      región,
      denominacionOrigen,
      alcohol,
      notaDeCata,
      maridaje,
      precio,
      comentarios,
      trazabilidad
    );

    // Generar el código QR (ajusta si tu método es diferente)
    const qrUrl = await lote.generarQR();

    res.json({
      success: true,
      qrBase64: qrUrl,
      loteData: {
        loteId: lote.loteId,
        nombreProducto: lote.nombreProducto,
        bodega: lote.bodega,
        año: lote.año,
        región: lote.región,
        precio: lote.precio,
      },
    });
  } catch (err) {
    console.error('Error generando el QR:', err);
    res.status(500).json({
      success: false,
      error: 'Error generando el QR',
      details: err.message,
    });
  }
}

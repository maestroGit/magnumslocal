/**
 * Clase Lote para gestionar la información detallada de un lote. Incluye el método para generación de códigos QR.
 */
// faltaría añadir este parámetro a la class Transaction

import qrcode from "qrcode";

class Lote {
  constructor(
    loteId = `L${Date.now()}`,                           // ID automático basado en timestamp
    nombreProducto = "Rioja Gran Reserva TEST",          // Producto por defecto
    fechaProduccion = new Date().toISOString().split('T')[0], // Fecha actual
    fechaCaducidad = new Date(Date.now() + 365*24*60*60*1000*10).toISOString().split('T')[0], // +10 años
    origen = "España",                                    // Origen por defecto
    bodega = "Bodegas Testing S.L.",                     // Bodega de prueba
    año = new Date().getFullYear() - 2,                  // Año hace 2 años
    variedad = "Tempranillo",                            // Variedad típica
    región = "La Rioja",                                 // Región conocida
    denominacionOrigen = "D.O.Ca Rioja",                // DO prestigiosa
    alcohol = "14.5%",                                   // Graduación típica
    notaDeCata = "Vino equilibrado con notas a frutos rojos y especias", // Nota estándar
    maridaje = "Carnes rojas, quesos curados, embutidos", // Maridaje clásico
    precio = "25.99€",                                   // Precio razonable
    comentarios = "Lote de prueba para testing del sistema", // Comentario claro
    trazabilidad = "Viñedo → Fermentación → Crianza → Embotellado → Distribución" // Proceso completo
  ) {
    this.loteId = loteId;
    this.nombreProducto = nombreProducto;
    this.fechaProduccion = fechaProduccion;
    this.fechaCaducidad = fechaCaducidad;
    this.origen = origen;
    this.bodega = bodega;
    this.año = año;
    this.variedad = variedad;
    this.región = región;
    this.denominacionOrigen = denominacionOrigen;
    this.alcohol = alcohol;
    this.notaDeCata = notaDeCata;
    this.maridaje = maridaje;
    this.precio = precio;
    this.comentarios = comentarios;
    this.trazabilidad = trazabilidad;
  }

  // 🧪 Métodos estáticos para testing rápido
  static crearLoteTest(variacion = 'default') {
    const variaciones = {
      'rioja': new Lote(
        `RIOJA${Date.now()}`,
        "Rioja Crianza",
        "2021-09-15",
        "2031-09-15",
        "España",
        "Marqués de Riscal",
        2019,
        "Tempranillo",
        "La Rioja",
        "D.O.Ca Rioja",
        "13.5%",
        "Equilibrado, con notas a cereza y vainilla",
        "Cordero asado, quesos manchegos",
        "18.50€",
        "Lote de prueba Rioja",
        "Viñedo propio → Fermentación controlada → Crianza 12 meses"
      ),
      
      'ribera': new Lote(
        `RIBERA${Date.now()}`,
        "Ribera del Duero Reserva",
        "2020-10-20",
        "2035-10-20",
        "España",
        "Vega Sicilia",
        2018,
        "Tinto Fino",
        "Castilla y León",
        "D.O. Ribera del Duero",
        "14.8%",
        "Potente, taninos maduros, frutos negros",
        "Chuletón, caza mayor",
        "45.00€",
        "Lote premium Ribera",
        "Selección manual → Fermentación → Crianza 18 meses en barrica"
      ),
      
      'albariño': new Lote(
        `ALBAR${Date.now()}`,
        "Albariño Rías Baixas",
        "2023-09-01",
        "2026-09-01",
        "España",
        "Martín Códax",
        2023,
        "Albariño",
        "Galicia",
        "D.O. Rías Baixas",
        "12.5%",
        "Fresco, cítrico, notas florales",
        "Mariscos, pescados, ensaladas",
        "12.95€",
        "Lote blanco gallego",
        "Vendimia nocturna → Prensado suave → Fermentación fría"
      ),
      
      'default': new Lote() // Usa todos los valores por defecto
    };
    
    return variaciones[variacion] || variaciones['default'];
  }

  static crearLotePersonalizado(override = {}) {
    const loteBase = new Lote();
    // Sobrescribir solo los campos especificados
    Object.keys(override).forEach(key => {
      if (loteBase.hasOwnProperty(key)) {
        loteBase[key] = override[key];
      }
    });
    return loteBase;
  }

  toJSON() {
    return {
      loteId: this.loteId,
      nombreProducto: this.nombreProducto,
      fechaProduccion: this.fechaProduccion,
      fechaCaducidad: this.fechaCaducidad,
      origen: this.origen,
      bodega: this.bodega,
      año: this.año,
      variedad: this.variedad,
      región: this.región,
      denominacionOrigen: this.denominacionOrigen,
      alcohol: this.alcohol,
      notaDeCata: this.notaDeCata,
      maridaje: this.maridaje,
      precio: this.precio,
      comentarios: this.comentarios,
      trazabilidad: this.trazabilidad,
    };
  }

  // 🔐 Nuevo método: JSON con prueba de propiedad blockchain
  toJSONWithProof(transactionId, ownerPublicKey, transactionSignature) {
    return {
      // Datos del lote
      ...this.toJSON(),
      
      // Prueba de propiedad blockchain
      blockchainProof: {
        transactionId,        // ID de la transacción de compra
        ownerPublicKey,       // Clave pública del propietario actual
        transactionSignature,// Firma de la transacción original
        timestamp: new Date().toISOString(),
        verificableAt: `blockchain/transaction/${transactionId}`
      }
    };
  }

  async generarQR() {
    const qrData = JSON.stringify(this.toJSON());
    try {
      const url = await qrcode.toDataURL(qrData); // Genera el código QR como URL base64.
      console.log(url); // URL del código QR generado
      return url; // Devuelve la URL del código QR
    } catch (err) {
      console.error(err);
      throw err; // Propaga el error para que el servidor lo maneje.
    }
  }

  // 🔐 Nuevo método: QR con prueba de propiedad blockchain
  async generarQRWithProof(transactionId, ownerPublicKey, transactionSignature) {
    const qrData = JSON.stringify(
      this.toJSONWithProof(transactionId, ownerPublicKey, transactionSignature)
    );
    
    try {
      const url = await qrcode.toDataURL(qrData);
      console.log("🍷 QR con prueba blockchain generado:");
      console.log(`   → Lote: ${this.loteId}`);
      console.log(`   → Propietario: ${ownerPublicKey.substring(0, 20)}...`);
      console.log(`   → Transacción: ${transactionId}`);
      return url;
    } catch (err) {
      console.error("❌ Error generando QR con prueba:", err);
      throw err;
    }
  }
  toString() {
    return `
        Lote ID: ${this.loteId}
        Nombre Producto: ${this.nombreProducto}
        Fecha Producción: ${this.fechaProduccion}
        Fecha Caducidad: ${this.fechaCaducidad}
        Origen: ${this.origen}
        Bodega: ${this.bodega}
        Año: ${this.año}
        Variedad: ${this.variedad}
        Región: ${this.región}
        Denominación Origen: ${this.denominacionOrigen}
        Alcohol: ${this.alcohol}
        Nota de Cata: ${this.notaDeCata}
        Maridaje: ${this.maridaje}
        Precio: ${this.precio}
        Comentarios: ${this.comentarios}
        Trazabilidad: ${this.trazabilidad}
        `;
  }
}

export { Lote };

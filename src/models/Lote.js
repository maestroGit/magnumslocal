// Clase Lote para gestión de lotes y generación de QR
import qrcode from "qrcode";

class Lote {
  constructor(
    loteId = `L${Date.now()}`,
    nombreProducto = "Rioja Gran Reserva TEST",
    fechaProduccion = new Date().toISOString().split('T')[0],
    fechaCaducidad = new Date(Date.now() + 365*24*60*60*1000*10).toISOString().split('T')[0],
    origen = "España",
    bodega = "Bodegas Testing S.L.",
    año = new Date().getFullYear() - 2,
    variedad = "Tempranillo",
    región = "La Rioja",
    denominacionOrigen = "D.O.Ca Rioja",
    alcohol = "14.5%",
    notaDeCata = "Vino equilibrado con notas a frutos rojos y especias",
    maridaje = "Carnes rojas, quesos curados, embutidos",
    precio = "25.99€",
    comentarios = "Lote de prueba para testing del sistema",
    trazabilidad = "Viñedo → Fermentación → Crianza → Embotellado → Distribución"
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
      'default': new Lote()
    };
    return variaciones[variacion] || variaciones['default'];
  }

  static crearLotePersonalizado(override = {}) {
    const loteBase = new Lote();
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

  toJSONWithProof(transactionId, ownerPublicKey, transactionSignature) {
    return {
      ...this.toJSON(),
      blockchainProof: {
        transactionId,
        ownerPublicKey,
        transactionSignature,
        timestamp: new Date().toISOString(),
        verificableAt: `blockchain/transaction/${transactionId}`
      }
    };
  }

  async generarQR() {
    const qrData = JSON.stringify(this.toJSON());
    try {
      const url = await qrcode.toDataURL(qrData);
      return url;
    } catch (err) {
      console.error(err);
      throw err;
    }
  }

  async generarQRWithProof(transactionId, ownerPublicKey, transactionSignature) {
    const qrData = JSON.stringify(
      this.toJSONWithProof(transactionId, ownerPublicKey, transactionSignature)
    );
    try {
      const url = await qrcode.toDataURL(qrData);
      return url;
    } catch (err) {
      console.error("❌ Error generando QR con prueba:", err);
      throw err;
    }
  }

  toString() {
    return `\n        Lote ID: ${this.loteId}\n        Nombre Producto: ${this.nombreProducto}\n        Fecha Producción: ${this.fechaProduccion}\n        Fecha Caducidad: ${this.fechaCaducidad}\n        Origen: ${this.origen}\n        Bodega: ${this.bodega}\n        Año: ${this.año}\n        Variedad: ${this.variedad}\n        Región: ${this.región}\n        Denominación Origen: ${this.denominacionOrigen}\n        Alcohol: ${this.alcohol}\n        Nota de Cata: ${this.notaDeCata}\n        Maridaje: ${this.maridaje}\n        Precio: ${this.precio}\n        Comentarios: ${this.comentarios}\n        Trazabilidad: ${this.trazabilidad}\n        `;
  }
}

export default Lote;

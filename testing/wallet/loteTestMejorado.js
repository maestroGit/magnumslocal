// 🧪 Test de Lote - Actualizado con valores por defecto para testing rápido
import { Lote } from '../lote.js';

console.log("🍷 === LOTE TESTING SYSTEM ACTUALIZADO === 🍷\n");

// Test 1: Modo anterior (aún funciona)
console.log("📋 === TEST 1: Modo anterior (completamente especificado) === 📋");
const loteCompleto = new Lote(
    'LOTE001', 
    'Vino Tinto Premium', 
    '2021-09-15', 
    '2031-09-15', 
    'España', 
    'Bodega Premium', 
    2019,
    'Tempranillo',
    'La Rioja',
    'D.O.Ca Rioja',
    '14.0%',
    'Excelente cuerpo y aroma',
    'Carnes rojas y quesos',
    '35.50€',
    'Lote tradicional especificado',
    'Viñedo → Fermentación → Crianza → Embotellado'
);

console.log("✅ Lote tradicional creado:");
console.log(`🏷️  ID: ${loteCompleto.loteId}`);
console.log(`🍷 Producto: ${loteCompleto.nombreProducto}`);
console.log(`💰 Precio: ${loteCompleto.precio}\n`);

// Test 2: NUEVO - Modo rápido con valores por defecto
console.log("📋 === TEST 2: NUEVO - Creación rápida con valores por defecto === 📋");
const loteRapido = new Lote();
console.log("✅ Lote rápido creado (sin parámetros):");
console.log(`🏷️  ID: ${loteRapido.loteId}`);
console.log(`🍷 Producto: ${loteRapido.nombreProducto}`);
console.log(`🏭 Bodega: ${loteRapido.bodega}`);
console.log(`📅 Año: ${loteRapido.año}`);
console.log(`💰 Precio: ${loteRapido.precio}\n`);

// Test 3: NUEVO - Lotes predefinidos
console.log("📋 === TEST 3: NUEVO - Lotes predefinidos === 📋");

const loteRioja = Lote.crearLoteTest('rioja');
console.log("✅ Lote Rioja predefinido:");
console.log(`🍇 ${loteRioja.nombreProducto} - ${loteRioja.precio}`);

const loteRibera = Lote.crearLoteTest('ribera');
console.log("✅ Lote Ribera predefinido:");
console.log(`🍇 ${loteRibera.nombreProducto} - ${loteRibera.precio}`);

const loteAlbariño = Lote.crearLoteTest('albariño');
console.log("✅ Lote Albariño predefinido:");
console.log(`🍇 ${loteAlbariño.nombreProducto} - ${loteAlbariño.precio}\n`);

// Test 4: NUEVO - Personalización selectiva
console.log("📋 === TEST 4: NUEVO - Personalización selectiva === 📋");
const lotePersonalizado = Lote.crearLotePersonalizado({
  nombreProducto: "Mi Testing Wine",
  precio: "99.99€",
  comentarios: "Solo cambio lo que necesito para el test"
});

console.log("✅ Lote personalizado (solo algunos campos):");
console.log(`🍷 ${lotePersonalizado.nombreProducto}`);
console.log(`💰 ${lotePersonalizado.precio}`);
console.log(`🏭 Bodega (por defecto): ${lotePersonalizado.bodega}`);
console.log(`💬 ${lotePersonalizado.comentarios}\n`);

// Test 5: Funcionalidades originales siguen funcionando
console.log("📋 === TEST 5: Verificar funcionalidades originales === 📋");
console.log("🔄 Generando QR del lote rápido...");
try {
  const qrUrl = await loteRapido.generarQR();
  console.log("✅ QR generado correctamente");
} catch (error) {
  console.log("⚠️  Error:", error.message);
}

console.log("\n📄 JSON del lote personalizado:");
console.log(JSON.stringify(lotePersonalizado.toJSON(), null, 2));

console.log("\n🎯 === RESUMEN DE MEJORAS === 🎯");
console.log("✅ new Lote() - Crea lote con valores realistas automáticamente");
console.log("✅ Lote.crearLoteTest('rioja') - Lotes predefinidos listos para usar");
console.log("✅ Lote.crearLotePersonalizado({precio: '10€'}) - Cambiar solo lo necesario");
console.log("✅ Compatibilidad total con código existente");
console.log("✅ IDs únicos automáticos con timestamp");
console.log("✅ Fechas calculadas automáticamente");

console.log("\n🎉 ¡Ya no necesitas rellenar formularios para testing! 🎉");

export { loteCompleto, loteRapido, loteRioja, loteRibera, loteAlbariño, lotePersonalizado };
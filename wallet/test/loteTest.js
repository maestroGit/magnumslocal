import { Lote } from '../lote.js'; // Asegúrate de ajustar la ruta al archivo donde está definida la clase Lote.

// Crear una instancia de la clase Lote
const lote = new Lote(
    '12345', 
    'Vino Tinto', 
    '2025-01-15', 
    '2027-01-15', 
    'España', 
    'Bodega de Ejemplo', 
    2025, 
    'Tempranillo', 
    'Rioja', 
    'DOC Rioja', 
    '14%', 
    'Aromas de frutas rojas y especias', 
    'Carne roja, quesos', 
    25.99, 
    'Muy buen vino', 
    'Completa'
);

// Mostrar la representación en cadena del objeto
console.log(lote.toString());

// Generar el código QR y mostrarlo en la consola
lote.generarQR();

// Imprimir el objeto en formato JSON
console.log(JSON.stringify(lote.toJSON(), null, 2));


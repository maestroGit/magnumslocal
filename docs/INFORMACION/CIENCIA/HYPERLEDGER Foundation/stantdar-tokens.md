1. Las características base (Las 5 variables de clasificación)
Cualquier token dentro de este marco se define respondiendo a cinco preguntas fundamentales:

¿Es Fungible o No Fungible?: ¿Son todos los tokens iguales e intercambiables entre sí (como un billete de dinero o una moneda), o cada token es único e irrepetible (como un diploma con nombre propio)?

¿Cuál es su Unidad?: ¿Se puede fraccionar en decimales (como las criptomonedas), es una cantidad entera ("Whole"), o es un elemento único e indivisible del que solo existe uno en el mundo ("Singleton", como una obra de arte o un título universitario)?

¿Cuál es su Valor?: ¿Tiene valor por sí mismo (intrínseco) o representa/hace referencia a algo externo (como un título físico o una certificación guardada en una base de datos)?

¿Cómo se representa?: ¿Es un saldo común registrado en una libreta centralizada o tiene una identidad única rastreable (como un número de serie)?

¿Tiene jerarquía?: ¿Es un token simple o es "híbrido" (un token principal que controla o agrupa a otros tokens secundarios)?

2. Los Comportamientos (Behaviors)
Son las reglas o capacidades que se le pueden activar o desactivar a un token. Por ejemplo:

Transferible (t) vs. No Transferible (~t): Un token de dinero suele ser transferible. En cambio, un diploma o certificado de notas educativo suele ser estrictamente no transferible (no puedes "vender" o "regalar" tu título universitario a otra persona).

Quemable (b): La capacidad de destruir o invalidar el token si, por ejemplo, el estudiante pierde la acreditación o expira su vigencia.

Acuñable (m): La capacidad de emitir nuevas unidades del token.

3. Las Propiedades y los Mensajes de Control
El TTF define cómo se guardan los datos dentro del token. Por ejemplo, un certificado educativo necesita almacenar metadatos claros:

¿Quién emitió la certificación? (Institución educativa).

¿Qué curso o habilidad avala? (ID del curso).

¿Qué calificación obtuvo? (Score).

Mediante "mensajes de control" estandarizados, cualquier software externo puede consultar estos datos (por ejemplo, enviando una orden para leer el estado del token y verificar si el certificado de una persona es legítimo o falso).

Todo el código y los proyectos oficiales de Hyperledger se encuentran en GitHub, divididos principalmente en dos grandes organizaciones según la madurez de los proyectos:

La organización principal (hyperledger):

URL: github.com/hyperledger

Qué hay aquí: Se encuentran los proyectos oficiales, estables y listos para producción empresarial, como el famoso Hyperledger Fabric, Hyperledger Besu o Hyperledger Sawtooth.

La organización de laboratorios experimentales (hyperledger-labs):

URL: github.com/hyperledger-labs

Qué hay aquí: Es justo donde descubriste el repositorio de Learning Tokens. Aquí se alojan las incubadoras, prototipos y herramientas en fase de pruebas o investigación comunitaria (como herramientas de despliegue en Docker, kits de desarrollo y librerías experimentales).
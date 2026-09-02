Objetivo: Adaptar el backend Node.js (server.js) para que funcione como un nodo agnóstico e independiente en una red distribuida. El sistema debe gestionar CORS dinámicos mediante variables de entorno y mantener la autenticación OAuth 2.0 (Google) dentro del dominio propio del nodo que ejecuta la petición (ej. Railway), en lugar de redirigir a un dominio central estático (blockswine.com).

Procedimiento paso a paso:

Configurar CORS y CSP Dinámicos:

Reemplazar las expresiones regulares y arreglos estáticos de dominios en server.js por una lectura dinámica de process.env.ALLOWED_ORIGINS (separados por coma).

Añadir soporte para wildcard (*) y acceso local (localhost).

Actualizar las directivas connect-src de Helmet con la whitelist resultante.

Actualizar la Estrategia de Google OAuth:

Cambiar la propiedad callbackURL en la configuración de GoogleStrategy a la ruta relativa /api/auth/google/callback.

Activar passReqToCallback: true para permitir contexto si es necesario.

Implementar Redirección Dinámica de Callback:

En la ruta de respuesta /api/auth/google/callback, construir la base de la URL dinámicamente usando el protocolo y el host de la petición entrante: ${req.headers['x-forwarded-proto'] || req.protocol}://${req.get('host')}.

Usar esa base dinámica para la instrucción res.redirect() hacia /complete-profile.html o la vista correspondiente.

Registrar Callback URIs en Google Cloud Console:

Acceder a la consola de desarrolladores de Google.

En las credenciales de OAuth 2.0, añadir las URLs exactas de callback de cada nuevo nodo desplegado (ej. [https://magnumsmaster-production-559b.up.railway.app/api/auth/google/callback](https://magnumsmaster-production-559b.up.railway.app/api/auth/google/callback)).

Despliegue y Pruebas por Nodo:

Desplegar en Railway/VPS definiendo las variables ALLOWED_ORIGINS y PORT.

Probar el flujo desde https://<tu-nodo>/login.html y verificar que tras autenticarte con Google el navegador retorne exactamente a https://<tu-nodo>/... sin errores de CORS.

##  Sí, la solución es completamente válida para cualquier máquina, red o IP, siempre que se cumplan dos requisitos de red básicos:

Por qué la arquitectura es universal
Host-Agnostic (No depende de la IP o dominio):
Al construir las redirecciones dinámicamente con req.get('host'), Node.js lee la cabecera Host que envía la petición entrante en tiempo de ejecución. Ya sea un dominio de Railway, un contenedor en AWS, una IP pública estática ([http://192.0.2.1:3100](http://192.0.2.1:3100)) o un tunel de Ngrok, el nodo detecta automáticamente dónde está respondiendo.

CORS adaptable vía Entorno:
Si una máquina funciona como un nodo público abierto a cualquier cliente, defines ALLOWED_ORIGINS=*. Si es un nodo privado o de una bodega específica, introduces únicamente sus orígenes autorizados en su archivo .env local sin modificar el código.

Los 2 Requisitos Obligatorios en Cualquier Red/IP Para que el flujo funcione sin interrupciones en cualquier máquina:RequisitoRazón Térmica / CausaSolución
1. Google Cloud ConsoleGoogle exige registrar cada dominio/IP exacta en la lista de URIs de redireccionamiento autorizadas. Si levantas un nodo en una IP nueva (ej. [http://203.0.113.5/api/auth/google/callback](http://203.0.113.5/api/auth/google/callback)), Google bloqueará la petición con un error redirect_uri_mismatch si no está en su consola.Registrar la URL/IP del nuevo nodo en tu proyecto de Google Cloud Console.

Significa que Google exige conocer por adelantado todas las direcciones (dominios o IPs públicas) donde tus nodos procesen el login con Google.

No se trata de autorizar la red interna o las IPs de los clientes que visitan tu web, sino únicamente las URLs del backend de los nodos a las que Google debe enviar de vuelta la respuesta del usuario (redirect_uri).

Google aplica este control como una medida estricta contra ataques de phishing y suplantación de identidad.

Si cualquier máquina pudiera iniciar sesión usando tu GOOGLE_CLIENT_ID y pedirle a Google que le envíe las credenciales de tus usuarios a una IP desconocida ([http://ip-del-atacante.com/callback](http://ip-del-atacante.com/callback)), un atacante podría robar accesos.

Por eso, Google bloquea la autenticación con el error redirect_uri_mismatch a menos que la dirección del nodo receptor esté explícitamente registrada en su panel de administración.

Cómo registrar una nueva IP o Dominio en Google Cloud Console
Entra a Google Cloud Console > APIs y servicios > Credenciales.

Selecciona tu ID de cliente de OAuth 2.0.

En la sección URIs de redireccionamiento autorizados, añade la URL exacta del callback de cada nodo:

[https://magnumsmaster-production-559b.up.railway.app/api/auth/google/callback](https://magnumsmaster-production-559b.up.railway.app/api/auth/google/callback)

[https://nodo-bodega1.com/api/auth/google/callback](https://nodo-bodega1.com/api/auth/google/callback)

[http://203.0.113.5:3100/api/auth/google/callback](http://203.0.113.5:3100/api/auth/google/callback)

Guarda los cambios. (Suele tardar entre 1 y 5 minutos en propagarse).

2. Proxy Inverso / HeadersDetrás de proxies (Railway, Nginx, Cloudflare), el protocolo o puerto original puede cambiar si Node no confía en los headers proxy.Mantener en server.js la instrucción app.set('trust proxy', 1); para que req.protocol y req.get('host') lean correctamente X-Forwarded-Proto y X-Forwarded-Host.

Resumen sobre el punto 2 (trust proxy)
La instrucción app.set('trust proxy', 1); no es para Google, sino para tu propio servidor Node.js.

Cuando despliegas en Railway o detrás de Nginx, Express cree que está corriendo en http://localhost. Al activar trust proxy, Express lee las cabeceras X-Forwarded-Proto (sabe que el usuario entró por https://) y X-Forwarded-Host (sabe qué dominio usó el usuario), permitiendo que req.get('host') devuelva la dirección real del nodo automáticamente.
_____________
 02/09/2027
 cuando accedo desde https://magnumsmaster-production-559b.up.railway.app/login.html no se bloque apor CORS. Entendido. Ahora la pregunta es cuando hago loguin con OAuth de google, me redirige al dominio https://app.blockswine.com/ que es el repositorio desplegado en seenode, no debería permanecer en  https://magnumsmaster-production-559b.up.railway y abrir el html correspondiente 
_____________
Eso ocurre porque la URL de redirección (OAuth Callback / Redirect URI) o el dominio de sesión está definido de forma estática con el valor de producción ([https://app.blockswine.com](https://app.blockswine.com)), en lugar de utilizar el origen dinámico de la petición actual.

Cuando inicias sesión con Google OAuth, se ejecutan dos pasos donde se especifica a dónde redirigir al usuario:

La petición inicial al proveedor (/auth/google): En este punto se le indica a Google a qué redirect_uri enviar el código de autorización.

El Callback de respuesta: Una vez validado el perfil con Google, tu backend emite un res.redirect(...) hacia la interfaz web.

Diagnóstico de las causas en el backend
redirect_uri hardcodeada en Passport / Google Strategy:
Suele usarse un string fijo como "[https://app.blockswine.com/api/auth/google/callback](https://app.blockswine.com/api/auth/google/callback)". Si el usuario inició el flujo desde Railway, Google lo enviará de vuelta a Seenode (app.blockswine.com).

res.redirect() estático al finalizar el login:
En el handler de la ruta de callback de Google, el backend suele incluir un redireccionamiento estático:

JavaScript
// ❌ Redirección hardcodeada
res.redirect('https://app.blockswine.com/complete-profile.html');
Solución: Redirección Dinámica basada en el Origen del Nodo
Para que cada nodo mantenga al usuario en su propio dominio (ya sea Railway, Seenode o un VPS independiente), debes capturar el host/origen desde la petición entrante.

1. Configurar GoogleStrategy con callback relativo o dinámico
Si usas passport-google-oauth20, en lugar de pasar un dominio completo en callbackURL, pasa la ruta relativa. Passport la resolverá automáticamente combinando el protocolo y el host desde donde se hace la petición (req):

Nota importante para Google Cloud Console: Debes añadir las URLs de callback de todos tus nodos en las "URIs de redireccionamiento autorizadas" de tu ID de cliente de Google:

[https://app.blockswine.com/api/auth/google/callback](https://app.blockswine.com/api/auth/google/callback)

[https://magnumsmaster-production-559b.up.railway.app/api/auth/google/callback](https://magnumsmaster-production-559b.up.railway.app/api/auth/google/callback)

2. Redireccionar al HTML correcto según el host de la petición
En el handler del Callback de OAuth, utiliza req.headers.host o req.protocol + '://' + req.get('host') para construir la redirección dentro del mismo nodo:

Resumen de Cambios
Ruta relativa en callbackURL: Cambia cualquier [https://app.blockswine.com/](https://app.blockswine.com/)... en la configuración de Google por /api/auth/google/callback.

Redirección dinámica en la respuesta: Reemplaza los res.redirect("[https://app.blockswine.com/](https://app.blockswine.com/)...") por la concatenación con el host activo (req.get('host')).

Google Developer Console: Registra la URL de Railway en la lista de callbacks permitidos de Google OAuth.

Resumen para proceder
Si quieres evitar añadir URLs en Google Console constantemente: Implementa el Gateway Centralizador en Seenode.Si prefieres mantener cada nodo independiente: Usa la Redirección Dinámica (req.get('host')) y añade el callback de Railway a Google Console.Sincronización: Vincula la respuesta de /auth/user con la dirección pública de la wallet para renderizar el avatar y la clave en view.html.
# Ejercicio 4 Aplicación web de imágenes

## Entrega y modo de ejecución

La aplicación está implementada. Usa Docker y abre http://localhost:3000. El modo demo utiliza LocalStack y no gasta créditos. Para evidencias AWS, configura la clave nueva de app-imagenes-user en el perfil lab09-nuevo, aplica docs/s3-cors.json en el bucket y ejecuta únicamente compose.yaml. La clave anterior no funciona: fue eliminada. No captures secretos ni URLs prefirmadas completas.

## Pruebas obligatorias y evidencias

1. **JPG válido:** abre la web, selecciona un JPG menor a 5 MiB y pulsa Subir imagen. Debe mostrar progreso, verificar y aparecer en la galería. Abre la vista previa y descarga; compara SHA256 con Get-FileHash. Captura la galería y el resultado. También se admiten PNG/WebP.
2. **EXE o PDF:** arrastra un PDF a la zona de carga (el selector filtra estos tipos). Debe indicar que solo se admiten JPG/PNG/WebP y no emitir una carga. Para probar el backend envía POST /api/upload-url con contentType application/pdf; debe devolver 400. Captura el mensaje y la respuesta.
3. **10 MB:** el frontend lo rechaza. Para demostrar que también lo rechaza el backend, abre DevTools > Console y ejecuta desde localhost:3000:

```js
fetch('/api/upload-url', {
  method:'POST', headers:{'Content-Type':'application/json'},
  body:JSON.stringify({filename:'grande.jpg',contentType:'image/jpeg',sizeBytes:10485760,checksum:'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA='})
}).then(async r=>console.log(r.status, await r.json()));
```

Debe mostrar 400. No hace falta subir 10 MB reales ni consumir almacenamiento para esta prueba.

4. **URL expirada:** en modo AWS, copia una URL de vista previa de GET /api/images > items[n].url a un archivo privado. Registra la hora, espera 16 minutos y abre exactamente esa misma URL en una pestaña nueva o realiza una solicitud nueva. Debe ser rechazada por AWS. No uses una imagen ya cargada en caché ni renueves la URL con Actualizar. Las URLs firmadas con credenciales temporales pueden vencer antes si caducan las credenciales. Captura el error y las horas, ocultando la firma. El emulador no certifica este comportamiento: haz esta prueba en AWS.
5. **Sin credenciales en frontend:** en DevTools > Sources inspecciona app.js e index.html. No contienen Access Keys ni Secret Access Keys. El frontend recibe URLs firmadas y configuración pública; esas URLs otorgan acceso temporal y no deben publicarse completas.
6. **Carga directa:** en Network, activa Preserve log y sube una imagen. Debes ver POST /api/upload-url a localhost:3000, PUT al host S3 y POST /api/uploads/id/complete a localhost:3000. El cuerpo binario va en PUT a S3, no en el POST al backend. La verificación posterior sí lee la imagen desde el backend de manera intencional.

Pruebas adicionales: archivo de texto renombrado a .png (rechazo al completar); búsqueda sin resultados; caída de almacenamiento con mensaje recuperable; eliminación con confirmación; tabulación y Escape en diálogos; pantalla móvil. Las pruebas automáticas no afirman que haya ocurrido una expiración de 16 minutos.

## Respuestas de análisis

### ¿Por qué usar URLs prefirmadas en lugar de hacer público el bucket?

Porque permiten conceder acceso a un archivo concreto durante un tiempo limitado. El bucket conserva su privacidad y el navegador no recibe las credenciales del backend. Así se puede compartir una imagen o autorizar una carga sin abrir toda la colección al público.

### ¿Qué pasa si un atacante intercepta una URL? ¿Cómo limitar el daño?

Puede usarla mientras siga vigente, dentro de la operación y el objeto autorizados. Por eso utilizamos HTTPS, URLs cortas, claves únicas, checksum firmado y permisos mínimos. Deben tratarse como tokens de acceso: no se publican en logs ni capturas. También hacen falta controles de identidad y cuotas si la aplicación se expone a otros usuarios.

### ¿Cómo eliminar credenciales del .env al desplegar en EC2?

Asignaría a la instancia un IAM Role mediante un instance profile, limitado al bucket. El SDK obtiene y renueva credenciales temporales automáticamente. No guardaría claves estáticas en el código, Dockerfile, repositorio ni .env.

### ¿Cómo proteger contra subidas masivas?

Aplicaría límites por usuario e IP, cuotas de almacenamiento, número máximo de cargas pendientes y límites de tamaño. Esta versión limita la generación de URLs a 15 por minuto y la API a 90 solicitudes por minuto e IP. En producción usaría un almacén compartido para los límites, autenticación y, si corresponde, AWS WAF. El límite en memoria no se comparte entre réplicas y se reinicia al arrancar.

### ¿Qué validaciones adicionales recomendaría?

No confiaría solo en la extensión o el MIME: comprobaría la firma del archivo, su decodificación real, dimensiones, cantidad de píxeles y tamaño efectivo. Esta versión decodifica con sharp, limita píxeles y rechaza imágenes dañadas/animadas antes de publicarlas. Para un servicio público añadiría antivirus, reencodificación y eliminación de metadatos EXIF, controles de contenido y cuotas por propietario. No se ha implementado antivirus ni se afirma que un archivo esté libre de malware.

## Video de hasta cinco minutos

- 0:00–0:40: Docker Compose y modo AWS, bucket privado.
- 0:40–1:40: cargar JPG, progreso, galería y vista previa.
- 1:40–2:20: descargar, buscar, ordenar y eliminar una imagen.
- 2:20–3:10: rechazar PDF y petición de 10 MB.
- 3:10–4:10: Network con PUT directo y Sources sin credenciales.
- 4:10–5:00: evidencia previamente registrada de URL expirada, SSE-S3 y explicación breve de permisos mínimos.

No esperes los 16 minutos durante la grabación: prepara esa evidencia antes. El video debe ser una captura real de tu ejecución; no se entrega un video simulado.

## Costos y limpieza

Utiliza imágenes pequeñas y no actives servicios opcionales de pago. La verificación adicional hace GET, HEAD y COPY; con versionado las copias y eliminaciones conservan versiones, incluso temporales. Al acabar las evidencias detén Docker, revoca la clave y vacía el bucket incluyendo todas las versiones y marcadores antes de eliminarlo. No basta con borrar las imágenes de la galería.

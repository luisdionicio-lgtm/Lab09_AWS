# Guía de evidencias del laboratorio 09 AWS S3

Alcance: ejercicios 1, 2 y 3. Bucket de trabajo: lab-09-dionicio-20261014. Región: us-east-1. Esta lista indica las evidencias que se deben obtener; no afirma que todas las pruebas estén ejecutadas.

## Ejercicio 1 Fundamentos de Amazon S3

1. En S3 > Buckets, capturar el nombre del bucket y su región.
2. En el bucket > Permisos, capturar Bloquear todo el acceso público en Activado y ACL deshabilitadas.
3. En Objetos, capturar las carpetas originales/, miniaturas/ y temporal/.
4. Abrir originales/ y capturar las tres imágenes con nombre, tamaño y clase Standard.
5. Seleccionar una imagen y descargarla. Mostrar el archivo descargado y su contenido.
6. En Propiedades del bucket, capturar el ARN. En Propiedades de una imagen, capturar la URL del objeto. No confundir esta URL con una URL prefirmada del botón Abrir.
7. Abrir la URL del objeto sin autenticación: documentar AccessDenied. El resultado esperado es acceso anónimo rechazado porque el objeto es privado.
8. En una terminal con AWS CLI autenticada, ejecutar y capturar por separado:

```powershell
aws sts get-caller-identity
aws s3 ls
aws s3 ls s3://lab-09-dionicio-20261014/originales/
aws s3 cp ./fotos/prueba-1.png s3://lab-09-dionicio-20261014/originales/mi-foto.png
aws s3 cp s3://lab-09-dionicio-20261014/originales/mi-foto.png ./descarga.png
aws s3 sync ./fotos/ s3://lab-09-dionicio-20261014/originales/
```

Si CloudShell sigue bloqueado por verificación de cuenta, capturar el error e identificar las pruebas CLI como pendientes. No presentar comandos preparados como operaciones ejecutadas.

## Ejercicio 2 Seguridad IAM y cifrado

1. En IAM > Usuarios > app-imagenes-user, capturar que no tiene acceso a la consola y que no pertenece a grupos.
2. Capturar su política: ListBucket sobre el ARN del bucket y GetObject, PutObject y DeleteObject sobre el ARN de objetos. No debe tener permisos administrativos de S3.
3. Crear la clave de acceso únicamente cuando se autorice. Guardarla de forma privada. Nunca capturar ni incluir la clave secreta, archivos de credenciales ni resultados que la muestren.
4. En S3 > Permisos > Política del bucket, capturar DenyInsecureConnections y aws:SecureTransport=false con Effect Deny.
5. En Propiedades, capturar el cifrado predeterminado SSE-S3.
6. Abrir las propiedades de una imagen nueva y capturar el cifrado AES-256.
7. Configurar el perfil app-user sin grabar la entrada de secretos. Después capturar solo los resultados de estas pruebas:

```powershell
aws s3 ls s3://lab-09-dionicio-20261014/ --profile app-user
aws s3 cp ./fotos/prueba-2.png s3://lab-09-dionicio-20261014/originales/test.png --profile app-user
aws s3api delete-bucket --bucket lab-09-dionicio-20261014 --profile app-user
```

El último comando es una prueba negativa: solo ejecutarlo después de verificar que la política del perfil no concede DeleteBucket. Debe fallar con AccessDenied. BucketNotEmpty no demuestra mínimo privilegio.

## Ejercicio 3 Versionado ciclo de vida y resiliencia

1. En Propiedades > Control de versiones, capturar Habilitada.
2. Preparar tres imágenes de contenido diferente con el mismo nombre prueba.png. Subirlas consecutivamente a originales/prueba.png.
3. Activar Mostrar versiones y capturar las tres versiones con sus identificadores. Usar exactamente la misma clave; tres nombres distintos no demuestran versionado.
4. Desactivar Mostrar versiones, seleccionar prueba.png y eliminar el objeto. Esta eliminación debe crear un marcador, conservando las versiones.
5. Activar Mostrar versiones y capturar el marcador de eliminación junto a las versiones conservadas.
6. Eliminar solo el marcador de eliminación, con confirmación previa. Capturar que prueba.png reaparece y que se puede recuperar su contenido.
7. Preparar la regla regla-imagenes-antiguas para originales/ y capturar su resumen:
   - Versiones actuales: Standard-IA tras 30 días; Glacier Instant Retrieval tras 90 días.
   - Versiones no actuales: Glacier Deep Archive tras 60 días.
   - Versiones no actuales: eliminación permanente tras 365 días.
   - Limpieza de marcadores de eliminación vencidos activada.
8. Guardar la regla solo con autorización para la eliminación permanente y los costos de transición. Si no se guarda, rotular la captura como configuración preparada, no aplicada.
9. Los objetos menores a 128 KB no transicionan de forma predeterminada. Las imágenes sintéticas de esta práctica son menores; no esperar una transición real de ellas ni afirmar que ocurrió.
10. Las transiciones se observan por configuración; no es necesario esperar 30 o 90 días para presentar esta evidencia. Replicación entre regiones y KMS son opcionales avanzados y requieren autorización separada si implican costos.

## Informe y presentación

Para cada evidencia, incluir número de ejercicio, acción, resultado observado y explicación breve. Mantener visibles el nombre del recurso y la región cuando corresponda. Las respuestas de análisis deben cubrir:

- Ejercicio 1: unicidad del nombre en el espacio global elegido, endpoints regionales y globales, y acceso anónimo denegado.
- Ejercicio 2: políticas de identidad y recurso, precedencia de Deny explícito, SSE-S3 frente a SSE-KMS y SSE-C, protección HTTPS y respuesta ante filtración de claves.
- Ejercicio 3: habilitación y suspensión del versionado, versiones existentes, costo de 100 GB con hipótesis explícitas, clases de almacenamiento y MFA Delete.

Para el cálculo de costos, usar precios oficiales vigentes de us-east-1 y declarar si se aplica la regla a todos los objetos o solo al 80 % frío. La regla basada únicamente en originales/ afecta todos los objetos de ese prefijo, no detecta automáticamente cuáles se consultan. Separar almacenamiento, solicitudes, recuperaciones y versiones adicionales.

## Estado inicial verificado

Se crearon el bucket y las tres carpetas; se cargaron tres PNG sintéticos (aproximadamente 16 KB en total); se configuraron SSE-S3, bloqueo público, versionado y política HTTPS. El usuario IAM app-imagenes-user ya está creado, sin consola ni grupos, y tiene adjunta la política insertada lab09-app-imagenes-minimo. La creación de clave, las pruebas CLI y la demostración completa de restauración quedan para el alumno. La regla de ciclo de vida no se guardó por decisión del usuario. CloudShell mostró un bloqueo por verificación de la cuenta.


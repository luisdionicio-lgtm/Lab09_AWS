# Verification record

2026-10-14: npm test passed 7 tests; npm run check passed; npm audit --omit=dev reported 0 vulnerabilities. Docker build and Compose demo startup succeeded. App and LocalStack health were healthy.

npm run smoke passed against local Docker/LocalStack: CORS preflight, direct PUT, post-upload verification, listing, 900-second GET signing, byte-identical download, 10 MiB/PDF rejection, delete and subsequent absence from list. URL parameters verified PUT expiry 300 seconds, GET expiry 900 seconds.

Browser: selected a synthetic PNG via real file chooser, uploaded, received confirmation, image appeared and loaded. Desktop and 390x844 screenshots reviewed; document scroll width was 390 at viewport width 390. Physical phone interactions not verified. No real AWS upload or 16-minute expiry result is claimed: existing profile returned InvalidAccessKeyId after user revoked key. Manual AWS verification instructions are in EJERCICIO_4.md.

Detector executed once: warnings about src-less images used in hidden selection/preview containers, whose src is assigned on interaction; colored shadow on dialog in a light surface. Screenshots confirmed visible gallery image loaded. No placeholder images are published.

The Docker demo uses public emulation credentials test/test, unrelated to AWS. No private credentials are committed. Runtime AWS credentials are mounted read-only and excluded from Docker build context and Git.

Final UI review: targeted findings resolved (dialog accessible names, loaded-image search scope, 44px action targets). Browser verified JPG upload and named preview dialog. Physical phone testing and AWS 16-minute expiration still require user execution. Code formatted with Prettier; 7 backend tests and syntax checks passed afterward.

AWS connection follow-up 2026-10-14:
- CORS saved for http://localhost:3000; public access blocking and HTTPS deny policy retained.
- User explicitly confirmed a new key for app-imagenes-user. Credentials stored only in the existing local lab09-nuevo profile; no key values recorded here or in Git.
- Docker switched from LocalStack to real Amazon S3.
- npm run smoke passed against the real bucket: CORS, signed direct PUT, content validation, gallery, byte-identical download, 10MB/PDF rejection and logical deletion.
- Browser uploaded a 982-byte synthetic JPG; the gallery confirmed success and the S3 console showed the same object under originales/.
- The 16-minute expiration proof remains a separate manual test. Existing versioning retains prior object versions and delete markers until final cleanup.

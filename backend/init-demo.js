import {
  S3Client,
  CreateBucketCommand,
  PutBucketCorsCommand,
  PutBucketVersioningCommand,
} from "@aws-sdk/client-s3";
const s3 = new S3Client({
  region: "us-east-1",
  endpoint: "http://localstack:4566",
  forcePathStyle: true,
});
let ready = false;
for (let n = 0; n < 40; n++) {
  try {
    await s3.send(new CreateBucketCommand({ Bucket: "lumbre-demo" }));
    ready = true;
    break;
  } catch (e) {
    if (e.name === "BucketAlreadyOwnedByYou") {
      ready = true;
      break;
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
}
if (!ready) throw Error("El almacenamiento local no está disponible.");
await s3.send(
  new PutBucketCorsCommand({
    Bucket: "lumbre-demo",
    CORSConfiguration: {
      CORSRules: [
        {
          AllowedOrigins: ["http://localhost:3000"],
          AllowedMethods: ["GET", "PUT", "HEAD"],
          AllowedHeaders: ["*"],
          ExposeHeaders: ["ETag"],
          MaxAgeSeconds: 300,
        },
      ],
    },
  }),
);
await s3.send(
  new PutBucketVersioningCommand({
    Bucket: "lumbre-demo",
    VersioningConfiguration: { Status: "Enabled" },
  }),
);
console.log("Almacenamiento local inicializado; no utiliza AWS.");

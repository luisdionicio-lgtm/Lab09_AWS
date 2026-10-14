import { test } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import sharp from "sharp";
import { createApp, MAX_BYTES } from "../backend/server.js";
const body = {
  filename: "paisaje.png",
  contentType: "image/png",
  sizeBytes: 100,
  checksum: Buffer.alloc(32).toString("base64"),
};
function fixture(overrides = {}) {
  const removed = [],
    promoted = [];
  const store = {
    putUrl: async () => "http://storage.local/signed-put",
    getUrl: async (key) => "http://storage.local/" + key,
    headers: (b) => ({ "Content-Type": b.contentType }),
    head: async () => ({ ContentLength: 100, ContentType: "image/png" }),
    read: async () => ({ Body: [Buffer.alloc(100)] }),
    promote: async (...keys) => promoted.push(keys),
    remove: async (key) => removed.push(key),
    list: async () => ({ Contents: [] }),
    ...overrides,
  };
  return { app: createApp({ store, limited: false }), removed, promoted };
}
test("rejects unsupported types, oversize, empty, fractional sizes and missing checksum before signing", async () => {
  const { app } = fixture();
  for (const b of [
    { ...body, contentType: "application/pdf" },
    { ...body, sizeBytes: 10 * 1024 * 1024 },
    { ...body, sizeBytes: MAX_BYTES },
    { ...body, sizeBytes: 0 },
    { ...body, sizeBytes: 1.5 },
    { ...body, checksum: "" },
  ])
    await request(app).post("/api/upload-url").send(b).expect(400);
});
test("issues a five minute ticket in quarantine, sanitizes filename and blocks foreign origins", async () => {
  let key;
  const { app } = fixture({
    putUrl: async (k) => ((key = k), "http://storage.local/put"),
  });
  const result = await request(app)
    .post("/api/upload-url")
    .send({ ...body, filename: "../../photo.png" })
    .expect(200);
  assert.equal(result.body.expiresIn, 300);
  assert.match(key, /^temporal\/uploads\//);
  assert.ok(!result.body.key.includes(".."));
  await request(app)
    .post("/api/upload-url")
    .set("Origin", "https://evil.example")
    .send(body)
    .expect(403);
});
test("rejects bytes masquerading as PNG, cleans quarantine, does not publish", async () => {
  const { app, removed, promoted } = fixture();
  const t = await request(app).post("/api/upload-url").send(body);
  await request(app)
    .post(`/api/uploads/${t.body.uploadId}/complete`)
    .send({})
    .expect(400);
  assert.equal(promoted.length, 0);
  assert.equal(removed.length, 1);
});
test("rejects declared versus actual size mismatch", async () => {
  const { app, promoted } = fixture({
    head: async () => ({ ContentLength: 200, ContentType: "image/png" }),
  });
  const t = await request(app).post("/api/upload-url").send(body);
  await request(app)
    .post(`/api/uploads/${t.body.uploadId}/complete`)
    .send({})
    .expect(400);
  assert.equal(promoted.length, 0);
});
test("decodes a valid image before promoting; ticket cannot be replayed", async () => {
  const bytes = await sharp({
    create: { width: 20, height: 20, channels: 3, background: "#336699" },
  })
    .png()
    .toBuffer();
  const { app, promoted } = fixture({
    head: async () => ({
      ContentLength: bytes.length,
      ContentType: "image/png",
    }),
    read: async () => ({ Body: [bytes] }),
  });
  const t = await request(app)
    .post("/api/upload-url")
    .send({ ...body, sizeBytes: bytes.length });
  await request(app)
    .post(`/api/uploads/${t.body.uploadId}/complete`)
    .send({})
    .expect(201);
  assert.equal(promoted.length, 1);
  await request(app)
    .post(`/api/uploads/${t.body.uploadId}/complete`)
    .send({})
    .expect(410);
});
test("lists only supported objects, returns continuation token, scoped deletion", async () => {
  const { app, removed } = fixture({
    list: async () => ({
      Contents: [
        { Key: "originales/a.png", Size: 20 },
        { Key: "originales/", Size: 0 },
        { Key: "originales/b.pdf", Size: 12 },
      ],
      NextContinuationToken: "page2",
    }),
  });
  const result = await request(app).get("/api/images").expect(200);
  assert.equal(result.body.items.length, 1);
  assert.equal(result.body.nextCursor, "page2");
  await request(app).delete("/api/images/temporal/other.png").expect(400);
  assert.equal(removed.length, 0);
  await request(app).delete("/api/images/originales/a.png").expect(200);
  assert.deepEqual(removed, ["originales/a.png"]);
});
test("provider errors are redacted and API responses are not cached", async () => {
  const { app } = fixture({
    list: async () => {
      throw Error("SECRET_PROVIDER_CREDENTIAL");
    },
  });
  const r = await request(app).get("/api/images").expect(503);
  assert.ok(!r.text.includes("SECRET"));
  assert.equal(r.headers["cache-control"], "no-store");
});

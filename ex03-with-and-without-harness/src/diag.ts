import { client, MODEL, textOf } from "@harness/client";
import { BASE_PROMPT, LeadSchema, stripFences } from "./schema";

const r = await client.messages.create({
  model: MODEL,
  max_tokens: 512,
  messages: [{ role: "user", content: BASE_PROMPT }],
});
const raw = textOf(r);
console.log("=== RAW ===\n" + raw + "\n=== /RAW ===");
try {
  const p = JSON.parse(stripFences(raw));
  console.log("parsed:", JSON.stringify(p));
  const res = LeadSchema.safeParse(p);
  console.log("schema ok?", res.success);
  if (!res.success) console.log("issues:", JSON.stringify(res.error.issues));
} catch (e: any) {
  console.log("parse error:", e.message);
}

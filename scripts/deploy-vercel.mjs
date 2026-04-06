import { readFileSync, readdirSync, statSync } from "fs";
import { join, relative } from "path";
import { createHash } from "crypto";

const TOKEN = process.env.VERCEL_TOKEN;
if (!TOKEN) { console.error("❌ Falta VERCEL_TOKEN en el entorno"); process.exit(1); }
const PROJECT_NAME = "vecinoactua";
const ROOT = decodeURIComponent(new URL("..", import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1"));

const HEADERS = {
  Authorization: `Bearer ${TOKEN}`,
  "Content-Type": "application/json",
};

// ── Archivos a ignorar ──────────────────────────────────────────────────────
const IGNORE = new Set([
  "node_modules", ".next", ".git", "scripts",
  "package-lock.json", ".env.local", ".env",
]);

function collectFiles(dir, base = dir) {
  const results = [];
  for (const entry of readdirSync(dir)) {
    if (IGNORE.has(entry)) continue;
    const full = join(dir, entry);
    const rel = relative(base, full).replace(/\\/g, "/");
    const stat = statSync(full);
    if (stat.isDirectory()) {
      results.push(...collectFiles(full, base));
    } else {
      results.push({ full, rel });
    }
  }
  return results;
}

async function uploadFile(content) {
  const sha = createHash("sha1").update(content).digest("hex");
  const res = await fetch("https://api.vercel.com/v2/files", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/octet-stream",
      "x-vercel-digest": sha,
    },
    body: content,
  });
  // 200 = uploaded, 409 = already exists — both OK
  return sha;
}

// ── 1. Crear o recuperar proyecto ───────────────────────────────────────────
console.log("🔍 Buscando proyecto en Vercel...");
let projectId;
{
  const res = await fetch(`https://api.vercel.com/v9/projects/${PROJECT_NAME}`, { headers: HEADERS });
  if (res.ok) {
    const p = await res.json();
    projectId = p.id;
    console.log(`   ✅ Proyecto existente: ${p.name} (${projectId})`);
  } else {
    console.log("   📦 Creando nuevo proyecto...");
    const res2 = await fetch("https://api.vercel.com/v10/projects", {
      method: "POST",
      headers: HEADERS,
      body: JSON.stringify({
        name: PROJECT_NAME,
        framework: "nextjs",
      }),
    });
    const p = await res2.json();
    projectId = p.id;
    console.log(`   ✅ Proyecto creado: ${p.name} (${projectId})`);
  }
}

// ── 2. Env vars ─────────────────────────────────────────────────────────────
console.log("\n🔑 Configurando variables de entorno...");
const envVars = [
  { key: "NEXT_PUBLIC_SUPABASE_URL", value: "https://ectyxauddclqbikkvnht.supabase.co", type: "plain", target: ["production", "preview"] },
  { key: "NEXT_PUBLIC_SUPABASE_ANON_KEY", value: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVjdHl4YXVkZGNscWJpa2t2bmh0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0ODczMTEsImV4cCI6MjA5MTA2MzMxMX0.fhC9QlrSj_pGnocYJzbVONuNWBLR8xF9MXwFMru9eE0", type: "encrypted", target: ["production", "preview"] },
  { key: "SUPABASE_SERVICE_ROLE_KEY", value: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVjdHl4YXVkZGNscWJpa2t2bmh0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTQ4NzMxMSwiZXhwIjoyMDkxMDYzMzExfQ.0qa6NNaqWV58-pBOtndpmPWpONhXPX5uKAht2m8p2PM", type: "encrypted", target: ["production", "preview"] },
];

for (const env of envVars) {
  const r = await fetch(`https://api.vercel.com/v10/projects/${projectId}/env`, {
    method: "POST", headers: HEADERS,
    body: JSON.stringify(env),
  });
  const data = await r.json();
  if (data.error?.code === "ENV_ALREADY_EXISTS") {
    process.stdout.write(`   ↩️  ${env.key} ya existe\n`);
  } else {
    process.stdout.write(`   ✅ ${env.key}\n`);
  }
}

// ── 3. Recopilar y subir archivos ───────────────────────────────────────────
console.log("\n📁 Recopilando archivos...");
const files = collectFiles(ROOT);
console.log(`   ${files.length} archivos encontrados`);

console.log("\n⬆️  Subiendo archivos a Vercel...");
const deployFiles = [];
let i = 0;
for (const { full, rel } of files) {
  const content = readFileSync(full);
  const sha = await uploadFile(content);
  deployFiles.push({ file: rel, sha, size: content.length });
  i++;
  if (i % 10 === 0) process.stdout.write(`   ${i}/${files.length}...\n`);
}
console.log(`   ✅ ${deployFiles.length} archivos listos`);

// ── 4. Crear deployment ─────────────────────────────────────────────────────
console.log("\n🚀 Creando deployment...");
const depRes = await fetch(`https://api.vercel.com/v13/deployments`, {
  method: "POST",
  headers: HEADERS,
  body: JSON.stringify({
    name: PROJECT_NAME,
    project: projectId,
    files: deployFiles,
    projectSettings: {
      framework: "nextjs",
      buildCommand: null,
      outputDirectory: null,
      installCommand: "npm install --include=dev",
    },
    target: "production",
  }),
});

const dep = await depRes.json();

if (dep.error) {
  console.error("\n❌ Error en deployment:", dep.error.message);
  process.exit(1);
}

console.log(`\n✅ Deployment iniciado!`);
console.log(`   ID:  ${dep.id}`);
console.log(`   URL: https://${dep.url}`);
console.log(`\n⏳ Esperando build (puede tardar 1-2 min)...`);

// ── 5. Polling del estado ───────────────────────────────────────────────────
for (let attempt = 0; attempt < 40; attempt++) {
  await new Promise(r => setTimeout(r, 5000));
  const check = await fetch(`https://api.vercel.com/v13/deployments/${dep.id}`, { headers: HEADERS });
  const d = await check.json();
  const state = d.readyState || d.status;
  process.stdout.write(`   [${attempt * 5}s] Estado: ${state}\n`);
  if (state === "READY") {
    console.log(`\n🎉 ¡Deployed exitosamente!`);
    console.log(`   🌐 URL: https://${d.url}`);
    console.log(`   🌐 Alias: https://${PROJECT_NAME}.vercel.app`);
    break;
  }
  if (state === "ERROR" || state === "CANCELED") {
    console.error(`\n❌ Build falló con estado: ${state}`);
    if (d.errorMessage) console.error("   Error:", d.errorMessage);
    process.exit(1);
  }
}

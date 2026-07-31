#!/usr/bin/env node
// Gera uma chave de licenca no formato XXXX-XXXX-XXXX-XXXX e o INSERT SQL pronto para rodar
// no seu projeto Supabase (via SQL editor ou execute_sql do MCP).
//
// Uso: node scripts/generate-license.js "Nome do Cliente" "cliente@email.com"

const crypto = require("crypto");

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sem 0/O/1/I para evitar confusao

function randomGroup(length) {
  let out = "";
  const bytes = crypto.randomBytes(length);
  for (let i = 0; i < length; i++) {
    out += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return out;
}

function generateKey() {
  return [randomGroup(4), randomGroup(4), randomGroup(4), randomGroup(4)].join("-");
}

const customerName = process.argv[2] ?? null;
const customerEmail = process.argv[3] ?? null;
const key = generateKey();

console.log("Chave gerada:", key);
console.log("\nSQL para inserir no Supabase:\n");
console.log(
  `insert into public.licenses (license_key, customer_name, customer_email) values ('${key}', ${
    customerName ? `'${customerName.replace(/'/g, "''")}'` : "null"
  }, ${customerEmail ? `'${customerEmail.replace(/'/g, "''")}'` : "null"});`
);

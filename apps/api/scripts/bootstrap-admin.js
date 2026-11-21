/* Bootstrap an admin account using the COMPILED dist (decorator metadata intact). */
require('reflect-metadata');
const { readFileSync } = require('node:fs');
const { NestFactory } = require('@nestjs/core');
const { AdminModule } = require('../dist/admin/admin.module.js');
const { AdminService } = require('../dist/admin/admin.service.js');

function loadEnv(path = '/var/www/BOOKFORFREEDOM/.env') {
  const content = readFileSync(path, 'utf8');
  for (const line of content.split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const e = t.indexOf('=');
    if (e < 0) continue;
    const k = t.slice(0, e).trim();
    let v = t.slice(e + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (!(k in process.env)) process.env[k] = v;
  }
}

async function main() {
  loadEnv();
  const [username, email, password, role] = process.argv.slice(2);
  if (!username || !email || !password || !role) {
    console.error('Usage: node scripts/bootstrap-admin.js <username> <email> <password> <role>');
    process.exit(1);
  }
  const context = await NestFactory.createApplicationContext(AdminModule, { logger: false });
  const admin = context.get(AdminService);
  const created = await admin.createAdmin(username, email, password, role);
  console.log(JSON.stringify(created));
  await context.close();
}

main();

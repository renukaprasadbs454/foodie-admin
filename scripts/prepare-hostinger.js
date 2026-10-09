const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const nextDir = path.join(root, "apps", ".next");
const standaloneApp = path.join(nextDir, "standalone", "apps");

const standaloneServer = path.join(standaloneApp, "server.js");

if (!fs.existsSync(standaloneServer)) {
  throw new Error(`Standalone server not found: ${standaloneServer}`);
}

const staticDir = path.join(nextDir, "static");
const standaloneStatic = path.join(standaloneApp, ".next", "static");

if (fs.existsSync(staticDir)) {
  fs.cpSync(staticDir, standaloneStatic, {
    recursive: true,
    force: true,
  });
}

const publicDir = path.join(root, "apps", "public");
const standalonePublic = path.join(standaloneApp, "public");

if (fs.existsSync(publicDir)) {
  fs.cpSync(publicDir, standalonePublic, {
    recursive: true,
    force: true,
  });
}

fs.writeFileSync(
  path.join(nextDir, "server.js"),
  'require("./standalone/apps/server.js");\n'
);

console.log("Hostinger startup wrapper created successfully.");
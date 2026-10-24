// Creates a self-signed HTTPS certificate for testing on a phone/iPad over Wi-Fi
// (the mic needs HTTPS). Nothing is installed in the system trust store: the device shows a
// one-time "not private" warning that you accept. Re-run when the PC's Wi-Fi IP changes.
// Usage: npm run cert:dev
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { networkInterfaces } from "node:os";

const ips = Object.values(networkInterfaces()).flat().filter((i) => i && i.family === "IPv4" && !i.internal).map((i) => i.address);
mkdirSync("certificates", { recursive: true });
const san = ["DNS:localhost", "IP:127.0.0.1", ...ips.map((ip) => `IP:${ip}`)].join(",");
writeFileSync(
  "certificates/openssl.cnf",
  `[req]\ndistinguished_name=dn\nx509_extensions=ext\nprompt=no\n[dn]\nCN=MCG Try AI dev\n[ext]\nsubjectAltName=${san}\nbasicConstraints=CA:FALSE\nkeyUsage=digitalSignature,keyEncipherment\nextendedKeyUsage=serverAuth\n`,
);
execFileSync("openssl", ["req", "-x509", "-newkey", "rsa:2048", "-nodes", "-days", "30", "-keyout", "certificates/dev-key.pem", "-out", "certificates/dev-cert.pem", "-config", "certificates/openssl.cnf"], { stdio: "inherit" });
console.log(`certificates/dev-cert.pem for ${san}`);
console.log(`Then: npm run dev:phone  →  open https://${ips[0] ?? "<your-pc-ip>"}:3000 on the phone (same Wi-Fi)`);

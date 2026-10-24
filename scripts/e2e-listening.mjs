import { chromium } from "@playwright/test";
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1366, height: 1024 }, deviceScaleFactor: 1.5 });
const errs = []; p.on("console", m => m.type()==="error" && errs.push(m.text())); p.on("pageerror", e => errs.push(String(e)));
const url = "http://localhost:3000";
const center = async (name) => { const bb = await p.getByRole("button", { name }).boundingBox(); return [bb.x + bb.width/2, bb.y + bb.height/2]; };
const screenName = async () => (await p.getByRole("button", { name: "Release to send" }).count()) ? "listening" : (await p.getByRole("button", { name: "Hold to talk" }).count()) ? "welcome" : (await p.getByRole("button", { name: "Hold to answer" }).count()) ? "conversation" : "?";

// 1. Hold 7s → screenshot in design state
await p.goto(url, { waitUntil: "networkidle" }); await p.evaluate(() => document.fonts.ready);
let [x, y] = await center("Hold to talk");
await p.mouse.move(x, y); await p.mouse.down();
console.log("on press:", await screenName());
await p.waitForTimeout(7300);
const cdp = await p.context().newCDPSession(p);
await cdp.send("Animation.enable"); await cdp.send("Animation.setPlaybackRate", { playbackRate: 0 });
await p.evaluate(() => document.getAnimations().forEach(a => { a.pause(); a.currentTime = 0; }));
await p.screenshot({ path: "screenshots-out/02-listening-app.png" });
console.log("caption:", await p.locator("p[aria-live]").innerText(), "| timer:", await p.locator("[role=status]").innerText());
await cdp.send("Animation.setPlaybackRate", { playbackRate: 1 });
// 2. release → conversation
await p.mouse.up(); await p.waitForTimeout(200);
console.log("after release:", await screenName());

// 3. slide off → cancel back to welcome
await p.goto(url, { waitUntil: "networkidle" });
[x, y] = await center("Hold to talk");
await p.mouse.move(x, y); await p.mouse.down(); await p.waitForTimeout(1500);
await p.mouse.move(x, y + 30, { steps: 3 }); console.log("small drift (30px) still:", await screenName());
const [rx, ry] = await center("Release to send");
await p.mouse.move(rx, ry, { steps: 8 }); console.log("drag onto Release button still:", await screenName());
await p.mouse.move(200, 200, { steps: 5 }); await p.waitForTimeout(100);
console.log("after slide off:", await screenName());
await p.mouse.up();

// 4. quick tap → nothing heard → back to welcome
await p.mouse.move(x, y); await p.mouse.down(); await p.waitForTimeout(150); await p.mouse.up(); await p.waitForTimeout(100);
console.log("after quick tap:", await screenName());

// 5. keyboard hold (Space) then release
await p.getByRole("button", { name: "Hold to talk" }).focus();
await p.keyboard.down(" "); await p.waitForTimeout(2000); console.log("space held:", await screenName());
await p.keyboard.up(" "); await p.waitForTimeout(100); console.log("space released:", await screenName());

// 6. Start over while holding (second pointer via click) → welcome
await p.goto(url, { waitUntil: "networkidle" });
await p.mouse.move(x, y); await p.mouse.down(); await p.waitForTimeout(800);
await p.getByRole("button", { name: "Start over" }).dispatchEvent("click"); await p.waitForTimeout(100);
console.log("start over:", await screenName()); await p.mouse.up();

// 7. Arabic
await p.getByRole("button", { name: "عربي" }).click();
const ar = p.getByRole("button", { name: "اضغط مطوّل وتكلّم" });
const bb = await ar.boundingBox(); await p.mouse.move(bb.x + bb.width/2, bb.y + bb.height/2); await p.mouse.down(); await p.waitForTimeout(4500);
await p.screenshot({ path: "screenshots-out/02-listening-ar.png" }); await p.mouse.up();
console.log("errors:", errs);
await b.close();

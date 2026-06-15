import puppeteer from "puppeteer-core";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const browser = await puppeteer.launch({ executablePath: CHROME, headless: "new", args: ["--no-sandbox"] });
async function check(w) {
  const p = await browser.newPage();
  await p.setViewport({ width: w, height: 760, deviceScaleFactor: 1.5 });
  await p.setCookie({ name: "flow_session", value: "u-barbero-demo", domain: "localhost", path: "/" });
  await p.goto("http://localhost:3000/panel/turnos", { waitUntil: "networkidle0", timeout: 60000 });
  await new Promise((r) => setTimeout(r, 700));
  const m = await p.evaluate(() => {
    const logo = document.querySelector("header a[href='/panel']");
    const salir = document.querySelector("header form button");
    const title = document.querySelector("main h1");
    const table = document.querySelector("main .rounded-2xl"); // contenedor de la tabla
    const r = (el) => el ? el.getBoundingClientRect() : null;
    const L = r(logo), S = r(salir), T = r(title), TB = r(table);
    return {
      logoLeft: L && Math.round(L.left),
      titleLeft: T && Math.round(T.left),
      tableLeft: TB && Math.round(TB.left),
      salirRight: S && Math.round(S.right),
      tableRight: TB && Math.round(TB.right),
    };
  });
  console.log(`w=${w}`, JSON.stringify(m));
  await p.screenshot({ path: `/tmp/align-${w}.png`, clip: { x: 0, y: 0, width: Math.min(w,1990), height: 560 } });
  await p.close();
}
await check(1280);
await check(1024);
await browser.close(); console.log("done");

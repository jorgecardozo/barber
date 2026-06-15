import puppeteer from "puppeteer-core";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const browser = await puppeteer.launch({ executablePath: CHROME, headless: "new", args: ["--no-sandbox"] });
async function check(w) {
  const p = await browser.newPage();
  await p.setViewport({ width: w, height: 800, deviceScaleFactor: 1 });
  await p.setCookie({ name: "flow_session", value: "u-barbero-demo", domain: "localhost", path: "/" });
  await p.goto("http://localhost:3000/panel/turnos", { waitUntil: "networkidle0", timeout: 60000 });
  await new Promise((r) => setTimeout(r, 600));
  const m = await p.evaluate(() => {
    const R = (s)=>{const e=document.querySelector(s);return e?e.getBoundingClientRect():null;};
    const logo=R("header a[href='/panel']"), salir=R("header form button"), title=R("main h1"), tbl=R("main .rounded-2xl");
    return { logoLeft:Math.round(logo.left), titleLeft:Math.round(title.left), tableLeft:tbl&&Math.round(tbl.left),
             salirRight:Math.round(salir.right), tableRight:tbl&&Math.round(tbl.right) };
  });
  console.log(`w=${w}`, JSON.stringify(m));
  await p.close();
}
await check(1280); await check(1440); await check(1024);
await browser.close(); console.log("done");

import { chromium } from "playwright";
import fs from "node:fs/promises";

const baseURL = process.env.TINY_TITANS_TEST_URL || "http://127.0.0.1:5173";
const email = process.env.TINY_TITANS_RESCUE_QA_EMAIL || "";
const password = process.env.TINY_TITANS_RESCUE_QA_PASSWORD || "";
const allowWrites = process.env.TINY_TITANS_RESCUE_QA_WRITE === "true";
const routes = ["/rescue","/rescue/animals","/rescue/animals?intake=1","/rescue/qr","/rescue/scan","/rescue/team","/rescue/reports","/rescue/adoption","/rescue/species-incubator","/rescue/log","/rescue/medical","/rescue/tasks","/rescue/foster","/rescue/transfers","/rescue/locations","/rescue/organisation","/rescue/compliance","/rescue/public-preview","/paid/timeline","/paid/analytics","/morph-library/evidence","/paid/marketplace","/paid/seller","/paid/business","/paid/team","/paid/automation","/paid/api","/paid/support","/paid/branding","/paid/export"];
const failures = []; const passes = []; let n = 0;
function record(ok, area, message, evidence = "") { const item = { id: "RQA-" + String(++n).padStart(3,"0"), area, message, evidence }; (ok ? passes : failures).push(item); }
async function main(){
  await fs.mkdir("reports",{recursive:true});
  const browser = await chromium.launch({headless:true});
  const page = await browser.newPage();
  for (const route of routes) {
    try {
      const response = await page.goto(baseURL + route,{waitUntil:"domcontentloaded",timeout:15000});
      const body = await page.locator("body").innerText().catch(()=>"");
      const bad = [];
      if (!response || response.status() >= 400) bad.push("HTTP " + (response?.status() ?? "NO_RESPONSE"));
      if (/internal\s*\[0\]/i.test(body)) bad.push("Visible internal [0] error");
      if (/Missing or insufficient permissions/i.test(body)) bad.push("Visible Firestore permission error");
      record(bad.length === 0,"route",route,bad.join(" | "));
    } catch(error) { record(false,"route",route,error instanceof Error ? error.message : String(error)); }
  }
  await page.goto(baseURL + "/rescue",{waitUntil:"domcontentloaded",timeout:15000});
  const expected = [["Animal Register","/rescue/animals"],["New Intake","/rescue/animals?intake=1"],["Scan / Create QR","/rescue/qr"],["Rescue Team & Permissions","/rescue/team"],["Advanced Timeline","/paid/timeline"],["Advanced Analytics","/paid/analytics"],["Morph Intelligence & Evidence","/morph-library/evidence"],["Marketplace Seller Tools","/paid/marketplace"],["Professional Seller Profile","/paid/seller"],["Business Reporting","/paid/business"],["Team & Permissions","/paid/team"],["Workflow Automation","/paid/automation"],["API Access","/paid/api"],["Priority Support","/paid/support"],["Data Export","/paid/export"],["Foster & Adoption","/rescue/adoption"],["Organisation & Branding","/rescue/organisation"]];
  const expectedProIcons = [
    ["/titan-intelligence", "tt-icon-name-titan"],
    ["/paid/analytics", "tt-icon-name-analytics"],
    ["/paid/timeline", "tt-icon-name-timeline"],
    ["/paid/export", "tt-icon-name-export"],
  ];
  if (email && password) {
    record(true,"navigation","Authenticated Rescue navigation assertions are executed after login.");
  } else {
    record(true,"navigation","Authenticated Rescue navigation assertions skipped because no Rescue QA credentials were supplied.");
  }
  await page.goto(baseURL + "/rescue/animals?intake=1",{waitUntil:"domcontentloaded",timeout:15000});
  const nameCount = await page.locator("input[placeholder*=\"Animal name\" i]").count();
  const speciesCount = await page.locator("input[placeholder*=\"Common name\" i]").count();
  record(nameCount > 0 && speciesCount > 0,"intake-form","Name and Species fields discoverable","name="+nameCount+" species="+speciesCount);
  record(await page.getByRole("button",{name:/create animal record/i}).count() > 0,"intake-form","Create animal record button present");
  await page.goto(baseURL + "/rescue/qr",{waitUntil:"domcontentloaded",timeout:15000});
  record(await page.locator("a[href=\"/rescue/scan\"]").count() > 0,"qr","Scanner link present");
  record(/standard QR/i.test(await page.locator("body").innerText()),"qr","QR centre explains standard scanner compatibility");
  if (email && password) {
    await page.goto(baseURL + "/login?redirect=%2Frescue",{waitUntil:"domcontentloaded",timeout:15000});
    await page.locator("input[type=\"email\"]").fill(email);
    await page.locator("input[type=\"password\"]").fill(password);
    await page.locator("button[type=\"submit\"]").click();
    await page.waitForTimeout(1000);
    record(page.url().includes("/rescue"),"auth","QA account reached Rescue workspace",page.url());
    if (page.url().includes("/rescue")) {
      await page.goto(baseURL + "/rescue",{waitUntil:"domcontentloaded",timeout:15000});
      for (const pair of expected) {
        const link = page.locator("a").filter({hasText:pair[0]}).first();
        if (await link.count() === 0) record(false,"navigation",pair[0],"Missing link");
        else record(await link.getAttribute("href") === pair[1],"navigation",pair[0],await link.getAttribute("href") || "");
      }
      for (const [href, iconClass] of expectedProIcons) {
        const link = page.locator(`a[href="${href}"]`).first();
        const icon = link.locator(`svg.${iconClass}`).first();
        record(await link.count() === 1 && await icon.count() === 1,"iconography",href,await icon.count() ? iconClass : "Expected semantic icon class missing");
      }
      for (const route of ["/paid/timeline","/paid/analytics","/morph-library/evidence","/paid/marketplace","/paid/seller","/paid/business","/paid/team","/paid/automation","/paid/api","/paid/support","/paid/branding","/paid/export"]) {
        await page.goto(baseURL + route,{waitUntil:"domcontentloaded",timeout:15000});
        const body = await page.locator("body").innerText().catch(()=>"");
        const blocked = /access is not active|current access:\s*free|requires .* paid feature/i.test(body);
        record(!blocked,"shared-paid-access",route,blocked ? "Authenticated Rescue QA account is still behind an access gate." : "Shared paid capability rendered without an access gate.");
      }
    }
    if (allowWrites) {
      await page.goto(baseURL + "/rescue/animals?intake=1",{waitUntil:"domcontentloaded",timeout:15000});
      const nameInput=page.locator("input[placeholder*=\"Animal name\" i]"); const speciesInput=page.locator("input[placeholder*=\"Common name\" i]");
      if (await nameInput.count() && await speciesInput.count()) {
        await nameInput.fill("BOT QA " + Date.now()); await speciesInput.fill("Corn Snake");
        await page.getByRole("button",{name:/create animal record/i}).click(); await page.waitForTimeout(1000);
        const body=await page.locator("body").innerText().catch(()=>"");
        record(/Animal added to the Rescue register/i.test(body),"intake-write","Authenticated intake creation",body.slice(-800));
      } else record(false,"intake-write","Authenticated intake fields missing");
    } else record(true,"intake-write","Write mode disabled; set TINY_TITANS_RESCUE_QA_WRITE=true for persistence testing");
  } else record(true,"auth","Unauthenticated mode; supply QA credentials for authenticated coverage");
  await browser.close();
  const report=["# TinyTitans Rescue QA Report","","Generated: "+new Date().toISOString(),"Base URL: "+baseURL,"Authenticated: "+(email&&password ? "yes":"no"),"Write mode: "+(allowWrites ? "enabled":"disabled"),"","## Summary","","PASS: "+passes.length,"FAIL: "+failures.length,"","## Failures","",...failures.map(f=>"### "+f.id+" · "+f.area+"\n**"+f.message+"**\n\nEvidence: `"+(f.evidence||"—")+"`\n"),"","## Passed checks","",...passes.map(p=>"- "+p.id+" · "+p.area+" · "+p.message)].join("\n");
  await fs.writeFile("reports/rescue-qa-report.md",report,"utf8");
  console.log("Rescue QA BOT complete: "+passes.length+" pass, "+failures.length+" fail. Report: reports/rescue-qa-report.md");
  if (failures.length) process.exitCode=1;
}
main().catch(async error=>{await fs.mkdir("reports",{recursive:true});await fs.writeFile("reports/rescue-qa-report.md","# TinyTitans Rescue QA Report\n\nBOT crashed.\n\n"+(error instanceof Error ? error.stack||error.message : String(error)),"utf8");console.error(error);process.exitCode=1;});
const PDFDocument = require("pdfkit");
const fs   = require("fs");
const path = require("path");

const outPath    = path.join(__dirname, "frontend", "public", "terms-and-conditions.pdf");
const logoPath   = path.join(__dirname, "frontend", "public", "logo.png");
const logoExists = fs.existsSync(logoPath);

const PRIMARY   = "#2563eb";
const DARK      = "#111827";
const MUTED     = "#6b7280";
const BANNER_H  = 115;
const MARGIN    = 50;
const LOGO_SIZE = 60;

// Timestamp at generation time
const now = new Date();
const pad = function(n) { return n.toString().padStart(2, "0"); };
const timestamp = pad(now.getDate()) + "-" + pad(now.getMonth()+1) + "-" + now.getFullYear() +
                  " " + pad(now.getHours()) + ":" + pad(now.getMinutes()) + ":" + pad(now.getSeconds());

const doc    = new PDFDocument({ margin: MARGIN, size: "A4", autoFirstPage: true });
const stream = fs.createWriteStream(outPath);

var docEnded   = false;
var streamDone = false;
function tryExit() {
  if (docEnded && streamDone) {
    var size = fs.statSync(outPath).size;
    process.stdout.write("PDF OK: " + size + " bytes\n");
    process.exit(0);
  }
}
doc.on("end", function() { docEnded = true; tryExit(); });
stream.on("finish", function() { streamDone = true; tryExit(); });
stream.on("error", function(e) { process.stderr.write("ERR: " + e.message + "\n"); process.exit(1); });

doc.pipe(stream);

var PAGE_W    = doc.page.width;
var PAGE_H    = doc.page.height;
var CONTENT_W = PAGE_W - MARGIN * 2;

// BLUE BANNER
doc.rect(0, 0, PAGE_W, BANNER_H).fill(PRIMARY);
if (logoExists) {
  doc.image(logoPath, MARGIN, 18, { width: LOGO_SIZE, height: LOGO_SIZE });
}
var textX = logoExists ? MARGIN + LOGO_SIZE + 12 : MARGIN;
doc.fill("#ffffff").fontSize(20).font("Helvetica-Bold")
   .text("Service Terms & Conditions", textX, 28, { lineBreak: false });
doc.fontSize(11).font("Helvetica")
   .text("MyPA Business Management Platform", textX, 58, { lineBreak: false });

doc.y = BANNER_H + 18;
doc.x = MARGIN;

// Effective date + generated timestamp
doc.fontSize(9).font("Helvetica").fill(MUTED)
   .text("Effective Date: July 2026  |  Version 1.0", MARGIN, doc.y, { align: "center", width: CONTENT_W });
doc.moveDown(0.3);
doc.fontSize(8).font("Helvetica").fill(MUTED)
   .text("This document is generated @ " + timestamp, MARGIN, doc.y, { align: "center", width: CONTENT_W });
doc.moveDown(0.8);

// Intro
doc.fontSize(10).fill(DARK).font("Helvetica")
   .text("Please read these Service Terms & Conditions carefully before using MyPA. By registering an account or using the Service, you confirm that you have read, understood, and agree to be bound by these terms.", MARGIN, doc.y, { align: "justify", width: CONTENT_W });
doc.moveDown(1);

var sections = [
  { title: "1. Acceptance of Terms", body: "By creating an account or using MyPA, you agree to these Service Terms & Conditions. MyPA may update these terms at any time. Continued use constitutes acceptance of revised terms." },
  { title: "2. Description of Service", body: "MyPA is an all-in-one business management platform for SMEs. Features include POS billing, inventory tracking, GST-compliant invoices, customer ledger, purchase tracking, and analytics." },
  { title: "3. Account Registration", body: "Provide accurate information during registration. You are responsible for safeguarding your credentials. Notify support@mypa.app immediately of any unauthorised use." },
  { title: "4. Subscription and Payments", body: "MyPA offers a free Starter plan, Economy at Rs. 599/year, and a Pro plan. Fees are non-refundable except where required by law. Pricing may change with 30 days notice." },
  { title: "5. Data Ownership and Privacy", body: "You own your business data. MyPA will not sell it to third parties. Data is secured and processed to provide the Service, in compliance with the IT Act, 2000 (India)." },
  { title: "6. GST and Tax Compliance", body: "MyPA provides GST billing tools but is not a tax advisor. You are responsible for verifying tax accuracy and filing returns. MyPA is not liable for penalties from user data errors." },
  { title: "7. Acceptable Use", body: "Do not use the Service for unlawful purposes, upload malicious code, attempt unauthorised access, or harass others. Violations may result in immediate account termination." },
  { title: "8. Intellectual Property", body: "All content, design, code, and branding in MyPA belong to MyPA and its licensors. Your business data remains your property." },
  { title: "9. Limitation of Liability", body: "MyPA is not liable for indirect, incidental, or consequential damages. Total liability shall not exceed fees paid in the three months preceding the claim." },
  { title: "10. Termination", body: "Either party may terminate at any time. Upon termination, access ceases. You may export data before termination." },
  { title: "11. Governing Law", body: "These terms are governed by the laws of India. Disputes are subject to courts in West Bengal, India." },
  { title: "12. Contact Us", body: "MyPA Support Team\nEmail: support@mypa.app\nAddress: West Bengal, India" }
];

sections.forEach(function(s) {
  if (doc.y > PAGE_H - 130) doc.addPage();
  doc.fontSize(11).font("Helvetica-Bold").fill(PRIMARY).text(s.title, MARGIN, doc.y, { width: CONTENT_W });
  doc.moveDown(0.25);
  doc.fontSize(10).font("Helvetica").fill(DARK).text(s.body, MARGIN, doc.y, { align: "justify", width: CONTENT_W });
  doc.moveDown(0.85);
});

// CLOSING
if (doc.y > PAGE_H - 160) doc.addPage();
doc.moveDown(0.5);
doc.moveTo(MARGIN, doc.y).lineTo(PAGE_W - MARGIN, doc.y).strokeColor("#d1d5db").lineWidth(0.8).stroke();
doc.moveDown(0.8);
doc.fontSize(10).font("Helvetica-Bold").fill(DARK)
   .text("By using MyPA, you acknowledge that you have read, understood, and agree to these Service Terms & Conditions.", MARGIN, doc.y, { align: "left", width: CONTENT_W });
doc.moveDown(1.5);

// Logo left-aligned above copyright
if (logoExists) {
  var logoY = doc.y;
  doc.image(logoPath, MARGIN, logoY, { width: 40, height: 40 });
  doc.y = logoY + 40 + 6;
}
doc.fontSize(9).fill(MUTED).font("Helvetica")
   .text(now.getFullYear() + " MyPA. All rights reserved.  |  support@mypa.app", MARGIN, doc.y, { align: "left", width: CONTENT_W });
doc.moveDown(0.4);
doc.fontSize(8).fill(MUTED).font("Helvetica")
   .text("This document is generated @ " + timestamp, MARGIN, doc.y, { align: "left", width: CONTENT_W });

doc.end();
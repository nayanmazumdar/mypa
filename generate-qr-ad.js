/**
 * MyPA — QR Ad PDF Generator  (single-column, full-page)
 * Run: node generate-qr-ad.js
 */
const PDFDocument = require("pdfkit");
const QRCode      = require("qrcode");
const fs          = require("fs");
const path        = require("path");

const OUT      = path.join(__dirname, "frontend", "public", "mypa-ad.pdf");
const LOGO     = path.join(__dirname, "frontend", "public", "logo.png");
const HAS_LOGO = fs.existsSync(LOGO);
const URL      = "https://mypa.app/login";

const C = {
  primary:  "#2563eb",
  primary2: "#1d4ed8",
  primary3: "#1e40af",
  light:    "#eff6ff",
  accent:   "#dbeafe",
  white:    "#ffffff",
  dark:     "#0f172a",
  mid:      "#334155",
  muted:    "#64748b",
  divider:  "#e2e8f0",
  bg:       "#f8faff",
};

const MODULES = [
  { tag: "POS", label: "POS & Billing"       },
  { tag: "PRD", label: "Products"             },
  { tag: "INV", label: "Inventory"            },
  { tag: "SLS", label: "Sales"                },
  { tag: "PUR", label: "Purchases"            },
  { tag: "CUS", label: "Customers"            },
  { tag: "GST", label: "GST Invoicing"        },
  { tag: "RPT", label: "Reports & Analytics"  },
  { tag: "ACC", label: "Accounts & Expenses"  },
  { tag: "PAY", label: "Payments"             },
  { tag: "OFR", label: "Offers & Discounts"   },
  { tag: "SHP", label: "Shop Management"      },
  { tag: "SPA", label: "Personal Care"        },
  { tag: "ATT", label: "Smart Punch-In"       },
  { tag: "TRP", label: "Transport"            },
  { tag: "TRS", label: "Tourism"              },
  { tag: "SET", label: "Settings & Users"     },
  { tag: "DEV", label: "Multi-device Ready"   },
];

async function run() {
  const qrBuf = await QRCode.toBuffer(URL, {
    type: "png", width: 260, margin: 1,
    color: { dark: C.primary2, light: C.white },
    errorCorrectionLevel: "H",
  });

  const doc    = new PDFDocument({ margin: 0, size: "A4", autoFirstPage: true });
  const stream = fs.createWriteStream(OUT);
  let ended = false, done = false;
  const finish = () => {
    if (ended && done) {
      console.log("PDF ready: " + OUT + " (" + Math.round(fs.statSync(OUT).size / 1024) + " KB)");
      process.exit(0);
    }
  };
  doc.on("end",       () => { ended = true; finish(); });
  stream.on("finish", () => { done  = true; finish(); });
  stream.on("error",  (e) => { console.error(e); process.exit(1); });
  doc.pipe(stream);

  const PW = doc.page.width;   // 595.28
  const PH = doc.page.height;  // 841.89
  const M  = 40;
  const CW = PW - M * 2;

  // ── 1. BACKGROUND ──────────────────────────────────────
  doc.rect(0, 0, PW, PH).fill(C.bg);

  // ── 2. HEADER BAND ─────────────────────────────────────
  const HDR = 100;
  doc.rect(0, 0, PW, HDR).fill(C.primary);

  let hTxtX = M + 8;
  if (HAS_LOGO) {
    doc.image(LOGO, M + 8, 16, { width: 64, height: 64 });
    hTxtX = M + 8 + 64 + 14;
  }
  doc.fill(C.white).fontSize(26).font("Helvetica-Bold")
     .text("MyPA", hTxtX, 18, { lineBreak: false });
  doc.fontSize(10).font("Helvetica")
     .text("Your Personal Business Assistant", hTxtX, 52, { lineBreak: false });
  doc.fontSize(7.5).font("Helvetica")
     .text("All-in-one Platform  |  GST Billing  |  POS  |  Inventory  |  Analytics  |  Multi-shop", hTxtX, 68, { lineBreak: false });

  // Free badge
  const BW = 148, BH = 20;
  doc.roundedRect(PW - M - BW, HDR - 30, BW, BH, 10).fill(C.primary3);
  doc.fontSize(7.5).font("Helvetica-Bold").fill(C.white)
     .text("Free Forever Plan Available", PW - M - BW, HDR - 25, { width: BW, align: "center", lineBreak: false });

  let y = HDR + 14;

  // ── 3. TAGLINE ─────────────────────────────────────────
  doc.fontSize(13.5).font("Helvetica-Bold").fill(C.primary)
     .text("Everything your Business needs — One powerful platform.", M, y, { width: CW, align: "center" });
  y = doc.y;
  doc.fontSize(8.5).font("Helvetica").fill(C.mid)
     .text("Promote your brand  •  Boost sales  •  Manage inventory, customers & accounts — all with MyPA.", M, y, { width: CW, align: "center" });
  y = doc.y + 10;

  // divider
  doc.moveTo(M, y).lineTo(PW - M, y).strokeColor(C.accent).lineWidth(1).stroke();
  y += 14;

  // ── 4. QR CODE — centered ──────────────────────────────
  const QR_SZ  = 140;
  const CARD_W = 220;
  const CARD_H = QR_SZ + 62;
  const cardX  = (PW - CARD_W) / 2;

  // Card shadow + card
  doc.roundedRect(cardX + 3, y + 3, CARD_W, CARD_H, 12).fill("#d6e0f7");
  doc.roundedRect(cardX,     y,     CARD_W, CARD_H, 12).fill(C.white);
  doc.roundedRect(cardX,     y,     CARD_W, CARD_H, 12).strokeColor(C.accent).lineWidth(0.8).stroke();

  // QR image
  const qrX = cardX + (CARD_W - QR_SZ) / 2;
  const qrY = y + 12;
  doc.image(qrBuf, qrX, qrY, { width: QR_SZ, height: QR_SZ });

  // Scan button
  const btnY = qrY + QR_SZ + 8;
  doc.roundedRect(cardX + 10, btnY, CARD_W - 20, 22, 6).fill(C.primary);
  doc.fontSize(8.5).font("Helvetica-Bold").fill(C.white)
     .text("Scan to Login / Register Free", cardX + 10, btnY + 7, { width: CARD_W - 20, align: "center", lineBreak: false });

  doc.fontSize(6.5).font("Helvetica").fill(C.muted)
     .text(URL + "  |  No credit card required", cardX, btnY + 34, { width: CARD_W, align: "center", lineBreak: false });

  y += CARD_H + 18;

  // ── 5. MODULES GRID ────────────────────────────────────
  // divider
  doc.moveTo(M, y).lineTo(PW - M, y).strokeColor(C.divider).lineWidth(0.8).stroke();
  y += 10;

  doc.fontSize(9.5).font("Helvetica-Bold").fill(C.dark)
     .text("What's inside MyPA", M, y, { width: CW, align: "center", lineBreak: false });
  y += 16;

  const COLS   = 3;
  const COL_W  = CW / COLS;
  const ROW_H  = 17;
  const TAG_W  = 26;
  const totalR = Math.ceil(MODULES.length / COLS);

  // Zebra rows
  for (let r = 0; r < totalR; r++) {
    if (r % 2 === 0) {
      doc.rect(M, y + r * ROW_H - 1, CW, ROW_H).fill("#eef2ff");
    }
  }

  MODULES.forEach((m, i) => {
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    const x   = M + col * COL_W + 3;
    const my  = y + row * ROW_H + 2;

    doc.roundedRect(x, my, TAG_W, 10, 2).fill(C.primary);
    doc.fontSize(5).font("Helvetica-Bold").fill(C.white)
       .text(m.tag, x, my + 2, { width: TAG_W, align: "center", lineBreak: false });
    doc.fontSize(7.5).font("Helvetica").fill(C.dark)
       .text(m.label, x + TAG_W + 4, my + 1, { width: COL_W - TAG_W - 10, lineBreak: false });
  });

  y += totalR * ROW_H + 14;

  // ── 6. PRICING ─────────────────────────────────────────
  doc.moveTo(M, y).lineTo(PW - M, y).strokeColor(C.divider).lineWidth(0.8).stroke();
  y += 10;

  doc.fontSize(9.5).font("Helvetica-Bold").fill(C.dark)
     .text("Simple, honest pricing", M, y, { width: CW, align: "center", lineBreak: false });
  y += 16;

  const plans = [
    { badge: "FREE", name: "Starter",  price: "Free",      period: "forever",  feat: "1 shop  •  200 products  •  POS & Billing" },
    { badge: "BEST", name: "Economy",  price: "Rs. 599",   period: "/ year",   feat: "Unlimited shops  •  Advanced analytics" },
    { badge: "PRO",  name: "Pro",      price: "Rs. 1,299", period: "/ month",  feat: "Multi-user  •  API access  •  Priority support" },
  ];

  const PL_W = CW / 3 - 6;
  const PL_H = 56;

  plans.forEach((p, i) => {
    const x  = M + i * (PL_W + 9);
    const hi = i === 1;
    const tc = hi ? C.white   : C.dark;
    const sc = hi ? "#bfdbfe" : C.muted;

    // shadow
    doc.roundedRect(x + 2, y + 2, PL_W, PL_H, 8).fill(hi ? "#1a37a0" : "#d0daf5");
    doc.roundedRect(x,     y,     PL_W, PL_H, 8).fill(hi ? C.primary : C.white);
    if (!hi) doc.roundedRect(x, y, PL_W, PL_H, 8).strokeColor(C.accent).lineWidth(0.8).stroke();

    // badge
    doc.roundedRect(x + PL_W - 33, y + 5, 27, 11, 4).fill(hi ? C.primary3 : C.primary);
    doc.fontSize(5.5).font("Helvetica-Bold").fill(C.white)
       .text(p.badge, x + PL_W - 33, y + 7.5, { width: 27, align: "center", lineBreak: false });

    doc.fontSize(8.5).font("Helvetica-Bold").fill(tc)
       .text(p.name,   x + 8, y + 6,  { lineBreak: false });
    doc.fontSize(13).font("Helvetica-Bold").fill(tc)
       .text(p.price,  x + 8, y + 19, { lineBreak: false });
    doc.fontSize(6.5).font("Helvetica").fill(sc)
       .text(p.period, x + 8, y + 34, { lineBreak: false });
    doc.fontSize(6).font("Helvetica").fill(sc)
       .text(p.feat,   x + 8, y + 43, { width: PL_W - 16, lineBreak: false });
  });

  y += PL_H + 14;

  // ── 7. CTA STRIP ───────────────────────────────────────
  doc.roundedRect(M, y, CW, 26, 7).fill(C.primary);
  doc.fontSize(9).font("Helvetica-Bold").fill(C.white)
     .text("Get started free  ›  " + URL + "  |  No credit card required", M, y + 9, { width: CW, align: "center", lineBreak: false });
  y += 38;

  // ── 8. FOOTER ──────────────────────────────────────────
  // fill remaining space to bottom
  const FTR_H = PH - y;
  doc.rect(0, y, PW, FTR_H).fill(C.dark);

  // thin accent line on top of footer
  doc.moveTo(M, y + 8).lineTo(PW - M, y + 8).strokeColor(C.primary).lineWidth(1).stroke();

  const fY = y + 14;
  if (HAS_LOGO) {
    doc.image(LOGO, M, fY, { width: 20, height: 20 });
  }
  const flo = HAS_LOGO ? 26 : 0;

  doc.fontSize(7.5).font("Helvetica-Bold").fill(C.white)
     .text("MyPA  —  Your Personal Business Assistant", M + flo, fY + 1, { lineBreak: false });
  doc.fontSize(6.5).font("Helvetica").fill("#94a3b8")
     .text("support@mypa.app   |   " + URL + "   |   West Bengal, India", M + flo, fY + 12, { lineBreak: false });
  doc.fontSize(6).font("Helvetica").fill("#475569")
     .text("(c) " + new Date().getFullYear() + " MyPA. All rights reserved.", PW - M - 160, fY + 12, { width: 160, align: "right", lineBreak: false });

  doc.end();
}

run().catch((e) => { console.error(e); process.exit(1); });

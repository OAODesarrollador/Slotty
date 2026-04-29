import { formatInTimeZone } from "date-fns-tz";

function normalizePdfText(value: string) {
  return value
    .replace(/[–—]/g, "-")
    .replace(/[•]/g, "-")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function escapePdfText(value: string) {
  return normalizePdfText(value)
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function wrapText(value: string, maxChars: number) {
  const normalized = normalizePdfText(value);
  if (!normalized) {
    return [""];
  }

  const words = normalized.split(" ");
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length <= maxChars) {
      current = next;
      continue;
    }

    if (current) {
      lines.push(current);
    }

    current = word;
  }

  if (current) {
    lines.push(current);
  }

  return lines;
}

function estimateTextWidth(text: string, fontSize: number) {
  return normalizePdfText(text).length * fontSize * 0.5;
}

function formatDate(value: string, timezone: string) {
  return formatInTimeZone(new Date(value), timezone, "dd/MM/yyyy");
}

function formatTime(value: string, timezone: string) {
  return formatInTimeZone(new Date(value), timezone, "HH:mm");
}

function formatIssuedAt(value: Date, timezone: string) {
  return formatInTimeZone(value, timezone, "dd/MM/yyyy HH:mm");
}

export function formatAppointmentStatusLabel(status: string) {
  const labels: Record<string, string> = {
    scheduled: "Confirmada",
    confirmed: "Confirmada",
    pending_payment: "Pendiente de pago",
    pending_verification: "Pendiente de verificacion",
    cancelled: "Cancelada",
    expired: "Expirada"
  };

  return labels[status] ?? status;
}

export function formatPaymentMethodLabel(value: string | null) {
  const labels: Record<string, string> = {
    pay_at_store: "Pago en el local",
    bank_transfer: "Transferencia bancaria",
    mercado_pago: "Mercado Pago"
  };

  return value ? (labels[value] ?? value) : "No informado";
}

export function formatPaymentStatusLabel(value: string | null) {
  const labels: Record<string, string> = {
    approved: "Aprobado",
    pending: "Pendiente",
    pending_verification: "En verificacion",
    rejected: "Rechazado",
    cancelled: "Cancelado",
    refunded: "Reintegrado",
    expired: "Expirado"
  };

  return value ? (labels[value] ?? value) : "No informado";
}

type ReceiptInput = {
  tenantName: string;
  timezone: string;
  appointmentId: string;
  customerName: string;
  serviceName: string;
  datetimeStart: string;
  barberName: string;
  appointmentStatus: string;
  paymentMethod: string | null;
  paymentStatus: string | null;
  issuedAt: Date;
};

export function buildReceiptFilename(tenantName: string) {
  const normalized = normalizePdfText(tenantName)
    .replace(/[^a-zA-Z0-9\s_-]/g, "")
    .trim()
    .replace(/\s+/g, "_");

  return `Reserva_Barberia_${normalized || "Tenant"}.pdf`;
}

function buildPdf(objects: Buffer[]) {
  const header = Buffer.from("%PDF-1.4\n%\xFF\xFF\xFF\xFF\n", "binary");
  const chunks: Buffer[] = [header];
  const offsets: number[] = [0];
  let currentOffset = header.length;

  objects.forEach((object, index) => {
    offsets.push(currentOffset);
    const wrapped = Buffer.concat([
      Buffer.from(`${index + 1} 0 obj\n`, "binary"),
      object,
      Buffer.from("\nendobj\n", "binary")
    ]);
    chunks.push(wrapped);
    currentOffset += wrapped.length;
  });

  const xrefOffset = currentOffset;
  const xrefLines = [
    `xref`,
    `0 ${objects.length + 1}`,
    `0000000000 65535 f `
  ];

  for (let index = 1; index < offsets.length; index += 1) {
    xrefLines.push(`${String(offsets[index]).padStart(10, "0")} 00000 n `);
  }

  xrefLines.push(
    `trailer`,
    `<< /Size ${objects.length + 1} /Root 1 0 R >>`,
    `startxref`,
    String(xrefOffset),
    `%%EOF`
  );

  chunks.push(Buffer.from(`${xrefLines.join("\n")}\n`, "binary"));
  return Buffer.concat(chunks);
}

export function buildAppointmentReceiptPdf(input: ReceiptInput) {
  const receiptCode = input.appointmentId.slice(0, 8).toUpperCase();
  const lines: string[] = [];
  const statusLabel = formatAppointmentStatusLabel(input.appointmentStatus);
  const paymentMethodLabel = formatPaymentMethodLabel(input.paymentMethod);
  const paymentStatusLabel = formatPaymentStatusLabel(input.paymentStatus);
  const pageWidth = 595;
  const pageHeight = 842;
  const cardX = 34;
  const cardY = 46;
  const cardWidth = pageWidth - 68;
  const cardHeight = pageHeight - 92;
  let cursorY = 742;

  const pushText = (
    text: string,
    x: number,
    fontSize: number,
    font: "F1" | "F2",
    color = "0 0 0"
  ) => {
    lines.push(`${color} rg`);
    lines.push(`BT /${font} ${fontSize} Tf 1 0 0 1 ${x} ${cursorY} Tm (${escapePdfText(text)}) Tj ET`);
    cursorY -= fontSize + 8;
  };

  const pushWrappedText = (
    value: string,
    x: number,
    maxChars: number,
    fontSize: number,
    font: "F1" | "F2",
    color = "0 0 0",
    lineGap = 5
  ) => {
    const wrapped = wrapText(value, maxChars);
    for (const line of wrapped) {
      lines.push(`${color} rg`);
      lines.push(`BT /${font} ${fontSize} Tf 1 0 0 1 ${x} ${cursorY} Tm (${escapePdfText(line)}) Tj ET`);
      cursorY -= fontSize + lineGap;
    }
  };

  const drawRect = (x: number, y: number, width: number, height: number, fillColor: string, strokeColor?: string) => {
    if (strokeColor) {
      lines.push(`${strokeColor} RG`);
    }
    lines.push(`${fillColor} rg`);
    lines.push(`${x} ${y} ${width} ${height} re ${strokeColor ? "B" : "f"}`);
  };

  const drawDivider = (y: number, color = "0.20 0.20 0.20") => {
    lines.push(`${color} RG`);
    lines.push(`48 ${y} 499 1 re S`);
  };

  const pushMetricBlock = (args: {
    x: number;
    y: number;
    width: number;
    height: number;
    label: string;
    value: string;
    accentColor: string;
    fillColor: string;
    valueFontSize?: number;
  }) => {
    const label = args.label.toUpperCase();
    const valueFontSize = args.valueFontSize ?? 16;
    const cardCenterX = args.x + args.width / 2;
    const labelX = Math.max(args.x + 14, cardCenterX - estimateTextWidth(label, 9) / 2);
    const valueX = Math.max(args.x + 14, cardCenterX - estimateTextWidth(args.value, valueFontSize) / 2);

    drawRect(args.x, args.y, args.width, args.height, args.fillColor, "0.16 0.16 0.16");
    lines.push(`0.64 0.64 0.64 rg`);
    lines.push(`BT /F2 9 Tf 1 0 0 1 ${labelX} ${args.y + args.height - 16} Tm (${escapePdfText(label)}) Tj ET`);
    lines.push(`${args.accentColor} rg`);
    lines.push(`BT /F1 ${valueFontSize} Tf 1 0 0 1 ${valueX} ${args.y + 12} Tm (${escapePdfText(args.value)}) Tj ET`);
  };

  const pushInfoField = (args: {
    x: number;
    y: number;
    label: string;
    value: string;
    maxChars: number;
  }) => {
    lines.push(`0.56 0.56 0.56 rg`);
    lines.push(`BT /F2 9 Tf 1 0 0 1 ${args.x} ${args.y} Tm (${escapePdfText(args.label.toUpperCase())}) Tj ET`);
    let localY = args.y - 18;
    for (const line of wrapText(args.value, args.maxChars)) {
      lines.push(`0.95 0.95 0.95 rg`);
      lines.push(`BT /F1 12 Tf 1 0 0 1 ${args.x} ${localY} Tm (${escapePdfText(line)}) Tj ET`);
      localY -= 16;
    }
  };

  drawRect(0, 0, pageWidth, pageHeight, "0.06 0.06 0.07");
  drawRect(cardX, cardY, cardWidth, cardHeight, "0.10 0.10 0.11", "0.14 0.14 0.15");
  drawRect(cardX, pageHeight - 132, cardWidth, 86, "0.12 0.12 0.13");
  drawRect(cardX, pageHeight - 52, 190, 6, "0.89 0.70 0.24");
  drawRect(pageWidth - 126, pageHeight - 132, 92, 92, "0.89 0.70 0.24");
  drawRect(pageWidth - 110, pageHeight - 116, 60, 60, "0.10 0.10 0.11");

  pushText(input.tenantName, 48, 22, "F1", "0.96 0.96 0.96");
  pushText("Comprobante de reserva", 48, 24, "F1", "0.96 0.96 0.96");
  pushWrappedText(
    "Tu reserva quedo registrada en el sistema con un comprobante listo para guardar o compartir.",
    48,
    62,
    10,
    "F2",
    "0.76 0.76 0.78",
    4
  );

  cursorY = 710;
  drawRect(48, 606, 499, 88, "0.13 0.13 0.14", "0.20 0.20 0.20");
  pushMetricBlock({
    x: 64,
    y: 622,
    width: 145,
    height: 56,
    label: "Estado",
    value: statusLabel,
    accentColor: "0.89 0.70 0.24",
    fillColor: "0.17 0.14 0.08"
  });
  pushMetricBlock({
    x: 225,
    y: 622,
    width: 145,
    height: 56,
    label: "Fecha",
    value: formatDate(input.datetimeStart, input.timezone),
    accentColor: "0.95 0.95 0.95",
    fillColor: "0.12 0.12 0.13",
    valueFontSize: 14
  });
  pushMetricBlock({
    x: 386,
    y: 622,
    width: 145,
    height: 56,
    label: "Hora",
    value: formatTime(input.datetimeStart, input.timezone),
    accentColor: "0.95 0.95 0.95",
    fillColor: "0.12 0.12 0.13",
    valueFontSize: 14
  });

  lines.push(`0.58 0.58 0.60 rg`);
  lines.push(`BT /F2 10 Tf 1 0 0 1 48 582 Tm (${escapePdfText(`Codigo de reserva ${receiptCode}`)}) Tj ET`);
  lines.push(`0.93 0.93 0.94 rg`);
  lines.push(`BT /F1 18 Tf 1 0 0 1 48 554 Tm (${escapePdfText(input.serviceName)}) Tj ET`);
  cursorY = 526;
  pushWrappedText(`Cliente ${input.customerName}`, 48, 60, 11, "F2", "0.72 0.72 0.74", 5);

  drawDivider(510);
  pushInfoField({ x: 48, y: 484, label: "Cliente", value: input.customerName, maxChars: 28 });
  pushInfoField({ x: 318, y: 484, label: "Profesional", value: input.barberName || "Sin asignar", maxChars: 24 });
  pushInfoField({ x: 48, y: 412, label: "Servicio", value: input.serviceName, maxChars: 28 });
  pushInfoField({ x: 318, y: 412, label: "Emitido", value: formatIssuedAt(input.issuedAt, input.timezone), maxChars: 24 });

  drawRect(48, 212, 499, 154, "0.12 0.12 0.13", "0.20 0.20 0.20");
  lines.push(`0.89 0.70 0.24 rg`);
  lines.push(`BT /F2 10 Tf 1 0 0 1 68 338 Tm (${escapePdfText("PAGO Y REFERENCIA")}) Tj ET`);
  pushInfoField({ x: 68, y: 308, label: "Medio de pago", value: paymentMethodLabel, maxChars: 28 });
  pushInfoField({ x: 318, y: 308, label: "Estado de pago", value: paymentStatusLabel, maxChars: 24 });
  pushInfoField({ x: 68, y: 250, label: "Identificador", value: receiptCode, maxChars: 28 });
  pushInfoField({ x: 318, y: 250, label: "Reserva", value: statusLabel, maxChars: 24 });

  drawDivider(176, "0.24 0.24 0.25");
  lines.push(`0.89 0.70 0.24 rg`);
  lines.push(`BT /F1 11 Tf 1 0 0 1 48 144 Tm (${escapePdfText("Reserva generada con Slotty")}) Tj ET`);
  lines.push(`0.62 0.62 0.64 rg`);
  lines.push(`BT /F2 9 Tf 1 0 0 1 48 124 Tm (${escapePdfText("Comprobante digital emitido automaticamente para consulta y uso del cliente.")}) Tj ET`);

  const contentStream = Buffer.from(lines.join("\n"), "latin1");
  const objects = [
    Buffer.from("<< /Type /Catalog /Pages 2 0 R >>", "binary"),
    Buffer.from("<< /Type /Pages /Count 1 /Kids [3 0 R] >>", "binary"),
    Buffer.from(
      "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>",
      "binary"
    ),
    Buffer.from("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>", "binary"),
    Buffer.from("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>", "binary"),
    Buffer.concat([
      Buffer.from(`<< /Length ${contentStream.length} >>\nstream\n`, "binary"),
      contentStream,
      Buffer.from("\nendstream", "binary")
    ])
  ];

  return buildPdf(objects);
}

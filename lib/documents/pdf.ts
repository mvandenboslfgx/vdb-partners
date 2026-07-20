import "server-only";
import PDFDocument from "pdfkit";

export interface PdfProof { title: string; reference: string; lines: readonly string[]; issuedAt?: Date; }
export function generateProofPdf(proof: PdfProof): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 48 }); const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk)); doc.on("error", reject); doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.fillColor("#171717").fontSize(22).text("VDB Partners").fillColor("#9A7B3F").fontSize(16).text(proof.title);
    doc.fillColor("#171717").fontSize(10).text(`Reference: ${proof.reference}`).text(`Issued: ${(proof.issuedAt ?? new Date()).toISOString()}`).moveDown();
    proof.lines.forEach((line) => doc.text(line)); doc.end();
  });
}
export const generateAgreementAcceptancePdf = (reference: string, lines: readonly string[]) => generateProofPdf({ title: "Agreement acceptance proof", reference, lines });
export const generateCashReceiptPdf = (reference: string, lines: readonly string[]) => generateProofPdf({ title: "Cash receipt", reference, lines });
export const generatePayoutProofPdf = (reference: string, lines: readonly string[]) => generateProofPdf({ title: "Payout proof", reference, lines });

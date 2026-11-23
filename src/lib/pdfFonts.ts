import { jsPDF } from "jspdf";

export async function loadRussianFont(doc: jsPDF) {
  const response = await fetch("/fonts/DejaVuSans.ttf");
  const buffer = await response.arrayBuffer();

  const binary = Array.from(new Uint8Array(buffer))
    .map((b) => String.fromCharCode(b))
    .join("");

  const base64 = btoa(binary);

  doc.addFileToVFS("DejaVuSans.ttf", base64);
  doc.addFont("DejaVuSans.ttf", "DejaVuSans", "normal");

  doc.setFont("DejaVuSans");
}
/**
 * Geração de payload PIX (BR Code / EMV do Banco Central) — portado
 * literalmente de barbearia-app.jsx (linhas 224-260).
 */

function emvField(id: string, value: string) {
  const len = String(value.length).padStart(2, "0");
  return `${id}${len}${value}`;
}

function crc16ccitt(payload: string) {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = (crc & 0x8000) !== 0 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

function sanitizePixText(str: string | null | undefined, maxLen: number) {
  const noAccents = (str || "").normalize("NFD").replace(/[̀-ͯ]/g, "");
  const clean = noAccents.replace(/[^A-Za-z0-9 ]/g, "").trim();
  return (clean || "BARBEARIA").slice(0, maxLen);
}

export function buildPixPayload({
  pixKey,
  merchantName,
  merchantCity,
  amount,
  txid,
}: {
  pixKey: string;
  merchantName: string;
  merchantCity: string;
  amount?: number;
  txid?: string;
}) {
  const name = sanitizePixText(merchantName, 25);
  const city = sanitizePixText(merchantCity, 15);
  const tx = (txid || "***").replace(/[^A-Za-z0-9]/g, "").slice(0, 25) || "***";
  const merchantAccountInfo = emvField("00", "BR.GOV.BCB.PIX") + emvField("01", pixKey);
  let payload =
    emvField("00", "01") +
    emvField("26", merchantAccountInfo) +
    emvField("52", "0000") +
    emvField("53", "986") +
    (amount ? emvField("54", amount.toFixed(2)) : "") +
    emvField("58", "BR") +
    emvField("59", name) +
    emvField("60", city) +
    emvField("62", emvField("05", tx));
  payload += "6304";
  return payload + crc16ccitt(payload);
}

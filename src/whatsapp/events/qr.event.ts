import { whatsappClient } from "../client";
import { logger } from "../../infrastructure/logger";
import qrcode from "qrcode-terminal";

export function registerQrEvent() {
    whatsappClient.on("qr", (qr) => {
        logger.info("WhatsApp", "QR code received, scan with your WhatsApp app:");
        qrcode.generate(qr, { small: true });
    });
}

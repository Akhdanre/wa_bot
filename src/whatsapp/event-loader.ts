import { registerMessageEvent } from "./events/message.event";
import { registerQrEvent } from "./events/qr.event";
import { registerReadyEvent } from "./events/ready.event";


export function registerEvents() {
    registerQrEvent();
    registerReadyEvent();
    registerMessageEvent();
}
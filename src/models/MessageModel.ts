import { Message } from "whatsapp-web.js";

export class MessageModel {
  private message: Message;

  constructor(message: Message) {
    this.message = message;
  }

  getText(): string {
    return (this.message.body || "").trim();
  }

  getTextLower(): string {
    return this.getText().toLowerCase();
  }

  getFrom(): string {
    return this.message.from;
  }

  isFromBot(): boolean {
    return this.message.fromMe;
  }

  isGroupMessage(): boolean {
    return this.message.isGroupMsg;
  }

  getOriginalMessage(): Message {
    return this.message;
  }

  isCommand(commandName: string): boolean {
    return this.getTextLower().startsWith(`!${commandName.toLowerCase()} `);
  }

  isExactMatch(text: string): boolean {
    return this.getTextLower() === text.toLowerCase();
  }

  getCommandArgument(commandName: string): string {
    const prefix = `!${commandName} `;
    const text = this.getText();
    if (text.toLowerCase().startsWith(prefix.toLowerCase())) {
      return text.slice(prefix.length);
    }
    return "";
  }
}

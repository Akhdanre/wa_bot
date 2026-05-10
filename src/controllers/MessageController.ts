import { Message } from "whatsapp-web.js";
import { MessageModel } from "../models/MessageModel";
import { QuotesModel } from "../models/QuotesModel";
import { MessageView } from "../views/MessageView";
import { logDebug, logError, delay } from "../utils/helpers";

export class MessageController {
  private messageView: MessageView;
  private quotesModel: QuotesModel;

  constructor(quotesModel: QuotesModel) {
    this.quotesModel = quotesModel;
    this.messageView = new MessageView(quotesModel);
  }

  async handleMessage(message: Message): Promise<void> {
    try {
      const msgModel = new MessageModel(message);

      // Skip bot's own messages
      if (msgModel.isFromBot()) {
        logDebug("Skipping message from bot itself");
        return;
      }

      const text = msgModel.getText();
      logDebug(`Message received: "${text}"`);

      // Route to appropriate handler
      if (msgModel.isExactMatch("akrida")) {
        await this.handleAkrida(msgModel);
      } else if (msgModel.isCommand("eco")) {
        await this.handleEcho(msgModel);
      } else {
        logDebug("Message did not match any commands");
      }
    } catch (err) {
      logError(`Exception in message handler: ${err}`);
    }
  }

  private async handleAkrida(msgModel: MessageModel): Promise<void> {
    logDebug("Matched 'akrida' command");
    const replyText = this.messageView.formatWithQuote("iya");
    await this.sendReply(msgModel.getOriginalMessage(), replyText);
  }

  private async handleEcho(msgModel: MessageModel): Promise<void> {
    logDebug("Matched '!eco' command");
    const echoText = msgModel.getCommandArgument("eco");
    if (!echoText) {
      await this.sendReply(msgModel.getOriginalMessage(), "Please provide text to echo: !eco <text>");
      return;
    }
    const replyText = this.messageView.formatEchoReply(echoText);
    await this.sendReply(msgModel.getOriginalMessage(), replyText);
  }

  private async sendReply(message: Message, replyText: string): Promise<void> {
    try {
      logDebug(`Attempting to reply with: "${replyText}"`);
      const chat = await message.getChat();

      // Send typing indicator
      try {
        await chat.sendStateTyping();
        await delay(2000);
        await chat.clearState();
      } catch (err) {
        logDebug("Typing state failed (continuing)");
      }

      // Send reply
      await message.reply(replyText);
      logDebug("Reply sent successfully");
    } catch (err) {
      logError(`Failed to send reply: ${err}`);
    }
  }
}

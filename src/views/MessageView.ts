import { QuotesModel } from "../models/QuotesModel";

export class MessageView {
  private quotesModel: QuotesModel;

  constructor(quotesModel: QuotesModel) {
    this.quotesModel = quotesModel;
  }

  formatWithQuote(baseText: string): string {
    const quote = this.quotesModel.getRandomQuote();
    if (!quote) return baseText;
    return `${baseText}\n\n_${quote}_`;
  }

  formatSimpleReply(text: string): string {
    return text;
  }

  formatError(errorMsg: string): string {
    return `❌ Error: ${errorMsg}`;
  }

  formatSuccess(message: string): string {
    return `✓ ${message}`;
  }

  formatEchoReply(text: string): string {
    return this.formatWithQuote(text);
  }
}

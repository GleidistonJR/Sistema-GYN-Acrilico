import whatsapp from 'whatsapp-web.js';

export function erroDeNavegacao(error) {
  return error instanceof Error && /detached Frame|Execution context was destroyed|Cannot find context with specified id|Target closed|Session closed|TargetCloseError/i.test(error.message);
}

// whatsapp-web.js 1.34.8 leaves this async EventEmitter listener unguarded.
// Navigation can invalidate an evaluate() while logout/QR renewal is in progress.
// Keep the workaround outside node_modules and covered by regression tests.
export class WhatsAppClient extends whatsapp.Client {
  async sendMessage(chatId, content, options = {}) {
    if (options.quotedMessageId) {
      const canQuote = await this.pupPage.evaluate(async id => {
        const { Msg } = window.require('WAWebCollections');
        const message = Msg.get(id) || (await Msg.getMessagesById([id]))?.messages?.[0];
        if (!message) return false;
        const reply = window.require('WAWebMsgReply');
        return reply ? reply.canReplyMsg(message.unsafe()) : message.canReply();
      }, options.quotedMessageId);
      if (!canQuote) {
        const error = new Error('A mensagem original não está mais disponível para responder no WhatsApp.');
        error.code = 'QUOTE_UNAVAILABLE';
        throw error;
      }
    }
    return super.sendMessage(chatId, content, options);
  }

  constructor(options) {
    super(options);
    this.logoutReported = false;
    this.on('authenticated', () => { this.logoutReported = false; });
  }

  _registerFramenavigatedHandler() {
    if (this._framenavigatedRegistered) return;
    this._framenavigatedRegistered = true;
    this.pupPage.on('framenavigated', frame => {
      void this.handleNavigation(frame).catch(error => this.emit('error', error));
    });
  }

  async handleNavigation(frame) {
    try {
      if (frame.parentFrame() !== null || this.pupPage.isClosed()) return;
      const isLogout = frame.url().includes('post_logout=1') || this.lastLoggedOut;
      if (isLogout && !this.logoutReported) {
        this.logoutReported = true;
        this.emit('disconnected', 'LOGOUT');
        await this.authStrategy.logout();
        await this.authStrategy.beforeBrowserInitialized();
        await this.authStrategy.afterBrowserInitialized();
        this.lastLoggedOut = false;
      }
      const storeAvailable = await this.pupPage.evaluate(() => typeof window.WWebJS !== 'undefined');
      if (!isLogout && storeAvailable) return;
      await this.inject();
    } catch (error) {
      // A later navigation event retries injection with a fresh frame.
      if (!erroDeNavegacao(error)) throw error;
    }
  }
}

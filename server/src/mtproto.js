const {TelegramClient, Api} = require('telegram');
const {Raw} = require('telegram/events');
const {StringSession} = require('telegram/sessions');

class MtProtoBridge {
  constructor({credentials, state, save, onMessage, onDeleted}) {
    this.credentials = credentials;
    this.state = state;
    this.save = save;
    this.onMessage = onMessage;
    this.onDeleted = onDeleted;
    this.client = null;
    this.eventHandlerAttached = false;
  }

  apiCredentials() {
    const apiId = Number(process.env.TELEGRAM_API_ID || this.state.apiId || 0);
    const apiHash = String(process.env.TELEGRAM_API_HASH || this.state.apiHash || '');
    if (!apiId || !apiHash) throw new Error('MTProto API ID və API Hash konfiqurasiya edilməyib.');
    return {apiId, apiHash};
  }

  async makeClient(session = '') {
    const {apiId, apiHash} = this.apiCredentials();
    const client = new TelegramClient(new StringSession(session), apiId, apiHash, {connectionRetries: 5});
    await client.connect();
    return client;
  }

  async requestCode(phone) {
    this.client = await this.makeClient(this.state.session || '');
    const credentials = this.apiCredentials();
    const sent = await this.client.sendCode(credentials, phone, false);
    this.state.phone = phone;
    this.state.phoneCodeHash = sent.phoneCodeHash;
    this.state.pending = 'code';
    this.state.lastError = null;
    this.state.session = this.client.session.save();
    this.save();
    return {ok: true, needsCode: true, isCodeViaApp: sent.isCodeViaApp};
  }

  async verifyCode(code) {
    if (!this.client) this.client = await this.makeClient(this.state.session || '');
    const credentials = this.apiCredentials();
    try {
      await this.client.invoke(new Api.auth.SignIn({
        phoneNumber: this.state.phone,
        phoneCodeHash: this.state.phoneCodeHash,
        phoneCode: String(code).replace(/\s+/g, '').trim()
      }));
      return this.finishAuthorization();
    } catch (error) {
      if (String(error.errorMessage || error.message || '').includes('SESSION_PASSWORD_NEEDED')) {
        this.state.pending = 'password';
        this.state.lastError = null;
        this.save();
        return {ok: true, needsPassword: true};
      }
      throw error;
    }
  }

  async verifyPassword(password) {
    if (!this.client) this.client = await this.makeClient(this.state.session || '');
    const credentials = this.apiCredentials();
    let authError = null;
    try {
      await this.client.signInWithPassword(credentials, {
        password: async () => String(password),
        onError: async error => { authError = error; return true; }
      });
    } catch (error) {
      throw authError || error;
    }
    if (authError) throw authError;
    return this.finishAuthorization();
  }

  async finishAuthorization() {
    this.state.session = this.client.session.save();
    this.state.authorized = true;
    this.state.pending = null;
    this.state.phoneCodeHash = null;
    this.state.lastError = null;
    this.save();
    this.attachEvents();
    return {ok: true, authorized: true, imported: await this.syncHistory()};
  }

  attachEvents() {
    if (!this.client || this.eventHandlerAttached) return;
    this.client.addEventHandler(async update => {
      try {
        const name = update?.className || '';
        if (name === 'UpdateNewChannelMessage' || name === 'UpdateNewMessage') {
          const message = update.message;
          if (message?.document) await this.handleMessage(message);
        } else if (name === 'UpdateDeleteChannelMessages') {
          await this.onDeleted((update.messages || []).map(Number));
        }
      } catch (error) {
        this.state.lastError = error.message;
        this.save();
      }
    }, new Raw({}));
    this.eventHandlerAttached = true;
  }

  async handleMessage(message) {
    const entity = await this.client.getEntity(this.credentials().channelId);
    const filenameAttribute = (message.document.attributes || []).find(a => a.className === 'DocumentAttributeFilename');
    const fileName = filenameAttribute?.fileName || `telegram-${message.id}.pdf`;
    if (!/\.pdf$/i.test(fileName) && message.document.mimeType !== 'application/pdf') return;
    const buffer = await this.client.downloadMedia(message, {workers: 1});
    if (!buffer) return;
    await this.onMessage({
      messageId: Number(message.id),
      channelId: String(this.credentials().channelId),
      fileId: String(message.document.id || ''),
      fileName,
      caption: message.message || '',
      date: message.date ? new Date(message.date * 1000).toISOString() : new Date().toISOString(),
      buffer
    });
  }

  async syncHistory() {
    if (!this.client || !this.state.authorized) return 0;
    const entity = await this.client.getEntity(this.credentials().channelId);
    let imported = 0;
    for await (const message of this.client.iterMessages(entity, {limit: 1000})) {
      if (!message?.document) continue;
      const before = this.state.importedCount || 0;
      await this.handleMessage(message);
      if ((this.state.importedCount || 0) > before) imported++;
    }
    this.state.lastHistorySync = new Date().toISOString();
    this.state.lastError = null;
    this.save();
    return imported;
  }

  async initialize() {
    if (!this.state.session || !this.state.authorized) return {authorized: false};
    this.client = await this.makeClient(this.state.session);
    this.attachEvents();
    this.state.lastError = null;
    this.save();
    return {authorized: true};
  }

  async disconnect(clearSession = false) {
    if (this.client) await this.client.disconnect();
    this.client = null;
    this.eventHandlerAttached = false;
    if (clearSession) {
      this.state.session = '';
      this.state.authorized = false;
      this.state.pending = null;
      this.state.phoneCodeHash = null;
      this.save();
    }
  }
}

module.exports = {MtProtoBridge};

const sessionId = Math.random().toString(36).substring(7);
const REGENERATION_TEXT = 'Regeneration...';
const CHAT_DISABLED_CLASS = 'chat-disabled';
const ALERT_TIMEOUT = 10000;
const user = {
  id: 'user',
};

const assistant = {
  id: 'assistant',
  name: 'Virtual Assistant',
};

export {
  sessionId,
  REGENERATION_TEXT,
  CHAT_DISABLED_CLASS,
  ALERT_TIMEOUT,
  user,
  assistant,
};

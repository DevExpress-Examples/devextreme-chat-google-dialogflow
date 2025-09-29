const sessionId = Math.random().toString(36).substring(7);
const REGENERATION_TEXT = 'Regeneration...';
const CHAT_MESSAGEBOX_BUTTON_CLASS = 'dx-chat-messagebox-button';
const CHAT_MESSAGEBOX_TEXTAREA_CLASS = 'dx-chat-messagebox-textarea';

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
  CHAT_MESSAGEBOX_BUTTON_CLASS,
  CHAT_MESSAGEBOX_TEXTAREA_CLASS,
  user,
  assistant,
};

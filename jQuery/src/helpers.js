import {
  assistant,
  CHAT_MESSAGEBOX_BUTTON_CLASS,
  CHAT_MESSAGEBOX_TEXTAREA_CLASS, REGENERATION_TEXT,
  sessionId, user,
} from './data.js';

let lastMessageText = '';
let alertTimeoutId;

export function loadMessages() {
  DevExpress.localization.loadMessages({
    'en': {
      'dxChat-emptyListMessage': 'Chat is Empty',
      'dxChat-emptyListPrompt': 'AI Assistant is ready to answer your questions.',
      'dxChat-textareaPlaceholder': 'Ask AI Assistant...',
    },
  });
}
async function getAIResponse(text) {
  const response = await fetch('http://localhost:3000/webhook', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ message: text, sessionId }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || response.statusText || `Request failed with status ${response.status}`);
  }

  if (typeof data.response !== 'string') {
    throw new Error('Invalid response from server');
  }

  return data.response;
}
function toggleDisabledState(disabled, instance) {
  const $button = instance.element().find(`.${CHAT_MESSAGEBOX_BUTTON_CLASS}`);
  const $textArea = instance.element().find(`.${CHAT_MESSAGEBOX_TEXTAREA_CLASS}`);
  const buttonInstance = $button.dxButton('instance');
  const textAreaInstance = $textArea.dxTextArea('instance');

  buttonInstance.option({ disabled });
  textAreaInstance.option({ disabled });

  if (!disabled) {
    textAreaInstance.focus();
  }
}

export async function processMessageSending(text, instance, customStore) {
  clearAlerts(instance);
  toggleDisabledState(true, instance);

  instance.option({ typingUsers: [assistant] });

  try {
    const aiResponse = await getAIResponse(text);

    setTimeout(() => {
      instance.option({ typingUsers: [] });

      renderMessage(aiResponse, customStore);
    }, 200);
  } catch (error) {
    instance.option({ typingUsers: [] });

    pushAlert(getErrorMessage(error), instance);
  } finally {
    toggleDisabledState(false, instance);
  }
}

export async function regenerate(instance, customStore) {
  clearAlerts(instance);
  toggleDisabledState(true, instance);

  try {
    const { items } = instance.option();
    const lastUserMessage = items.filter((item) => item.author.id === user.id).at(-1);
    const aiResponse = await getAIResponse(lastUserMessage.text);

    updateLastMessage(aiResponse, customStore, instance);
  } catch (error) {
    updateLastMessage(lastMessageText, customStore, instance);
    pushAlert(getErrorMessage(error), instance);
  } finally {
    toggleDisabledState(false, instance);
  }
}
function renderMessage(text, customStore) {
  const message = {
    id: Date.now(),
    timestamp: new Date(),
    author: assistant,
    text,
  };

  customStore.push([{ type: 'insert', data: message }]);
}

export function updateLastMessage(text, customStore, instance) {
  const { items } = instance.option();
  const lastMessage = items.at(-1);

  lastMessageText = text ? '' : lastMessage.text;

  const data = {
    text: text ?? REGENERATION_TEXT,
  };

  customStore.push([{
    type: 'update',
    key: lastMessage.id,
    data,
  }]);
}
export function convertToHtml(value) {
  const result = unified()
    .use(remarkParse)
    // eslint-disable-next-line spellcheck/spell-checker
    .use(remarkRehype)
    // eslint-disable-next-line spellcheck/spell-checker
    .use(rehypeStringify)
    .processSync(value)
    .toString();

  return result;
}
function getErrorMessage(error) {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'Unknown error';
}

function clearAlerts(instance) {
  clearTimeout(alertTimeoutId);
  instance.option({ alerts: [] });
}

function pushAlert(message, instance) {
  clearAlerts(instance);

  instance.option({
    alerts: [{
      message,
    }],
  });

  alertTimeoutId = setTimeout(() => {
    instance.option({ alerts: [] });
  }, 10000);
}

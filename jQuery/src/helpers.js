import {
  assistant,
  CHAT_MESSAGEBOX_BUTTON_CLASS,
  CHAT_MESSAGEBOX_TEXTAREA_CLASS, REGENERATION_TEXT,
  sessionId, user,
} from './data.js';

let lastMessageText = '';

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

    pushAlert(error, instance);
  } finally {
    toggleDisabledState(false, instance);
  }
}

export async function regenerate(instance, customStore) {
  toggleDisabledState(true, instance);

  try {
    const { items } = instance.option();
    const lastUserMessage = items.filter((item) => item.author.id === user.id).at(-1);
    const aiResponse = await getAIResponse(lastUserMessage.text);

    updateLastMessage(aiResponse, customStore, instance);
  } catch (error) {
    updateLastMessage(lastMessageText, customStore, instance);
    pushAlert(error, instance);
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
  console.log(data)
  customStore.push([{
    type: 'update',
    key: lastMessage.id,
    data,
  }]);
}
export function convertToHtml(value) {
  const result = unified()
    .use(remarkParse)
    .use(remarkRehype)
    .use(rehypeStringify)
    .processSync(value)
    .toString();

  return result;
}
function pushAlert(error, instance) {
  instance.option({
    alerts: [{
      message: error.message,
    }],
  });

  setTimeout(() => {
    instance.option({ alerts: [] });
  }, 10000);
}

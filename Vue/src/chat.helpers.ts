import { ref } from 'vue';
import { CustomStore, DataSource } from 'devextreme-vue/common/data';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';
import { loadMessages } from 'devextreme/localization';
import type { DxChatTypes } from 'devextreme-vue/chat';

const ALERT_TIMEOUT = 10000;

const assistant: DxChatTypes.User = { id: 'assistant', name: 'Virtual Assistant' };

export function useChatLogic() {
  const sessionId: string = Math.random().toString(36).substring(7);
  let lastMessageText: string = '';
  const dataSource = ref<DataSource | null>(null);
  const user = ref({ id: 'user' });
  const typingUsers = ref<Array<DxChatTypes.User>>([]);
  const alerts = ref<Array<DxChatTypes.Alert>>([]);
  const regenerationText = ref('Regeneration...');
  const copyButtonIcon = ref('copy');
  const isDisabled = ref(false);
  const store = ref([]);
  const messages = ref<Array<{ role: 'user' | 'assistant' | 'system'; content: string }>>([]);

  const loadMessage = () => {
    loadMessages({
      en: {
        'dxChat-emptyListMessage': 'Chat is Empty',
        'dxChat-emptyListPrompt': 'AI Assistant is ready to answer your questions.',
        'dxChat-textareaPlaceholder': 'Ask AI Assistant...'
      }
    });
  };

  const initDataSource = () => {
    const customStore = new CustomStore({
      key: 'id',
      load: () => Promise.resolve([...store.value]),
      insert: (message) => {
        store.value.push(message);
        return Promise.resolve(message);
      }
    });

    dataSource.value = new DataSource({ store: customStore, paginate: false });
  };

  const getAIResponse = async(text: string | undefined) => {
    let id = sessionId;
    const response = await fetch('http://localhost:3000/webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message: text, sessionId: id }),
    });

    const data: { response: string } = await response.json();

    return data.response;
  };

  const processMessageSending = async(e: DxChatTypes.MessageEnteredEvent) => {
    let { message } = e;
    toggleDisabledState(true);
    (e.event?.target as HTMLElement).blur();
    typingUsers.value = [assistant];

    try {
      const aiResponse = await getAIResponse(message.text);
      setTimeout(() => {
        typingUsers.value = [];
        renderAssistantMessage(aiResponse ?? '');
      }, 200);
    } catch(error) {
      (e.event?.target as HTMLElement).focus();
      typingUsers.value = [];
      alertLimitReached(error);
    } finally {
      (e.event?.target as HTMLElement).focus();
      toggleDisabledState(false);
    }
  };

  const updateLastMessage = (text?: string | null | undefined) => {
    let items = dataSource.value?.items();
    const lastMessage = items?.slice(-1)[0];
    const data = {
      text: text ?? regenerationText
    };
    lastMessageText = text ? '' : lastMessage.text;

    dataSource.value?.store().push([{
      type: 'update',
      key: lastMessage.id,
      data: data
    }]);
  };

  const renderAssistantMessage = (text: string | null) => {
    const message = {
      id: Date.now(),
      timestamp: new Date(),
      author: assistant,
      text
    };

    dataSource.value?.store().push([{ type: 'insert', data: message }]);
  };

  const alertLimitReached = (error: any) => {
    setAlerts([{ message: error.message }]);
    setTimeout(() => setAlerts([]), ALERT_TIMEOUT);
  };

  const setAlerts = (newAlerts: DxChatTypes.Alert[]) => {
    alerts.value = newAlerts;
  };

  const regenerate = async() => {
    try {
      const aiResponse = await getAIResponse(lastMessageText);
      updateLastMessage(aiResponse);
      const lastMsg = messages.value.slice(-1)[0];
      if (lastMsg) {
        lastMsg.content = aiResponse ?? '';
        messages.value = [...messages.value];
      }
    } catch(error) {
      const lastMsg = messages.value.slice(-1)[0];
      if (lastMsg) updateLastMessage(lastMsg.content);
      alertLimitReached(error);
    }
  };

  const convertToHtml = (message: {text: string}) => {
    return unified()
      .use(remarkParse)
      .use(remarkRehype)
      .use(rehypeStringify)
      .processSync(message.text || '')
      .toString();
  };

  const toggleDisabledState = (disabled: boolean, event?: { target?: EventTarget } | undefined) => {
    const element = event?.target as HTMLElement;
    isDisabled.value = disabled;

    if (element) {
      if (disabled) {
        element.blur();
      } else {
        element.focus();
      }
    }
  };

  const onMessageEntered = async(e: DxChatTypes.MessageEnteredEvent) => {
    let { message } = e;
    dataSource.value?.store().push([{
      type: 'insert',
      data: { id: Date.now(), ...message }
    }]);

    messages.value.push({ role: 'user', content: message?.text ?? '' });
    await processMessageSending(e);
  };

  const onCopyButtonClick = (message: {text: string}) => {
    navigator.clipboard?.writeText(message.text ?? '');
    copyButtonIcon.value = 'check';
    setTimeout(() => copyButtonIcon.value = 'copy', 2500);
  };

  const onRegenerateButtonClick = async() => {
    updateLastMessage();
    toggleDisabledState(true);
    try {
      await regenerate();
    } finally {
      toggleDisabledState(false);
    }
  };

  return {
    dataSource,
    user,
    typingUsers,
    alerts,
    regenerationText,
    copyButtonIcon,
    loadMessage,
    initDataSource,
    convertToHtml,
    onMessageEntered,
    onCopyButtonClick,
    onRegenerateButtonClick,
    isDisabled
  };
}

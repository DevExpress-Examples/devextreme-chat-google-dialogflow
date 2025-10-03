import { type ChatTypes } from 'devextreme-react/chat';
import { DataSource, CustomStore } from 'devextreme-react/common/data';
import { BehaviorSubject, Observable } from 'rxjs';
import { ALERT_TIMEOUT, assistant, sessionId } from './data.ts';

class AppService {
  store: ChatTypes.Message[] = [];

  lastMessageText: string | undefined;

  messages: { role: 'user' | 'assistant' | 'system'; content: string }[] = [];

  alerts: ChatTypes.Alert[] = [];

  customStore?: CustomStore;

  dataSource?: DataSource;

  private readonly typingUsersSubject: BehaviorSubject<ChatTypes.User[]> = new BehaviorSubject<ChatTypes.User[]>([]);

  private readonly alertsSubject: BehaviorSubject<ChatTypes.Alert[]> = new BehaviorSubject<ChatTypes.Alert[]>([]);

  constructor() {
    this.initDataSource();
    this.typingUsersSubject.next([]);
    this.alertsSubject.next([]);
  }

  get typingUsers$(): Observable<ChatTypes.User[]> {
    return this.typingUsersSubject.asObservable();
  }

  get alerts$(): Observable<ChatTypes.Alert[]> {
    return this.alertsSubject.asObservable();
  }

  getDictionary(): object {
    return {
      en: {
        'dxChat-emptyListMessage': 'Chat is Empty',
        'dxChat-emptyListPrompt': 'AI Assistant is ready to answer your questions.',
        'dxChat-textareaPlaceholder': 'Ask AI Assistant...',
      },
    };
  }

  initDataSource(): void {
    this.customStore = new CustomStore({
      key: 'id',
      load: () => new Promise((resolve): void => {
        setTimeout(() => {
          resolve([...this.store]);
        }, 0);
      }),
      insert: (message: ChatTypes.Message) => new Promise((resolve): void => {
        setTimeout(() => {
          this.store.push(message);
          resolve(message);
        });
      }),
    });

    this.dataSource = new DataSource({
      store: this.customStore,
      paginate: false,
    });
  }

  async getAIResponse(text: string | undefined): Promise<string> {
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
  }

  async processMessageSending(setDisabled: Function, e: ChatTypes.MessageEnteredEvent): Promise<void> {
    let { message } = e;
    setDisabled(true);
    (e.event?.target as HTMLElement).blur();
    this.typingUsersSubject.next([assistant]);

    try {
      const aiResponse = await this.getAIResponse(message.text);
      setTimeout(() => {
        this.typingUsersSubject.next([]);
        this.renderAssistantMessage(aiResponse ?? '');
      }, 200);
    } catch (error) {
      (e.event?.target as HTMLElement).focus();
      this.typingUsersSubject.next([]);
      this.alertLimitReached(error);
    } finally {
      (e.event?.target as HTMLElement).focus();
      setDisabled(false);
    }
  }

  updateLastMessage(text?: string | null | undefined): void {
    const items = this.dataSource?.items();
    const lastMessage = items?.at(-1);
    const data = {
      text: text ?? 'Regeneration...',
    };
    this.lastMessageText = text ? '' : lastMessage.text;

    this.dataSource?.store().push([{ type: 'remove', key: lastMessage.id }]);
    this.dataSource?.store().push([
      {
        type: 'insert',
        data: { ...lastMessage, ...data },
      },
    ]);
  }

  renderAssistantMessage(text: string | null): void {
    const message = {
      id: Date.now(),
      timestamp: new Date(),
      author: assistant,
      text,
    };

    this.dataSource?.store().push([{ type: 'insert', data: message }]);
  }

  alertLimitReached(error: any): void {
    this.setAlerts([
      {
        message: error.message,
      },
    ]);

    setTimeout((): void => {
      this.setAlerts([]);
    }, ALERT_TIMEOUT);
  }

  setAlerts(alerts: ChatTypes.Alert[]): void {
    this.alerts = alerts;
    this.alertsSubject.next(alerts);
  }

  async regenerate(): Promise<void> {
    try {
      const aiResponse = await this.getAIResponse(this.lastMessageText);
      this.updateLastMessage(aiResponse);
      const lastMsg = this.messages.at(-1);
      if (lastMsg) {
        lastMsg.content = aiResponse ?? '';
        this.messages = [...this.messages];
      }
    } catch (error) {
      const lastMsg = this.messages.at(-1);
      if (lastMsg) {
        this.updateLastMessage(lastMsg.content);
      }
      this.alertLimitReached(error);
    }
  }

  async onMessageEntered(event: ChatTypes.MessageEnteredEvent, setDisabled: Function): void {
    let { message } = event;
    this.dataSource
      ?.store()
      .push([{ type: 'insert', data: { id: Date.now(), ...message } }]);

    this.messages.push({ role: 'user', content: message?.text ?? '' });
    await this.processMessageSending(setDisabled, event);
  }
}

export const appService = new AppService();

import { Injectable } from "@angular/core";
import { Observable, BehaviorSubject } from "rxjs";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import rehypeStringify from "rehype-stringify";
import { type DxChatTypes } from 'devextreme-angular/ui/chat';
import { DataSource } from 'devextreme-angular/common/data';
import { CustomStore } from 'devextreme-angular/common/data';

@Injectable({
  providedIn: "root",
})
export class AppService {

  REGENERATION_TEXT = "Regeneration...";
  sessionId: string;

  user: DxChatTypes.User = {
    id: "user",
  };

  assistant: DxChatTypes.User = {
    id: "assistant",
    name: "Virtual Assistant",
  };

  store: Array<{ id: number; timestamp: Date; author: DxChatTypes.User; text: string }> = [];

  messages: any = [];

  alerts: DxChatTypes.Alert[] = [];

  customStore: CustomStore | undefined;

  dataSource: DataSource | undefined;

  lastMessageText: string | undefined;

  typingUsersSubject: BehaviorSubject<DxChatTypes.User[]> = new BehaviorSubject<DxChatTypes.User[]>([]);

  alertsSubject: BehaviorSubject<DxChatTypes.Alert[]> = new BehaviorSubject<DxChatTypes.Alert[]>([]);

  constructor() {
    this.initDataSource();
    this.typingUsersSubject.next([]);
    this.alertsSubject.next([]);
    this.sessionId = Math.random().toString(36).substring(7);
  }

  get typingUsers$(): Observable<DxChatTypes.User[]> {
    return this.typingUsersSubject.asObservable();
  }

  get alerts$(): Observable<DxChatTypes.Alert[]> {
    return this.alertsSubject.asObservable();
  }

  getDictionary() {
    return {
      en: {
        "dxChat-emptyListMessage": "Chat is Empty",
        "dxChat-emptyListPrompt":
          "AI Assistant is ready to answer your questions.",
        "dxChat-textareaPlaceholder": "Ask AI Assistant...",
      },
    };
  }
  toggleDisabledState(disabled: boolean, event?: { target?: EventTarget } | undefined) {
    const element = event?.target as HTMLElement;

    if (element) {
      disabled ? element.blur() : element.focus();
    }
  }
  initDataSource() {
    this.customStore = new CustomStore({
      key: "id",
      load: () => {
        return new Promise((resolve) => {
          setTimeout(() => {
            resolve([...this.store]);
          }, 0);
        });
      },
      insert: (message) => {
        return new Promise((resolve) => {
          setTimeout(() => {
            this.store.push(message);
            resolve(message);
          });
        });
      },
    });

    this.dataSource = new DataSource({
      store: this.customStore,
      paginate: false,
    });
  }

  async getAIResponse(text: string | undefined) {
    let id = this.sessionId;

    const response = await fetch('http://localhost:3000/webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message: text, sessionId: id }),
    });

    const data = await response.json();

    return data.response;
  }

  async processMessageSending(e: DxChatTypes.MessageEnteredEvent) {
    let { message } = e;
    this.toggleDisabledState(true, e.event);

    this.typingUsersSubject.next([this.assistant]);
    try {
      const aiResponse = await this.getAIResponse(message.text);

      setTimeout(() => {
        this.typingUsersSubject.next([]);
        this.renderAssistantMessage(aiResponse ?? "");
      }, 200);
    } catch (error) {
      this.typingUsersSubject.next([]);
      this.alertLimitReached(error);
    } finally {
      this.toggleDisabledState(false, e.event);
    }
  }

  updateLastMessage(text?: string | null | undefined) {
    const items = this.dataSource?.items();
    const lastMessage = items?.at(-1);

    this.lastMessageText = text ? '' : lastMessage.text;

    const data = {
      text: text ?? this.REGENERATION_TEXT,
    }
    this.dataSource?.store().push([
      {
        type: "update",
        key: lastMessage.id,
        data: data,
      },
    ]);
  }

  renderAssistantMessage(text: string | null) {
    const message = {
      id: Date.now(),
      timestamp: new Date(),
      author: this.assistant,
      text,
    };

    this.dataSource?.store().push([{ type: "insert", data: message }]);
  }

  alertLimitReached(error: any) {
    this.setAlerts([
      {
        message: error.message,
      },
    ]);

    setTimeout(() => {
      this.setAlerts([]);
    }, 10000);
  }

  setAlerts(alerts: DxChatTypes.Alert[]) {
    this.alerts = alerts;
    this.alertsSubject.next(alerts);
  }

  async regenerate() {
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

  convertToHtml(value: string) {
    const result = unified()
      .use(remarkParse)
      .use(remarkRehype)
      .use(rehypeStringify)
      .processSync(value)
      .toString();

    return result;
  }

  async onMessageEntered(event: DxChatTypes.MessageEnteredEvent) {
    let { message } = event;
    this.dataSource
      ?.store()
      .push([{ type: "insert", data: { id: Date.now(), ...message } }]);

    this.messages.push({ role: "user", content: message?.text ?? "" });
    await this.processMessageSending(event);
  }
}

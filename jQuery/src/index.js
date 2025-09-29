import {
  REGENERATION_TEXT,
  user,
} from './data.js';
import {
  loadMessages, processMessageSending, updateLastMessage, regenerate, convertToHtml,
} from './helpers.js';

$(() => {
  const store = [];

  loadMessages();
  const customStore = new DevExpress.data.CustomStore({
    key: 'id',
    load: () => {
      const d = $.Deferred();

      setTimeout(() => {
        d.resolve([...store]);
      });

      return d.promise();
    },
    insert: (message) => {
      const d = $.Deferred();

      setTimeout(() => {
        store.push(message);
        d.resolve();
      });

      return d.promise();
    },
  });

  const instance = $('#dx-ai-chat').dxChat({
    dataSource: customStore,
    reloadOnChange: false,
    showAvatar: false,
    showDayHeaders: false,
    user,
    height: 710,
    onMessageEntered: (e) => {
      const { message } = e;

      customStore.push([{ type: 'insert', data: { id: Date.now(), ...message } }]);

      processMessageSending(message.text, instance, customStore);
    },
    messageTemplate: (data, element) => {
      const { message } = data;

      if (message.text === REGENERATION_TEXT) {
        element.text(REGENERATION_TEXT);
        return;
      }

      const $textElement = $('<div>')
        .addClass('dx-chat-messagebubble-text')
        .html(convertToHtml(message.text))
        .appendTo(element);

      const $buttonContainer = $('<div>')
        .addClass('dx-bubble-button-container');

      $('<div>')
        .dxButton({
          icon: 'copy',
          stylingMode: 'text',
          hint: 'Copy',
          onClick: ({ component }) => {
            navigator.clipboard.writeText($textElement.text());
            component.option({ icon: 'check' });
            setTimeout(() => {
              component.option({ icon: 'copy' });
            }, 5000);
          },
        })
        .appendTo($buttonContainer);

      $('<div>')
        .dxButton({
          icon: 'refresh',
          stylingMode: 'text',
          hint: 'Regenerate',
          onClick: () => {
            updateLastMessage('', customStore);
            regenerate(instance);
          },
        })
        .appendTo($buttonContainer);

      $buttonContainer.appendTo(element);
    },
  }).dxChat('instance');
});

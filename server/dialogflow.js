import { SessionsClient } from '@google-cloud/dialogflow';
import path from 'path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);

const __dirname = path.dirname(__filename);

const keyFilePath = path.join(__dirname, 'key.json');

const sessionClient = new SessionsClient({
  keyFilename: keyFilePath,
});

// your project id
const projectId = 'agent-ncfh';

async function detectIntent(message, sessionId) {
  try {
    const sessionPath = sessionClient.projectAgentSessionPath(projectId, sessionId);

    const params = {
      session: sessionPath,
      queryInput: {
        text: {
          text: message,
          languageCode: 'en',
        },
      },
    };

    const responses = await sessionClient.detectIntent(params);
    const result = responses[0]?.queryResult;

    if (!result || !result.fulfillmentText) {
      throw new Error('No response from Dialogflow');
    }

    return result.fulfillmentText;
  } catch (error) {
    throw new Error('Failed to process message in Dialogflow');
  }
}

export default detectIntent;

const { BedrockRuntimeClient, ConverseCommand } = require("@aws-sdk/client-bedrock-runtime");

const AWS_BEDROCK_MODEL_ID = "anthropic.claude-3-sonnet-20240229-v1:0";

/**
 * Simple chatbot session that lets users converse with a specific LLM in Amazon Bedrock.
 * The session keeps track of previous questions and answers, and always includes them
 * with new prompts.
 */
class ChatbotSession {
    static client = new BedrockRuntimeClient();

    constructor() {
        this.messages = [];
    }

    /**
     * Sends a text prompt (together with all previous prompts and answers) to Amazon Bedrock.
     * @param {string} input New prompt.
     * @returns Answer.
     */
    async prompt(input) {
        this.messages.push({ role: "user", content: [{ text: input }] });
        const command = new ConverseCommand({
            modelId: AWS_BEDROCK_MODEL_ID,
            messages: this.messages
        });
        const response = await ChatbotSession.client.send(command);
        this.messages.push(response.output.message);
        return response.output.message.content.map(e => e.text).join("\n");
    }
}

module.exports = {
    ChatbotSession
};
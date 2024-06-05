const { BedrockRuntimeClient, ConverseCommand } = require("@aws-sdk/client-bedrock-runtime");

class ChatbotSession {
    static client = new BedrockRuntimeClient({
        region: "us-west-2",
    });

    constructor() {
        this.messages = [];
    }

    async prompt(input) {
        this.messages.push({ role: "user", content: [{ text: input }] });
        const command = new ConverseCommand({
            modelId: "anthropic.claude-3-sonnet-20240229-v1:0",
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
const { OpenAI } = require("openai");

const OPENAI_MODEL_ID = "gpt-3.5-turbo";

/**
 * Simple chatbot session that lets users converse with OpenAI ChatGPT.
 * The session keeps track of previous questions and answers, and always includes them
 * with new prompts.
 *
 * IMPORTANT: make sure to configure the OpenAI access, for example,
 * by setting the OPENAI_API_KEY environment variable.
 */
class ChatbotSession {
    static client = new OpenAI();

    constructor() {
        this.messages = [];
    }

    /**
     * Sends a text prompt (together with all previous prompts and answers) to ChatGPT.
     * @param {string} input New prompt.
     * @returns Answer.
     */
    async prompt(input) {
        this.messages.push({ role: "user", content: input });
        const completion = await ChatbotSession.client.chat.completions.create({
            messages: this.messages,
            model: OPENAI_MODEL_ID,
        });
        this.messages.push(completion.choices[0].message);
        return completion.choices[0].message.content;
    }
}

module.exports = {
    ChatbotSession
};
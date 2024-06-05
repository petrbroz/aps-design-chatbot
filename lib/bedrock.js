const { BedrockRuntimeClient, InvokeModelCommand } = require("@aws-sdk/client-bedrock-runtime");

async function prompt(question) {
    const client = new BedrockRuntimeClient({ region: "us-west-2" });
    const command = new InvokeModelCommand({
        modelId: "anthropic.claude-3-sonnet-20240229-v1:0",
        accept: "application/json",
        contentType: "application/json",
        body: JSON.stringify({
            anthropic_version: "bedrock-2023-05-31",
            max_tokens: 4096,
            temperature: 1,
            top_p: 0.999,
            top_k: 250,
            messages: [
                {
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: question
                        }
                    ]
                }
            ]
        })
    });
    const response = await client.send(command);
    const json = JSON.parse(new TextDecoder().decode(response.body));
    return json.content.filter(e => e.type === "text").map(e => e.text).join("\n");
}

module.exports = {
    prompt
};
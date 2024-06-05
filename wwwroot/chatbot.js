export function initChatbot(container, urn) {
    container.innerHTML = `
        <div id="chatbot-log" style="position: absolute; width: 100%; top: 0; height: 90%; overflow-y: scroll;"></div>
        <div style="position: absolute; width: 100%; bottom: 0; height: 10%;">
            <textarea id="chatbot-input">What is the average area of all objects?</textarea>
            <button id="chatbot-send">Send</button>
        </div>
    `;
    const input = document.getElementById("chatbot-input");
    const button = document.getElementById("chatbot-send");
    button.addEventListener("click", async function () {
        addLogEntry(`Q: ${input.value}`);
        const resp = await fetch(`/prompt/${urn}`, {
            method: "post",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                question: input.value
            })
        });
        if (resp.ok) {
            const { answer } = await resp.json();
            addLogEntry(`A: ${answer}`);
        } else {
            console.error(await resp.text());
            alert("Unable to process the query. See console for more details.");
        }
    });
}

function addLogEntry(message) {
    const entry = document.createElement("div");
    entry.style.margin = "0.5em";
    entry.style.padding = "0.5em";
    entry.style.borderRadius = "0.5em";
    entry.style.backgroundColor = "#eee";
    entry.innerText = message;
    document.getElementById("chatbot-log").appendChild(entry);
}
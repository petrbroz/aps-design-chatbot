export function initChatbot(container, urn) {
    container.innerHTML = `
        <div id="chatbot-history" style="position: absolute; top: 0; left: 0; right: 0; bottom: 10em; overflow-y: auto; display: flex; flex-flow: column nowrap;">
        </div>
        <div id="chatbot-prompt" style="position: absolute; left: 0; right: 0; bottom: 0; height: 10em; display: flex; flex-flow: column nowrap;">
            <textarea id="chatbot-input" style="margin: 0.5em; margin-bottom: 0; height: 100%;">What is the average area of all objects?</textarea>
            <sl-button id="chatbot-send" variant="primary" style="margin: 0.5em;">Send</sl-button>
        </div>
    `;
    const input = document.getElementById("chatbot-input");
    const button = document.getElementById("chatbot-send");
    button.addEventListener("click", async function () {
        addLogEntry("User", input.value);
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
            addLogEntry("Assistant", answer);
        } else {
            console.error(await resp.text());
            alert("Unable to process the query. See console for more details.");
        }
    });
}

function addLogEntry(title, message) {
    const card = document.createElement("sl-card");
    card.classList.add("card-header");
    card.style.margin = "0.5em";
    message = message.replaceAll(/\[(\d+)(,\s+\d+)*\]/g, function (match) {
        const dbids = JSON.parse(match);
        return `<a href="#" data-dbids="${dbids.join(",")}">${match}</a>`;
    });
    card.innerHTML = `<div slot="header">${title}</div>${message}`;
    document.getElementById("chatbot-history").appendChild(card);
}

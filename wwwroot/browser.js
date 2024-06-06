class DataManagementClient {
    async #token() {
        const resp = await fetch("/auth/token");
        if (!resp.ok) {
            throw new Error(await resp.text());
        }
        const credentials = await resp.json();
        return credentials["access_token"];
    }

    async #get(endpoint) {
        const token = await this.#token();
        const resp = await fetch(`https://developer.api.autodesk.com/${endpoint}`, {
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });
        if (!resp.ok) {
            throw new Error(await resp.text());
        }
        const { data } = await resp.json();
        return data;
    }

    getHubs() {
        return this.#get(`/project/v1/hubs`);
    }

    getProjects(hubId) {
        return this.#get(`/project/v1/hubs/${encodeURIComponent(hubId)}/projects`);
    }

    getContents(hubId, projectId, folderId = null) {
        return this.#get(folderId
            ? `/data/v1/projects/${encodeURIComponent(projectId)}/folders/${encodeURIComponent(folderId)}/contents`
            : `/project/v1/hubs/${encodeURIComponent(hubId)}/projects/${encodeURIComponent(projectId)}/topFolders`);
    }

    getVersions(hubId, projectId, itemId) {
        return this.#get(`/data/v1/projects/${encodeURIComponent(projectId)}/items/${encodeURIComponent(itemId)}/versions`);
    }
}

const dataManagementClient = new DataManagementClient();

export async function initBrowser(tree, onSelectionChanged) {
    const hubs = await dataManagementClient.getHubs();
    for (const hub of hubs) {
        tree.append(createTreeItem(`hub|${hub.id}`, hub.attributes.name, "cloud", true));
    }
    tree.addEventListener("sl-selection-change", function (ev) {
        const selection = ev.detail.selection;
        if (selection.length === 1 && selection[0].id.startsWith("version|")) {
            onSelectionChanged(selection[0].id.substring(8));
        }
    });
}

function createTreeItem(id, text, icon, children = false) {
    const item = document.createElement("sl-tree-item");
    item.id = id;
    item.innerHTML = `<sl-icon name="${icon}"></sl-icon><span style="white-space: nowrap">${text}</span>`;
    if (children) {
        item.lazy = true;
        item.addEventListener("sl-lazy-load", async function (ev) {
            ev.stopPropagation();
            item.lazy = false;
            const tokens = item.id.split("|");
            switch (tokens[0]) {
                case "hub": {
                    for (const project of await dataManagementClient.getProjects(tokens[1])) {
                        item.append(createTreeItem(`project|${tokens[1]}|${project.id}`, project.attributes.name, "building", true));
                    }
                    break;
                }
                case "project": {
                    for (const folder of await dataManagementClient.getContents(tokens[1], tokens[2])) {
                        item.append(createTreeItem(`folder|${tokens[1]}|${tokens[2]}|${folder.id}`, folder.attributes.displayName, "folder", true));
                    }
                    break;
                }
                case "folder": {
                    for (const entry of await dataManagementClient.getContents(tokens[1], tokens[2], tokens[3])) {
                        if (entry.type === "folders") {
                            item.append(createTreeItem(`folder|${tokens[1]}|${tokens[2]}|${entry.id}`, entry.attributes.displayName, "folder", true));
                        } else {
                            item.append(createTreeItem(`item|${tokens[1]}|${tokens[2]}|${entry.id}`, entry.attributes.displayName, "file-earmark-richtext", true));
                        }
                    }
                    break;
                }
                case "item": {
                    for (const version of await dataManagementClient.getVersions(tokens[1], tokens[2], tokens[3])) {
                        item.append(createTreeItem(`version|${version.id}`, version.attributes.createTime, "clock-history"));
                    }
                    break;
                }
            }
        });
    }
    return item;
}

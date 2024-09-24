// Based on https://js.langchain.com/v0.2/docs/tutorials/sql_qa

const { Bedrock } = require("@langchain/community/llms/bedrock");
const { createSqlQueryChain } = require("langchain/chains/sql_db");
const { SqlDatabase } = require("langchain/sql_db");
const { DataSource } = require("typeorm");
const { QuerySqlTool } = require("langchain/tools/sql");
const { StringOutputParser } = require("@langchain/core/output_parsers");
const { RunnablePassthrough, RunnableSequence, RunnableWithMessageHistory } = require("@langchain/core/runnables");
const { InMemoryChatMessageHistory } = require("@langchain/core/chat_history");
const { ChatPromptTemplate } = require("@langchain/core/prompts");

class ChatbotSession {
    /** @private */
    constructor(db, chain, history) {
        this.db = db;
        this.chain = chain;
        this.history = history;
    }

    static async init(sqliteDatabasePath) {
        const db = await SqlDatabase.fromDataSourceParams({
            appDataSource: new DataSource({
                type: "sqlite",
                database: sqliteDatabasePath
            })
        });
        console.log(db.allTables.map(t => t.tableName));
        const llm = new Bedrock({
            model: "mistral.mistral-large-2407-v1:0",
            // model: "meta.llama3-1-405b-instruct-v1:0",
            // model: "amazon.titan-text-express-v1",
            // model: "anthropic.claude-3-sonnet-20240229-v1:0",
            region: process.env.BEDROCK_AWS_REGION,
            credentials: {
                accessKeyId: process.env.BEDROCK_AWS_ACCESS_KEY_ID,
                secretAccessKey: process.env.BEDROCK_AWS_SECRET_ACCESS_KEY,
            },
            temperature: 0,
            maxTokens: 8192,
            maxRetries: 2
        });
        const questionToSqlQuery = await createSqlQueryChain({ llm, db, dialect: "sqlite" });
        const executeQueryTool = new QuerySqlTool(db);
        executeQueryTool.verbose = true;
        const sqlResultToAnswer = ChatPromptTemplate.fromMessages([
            ["placeholder", "{chat_history}"],
            ["human", [
                "Given the following user question, corresponding SQL query, and SQL result, answer the user question.",
                "",
                "Question: {question}",
                "SQL Query: {query}",
                "SQL Result: {result}",
                "Answer: "
            ].join("\n")]
        ]);
        const history = new InMemoryChatMessageHistory();
        const chain = new RunnableWithMessageHistory({
            runnable: RunnableSequence.from([
                RunnablePassthrough
                    .assign({ query: questionToSqlQuery })
                    .assign({ result: i => executeQueryTool.invoke(i.query)}),
                sqlResultToAnswer.pipe(llm).pipe(new StringOutputParser())
            ]),
            getMessageHistory: async () => history,
            inputMessagesKey: "question",
            historyMessagesKey: "chat_history"
        });
        return new ChatbotSession(db, chain, history);
    }

    async prompt(question) {
        return await this.chain.invoke({ question }, { configurable: { sessionId: "default" } });
    }
}

module.exports = {
    ChatbotSession
};

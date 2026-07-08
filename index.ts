import "dotenv/config";
import express from "express";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/prisma/client";

// ロギング関数
const log = (message: string, error?: any) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`);
  if (error) {
    console.error(`[${timestamp}] Error:`, error);
  }
};

// データベース接続の準備
log("Initializing database connection...");
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter, log: ["query", "info", "warn", "error"] });

const app = express();
const PORT = process.env.PORT || 8888;

// EJS を使うための設定じゃ
app.set("view engine", "ejs");
app.set("views", "./views");
// フォームから送られたデータを受け取れるようにする設定じゃ
app.use(express.urlencoded({ extended: true }));

// トップページ：ユーザー一覧を表示する
app.get("/", async (req, res) => {
  try {
    log("GET / - Fetching users from database");
    const users = await prisma.user.findMany();
    log(`GET / - Found ${users.length} users`);
    res.render("index", { users });
  } catch (error: any) {
    const errorMessage = error?.message || String(error);
    const errorMeta = error?.meta ? JSON.stringify(error.meta, null, 2) : "No meta info";
    const errorCode = error?.code || "No code";
    const errorStack = error instanceof Error ? error.stack : "";
    log("GET / - Error occurred", error);
    res.status(500).send(`<pre style="color: red; font-size: 12px; overflow-x: auto; white-space: pre-wrap; word-wrap: break-word;">
ERROR MESSAGE:
${errorMessage}

ERROR CODE:
${errorCode}

ERROR META:
${errorMeta}

FULL ERROR:
${String(error)}

STACK:
${errorStack}
    </pre>`);
  }
});

// ユーザー追加：フォームから送られた名前を DB に保存する
app.post("/users", async (req, res) => {
  try {
    const { name, age } = req.body;
    log(`POST /users - Received: name="${name}", age="${age}"`);
    if (name) {
      await prisma.user.create({
        data: {
          name,
          age: age ? parseInt(age) : null
        }
      });
      log(`POST /users - User created successfully`);
    }
    res.redirect("/");
  } catch (error) {
    log("POST /users - Error occurred", error);
    res.status(500).send(`<pre>Error: ${error instanceof Error ? error.message : String(error)}</pre>`);
  }
});

// グローバルエラーハンドラー
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  log("Global error handler triggered", err);
  res.status(500).send(`<pre>Internal Server Error: ${err.message || String(err)}</pre>`);
});

const server = app.listen(PORT, () => {
  log(`Server is running on port ${PORT}`);
  log(`Database URL configured: ${process.env.DATABASE_URL ? "YES (configured)" : "NO (missing)"}`);
  log(`Node environment: ${process.env.NODE_ENV || "development"}`);
});

// グレースフルシャットダウン
process.on("SIGTERM", async () => {
  log("SIGTERM received, gracefully shutting down...");
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
});

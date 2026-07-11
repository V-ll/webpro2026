import "dotenv/config";
import express from "express";
import { PrismaClient } from "../generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter, log: ["query", "info", "warn", "error"] });

const app = express();
const PORT = process.env.PORT || 8888;

// EJS を使うための設定
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "../views"));

// ミドルウェア設定
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "../public")));



// ルート：トップページ（ダッシュボード）
app.get("/", async (req, res) => {
  try {
    log("GET / - Loading dashboard");
    
    // デモ用：最初のワークスペースを取得
    const workspace = await prisma.workspace.findFirst({
      include: {
        members: true,
        lists: {
          include: {
            tasks: {
              where: { deletedAt: null },
              include: {
                milestones: true
              }
            }
          }
        }
      }
    });

    if (!workspace) {
      res.render("index", { workspace: null, lists: [], tasks: [] });
      return;
    }

    res.render("index", { 
      workspace,
      lists: workspace.lists,
      tasks: workspace.lists.flatMap(l => l.tasks)
    });
  } catch (error) {
    log("GET / - Error occurred", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : "";
    res.status(500).send(`<pre style="color: red; font-size: 12px; overflow-x: auto; white-space: pre-wrap; word-wrap: break-word;">
ERROR: ${errorMessage}
STACK: ${errorStack}
    </pre>`);
  }
});

// ルート：API - ワークスペース一覧取得
app.get("/api/workspaces", async (req, res) => {
  try {
    log("GET /api/workspaces");
    const workspaces = await prisma.workspace.findMany({
      include: {
        members: { include: { user: true } },
        lists: true
      }
    });
    res.json(workspaces);
  } catch (error) {
    log("GET /api/workspaces - Error", error);
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

// ルート：API - 初期データ自動生成（ワークスペース・リスト・ユーザーが存在しない場合）
app.post("/api/init", async (req, res) => {
  try {
    log("POST /api/init - Initializing default data");

    // デフォルトユーザーを取得または作成
    let user = await prisma.user.findFirst();
    if (!user) {
      user = await prisma.user.create({
        data: { email: "default@example.com", name: "ユーザー" }
      });
      log(`Created default user: ${user.id}`);
    }

    // デフォルトワークスペースを取得または作成
    let workspace = await prisma.workspace.findFirst();
    if (!workspace) {
      workspace = await prisma.workspace.create({
        data: { name: "マイワークスペース", description: "デフォルトワークスペース" }
      });
      log(`Created default workspace: ${workspace.id}`);

      // メンバーとして追加
      await prisma.workspaceMember.create({
        data: { workspaceId: workspace.id, userId: user.id, role: "owner" }
      });
    }

    // デフォルトリストを取得または作成
    let list = await prisma.taskList.findFirst({ where: { workspaceId: workspace.id } });
    if (!list) {
      list = await prisma.taskList.create({
        data: { workspaceId: workspace.id, name: "タスク", color: "#3b82f6" }
      });
      log(`Created default list: ${list.id}`);
    }

    res.json({ workspace, list, user });
  } catch (error) {
    log("POST /api/init - Error", error);
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

// ルート：API - リスト一覧取得
app.get("/api/workspaces/:workspaceId/lists", async (req, res) => {
  try {
    const { workspaceId } = req.params;
    log(`GET /api/workspaces/${workspaceId}/lists`);
    const lists = await prisma.taskList.findMany({
      where: { workspaceId: parseInt(workspaceId) },
      orderBy: { order: "asc" }
    });
    res.json(lists);
  } catch (error) {
    log("GET /api/lists - Error", error);
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});



// ルート：API - タスク一覧取得
app.get("/api/workspaces/:workspaceId/tasks", async (req, res) => {
  try {
    const { workspaceId } = req.params;
    log(`GET /api/workspaces/${workspaceId}/tasks`);
    
    const tasks = await prisma.task.findMany({
      where: {
        workspaceId: parseInt(workspaceId),
        deletedAt: null
      },
      include: {
        milestones: true,
        createdBy: true
      }
    });
    res.json(tasks);
  } catch (error) {
    log("GET /api/tasks - Error", error);
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

// ルート：API - タスク作成
app.post("/api/workspaces/:workspaceId/tasks", async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const { title, listId, createdById, status, priority, dueDate } = req.body;
    log(`POST /api/workspaces/${workspaceId}/tasks - Creating: ${title}`);

    const task = await prisma.task.create({
      data: {
        workspaceId: parseInt(workspaceId),
        listId: parseInt(listId),
        createdById: parseInt(createdById),
        title,
        status: status || "未着手",
        priority: priority || 0,
        dueDate: dueDate ? new Date(dueDate) : null
      },
      include: { milestones: true }
    });

    res.json(task);
  } catch (error) {
    log("POST /api/tasks - Error", error);
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

// ルート：API - タスク更新
app.put("/api/tasks/:taskId", async (req, res) => {
  try {
    const { taskId } = req.params;
    const { title, status, progress, description, priority, dueDate } = req.body;
    log(`PUT /api/tasks/${taskId} - Updating`);

    const task = await prisma.task.update({
      where: { id: parseInt(taskId) },
      data: {
        ...(title && { title }),
        ...(status && { status }),
        ...(progress !== undefined && { progress: parseInt(progress) }),
        ...(description !== undefined && { description }),
        ...(priority !== undefined && { priority: parseInt(priority) }),
        ...("dueDate" in req.body && { dueDate: dueDate ? new Date(dueDate) : null }),
      },
      include: { milestones: true }
    });

    res.json(task);
  } catch (error) {
    log("PUT /api/tasks - Error", error);
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});


// ルート：API - タスク削除（ソフトデリート）
app.delete("/api/tasks/:taskId", async (req, res) => {
  try {
    const { taskId } = req.params;
    log(`DELETE /api/tasks/${taskId}`);

    const task = await prisma.task.update({
      where: { id: parseInt(taskId) },
      data: { deletedAt: new Date() },
      include: { milestones: true }
    });

    res.json(task);
  } catch (error) {
    log("DELETE /api/tasks - Error", error);
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

// グローバルエラーハンドラー（ルート定義の後に配置する必要がある）
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  log("Global error handler triggered", err);
  res.status(500).send(`<pre>Internal Server Error: ${err.message || String(err)}</pre>`);
});

const server = app.listen(PORT, () => {
  log(`Server is running on port ${PORT}`);
  log(`Database URL configured: ${process.env.DATABASE_URL ? "YES" : "NO"}`);
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

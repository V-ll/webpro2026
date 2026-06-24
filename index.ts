import "dotenv/config";
import express from "express";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/prisma/client";

// データベース接続の準備
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter, log: ["query"] });

const app = express();
const PORT = process.env.PORT || 8888;

// EJS を使うための設定じゃ
app.set("view engine", "ejs");
app.set("views", "./views");
// フォームから送られたデータを受け取れるようにする設定じゃ
app.use(express.urlencoded({ extended: true }));

// トップページ：ユーザー一覧を表示する
app.get("/", async (req, res) => {
  const users = await prisma.user.findMany();
  res.render("index", { users });
});

// ユーザー追加：フォームから送られた名前を DB に保存する
app.post("/users", async (req, res) => {
  const { name, age } = req.body;
  if (name) {
    await prisma.user.create({
      data: {
        name,
        age: age ? parseInt(age) : null
      }
    });
  }
  res.redirect("/");
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

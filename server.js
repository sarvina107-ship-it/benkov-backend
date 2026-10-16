
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const pool = require("./db");

const app = express();

app.use(cors());
app.use(express.json({ limit: "10mb" }));

const PORT = process.env.PORT || 3000;

// Проверка работы сервера
app.get("/", (req, res) => {
  res.json({
    message: "Benkov News API is working",
  });
});

// Вспомогательная функция для обработки данных новости
function prepareNews(body = {}) {
  const title_ru = String(body.title_ru ?? body.title ?? "").trim();
  const title_uz = String(body.title_uz ?? title_ru).trim();
  const title_en = String(body.title_en ?? title_ru).trim();

  const description_ru = String(
    body.description_ru ?? body.description ?? ""
  ).trim();

  const description_uz = String(
    body.description_uz ?? description_ru
  ).trim();

  const description_en = String(
    body.description_en ?? description_ru
  ).trim();

  // Админка отправляет image, а старый API использовал img
  const rawImage = body.image ?? body.img ?? null;

  const img =
    typeof rawImage === "string" && rawImage.trim()
      ? rawImage.trim()
      : null;

  const date = String(body.date ?? "").trim();

  return {
    img,
    title: title_ru,
    description: description_ru,
    date,
    title_ru,
    title_uz,
    title_en,
    description_ru,
    description_uz,
    description_en,
  };
}

// Проверка обязательных данных
function validateNews(news) {
  if (
    !news.title_ru ||
    !news.title_uz ||
    !news.title_en ||
    !news.description_ru ||
    !news.description_uz ||
    !news.description_en ||
    !news.date
  ) {
    return "Заполните заголовки и описания на русском, узбекском и английском языках, а также дату.";
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(news.date)) {
    return "Дата должна быть в формате YYYY-MM-DD.";
  }

  const parsedDate = new Date(`${news.date}T00:00:00Z`);

  if (
    Number.isNaN(parsedDate.getTime()) ||
    parsedDate.toISOString().slice(0, 10) !== news.date
  ) {
    return "Указана некорректная дата.";
  }

  return null;
}

// GET — получить все новости
app.get("/api/news", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT news.*, img AS image
      FROM news
      ORDER BY date DESC, id DESC
    `);

    res.json(result.rows);
  } catch (error) {
    console.error("Ошибка получения новостей:", error);

    res.status(500).json({
      message: "Ошибка при получении новостей",
    });
  }
});

// GET — получить одну новость
app.get("/api/news/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT news.*, img AS image
       FROM news
       WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Новость не найдена",
      });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Ошибка получения новости:", error);

    res.status(500).json({
      message: "Ошибка при получении новости",
    });
  }
});

// POST — добавить новость на трёх языках
app.post("/api/news", async (req, res) => {
  try {
    const news = prepareNews(req.body);
    const validationError = validateNews(news);

    if (validationError) {
      return res.status(400).json({
        message: validationError,
      });
    }

    const result = await pool.query(
      `INSERT INTO news (
        img,
        title,
        description,
        date,
        title_ru,
        title_uz,
        title_en,
        description_ru,
        description_uz,
        description_en
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *, img AS image`,
      [
        news.img,
        news.title,
        news.description,
        news.date,
        news.title_ru,
        news.title_uz,
        news.title_en,
        news.description_ru,
        news.description_uz,
        news.description_en,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Ошибка добавления новости:", error);

    res.status(500).json({
      message: "Ошибка при добавлении новости",
    });
  }
});

// PUT — изменить новость на трёх языках
app.put("/api/news/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const news = prepareNews(req.body);
    const validationError = validateNews(news);

    if (validationError) {
      return res.status(400).json({
        message: validationError,
      });
    }

    const result = await pool.query(
      `UPDATE news
       SET img = $1,
           title = $2,
           description = $3,
           date = $4,
           title_ru = $5,
           title_uz = $6,
           title_en = $7,
           description_ru = $8,
           description_uz = $9,
           description_en = $10
       WHERE id = $11
       RETURNING *, img AS image`,
      [
        news.img,
        news.title,
        news.description,
        news.date,
        news.title_ru,
        news.title_uz,
        news.title_en,
        news.description_ru,
        news.description_uz,
        news.description_en,
        id,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Новость не найдена",
      });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Ошибка изменения новости:", error);

    res.status(500).json({
      message: "Ошибка при изменении новости",
    });
  }
});

// DELETE — удалить новость
app.delete("/api/news/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `DELETE FROM news
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Новость не найдена",
      });
    }

    res.json({
      message: "Новость удалена",
      news: result.rows[0],
    });
  } catch (error) {
    console.error("Ошибка удаления новости:", error);

    res.status(500).json({
      message: "Ошибка при удалении новости",
    });
  }
});

// Запуск сервера
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

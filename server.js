require("dotenv").config();

const express = require("express");
const cors = require("cors");
const pool = require("./db");

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

// Проверка сервера
app.get("/", (req, res) => {
  res.json({
    message: "Benkov News API is working",
  });
});

// GET — получить все новости
app.get("/api/news", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM news ORDER BY date DESC, id DESC"
    );

    res.json(result.rows);
  } catch (error) {
    console.error(error);
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
      "SELECT * FROM news WHERE id = $1",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Новость не найдена",
      });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Ошибка при получении новости",
    });
  }
});

// POST — добавить новость
app.post("/api/news", async (req, res) => {
  try {
    const { img, title, description, date } = req.body;

    if (!title || !description || !date) {
      return res.status(400).json({
        message: "title, description и date обязательны",
      });
    }

    const result = await pool.query(
      `INSERT INTO news (img, title, description, date)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [img || null, title, description, date]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Ошибка при добавлении новости",
    });
  }
});

// PUT — изменить новость
app.put("/api/news/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { img, title, description, date } = req.body;

    if (!title || !description || !date) {
      return res.status(400).json({
        message: "title, description и date обязательны",
      });
    }

    const result = await pool.query(
      `UPDATE news
       SET img = $1,
           title = $2,
           description = $3,
           date = $4
       WHERE id = $5
       RETURNING *`,
      [img || null, title, description, date, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Новость не найдена",
      });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
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
      "DELETE FROM news WHERE id = $1 RETURNING *",
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
    console.error(error);
    res.status(500).json({
      message: "Ошибка при удалении новости",
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
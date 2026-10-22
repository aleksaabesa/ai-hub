require("dotenv").config({ path: require("path").join(__dirname, ".env") });

const express = require("express");
const OpenAI = require("openai");
const path = require("path");

const app = express();
const port = Number(process.env.PORT) || 3000;
const publicFiles = {
  "/": "index.html",
  "/style.css": "style.css",
  "/script.js": "script.js",
  "/download.jpg": "download.jpg"
};

app.use(express.json({ limit: "10kb" }));

app.get(Object.keys(publicFiles), (req, res, next) => {
  res.sendFile(path.join(__dirname, publicFiles[req.path]), (error) => {
    if (error) next(error);
  });
});

app.post("/api/chat", async (req, res) => {
  const message = req.body && req.body.message;

  if (typeof message !== "string" || !message.trim()) {
    return res.status(400).json({ error: "შეიყვანე შეკითხვა." });
  }

  const trimmedMessage = message.trim();
  if (trimmedMessage.length > 2000) {
    return res.status(400).json({ error: "შეკითხვა 2000 სიმბოლოზე გრძელი ვერ იქნება." });
  }

  const apiKey = process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.trim();
  if (!apiKey) {
    return res.status(503).json({
      error: "სერვერზე OPENAI_API_KEY არ არის დაყენებული. დაამატე გასაღები root .env ფაილში."
    });
  }

  const model = process.env.OPENAI_MODEL && process.env.OPENAI_MODEL.trim();
  if (!model) {
    return res.status(503).json({
      error: "OPENAI_MODEL არ არის მითითებული .env ფაილში. მიუთითე შენი API ანგარიშისთვის ხელმისაწვდომი მოდელი."
    });
  }

  try {
    const client = new OpenAI({ apiKey });
    const response = await client.responses.create({
      model,
      instructions: "შენ ხარ AI Hub-ის მეგობრული ასისტენტი. უპასუხე მომხმარებელს მისივე ენაზე.",
      input: trimmedMessage,
      max_output_tokens: 500
    });

    if (!response.output_text) {
      return res.status(502).json({ error: "AI-მ ცარიელი პასუხი დააბრუნა. სცადე ხელახლა." });
    }

    return res.json({ reply: response.output_text });
  } catch (error) {
    const status = error.status;
    const code = error.code;
    console.error("OpenAI request failed:", error.name || "Error", status || "no status", code || "");

    if (status === 401) {
      return res.status(502).json({
        error: "OpenAI API key არასწორია ან გაუქმებულია. გადაამოწმე OPENAI_API_KEY .env ფაილში."
      });
    }

    if (status === 403) {
      return res.status(502).json({
        error: "OpenAI ანგარიშს ამ მოთხოვნაზე ან მოდელზე წვდომა არ აქვს. გადაამოწმე API ანგარიშის უფლებები."
      });
    }

    if (status === 404 || code === "model_not_found" || (status === 400 && error.param === "model")) {
      return res.status(502).json({
        error: `მოდელი "${model}" ამ API ანგარიშისთვის მიუწვდომელია. აირჩიე ანგარიშისთვის ხელმისაწვდომი OPENAI_MODEL.`
      });
    }

    if (status === 429) {
      return res.status(429).json({
        error: "OpenAI მოთხოვნების ლიმიტი ან ბალანსი ამოიწურა. სცადე მოგვიანებით და გადაამოწმე API billing."
      });
    }

    if (error.name === "APIConnectionError" || error.name === "APIConnectionTimeoutError") {
      return res.status(502).json({
        error: "OpenAI სერვისთან კავშირი ვერ მოხერხდა. შეამოწმე ინტერნეტი და სცადე მოგვიანებით."
      });
    }

    if (status >= 500) {
      return res.status(502).json({
        error: "OpenAI სერვისში დროებითი შეცდომაა. სცადე მოგვიანებით."
      });
    }

    return res.status(502).json({
      error: "AI პასუხის მიღება ვერ მოხერხდა. გადაამოწმე სერვერის კონფიგურაცია და სცადე მოგვიანებით."
    });
  }
});

app.use((req, res) => {
  res.status(404).json({ error: "მოთხოვნილი რესურსი ვერ მოიძებნა." });
});

app.use((error, req, res, next) => {
  if (error instanceof SyntaxError && error.status === 400 && "body" in error) {
    return res.status(400).json({ error: "მოთხოვნის JSON ფორმატი არასწორია." });
  }

  console.error("Request handling failed:", error.name || "Error");
  return res.status(500).json({ error: "სერვერის შეცდომა. სცადე მოგვიანებით." });
});

app.listen(port, () => {
  console.log(`AI Hub მუშაობს: http://localhost:${port}`);
});

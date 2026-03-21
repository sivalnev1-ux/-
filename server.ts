import express from "express";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import path from "path";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Increase payload limit for base64 images
  app.use(express.json({ limit: '50mb' }));
  
  // Initialize Gemini API (runs securely on the server)
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    console.error("CRITICAL: Invalid or missing GEMINI_API_KEY environment variable.");
  }
  const ai = new GoogleGenAI({ apiKey: apiKey || 'invalid_key' });

  // API Route: Analyze Image
  app.post("/api/analyze-image", async (req, res) => {
    try {
      const { base64Data, mimeType } = req.body;
      
      if (!base64Data || !mimeType) {
        return res.status(400).json({ error: "Missing image data" });
      }

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [
          { inlineData: { data: base64Data, mimeType } },
          { text: 'Перечисли все съедобные ингредиенты на этом фото через запятую. Только названия продуктов, без лишнего текста. На русском языке.' }
        ]
      });

      res.json({ text: response.text?.trim() || '' });
    } catch (error: any) {
      console.error("Error analyzing image:", error);
      
      if (error.message && error.message.includes('API key not valid')) {
        return res.status(500).json({ 
          error: "Ошибка: Неверный API-ключ Gemini. Пожалуйста, проверьте настройки (Secrets в AI Studio или Environment Variables на Render) и укажите настоящий ключ от Google AI Studio (aistudio.google.com/app/apikey)." 
        });
      }
      
      res.status(500).json({ error: "Failed to analyze image" });
    }
  });

  // API Route: Generate Recipes
  app.post("/api/generate-recipes", async (req, res) => {
    try {
      const { ingredients } = req.body;
      
      if (!ingredients) {
        return res.status(400).json({ error: "Missing ingredients" });
      }

      const prompt = `Ты — Ольга Юриковна, опытная, уверенная в себе, прямолинейная и немного дерзкая, но добрая кухарка. Твой девиз: "Не ссы, Ольга Юриковна разрулит!".
      Пользователь дал тебе список ингредиентов, которые у него есть: ${ingredients}.
      Твоя задача: придумать 1-3 рецепта, используя СТРОГО ТОЛЬКО эти ингредиенты.
      Разрешается дополнительно использовать только: соль, сахар, черный перец, питьевую воду, любое растительное масло.
      Никаких других скрытых ингредиентов (мука, яйца, лук и т.д. нельзя, если их нет в списке!).
      Если из этого вообще ничего нельзя приготовить (например, только сырая картошка и вода), скажи это в своем фирменном стиле, отругай за пустой холодильник и предложи съесть ингредиенты сырыми или просто выпить воды.
      Отвечай в формате Markdown. Начни с фирменного приветствия и пары слов от себя.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.1-pro-preview',
        contents: prompt,
      });

      res.json({ text: response.text || 'Ольга Юриковна ушла на перекур. Попробуй еще раз.' });
    } catch (error: any) {
      console.error("Error generating recipes:", error);
      
      // Provide a clearer error message for API key issues
      if (error.message && error.message.includes('API key not valid')) {
        return res.status(500).json({ 
          error: "Ошибка: Неверный API-ключ Gemini. Пожалуйста, проверьте настройки (Secrets в AI Studio или Environment Variables на Render) и укажите настоящий ключ от Google AI Studio (aistudio.google.com/app/apikey)." 
        });
      }
      
      res.status(500).json({ error: "Failed to generate recipes" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

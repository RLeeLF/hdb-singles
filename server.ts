import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "10mb" }));

// Shared Gemini AI instance
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "",
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// Healthcheck API
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// API Endpoint: AI Housing & Financial Strategy Advisor for Singles Age 35+
app.post("/api/housing-advisor", async (req, res) => {
  try {
    const {
      monthlyBudget,
      cashInjection,
      interestRate,
      baseRent,
      selectedTowns,
      selectedFlatTypes,
      topScenario,
      userQuery
    } = req.body;

    const systemPrompt = `You are an expert Singapore Housing & Financial Wealth Advisor specializing in HDB policies for Singaporean Singles turning Age 35+.
Provide concise, highly actionable, strategic advice grounded in real HDB regulations (e.g., Single Citizens Scheme, Joint Singles Scheme, 2-Room Flexi BTO vs Resale, CPF Housing Grants up to $80k for Singles, Proximity Housing Grant, Prime/Plus/Standard classification, MOP 5 vs 10 years, LTV 75%, BSD stamp duties, CPF OA usage).

Output MUST be valid JSON with this exact schema:
{
  "recommendation": "A 2-3 sentence strategic executive summary.",
  "prosAndCons": {
    "pros": ["Pro 1", "Pro 2", "Pro 3"],
    "cons": ["Con 1", "Con 2", "Con 3"]
  },
  "keyRisks": ["Risk 1", "Risk 2"],
  "actionItems": ["Action item 1", "Action item 2", "Action item 3"]
}`;

    const promptText = `
User Context for Single Age 35 Housing Evaluation:
- Selected Towns: ${selectedTowns ? selectedTowns.join(', ') : 'PUNGGOL'}
- Selected Flat Sizes: ${selectedFlatTypes ? selectedFlatTypes.join(', ') : '4_ROOM'}
- Monthly Housing Budget: $${monthlyBudget}
- Cash/CPF Capital Injection: $${cashInjection}
- Mortgage Interest Rate: ${interestRate}%
- Current Monthly Rent Baseline: $${baseRent}
${topScenario ? `- Best Calculated Scenario: ${topScenario.path} for ${topScenario.town} ${topScenario.flatType} with 5-Year Equity $${topScenario.netWorth} (Monthly: $${topScenario.monthlyCost})` : ''}
${userQuery ? `- Custom User Question: "${userQuery}"` : ''}

Analyze the financial feasibility, net worth wealth trajectory over 5 years, trade-offs between waiting for BTO vs buying Resale immediately, CPF grant optimization, and potential market risks. Return JSON adhering to the specified schema.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: promptText,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        temperature: 0.3
      }
    });

    const jsonText = response.text || "{}";
    const parsedData = JSON.parse(jsonText);
    res.json(parsedData);
  } catch (error: any) {
    console.error("Error generating AI housing advice:", error);
    res.status(500).json({
      error: "Failed to generate AI advice",
      details: error.message || "An unexpected error occurred."
    });
  }
});

// Explicit API 404 handler for any unhandled /api/* routes
app.all("/api/*", (_req, res) => {
  res.status(404).json({ error: "API route not found" });
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);

    // Fallback for SPA routing in dev mode
    app.get("*", async (req, res, next) => {
      try {
        const url = req.originalUrl;
        let template = fs.readFileSync(path.resolve(process.cwd(), "index.html"), "utf-8");
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ "Content-Type": "text/html" }).end(template);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Singapore HDB Housing Calculator Server listening at http://0.0.0.0:${PORT}`);
  });
}

startServer();


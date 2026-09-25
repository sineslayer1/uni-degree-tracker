import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';
import { UnitZodSchema } from './src/types/dashboard.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Initialize Google Gemini AI client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Canvas LMS Calendar Proxy Endpoint (Solves CORS and handles webcal://)
app.post('/api/fetch-calendar', async (req, res) => {
  try {
    const { icsUrl, icsContent } = req.body;

    // If raw ICS content was uploaded or pasted directly
    if (icsContent && typeof icsContent === 'string' && icsContent.includes('BEGIN:VCALENDAR')) {
      return res.json({ success: true, icsContent });
    }

    if (!icsUrl || typeof icsUrl !== 'string' || icsUrl.trim().length === 0) {
      return res.status(400).json({
        error: 'Please provide your Canvas calendar feed URL (.ics).',
      });
    }

    let cleanUrl = icsUrl.trim();
    if (cleanUrl.startsWith('webcal://')) {
      cleanUrl = cleanUrl.replace(/^webcal:\/\//i, 'https://');
    } else if (/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(cleanUrl) && !cleanUrl.includes('://')) {
      cleanUrl = `https://${cleanUrl}`;
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(cleanUrl);
      if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
        return res.status(400).json({
          error: 'Invalid protocol. Only HTTP, HTTPS, and webcal links are supported.',
        });
      }
    } catch {
      return res.status(400).json({
        error: 'Invalid URL format. Please paste your Canvas iCalendar feed link.',
      });
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    const response = await fetch(cleanUrl, {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 (compatible; ApexAcademicDashboard/1.0)',
        Accept: 'text/calendar, text/plain, */*',
      },
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      return res.status(response.status).json({
        error: `Canvas server responded with HTTP ${response.status} (${response.statusText}). Please check that your Canvas feed URL is active and contains the private feed token.`,
      });
    }

    const content = await response.text();

    if (!content.includes('BEGIN:VCALENDAR') && !content.includes('BEGIN:VEVENT')) {
      return res.status(422).json({
        error:
          'The provided URL did not return a valid iCalendar feed. Make sure you copied the "Calendar Feed" link from Canvas (not the browser page URL).',
      });
    }

    return res.json({ success: true, icsContent: content });
  } catch (err: any) {
    if (err.name === 'AbortError') {
      return res.status(504).json({
        error: 'Connection to the Canvas calendar server timed out. You can also export/download the .ics file and upload it directly.',
      });
    }
    console.error('Error in /api/fetch-calendar:', err);
    return res.status(500).json({
      error: `Could not fetch Canvas calendar: ${err?.message || 'Network error'}. You can also upload your .ics file directly.`,
    });
  }
});

// Ephemeral Syllabus Ingestion API Endpoint with Native PDF and High-Spike Resilience
app.post('/api/extract-syllabus', async (req, res) => {
  try {
    const { syllabusText, pdfBase64, fileName } = req.body;

    const hasText = typeof syllabusText === 'string' && syllabusText.trim().length > 0;
    const hasPdf = typeof pdfBase64 === 'string' && pdfBase64.length > 50;

    if (!hasText && !hasPdf) {
      return res.status(400).json({
        error: 'No syllabus content provided. Please upload a PDF or paste outline text.',
      });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(503).json({
        error: 'AI service unavailable: GEMINI_API_KEY is not configured on the server.',
      });
    }

    const promptText = `You are an expert university curriculum parser analyzing the official unit outline / syllabus "${fileName || 'course_outline'}".
Extract the complete unit metadata, grading structure, and assessment schedule with extreme accuracy.

CRITICAL EXTRACTION REQUIREMENTS:
1. Unit Code: Must be 4 uppercase letters followed by 4 digits (e.g. INFO1110, ELEC1601, AMME3500, MATH1002, ENGG1802).
2. Unit Name: Exact official title (e.g. "Introduction to Programming", "System Dynamics and Control").
3. Credit Points: Extract credit points (usually 6 for standard university engineering/science units).
4. Semester: e.g. "Semester 1, 2026" or "Semester 2, 2026".
5. Grading Scheme:
   - "foundation_plus_advanced": If this unit has a foundation requirement unlocking a 50 Pass baseline (e.g. INFO1110 Foundation Test/Assignment) with advanced extensions adding marks up to 100.
   - "standard": For standard weighted units where assessment weights sum to 100%.
6. Assessments:
   - Extract EVERY individual assessment task listed in the syllabus table or schedule.
   - title: Specific, descriptive assessment title.
   - weight: Percentage weighting (0 to 100).
   - kind:
     * "foundation_requirement" for foundation tasks that unlock the 50 P baseline.
     * "competency_hurdle" for mandatory unweighted pass/fail tasks (weight 0).
     * "advanced_extension" for advanced bonus sections adding to the 50 P baseline.
     * "standard" for regular percentage weighted items.
   - isHurdle: true if this assessment is a mandatory pass requirement (e.g. "must achieve 45% or 50% in final exam to pass", "must pass lab competency", or unweighted hurdle).
   - hurdleMinMark: The minimum mark required to pass (e.g. 45 for double-pass exam hurdle, 50 for 50% hurdle, or 100 for pass/fail competency).
   - hurdleDescription: Full explanation of the hurdle constraint from the syllabus.
   - dueDate: Due week or date (e.g. "Week 5", "Week 11", "Exam Period", "18 May 2026").
7. aiSummary: 2-3 concise sentences summarizing the course structure, weight distribution, and any detected hurdles.`;

    let contentsPayload: any[];

    if (hasPdf) {
      // Native PDF understanding via Gemini inlineData
      contentsPayload = [
        {
          inlineData: {
            mimeType: 'application/pdf',
            data: pdfBase64,
          },
        },
        {
          text: promptText,
        },
      ];
    } else {
      // Text understanding
      contentsPayload = [
        {
          text: `${promptText}\n\n=== SYLLABUS CONTENT ===\n${syllabusText.slice(0, 30000)}`,
        },
      ];
    }

    // High availability model fallback chain:
    // gemini-3.1-flash-lite and gemini-flash-lite-latest avoid 503 spike errors under load.
    const modelsToTry = [
      'gemini-3.1-flash-lite',
      'gemini-flash-lite-latest',
      'gemini-flash-latest',
      'gemini-3.7-flash',
    ];

    let lastError: any = null;

    for (const model of modelsToTry) {
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const response = await ai.models.generateContent({
            model,
            contents: contentsPayload,
            config: {
              responseMimeType: 'application/json',
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  code: { type: Type.STRING, description: 'Unit code (e.g. AMME3500)' },
                  name: { type: Type.STRING, description: 'Official unit title' },
                  creditPoints: { type: Type.NUMBER, description: 'Credit points, usually 6' },
                  semester: { type: Type.STRING, description: 'e.g. Semester 1, 2026' },
                  gradingScheme: { type: Type.STRING, description: 'standard or foundation_plus_advanced' },
                  aiSummary: { type: Type.STRING, description: 'Summary of detected structure and hurdles' },
                  assessments: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        title: { type: Type.STRING, description: 'Name of assessment' },
                        weight: { type: Type.NUMBER, description: 'Percentage weighting' },
                        kind: {
                          type: Type.STRING,
                          description: 'standard, competency_hurdle, foundation_requirement, or advanced_extension',
                        },
                        isHurdle: { type: Type.BOOLEAN, description: 'True if hurdle or competency' },
                        hurdleMinMark: { type: Type.NUMBER, description: 'Minimum mark required to pass' },
                        hurdleDescription: { type: Type.STRING, description: 'Explanation of hurdle constraint' },
                        dueDate: { type: Type.STRING, description: 'Due week or date' },
                      },
                      required: ['title', 'weight', 'isHurdle'],
                    },
                  },
                },
                required: ['code', 'name', 'creditPoints', 'assessments', 'aiSummary'],
              },
            },
          });

          const rawText = response.text || '{}';
          const cleaned = rawText.replace(/```json\s*|\s*```/g, '').trim();
          const parsedJson = JSON.parse(cleaned);

          // Post-processing sanitization for highest accuracy
          if (parsedJson.code) {
            parsedJson.code = parsedJson.code.toUpperCase().replace(/\s+/g, '');
          }
          if (!parsedJson.creditPoints || parsedJson.creditPoints < 1) {
            parsedJson.creditPoints = 6;
          }

          return res.json(parsedJson);
        } catch (err: any) {
          lastError = err;
          const status = err?.status || err?.code;
          const msg = err?.message || String(err);
          const isSpikeOrRateLimit = status === 503 || status === 429 || msg.includes('Spikes') || msg.includes('high demand');

          if (isSpikeOrRateLimit && attempt === 0) {
            // Short backoff before retry
            await new Promise((r) => setTimeout(r, 1000));
            continue;
          }
          // Move to next model
          break;
        }
      }
    }

    throw lastError || new Error('All AI models failed to process outline');
  } catch (error: any) {
    console.error('Error in /api/extract-syllabus:', error);
    return res.status(500).json({
      error:
        error?.message ||
        'Failed to parse syllabus with AI. Please check the outline format and try again.',
    });
  }
});

// Ephemeral Degree Plan Photo / PDF Ingestion API
app.post('/api/extract-degree-plan', async (req, res) => {
  try {
    const { imageBase64, mimeType = 'image/png', planText } = req.body;

    const hasMedia = typeof imageBase64 === 'string' && imageBase64.length > 50;
    const hasText = typeof planText === 'string' && planText.trim().length > 0;

    if (!hasMedia && !hasText) {
      return res.status(400).json({
        error: 'Please upload a photo/PDF of your degree progression map or paste your plan details.',
      });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(503).json({
        error: 'AI service unavailable: GEMINI_API_KEY is not configured on the server.',
      });
    }

    const degreePlanResponseSchema = {
      type: Type.OBJECT,
      properties: {
        degreeName: { type: Type.STRING },
        totalCreditPoints: { type: Type.NUMBER },
        recommendedUnits: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              code: { type: Type.STRING },
              name: { type: Type.STRING },
              creditPoints: { type: Type.NUMBER },
              year: { type: Type.NUMBER },
              semester: { type: Type.STRING },
              prerequisites: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              isCore: { type: Type.BOOLEAN },
            },
            required: ['code', 'name', 'creditPoints', 'year', 'semester'],
          },
        },
      },
      required: ['recommendedUnits'],
    };

    const promptText = `You are an expert university academic advisor analyzing an official engineering degree plan, CUSP progression map, or course pathway diagram.
Carefully inspect the image or text and extract the complete degree curriculum:
1. Degree Name: e.g. "Bachelor of Engineering Honours (Mechatronic Engineering)" or "Bachelor of Advanced Computing".
2. Total Credit Points: Standard 4-year Australian engineering degree is 192 CP. 3-year bachelor is 144 CP.
3. List of ALL recommended/planned units across all study years and semesters:
   - code: Standard 4-letter prefix + 4-digit code (e.g. MATH1002, INFO1110, ELEC1601, AMME2500, MECH3400, COMP2017).
   - name: Descriptive unit title (e.g. "Linear Algebra", "Introduction to Programming", "Foundations of Computer Systems").
   - creditPoints: Credit points (usually 6 for USYD units, sometimes 3 or 12).
   - year: Academic year of the program (1, 2, 3, or 4).
   - semester: Study period (e.g. "Semester 1", "Semester 2").
   - isCore: true if marked as Core / Mandatory, false if Elective.
   - prerequisites: Any prerequisite unit codes mentioned.

Ensure accuracy and clean unit code formatting.`;

    const contentsPayload: any[] = [];
    if (hasMedia) {
      const cleanBase64 = imageBase64.replace(/^data:[^;]+;base64,/, '');
      contentsPayload.push({
        inlineData: {
          mimeType,
          data: cleanBase64,
        },
      });
    }
    contentsPayload.push({
      text: `${promptText}${hasText ? `\n\n=== DEGREE PLAN TEXT / NOTES ===\n${planText}` : ''}`,
    });

    const modelsToTry = [
      'gemini-3.1-flash-lite',
      'gemini-flash-lite-latest',
      'gemini-flash-latest',
      'gemini-3.5-flash',
    ];
    let planData: any = null;
    let lastError: any = null;

    for (const modelName of modelsToTry) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: contentsPayload,
          config: {
            responseMimeType: 'application/json',
            responseSchema: degreePlanResponseSchema,
            temperature: 0.2,
          },
        });

        if (response.text) {
          const rawText = response.text || '{}';
          const cleaned = rawText.replace(/```json\s*|\s*```/g, '').trim();
          planData = JSON.parse(cleaned);
          if (planData && Array.isArray(planData.recommendedUnits) && planData.recommendedUnits.length > 0) {
            break;
          }
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`Degree plan extraction failed with ${modelName}:`, err?.message || err);
      }
    }

    if (!planData || !Array.isArray(planData.recommendedUnits) || planData.recommendedUnits.length === 0) {
      throw lastError || new Error('Could not identify units from the degree plan image. Please ensure the course codes are legible.');
    }

    return res.json({
      success: true,
      degreePlan: planData,
    });
  } catch (error: any) {
    console.error('Error in /api/extract-degree-plan:', error);
    return res.status(500).json({
      error: error?.message || 'Failed to analyze degree plan image. Please try again or enter units manually.',
    });
  }
});

// Server-Side Unit Validation Endpoint
app.post('/api/validate-unit', (req, res) => {
  const result = UnitZodSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({
      valid: false,
      errors: result.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`),
    });
  }
  return res.json({ valid: true, unit: result.data });
});

// Multi-Turn Academic Advisor Chat Endpoint with Gemini
app.post('/api/chat', async (req, res) => {
  try {
    const { message, history = [], studentContext = '', modelPreference = 'gemini-3.5-flash' } = req.body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ error: 'Message cannot be empty.' });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(503).json({
        error: 'Gemini AI service unavailable: GEMINI_API_KEY is not configured on the server.',
      });
    }

    // Role-specific system instructions
    const systemInstruction = `You are the Apex Academic Advisor & Study Strategist, an expert AI mentor specializing in University of Sydney (USYD) engineering, computing, and STEM curriculum.
Your role:
1. Advise students on their Weighted Average Mark (WAM) and Semester Average Mark (SAM). Remind them that WAM at USYD is calculated purely as Σ(CP × Mark) / Σ(CP) weighted by credit points.
2. Clearly explain double-pass exam hurdle policies: failing an exam hurdle drops their final grade to an automatic UF / 45 FA regardless of coursework marks.
3. Guide students through Foundation + Advanced units (e.g. INFO1110) where meeting foundation requirements unlocks the 50 P baseline, and advanced extensions add marks above 50.
4. Provide structured, actionable study schedules, revision tips, lab prep checklists, and What-If scenario simulations.
5. Tone: Concise, encouraging, mathematically precise, formatted with clean bullet points and bold highlights.

${studentContext ? `--- CURRENT STUDENT ACADEMIC PROFILE ---\n${studentContext}\n--------------------------------------` : ''}`;

    // Format conversation history for Gemini SDK
    const formattedContents = [
      ...history
        .filter((h: any) => h && h.text && (h.role === 'user' || h.role === 'model' || h.role === 'assistant'))
        .map((h: any) => ({
          role: h.role === 'assistant' || h.role === 'model' ? 'model' : 'user',
          parts: [{ text: String(h.text) }],
        })),
      {
        role: 'user',
        parts: [{ text: message.trim() }],
      },
    ];

    // Priority model chain based on user preference with fallback
    const candidateModels = [
      modelPreference || 'gemini-3.5-flash',
      'gemini-3.5-flash',
      'gemini-3.1-flash-lite',
      'gemini-flash-latest',
    ];

    // Deduplicate candidate models
    const uniqueModels = Array.from(new Set(candidateModels));

    let reply = '';
    let lastError: any = null;

    for (const modelName of uniqueModels) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: formattedContents,
          config: {
            systemInstruction,
            temperature: 0.7,
            topP: 0.95,
          },
        });

        if (response.text) {
          reply = response.text;
          break;
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`Chat model ${modelName} failed, trying next candidate:`, err.message || err);
      }
    }

    if (!reply) {
      throw lastError || new Error('No response generated by Gemini chat models');
    }

    return res.json({ reply });
  } catch (error: any) {
    console.error('Error in /api/chat:', error);
    return res.status(500).json({
      error: error?.message || 'Failed to process message with AI Academic Advisor.',
    });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'apex-engineering-dashboard' });
});

async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  } else {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, () => {
    console.log(`Apex Engineering Server running on port ${PORT}`);
  });
}

startServer();

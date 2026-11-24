import { z } from "zod";
import { deterministicAnalysis } from "../shared/support/support-analysis-engine";

const inputSchema = z.object({
  ticket: z.object({
    id: z.string(),
    description: z.string().min(3),
    category: z.string(),
    priority: z.string(),
    client: z.string().optional(),
  }),
  context: z.record(z.string(), z.string()),
  completedChecks: z.array(z.string()),
  evidence: z.record(z.string(), z.string()),
  resolution: z.string().optional(),
});

const enhancementSchema = z.object({
  extracted: z.record(z.string(), z.string()).optional(),
  additionalGaps: z
    .array(
      z.object({
        field: z.string(),
        reason: z.string(),
        severity: z.enum(["required", "recommended"]),
      }),
    )
    .optional(),
  improvedPacket: z.string().min(20).optional(),
  improvedClientUpdate: z.string().min(20).optional(),
});

const enhancementJsonSchema = {
  type: "object",
  properties: {
    extracted: {
      type: "object",
      properties: {
        category: { type: "string" },
        symptom: { type: "string" },
        affectedEntity: { type: "string" },
        impact: { type: "string" },
        occurrenceTime: { type: "string" },
        reproducibility: { type: "string" },
      },
      required: [
        "category",
        "symptom",
        "affectedEntity",
        "impact",
        "occurrenceTime",
        "reproducibility",
      ],
    },
    additionalGaps: {
      type: "array",
      items: {
        type: "object",
        properties: {
          field: { type: "string" },
          reason: { type: "string" },
          severity: { type: "string", enum: ["required", "recommended"] },
        },
        required: ["field", "reason", "severity"],
      },
    },
    improvedPacket: { type: "string" },
    improvedClientUpdate: { type: "string" },
  },
  required: [
    "extracted",
    "additionalGaps",
    "improvedPacket",
    "improvedClientUpdate",
  ],
} as const;

function outputText(payload: unknown) {
  const data = payload as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  return (
    data.candidates?.[0]?.content?.parts
      ?.map((part) => part.text ?? "")
      .join("")
      .trim() ?? ""
  );
}

async function handleCopilot(request: Request) {
  if (request.method !== "POST")
    return Response.json({ error: "Method not allowed" }, { status: 405 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = inputSchema.safeParse(body);
  if (!parsed.success)
    return Response.json(
      {
        error: "Invalid copilot request",
        detail: parsed.error.flatten(),
      },
      { status: 400 },
    );
  const fallback = deterministicAnalysis(parsed.data);
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey)
    return Response.json({
      ...fallback,
      providerStatus:
        "Model credential not configured; deterministic evidence engine used.",
    });
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60000);
  try {
    const model = process.env.GEMINI_MODEL || "gemini-3-flash-preview";
    const prompt = [
      "You are RideOps Support Copilot.",
      "Use only the supplied ticket, evidence, deterministic findings and similar cases.",
      "Never invent IDs, actions, root causes, ETAs or Engineering progress.",
      "Return JSON only with keys extracted, additionalGaps, improvedPacket, improvedClientUpdate.",
      "Keep routing human-approved. Do not contradict deterministic safety checks.",
      JSON.stringify({ request: parsed.data, deterministicFindings: fallback }),
    ].join("\n\n");
    const requestBody = JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseJsonSchema: enhancementJsonSchema,
        temperature: 0.15,
        maxOutputTokens: 4096,
        thinkingConfig: { thinkingLevel: "MINIMAL" },
      },
    });
    let response: globalThis.Response | undefined;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
        {
          method: "POST",
          signal: controller.signal,
          headers: {
            "x-goog-api-key": apiKey,
            "Content-Type": "application/json",
          },
          body: requestBody,
        },
      );
      if (response.ok) break;
      if (![429, 500, 502, 503, 504].includes(response.status) || attempt === 1)
        throw new Error(`Gemini request failed: ${response.status}`);
      await new Promise((resolve) => setTimeout(resolve, 900));
    }
    if (!response?.ok)
      throw new Error("Gemini request failed without a response");
    const text = outputText(await response.json());
    if (!text) throw new Error("Gemini returned no usable text");
    const modelResult = enhancementSchema.parse(JSON.parse(text));
    const extraGaps = (modelResult.additionalGaps ?? []).filter(
      (g) =>
        !fallback.missingEvidence.some(
          (existing) => existing.field.toLowerCase() === g.field.toLowerCase(),
        ),
    );
    return Response.json({
      ...fallback,
      mode: "gemini",
      extracted: { ...fallback.extracted, ...(modelResult.extracted ?? {}) },
      missingEvidence: [...fallback.missingEvidence, ...extraGaps],
      escalationPacket: modelResult.improvedPacket || fallback.escalationPacket,
      clientUpdate: modelResult.improvedClientUpdate || fallback.clientUpdate,
      providerStatus: `Enhanced by ${model}; deterministic guardrails retained.`,
    });
  } catch (error) {
    return Response.json({
      ...fallback,
      providerStatus: `Model enhancement unavailable; deterministic engine used safely. ${error instanceof Error ? error.message : "Unknown error"}`,
    });
  } finally {
    clearTimeout(timeout);
  }
}

export default { fetch: handleCopilot };

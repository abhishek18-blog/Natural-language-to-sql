import { NextResponse } from "next/server";

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

export async function GET() {
  try {
    const response = await fetch("http://localhost:11434/api/tags", {
      method: "GET",
      // Set a short timeout if possible, but fetch doesn't support timeout directly,
      // so we use AbortController
      signal: AbortSignal.timeout(2000), 
    });

    if (!response.ok) {
      throw new Error(`Ollama API responded with status: ${response.status}`);
    }

    const data = await response.json();
    
    // Check if llama3.2:latest is in the models
    const hasModel = data.models?.some((model: any) => model.name === "llama3.2:latest");

    if (hasModel) {
      return NextResponse.json({ success: true, message: "Local AI connected and model found." }, {
        headers: {
          "Access-Control-Allow-Origin": "*",
        }
      });
    } else {
      return NextResponse.json({ success: false, message: "Local AI connected but llama3.2:latest not found." }, {
        headers: {
          "Access-Control-Allow-Origin": "*",
        }
      });
    }
  } catch (error: any) {
    return NextResponse.json({ success: false, message: "Local AI connection failed or could not exist." }, {
      headers: {
        "Access-Control-Allow-Origin": "*",
      }
    });
  }
}

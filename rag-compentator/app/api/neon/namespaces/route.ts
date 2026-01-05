/**
 * API Route: GET /api/neon/namespaces
 *
 * Fast namespace listing from NeonDB (bypasses FastAPI).
 */

import { NextResponse } from "next/server";
import { getNamespaces } from "@/lib/neon-db";

export async function GET() {
  try {
    // Query NeonDB directly
    const namespaces = await getNamespaces();

    // Transform to match frontend Namespace type
    const transformedNamespaces = namespaces.map((ns) => ({
      id: ns.id,
      name: ns.name,
      documentCount: ns.document_count,
      createdAt: ns.created_at.toISOString(),
    }));

    return NextResponse.json(transformedNamespaces);
  } catch (error) {
    console.error("Error fetching namespaces from NeonDB:", error);

    return NextResponse.json(
      {
        error: "Failed to fetch namespaces",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

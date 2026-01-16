import { ImageResponse } from "next/og";

// Route segment config
export const runtime = "edge";

// Image metadata
export const alt = "TheMindSurf - AI-Powered Document Chat & Analysis Platform";
export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

// Image generation
export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#FFFEF0",
          padding: "80px",
          position: "relative",
        }}
      >
        {/* Neo-brutalist border */}
        <div
          style={{
            position: "absolute",
            inset: "40px",
            border: "8px solid black",
            boxShadow: "16px 16px 0px #000",
          }}
        />

        {/* Content */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "40px",
            zIndex: "10",
          }}
        >
          {/* Logo/Icon */}
          <div
            style={{
              width: "160px",
              height: "160px",
              backgroundColor: "#FF006E",
              border: "8px solid black",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "80px",
              boxShadow: "12px 12px 0px #000",
            }}
          >
            💬
          </div>

          {/* Headline */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "16px",
            }}
          >
            <h1
              style={{
                fontSize: "80px",
                fontWeight: 900,
                color: "black",
                margin: 0,
                textTransform: "uppercase",
                letterSpacing: "-3px",
                textAlign: "center",
              }}
            >
              CHAT WITH ANY DOCUMENT
            </h1>
            <div
              style={{
                display: "flex",
                backgroundColor: "#FFFF00",
                border: "6px solid black",
                padding: "16px 32px",
                boxShadow: "8px 8px 0px #000",
              }}
            >
              <p
                style={{
                  fontSize: "32px",
                  fontWeight: 700,
                  color: "black",
                  margin: 0,
                  textTransform: "uppercase",
                  textAlign: "center",
                }}
              >
                Get AI-Powered Answers Instantly
              </p>
            </div>
            <p
              style={{
                fontSize: "24px",
                fontWeight: 600,
                color: "#666",
                margin: 0,
                textAlign: "center",
              }}
            >
              TheMindSurf • Advanced RAG Technology
            </p>
          </div>

          {/* Feature badges */}
          <div
            style={{
              display: "flex",
              gap: "20px",
              marginTop: "16px",
            }}
          >
            <div
              style={{
                backgroundColor: "#00FFFF",
                border: "4px solid black",
                padding: "12px 24px",
                fontSize: "20px",
                fontWeight: 700,
                boxShadow: "4px 4px 0px #000",
              }}
            >
              🔍 SMART SEARCH
            </div>
            <div
              style={{
                backgroundColor: "#CCFF00",
                border: "4px solid black",
                padding: "12px 24px",
                fontSize: "20px",
                fontWeight: 700,
                boxShadow: "4px 4px 0px #000",
              }}
            >
              🤖 AI ANSWERS
            </div>
            <div
              style={{
                backgroundColor: "#FF006E",
                color: "white",
                border: "4px solid black",
                padding: "12px 24px",
                fontSize: "20px",
                fontWeight: 700,
                boxShadow: "4px 4px 0px #000",
              }}
            >
              📚 MULTI-DOC
            </div>
          </div>

          {/* Call-to-Action */}
          <div
            style={{
              display: "flex",
              marginTop: "32px",
              backgroundColor: "#FF006E",
              border: "6px solid black",
              padding: "20px 60px",
              boxShadow: "12px 12px 0px #000",
            }}
          >
            <p
              style={{
                fontSize: "36px",
                fontWeight: 900,
                color: "white",
                margin: 0,
                textTransform: "uppercase",
                letterSpacing: "2px",
              }}
            >
              START CHATTING NOW →
            </p>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}

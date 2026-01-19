import { ImageResponse } from "next/og";

export const runtime = "edge";

export const alt = "TheMindSurf - Chat with your documents like never before";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default async function Image() {
  // Fetch real-time stats
  let stats = { total_documents: 0, total_users: 0, total_questions: 0 };
  try {
    const response = await fetch("http://127.0.0.1:8000/api/v1/public/stats", {
      cache: "no-store",
    });
    if (response.ok) {
      stats = await response.json();
    }
  } catch (error) {
    console.error("Failed to fetch stats for OG image:", error);
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          backgroundColor: "#F5F3E8",
          border: "8px solid #000000",
          fontFamily: "system-ui, -apple-system, sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Left Section - 55% */}
        <div
          style={{
            width: "55%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            padding: "40px 48px",
            position: "relative",
          }}
        >
          {/* Logo & Brand */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "16px",
              marginBottom: "20px",
            }}
          >
            {/* Custom Logo */}
            <div
              style={{
                width: "56px",
                height: "56px",
                border: "4px solid #FF006E",
                backgroundColor: "#FFFF00",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                position: "relative",
              }}
            >
              {/* Brain wave (top) - simplified as a zigzag shape */}
              <div
                style={{
                  position: "absolute",
                  top: "12px",
                  left: "8px",
                  right: "8px",
                  height: "3px",
                  backgroundColor: "#000000",
                  display: "flex",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  top: "8px",
                  left: "14px",
                  width: "3px",
                  height: "8px",
                  backgroundColor: "#000000",
                  display: "flex",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  top: "8px",
                  left: "24px",
                  width: "3px",
                  height: "8px",
                  backgroundColor: "#000000",
                  display: "flex",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  top: "8px",
                  left: "34px",
                  width: "3px",
                  height: "8px",
                  backgroundColor: "#000000",
                  display: "flex",
                }}
              />

              {/* Surf wave (bottom) */}
              <div
                style={{
                  position: "absolute",
                  bottom: "12px",
                  left: "8px",
                  right: "8px",
                  height: "12px",
                  backgroundColor: "#00FFFF",
                  borderRadius: "50% 50% 0 0",
                  display: "flex",
                }}
              />
            </div>

            {/* Brand Name */}
            <span
              style={{
                fontSize: "28px",
                fontWeight: 900,
                textTransform: "uppercase",
                color: "#000000",
                letterSpacing: "-0.5px",
              }}
            >
              TheMindSurf
            </span>
          </div>

          {/* Top Badge */}
          <div
            style={{
              display: "flex",
              backgroundColor: "#DFFF00",
              border: "4px solid #000000",
              padding: "12px 24px",
              marginBottom: "24px",
              alignSelf: "flex-start",
            }}
          >
            <span
              style={{
                fontSize: "16px",
                fontWeight: 900,
                textTransform: "uppercase",
                color: "#000000",
                letterSpacing: "0.5px",
              }}
            >
              🚀 {stats.total_documents.toLocaleString()} DOCUMENTS PROCESSED
            </span>
          </div>

          {/* Main Headline */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              marginBottom: "24px",
            }}
          >
            <span
              style={{
                fontSize: "58px",
                fontWeight: 900,
                textTransform: "uppercase",
                color: "#000000",
                lineHeight: 1.05,
                letterSpacing: "-1px",
              }}
            >
              CHAT WITH YOUR
            </span>
            <span
              style={{
                fontSize: "58px",
                fontWeight: 900,
                textTransform: "uppercase",
                color: "#000000",
                lineHeight: 1.05,
                letterSpacing: "-1px",
              }}
            >
              DOCUMENTS
            </span>
            <span
              style={{
                fontSize: "58px",
                fontWeight: 900,
                textTransform: "uppercase",
                color: "#FF0080",
                lineHeight: 1.05,
                letterSpacing: "-1px",
              }}
            >
              LIKE NEVER BEFORE
            </span>
          </div>

          {/* Subheadline */}
          <p
            style={{
              fontSize: "20px",
              fontWeight: 500,
              color: "#3D3D3D",
              lineHeight: 1.4,
              maxWidth: "520px",
              marginBottom: "32px",
            }}
          >
            Upload PDFs, ask questions in plain English, and get instant
            AI-powered answers with source citations.
          </p>

          {/* CTA Buttons */}
          <div
            style={{
              display: "flex",
              gap: "16px",
              marginBottom: "12px",
            }}
          >
            {/* Start Free Trial Button */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "#00FFFF",
                border: "4px solid #000000",
                padding: "14px 28px",
              }}
            >
              <span
                style={{
                  fontSize: "15px",
                  fontWeight: 900,
                  textTransform: "uppercase",
                  color: "#000000",
                }}
              >
                START FREE TRIAL →
              </span>
            </div>

            {/* See Examples Button */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "#FFFFFF",
                border: "4px solid #000000",
                padding: "14px 28px",
              }}
            >
              <span
                style={{
                  fontSize: "15px",
                  fontWeight: 900,
                  textTransform: "uppercase",
                  color: "#000000",
                }}
              >
                📚 SEE EXAMPLES
              </span>
            </div>
          </div>

          {/* Small Text */}
          <span
            style={{
              fontSize: "13px",
              color: "#6B6B6B",
            }}
          >
            No credit card required • 3 free credits to start
          </span>
        </div>

        {/* Right Section - 45% - Chat Interface Mockup */}
        <div
          style={{
            width: "45%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
            paddingRight: "24px",
          }}
        >
          {/* Chat Mockup Container */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              width: "420px",
              backgroundColor: "#FFFFFF",
              border: "6px solid #000000",
              transform: "rotate(2deg)",
              position: "relative",
              marginLeft: "-40px",
            }}
          >
            {/* AI Badge - Top Right */}
            <div
              style={{
                position: "absolute",
                top: "-25px",
                right: "-25px",
                width: "50px",
                height: "50px",
                backgroundColor: "#FF0080",
                border: "4px solid #000000",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <span
                style={{
                  fontSize: "18px",
                  fontWeight: 900,
                  color: "#FFFFFF",
                }}
              >
                AI
              </span>
            </div>

            {/* PDF File Card */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                padding: "16px",
                borderBottom: "4px solid #000000",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  marginBottom: "8px",
                }}
              >
                {/* PDF Badge */}
                <div
                  style={{
                    display: "flex",
                    backgroundColor: "#FF0080",
                    border: "3px solid #000000",
                    padding: "4px 10px",
                  }}
                >
                  <span
                    style={{
                      fontSize: "12px",
                      fontWeight: 900,
                      color: "#FFFFFF",
                    }}
                  >
                    PDF
                  </span>
                </div>
                <span
                  style={{
                    fontSize: "14px",
                    fontWeight: 700,
                    color: "#000000",
                  }}
                >
                  research_paper.pdf
                </span>
              </div>
              <span
                style={{
                  fontSize: "12px",
                  color: "#6B6B6B",
                }}
              >
                45 pages • 2.3 MB
              </span>
              {/* Gray lines simulating content */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "6px",
                  marginTop: "12px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    width: "100%",
                    height: "8px",
                    backgroundColor: "#E5E5E5",
                  }}
                />
                <div
                  style={{
                    display: "flex",
                    width: "85%",
                    height: "8px",
                    backgroundColor: "#E5E5E5",
                  }}
                />
                <div
                  style={{
                    display: "flex",
                    width: "92%",
                    height: "8px",
                    backgroundColor: "#E5E5E5",
                  }}
                />
              </div>
            </div>

            {/* Question Bubble */}
            <div
              style={{
                display: "flex",
                padding: "16px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  backgroundColor: "#00FFFF",
                  border: "4px solid #000000",
                  padding: "14px 18px",
                  width: "100%",
                }}
              >
                <span
                  style={{
                    fontSize: "15px",
                    fontWeight: 700,
                    color: "#000000",
                  }}
                >
                  What are the main findings of this study?
                </span>
              </div>
            </div>

            {/* Answer Bubble */}
            <div
              style={{
                display: "flex",
                padding: "0 16px 16px 16px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  backgroundColor: "#DFFF00",
                  border: "4px solid #000000",
                  padding: "14px 18px",
                  width: "100%",
                  gap: "8px",
                }}
              >
                <span
                  style={{
                    fontSize: "15px",
                    fontWeight: 700,
                    color: "#000000",
                  }}
                >
                  The study found three key insights:
                </span>
                <span
                  style={{
                    fontSize: "13px",
                    fontWeight: 500,
                    color: "#000000",
                  }}
                >
                  1. AI improves efficiency by 47%...
                </span>
                {/* Citation Badge */}
                <div
                  style={{
                    display: "flex",
                    alignSelf: "flex-start",
                    backgroundColor: "#000000",
                    border: "3px solid #000000",
                    padding: "6px 12px",
                    marginTop: "4px",
                  }}
                >
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: 700,
                      color: "#FFFFFF",
                    }}
                  >
                    📄 Page 12, Para 3
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}

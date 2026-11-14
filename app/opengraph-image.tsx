import { ImageResponse } from "next/og";

export const contentType = "image/png";
export const size = { width: 1200, height: 630 };

export default async function OgImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: 80,
        background: "#ffffff",
        color: "#111111",
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ fontSize: 48, fontWeight: 700 }}>Cevo</div>
      <div style={{ fontSize: 64, fontWeight: 700, marginTop: 16 }}>
        From idea to verified academic report
      </div>
      <div style={{ fontSize: 28, marginTop: 24, color: "#555555" }}>
        Transparent XAF pricing · MTN MoMo and Orange Money
      </div>
    </div>,
    { ...size },
  );
}

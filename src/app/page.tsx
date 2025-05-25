"use client";

import { useEffect, useRef, useState } from "react";

type DetectedPerson = {
  name: string;
  match: boolean;
};

type FaceBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export default function Home() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [detectedPeople, setDetectedPeople] = useState<DetectedPerson[]>([]);
  const [faceBoxes, setFaceBoxes] = useState<FaceBox[]>([]);

  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }

        intervalId = setInterval(captureAndCheckFace, 5000);
      } catch (err) {
        console.error("Camera access denied or not available.", err);
      }
    }

    startCamera();

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, []);

  async function captureAndCheckFace() {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const context = canvas.getContext("2d");
    if (!context) return;

    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob>((resolve) =>
      canvas.toBlob((blob) => blob && resolve(blob), "image/jpeg")
    );

    if (!blob) return;

    const formData = new FormData();
    formData.append("file", blob, "frame.jpg");

    try {
      const response = await fetch("http://localhost:8080/v1/face-embeddings/match", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const result = await response.json();
      console.log("Match result:", result);

      if (result.boxes && Array.isArray(result.boxes)) {
        setFaceBoxes(result.boxes);
        drawBoxes(result.boxes);
      }

      if (result.match && result.results?.length) {
        const firstMatch = result.results[0];
        const name = firstMatch.name || "Unknown";
        const isBlacklisted = firstMatch.is_blacklisted || false;

        setDetectedPeople((prev) => {
          const alreadyExists = prev.some((p) => p.name === name);
          if (alreadyExists) return prev;

          return [
            ...prev,
            {
              name,
              match: isBlacklisted,
            },
          ];
        });
      }
    } catch (error) {
      console.error("Error during face match:", error);
    }
  }


  function drawBoxes(boxes: FaceBox[]) {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    boxes.forEach((box) => {
      ctx.beginPath();
      ctx.lineWidth = 3;
      ctx.strokeStyle = "rgba(255, 0, 0, 0.8)";
      ctx.rect(box.x, box.y, box.width, box.height);
      ctx.stroke();
    });
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
      {/* Camera View */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="relative w-full max-w-4xl aspect-video rounded-2xl overflow-hidden shadow-2xl border border-gray-700 bg-gray-800/20 backdrop-blur-md">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="absolute inset-0 w-full h-full object-cover"
          />
          <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full pointer-events-none"
          />
          <div className="absolute bottom-0 left-0 right-0 bg-black/40 p-4 text-sm text-gray-300">
            Live Camera Feed
          </div>
        </div>
      </div>

      {/* Sidebar */}
      <aside className="w-96 bg-gray-800/30 backdrop-blur-lg border-l border-gray-700 p-6 flex flex-col">
        <h2 className="text-2xl font-bold mb-6 tracking-wide">Rupaa Syndicate Detection</h2>

        {detectedPeople.length === 0 ? (
          <div className="text-gray-400 text-center mt-12">No faces detected yet</div>
        ) : (
          <ul className="space-y-4 overflow-y-auto flex-1">
            {detectedPeople.map((person, idx) => (
              <li
                key={idx}
                className={`p-4 rounded-xl shadow transition duration-300 ${person.match
                  ? "bg-red-600/30 border border-red-400 text-red-200"
                  : "bg-green-600/20 border border-green-400 text-green-200"
                  }`}
              >
                <p className="font-semibold text-lg">{person.name}</p>
                <p className="text-sm">
                  {person.match ? "⚠️ Blacklisted" : "✅ Clear"}
                </p>
              </li>
            ))}
          </ul>
        )}

        <footer className="text-xs text-gray-500 mt-8 text-center">
          Powered by Rentalize
        </footer>
      </aside>
    </div>
  );
}

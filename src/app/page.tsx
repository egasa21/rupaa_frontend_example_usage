"use client";

import DialogAIFaceRecog from "@/components/DialogAIFaceRecog";
import { useEffect, useRef, useState } from "react";

type DetectedPerson = {
  name: string;
  match: boolean;
  description?: string | null;
};

type FaceBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type MatchedFace = {
  id: number;
  name: string;
  suspected: boolean;
  description?: string | null;
  image_url: string;
  user_id: string;
  box: FaceBox;
};

const HARDCODED_TOKEN = "";

export default function FaceRecognition() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const [detectedPeople, setDetectedPeople] = useState<DetectedPerson[]>([]);
  const [faceBoxes, setFaceBoxes] = useState<FaceBox[]>([]);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;

    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Camera access denied or not available.", err);
      }
    }

    function connectWebSocket() {
      if (!HARDCODED_TOKEN) {
        console.error("No auth token provided");
        return;
      }

      wsRef.current = new WebSocket("ws://localhost:8080/match-face");

      wsRef.current.onopen = () => {
        console.log("WebSocket connected");
        wsRef.current?.send(JSON.stringify({ token: HARDCODED_TOKEN }));
        intervalId = setInterval(sendFrame, 5000);
      };

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.error) {
            console.error("Server error:", data.error);
            setFaceBoxes([]);
            setDetectedPeople([]);
            return;
          }

          if (data.match && Array.isArray(data.matched_faces)) {
            const matches: MatchedFace[] = data.matched_faces;

            setFaceBoxes(matches.map((f) => f.box));

            setDetectedPeople(
              matches.map((f) => ({
                name: `Nama: ${f.name}`,
                match: f.suspected,
                description: f.description || null,
              }))
            );
          } else {
            setFaceBoxes([]);
            setDetectedPeople([]);
          }
        } catch (e) {
          console.error("Error parsing WS message", e);
        }
      };

      wsRef.current.onerror = (e) => {
        console.error("WebSocket error", e);
      };

      wsRef.current.onclose = () => {
        console.log("WebSocket disconnected");
        if (intervalId) clearInterval(intervalId);
      };
    }

    async function sendFrame() {
      if (!videoRef.current || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

      const video = videoRef.current;
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const base64 = canvas.toDataURL("image/jpeg").split(",")[1];
      wsRef.current.send(JSON.stringify({ image: base64 }));
    }

    if (visible) {
      startCamera();
      connectWebSocket();
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
      if (wsRef.current) wsRef.current.close();
      if (videoRef.current?.srcObject) {
        (videoRef.current.srcObject as MediaStream)
          .getTracks()
          .forEach((track) => track.stop());
      }
    };
  }, [visible]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    faceBoxes.forEach((box) => {
      ctx.beginPath();
      ctx.lineWidth = 3;
      ctx.strokeStyle = "rgba(255, 0, 0, 0.8)";
      ctx.rect(box.x, box.y, box.width, box.height);
      ctx.stroke();
    });
  }, [faceBoxes]);

  return (
    <DialogAIFaceRecog
      title="Face Recognition"
      visible={visible}
      onClose={() => setVisible(false)}
    >
      <div className="flex flex-col items-center space-y-3">
        <div className="relative w-[400px] h-[240px]">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="absolute inset-0 w-full h-full object-cover rounded-md border"
          />
          <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full pointer-events-none rounded-md border"
          />
        </div>

        {detectedPeople.length > 0 && (
          <ul className="w-full space-y-2 text-sm mt-2">
            {detectedPeople.map((person, i) => (
              <li
                key={i}
                className={`p-2 rounded border ${person.match
                  ? "bg-red-100 text-red-800 border-red-400"
                  : "bg-green-100 text-green-800 border-green-400"
                  }`}
              >
                <div className="font-semibold">{person.name}</div>
                <div>
                  {person.match ? "⚠️ Suspected Person" : "✅ Clear"}
                  {person.description && (
                    <p className="text-xs text-gray-600 mt-1 italic">
                      {person.description}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </DialogAIFaceRecog>
  );
}

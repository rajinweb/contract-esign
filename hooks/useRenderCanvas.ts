import { itemTypes } from "@/types/types";
import { useEffect } from "react";

export function useRenderCanvas(
    canvasRef: React.RefObject<{ getCanvas: () => HTMLCanvasElement | null }>,
    value?: string,
    width?: number,
    height?: number
) {
    useEffect(() => {
        const canvas = canvasRef.current?.getCanvas();
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (!value) return;

        let parsedValue = value;
        let type: itemTypes | null = null;

        // 🔑 Parse stored value
        try {
            const parsed = JSON.parse(value);
            if (parsed?.value) {
                parsedValue = parsed.value;
                type = parsed.type;
            }
        } catch {
            // backward compatible (plain string)
        }

        // 🖼 Draw image signature
        if (parsedValue.startsWith("data:image")) {
            const img = new Image();
            img.src = parsedValue;
            img.onload = () => {
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            };
            return;
        }

        // ✍️ Draw typed initials
        ctx.fillStyle = "#000";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        let fontSize = Math.min(canvas.width, canvas.height);
        do {
            ctx.font = `${fontSize}px 'Dancing Script', cursive`;
            fontSize -= 2;
        } while (
            ctx.measureText(parsedValue).width > canvas.width * 0.8 &&
            fontSize > 10
        );

        ctx.fillText(parsedValue, canvas.width / 2, canvas.height / 2);
    }, [canvasRef, value, width, height]);
}

export const isCanvasBlank = (canvas: HTMLCanvasElement | null): boolean => {
    if (!canvas) return true;

    const ctx = canvas.getContext("2d");
    if (!ctx) return true;

    const { width, height } = canvas;
    const imageData = ctx.getImageData(0, 0, width, height).data;

    // If any pixel is not transparent → canvas has drawing
    return !imageData.some((channel) => channel !== 0);
};

export function validateEmail(email: string): boolean {
    if (!email) return false;
    const emailRegex: RegExp = /^([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})(#*)$/;

    return emailRegex.test(email.trim());
}

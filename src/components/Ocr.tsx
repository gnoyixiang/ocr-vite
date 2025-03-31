import { useEffect, useRef } from "react";

interface OCR {
  recognize: (imageEl: HTMLImageElement) => Promise<{ text: string[] }>;
}

const ACTIONS = {
  INIT: "pos:ocr:init",
  RECOGNIZE_IMAGE: "pos:ocr:recognize_image",
  IMAGE_RESULT: "pos:ocr:image_result",
};

export default function OCR() {
  const ocrRef = useRef<OCR>(null);
  const initializedRef = useRef(false);

  const processOCR = async (imageData: string) => {
    if (!ocrRef.current) {
      return { error: "OCR is not initialized" };
    }
    try {
      const imageEl: HTMLImageElement = await new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error("Image not loaded!"));
        img.src = imageData;
      });
      const { text } = await ocrRef.current.recognize(imageEl);
      return { text };
    } catch (error: unknown) {
      if (error instanceof Error) {
        return { error: error.message };
      }
      return { error: "An unexpected error has occurred!" };
    }
  };

  const init = async () => {
    try {
      console.log("initializing ocr...");
      // @ts-expect-error no types
      const ocr = await import("@paddlejs-models/ocr");
      await ocr.init();
      ocrRef.current = ocr;
      initializedRef.current = true;
      window.parent.postMessage({ action: ACTIONS.INIT, result: true }, "*");
      console.log("ocr initialized!");
    } catch (error) {
      const msg = (error as Error).message;
      console.log("error initializing ocr...", msg);
      window.parent.postMessage(
        {
          action: ACTIONS.INIT,
          result: false,
          message: msg,
        },
        "*"
      );
      return;
    }
  };

  useEffect(() => {
    window.addEventListener("message", async (event) => {
      if (
        event.data.action === ACTIONS.RECOGNIZE_IMAGE &&
        initializedRef.current
      ) {
        const { imageData } = event.data;
        console.log("recognize:", { data: event.data });
        const result = await processOCR(imageData);
        window.parent.postMessage(
          { action: ACTIONS.IMAGE_RESULT, result, imageData },
          "*"
        );
        return;
      }
      if ([ACTIONS.INIT, ACTIONS.IMAGE_RESULT].includes(event.data.action)) {
        console.log("received:", event.data);
      }
    });
    init();
  }, []);

  return null;
}

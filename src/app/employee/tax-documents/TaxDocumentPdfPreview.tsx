"use client";

import { useEffect, useRef, useState } from "react";

type PdfDocumentProxy = {
  numPages: number;
  getPage(pageNumber: number): Promise<PdfPageProxy>;
  destroy(): Promise<void>;
};

type PdfPageProxy = {
  getViewport(params: { scale: number }): {
    width: number;
    height: number;
  };
  render(params: {
    canvasContext: CanvasRenderingContext2D;
    viewport: { width: number; height: number };
  }): {
    promise: Promise<void>;
    cancel(): void;
  };
};

type PdfJsLib = {
  GlobalWorkerOptions: {
    workerSrc: string;
  };
  getDocument(params: { url: string }): {
    promise: Promise<PdfDocumentProxy>;
  };
};

declare global {
  interface Window {
    pdfjsLib?: PdfJsLib;
  }
}

type TaxDocumentPdfPreviewProps = {
  previewUrl: string;
  title: string;
};

const PDF_JS_URL =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
const PDF_JS_WORKER_URL =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

let pdfJsLoadPromise: Promise<PdfJsLib> | null = null;

export function TaxDocumentPdfPreview({
  previewUrl,
  title,
}: TaxDocumentPdfPreviewProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const documentRef = useRef<PdfDocumentProxy | null>(null);
  const renderTaskRef = useRef<{ cancel(): void } | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageCount, setPageCount] = useState(0);
  const [status, setStatus] = useState("PDFを読み込んでいます。");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    async function loadDocument() {
      setStatus("PDFを読み込んでいます。");
      setError(null);
      setPageNumber(1);
      setPageCount(0);

      try {
        const pdfjsLib = await loadPdfJs();
        const pdfDocument = await pdfjsLib.getDocument({ url: previewUrl }).promise;

        if (!isActive) {
          await pdfDocument.destroy();
          return;
        }

        documentRef.current = pdfDocument;
        setPageCount(pdfDocument.numPages);
        setStatus("");
      } catch {
        if (isActive) {
          setError("PDFプレビューを表示できませんでした。");
          setStatus("");
        }
      }
    }

    loadDocument();

    return () => {
      isActive = false;
      renderTaskRef.current?.cancel();
      renderTaskRef.current = null;
      void documentRef.current?.destroy();
      documentRef.current = null;
    };
  }, [previewUrl]);

  useEffect(() => {
    const wrapper = wrapperRef.current;

    if (!wrapper) {
      return;
    }

    const resizeObserver = new ResizeObserver(() => {
      void renderCurrentPage(pageNumber);
    });

    resizeObserver.observe(wrapper);
    void renderCurrentPage(pageNumber);

    return () => {
      resizeObserver.disconnect();
      renderTaskRef.current?.cancel();
      renderTaskRef.current = null;
    };
  }, [pageNumber, pageCount]);

  async function renderCurrentPage(nextPageNumber: number) {
    const pdfDocument = documentRef.current;
    const canvas = canvasRef.current;
    const wrapper = wrapperRef.current;

    if (!pdfDocument || !canvas || !wrapper || pageCount === 0) {
      return;
    }

    try {
      renderTaskRef.current?.cancel();
      const page = await pdfDocument.getPage(nextPageNumber);
      const baseViewport = page.getViewport({ scale: 1 });
      const availableWidth = Math.max(wrapper.clientWidth - 32, 320);
      const maxHeight = Math.min(
        Math.max(window.innerHeight * 0.72, 420),
        780,
      );
      const scale = Math.min(
        availableWidth / baseViewport.width,
        maxHeight / baseViewport.height,
      );
      const viewport = page.getViewport({ scale });
      const pixelRatio = window.devicePixelRatio || 1;
      const canvasContext = canvas.getContext("2d");

      if (!canvasContext) {
        return;
      }

      canvas.width = Math.floor(viewport.width * pixelRatio);
      canvas.height = Math.floor(viewport.height * pixelRatio);
      canvas.style.width = `${Math.floor(viewport.width)}px`;
      canvas.style.height = `${Math.floor(viewport.height)}px`;
      canvasContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      canvasContext.clearRect(0, 0, viewport.width, viewport.height);

      const renderTask = page.render({
        canvasContext,
        viewport,
      });

      renderTaskRef.current = renderTask;
      await renderTask.promise;
      renderTaskRef.current = null;
    } catch (renderError) {
      if (
        renderError instanceof Error &&
        renderError.name === "RenderingCancelledException"
      ) {
        return;
      }

      setError("PDFプレビューを表示できませんでした。");
    }
  }

  const hasMultiplePages = pageCount > 1;

  return (
    <div className="stack">
      <div
        ref={wrapperRef}
        aria-label={title}
        style={{
          display: "grid",
          placeItems: "center",
          overflow: "hidden",
          border: "1px solid var(--line)",
          borderRadius: 8,
          background: "#eef2f8",
          padding: 16,
        }}
      >
        {status ? <p style={{ margin: 0 }}>{status}</p> : null}
        {error ? <div className="error">{error}</div> : null}
        <canvas
          ref={canvasRef}
          style={{
            display: error ? "none" : "block",
            maxWidth: "100%",
            background: "#ffffff",
            boxShadow: "0 8px 24px rgba(15, 23, 42, 0.12)",
          }}
        />
      </div>

      {hasMultiplePages ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
          }}
        >
          <button
            className="button secondary"
            type="button"
            disabled={pageNumber <= 1}
            onClick={() => setPageNumber((current) => Math.max(current - 1, 1))}
          >
            前へ
          </button>
          <span style={{ color: "var(--muted)", fontSize: 13 }}>
            {pageNumber} / {pageCount}
          </span>
          <button
            className="button secondary"
            type="button"
            disabled={pageNumber >= pageCount}
            onClick={() =>
              setPageNumber((current) => Math.min(current + 1, pageCount))
            }
          >
            次へ
          </button>
        </div>
      ) : null}
    </div>
  );
}

function loadPdfJs(): Promise<PdfJsLib> {
  if (window.pdfjsLib) {
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDF_JS_WORKER_URL;
    return Promise.resolve(window.pdfjsLib);
  }

  if (pdfJsLoadPromise) {
    return pdfJsLoadPromise;
  }

  pdfJsLoadPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = PDF_JS_URL;
    script.async = true;
    script.onload = () => {
      if (!window.pdfjsLib) {
        reject(new Error("PDF.js could not be loaded."));
        return;
      }

      window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDF_JS_WORKER_URL;
      resolve(window.pdfjsLib);
    };
    script.onerror = () => reject(new Error("PDF.js could not be loaded."));
    document.body.appendChild(script);
  });

  return pdfJsLoadPromise;
}

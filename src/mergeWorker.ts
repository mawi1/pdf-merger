import {
  EncryptedPDFError,
  PDFDocument,
  PDFParsingError,
} from "@cantoo/pdf-lib";

import {
  AppError,
  ErrorType,
  Status,
  WriteTo,
  type MergeRequest,
  type MergeResponse,
} from "./model";
import { getPdfDataById } from "./pdfRepository";

onmessage = async function (e: MessageEvent<MergeRequest>) {
  const request = e.data;

  let pdfBytes: Uint8Array;
  try {
    const pdfDoc = await PDFDocument.create();
    for (const pdf of request.pdfList) {
      const srcDoc = await PDFDocument.load(await getPdfDataById(pdf.id));
      for (const page of await pdfDoc.copyPages(
        srcDoc,
        srcDoc.getPageIndices()
      )) {
        pdfDoc.addPage(page);
      }
    }
    pdfBytes = await pdfDoc.save();
  } catch (error) {
    // @ts-ignore
    request.outFileHandle.remove();

    let errorType: ErrorType;
    if (error instanceof AppError) {
      errorType = error.type;
    } else if (error instanceof EncryptedPDFError) {
      errorType = ErrorType.EncryptedPDF;
    } else if (error instanceof PDFParsingError) {
      errorType = ErrorType.PDFParsing;
    } else {
      errorType = ErrorType.Unexpected;
    }

    const r: MergeResponse = {
      status: Status.Error,
      error: errorType,
    };
    postMessage(r);
    console.error(error);
    return;
  }

  if (request.writeTo === WriteTo.File) {
    try {
      const writable = await request.outFileHandle.createWritable();
      await writable.write(pdfBytes.buffer);
      await writable.close();
    } catch (error) {
      // @ts-ignore
      request.outFileHandle.remove();

      let errorType: ErrorType;
      if (
        error instanceof DOMException &&
        [
          "NotAllowedError",
          "NotFoundError",
          "NoModificationAllowedError",
          "AbortError",
        ].includes(error.name)
      ) {
        errorType = ErrorType.FileAccess;
      } else {
        errorType = ErrorType.Unexpected;
      }

      const r: MergeResponse = {
        status: Status.Error,
        error: errorType,
      };
      postMessage(r);
      console.error(error);
      return;
    }

    const r: MergeResponse = {
      status: Status.Ok,
      response: {
        writeTo: WriteTo.File,
      },
    };
    postMessage(r);
  } else if (request.writeTo === WriteTo.Blob) {
    const blob = new Blob([pdfBytes], { type: "application/pdf" });
    const r: MergeResponse = {
      status: Status.Ok,
      response: {
        writeTo: WriteTo.Blob,
        url: URL.createObjectURL(blob).toString(),
      },
    };
    postMessage(r);
  }
};

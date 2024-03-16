import {
  get,
  writable,
  type Invalidator,
  type Subscriber,
  type Unsubscriber,
  type Updater,  
} from "svelte/store";

import {
  addPdfs,
  deleteAll,
  deletePdfById,
  getAllPdfsOrdered,
  updateOrder,
} from "./pdfRepository";

export type PdfListItem = {
  id: number;
  name: string;
};

export type PdfList = PdfListItem[];

export enum ErrorType {
  EncryptedPDF,
  FileAccess,  
  PDFParsing,
  QuotaExceeded,
  Unexpected,
}

export function toErrorMessage(errorType: ErrorType): string {
  switch (errorType) {
    case ErrorType.PDFParsing:
      return "Failed to parse PDF document";
    case ErrorType.FileAccess:
      return "Unable to write to output file";
    case ErrorType.EncryptedPDF:
      return "Encrypted PDF cannot be processed";
    case ErrorType.QuotaExceeded:
      return "Not enough storage space available";
    case ErrorType.Unexpected:
      return "An Unexpected Error Occurred";
    default:
      ((x: never) => {
        throw new Error(`${x} was unhandled!`);
      })(errorType);
  }
}

export class AppError extends Error {
  type: ErrorType;

  constructor({ type, cause }: { type: ErrorType; cause?: unknown }) {
    super(toErrorMessage(type), { cause });
    this.type = type;
  }
}

export class PdfListStore {
  public subscribe: (
    run: Subscriber<PdfList>,
    invalidate?: Invalidator<PdfList>
  ) => Unsubscriber;
  public get: () => PdfList;

  private update: (fn: Updater<PdfList>) => void;
  private set: (value: PdfList) => void;

  constructor() {
    const store = writable<PdfList>([]);
    this.get = () => get(store);
    this.subscribe = store.subscribe;
    this.update = store.update;
    this.set = store.set;
  }

  async init(): Promise<void> {
    this.set(await getAllPdfsOrdered());
  }

  async add(files: FileList) {
    const addedPdfs = await addPdfs(files);
    this.update((t) => [...t, ...addedPdfs]);
  }

  async moveUp(index: number): Promise<void> {
    let newList: PdfList;
    this.update((l) => {
      l.splice(index - 1, 2, l[index], l[index - 1]);
      newList = l;
      return l;
    });

    return updateOrder(newList!);
  }

  async moveDown(index: number) {
    let newList: PdfList;
    this.update((l) => {
      l.splice(index, 2, l[index + 1], l[index]);
      newList = l;
      return l;
    });

    return updateOrder(newList!);
  }

  dndConsider(e: CustomEvent<DndEvent<PdfListItem>>): void {
    this.set(e.detail.items);
  }

  async dndFinalize(e: CustomEvent<DndEvent<PdfListItem>>): Promise<void> {
    this.set(e.detail.items);
    return updateOrder(e.detail.items);
  }

  async delete(id: number): Promise<void> {
    await deletePdfById(id);
    this.update((list) => list.filter((p) => p.id != id));
  }

  async deleteAll(): Promise<void> {
    await deleteAll();
    this.set([]);
  }

  sortAZ(): void {
    this.update((l) => {
      l.sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { numeric: true })
      );
      return l;
    });
  }

  sortFirstAdded(): void {
    this.update((l) => {
      l.sort((a, b) =>
        a.id - b.id
      );
      return l;
    });
  }
}

export enum State {
  Idle,
  FilePickerOpen,
  Merging,
  Done,
  Error,
}

export enum WriteTo {
  File,
  Blob,
}

export type MergeRequest =
  | {
      writeTo: WriteTo.File;
      outFileHandle: FileSystemFileHandle;
      pdfList: PdfList;
    }
  | {
      writeTo: WriteTo.Blob;
      pdfList: PdfList;
    };

export enum Status {
  Ok,
  Error,
}

export type MergeResponse =
  | {
      status: Status.Ok;
      response: {
        writeTo: WriteTo.File;
      };
    }
  | {
      status: Status.Ok;
      response: {
        writeTo: WriteTo.Blob;
        url: string;
      };
    }
  | {
      status: Status.Error;
      error: ErrorType;
    };

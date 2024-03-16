import Dexie, { type Table } from "dexie";

import { AppError, ErrorType, type PdfList } from "./model";

interface PdfMetaRow {
  id?: number;
  name: string;
  order: number;
}

interface PdfDataRow {
  id: number;
  data: ArrayBuffer;
}

class PdfDatabase extends Dexie {
  meta!: Table<PdfMetaRow>;
  data!: Table<PdfDataRow>;

  constructor() {
    super("PdfDatabase");
    this.version(1).stores({
      meta: "++id, order",
      data: "&id",
    });
  }
}

const db = new PdfDatabase();

function notFoundError(id: number): AppError {
  return new AppError({
    type: ErrorType.Unexpected,
    cause: {
      cause: "NotFound",
      id: id,
    },
  });
}

async function _addPdfs(files: FileList): Promise<PdfList> {
  let addedPdfs = [];

  for (const file of files) {
    const id = await db.meta.add({
      name: file.name,
      order: await db.meta.count(),
    });
    await db.data.add({
      id: id,
      data: await file.arrayBuffer(),
    });

    addedPdfs.push({
      id,
      name: file.name,
    });
  }

  return addedPdfs;
}

async function _getAllPdfsOrdered(): Promise<PdfList> {
  return (await db.meta.orderBy("order").toArray()).map((row) => ({
    id: row.id!,
    name: row.name,
  }));
}

async function _getPdfDataById(id: number): Promise<ArrayBuffer> {
  const row = await db.data.get(id);
  if (row) {
    return row.data;
  } else {
    throw notFoundError(id);
  }
}

async function _updateOrder(list: PdfList): Promise<void> {
  await db.meta.bulkUpdate(
    list.map((item, index) => ({
      key: item.id,
      changes: {
        order: index,
      },
    }))
  );
}

async function _deletePdfById(id: number): Promise<void> {
  const row = await db.meta.get(id);
  if (row === undefined) {
    throw notFoundError(id);
  }

  await Promise.all([
    db.meta
      .where("order")
      .above(row.order)
      .modify((pdf) => {
        pdf.order = pdf.order - 1;
      }),
    db.meta.delete(id),
    db.data.delete(id),
  ]);
}

async function _deleteAll(): Promise<void> {
  await Promise.all([db.meta.clear(), db.data.clear()]);
}

type AsyncFunc<T extends any[], U> = (...args: T) => Promise<U>;

function wrapErrors<T extends any[], U>(
  func: AsyncFunc<T, U>
): (...args: T) => Promise<U> {
  return async function (...args: T): Promise<U> {
    try {
      return await func(...args);
    } catch (e) {
      if (e instanceof AppError) {
        throw e;
      } else if (
        e instanceof Dexie.DexieError &&
        (e.name === "QuotaExceededError" ||
          (e.inner && e.inner.name === "QuotaExceededError"))
      ) {
        throw new AppError({
          type: ErrorType.QuotaExceeded,
          cause: e,
        });
      } else {
        throw new AppError({
          type: ErrorType.Unexpected,
          cause: e,
        });
      }
    }
  };
}

export const addPdfs = wrapErrors(_addPdfs);
export const getAllPdfsOrdered = wrapErrors(_getAllPdfsOrdered);
export const getPdfDataById = wrapErrors(_getPdfDataById);
export const updateOrder = wrapErrors(_updateOrder);
export const deletePdfById = wrapErrors(_deletePdfById);
export const deleteAll = wrapErrors(_deleteAll);

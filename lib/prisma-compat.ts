import { Prisma } from "@prisma/client";

export function isMissingColumnError(
  error: unknown,
  tableName: string,
  columnName: string
) {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) {
    return false;
  }
  if (error.code !== "P2022") {
    return false;
  }

  const message = String(error.message || "");
  const qualified = `${tableName}.${columnName}`;
  return (
    message.includes(qualified) ||
    message.includes(`column \`${qualified}\``) ||
    message.includes(`column '${qualified}'`) ||
    message.includes(columnName)
  );
}

export function isMissingTableError(error: unknown, tableName: string) {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) {
    return false;
  }

  // P2021: "The table ... does not exist in the current database."
  if (error.code !== "P2021") {
    return false;
  }

  const message = String(error.message || "");
  return (
    message.includes(tableName) ||
    message.includes(`table \`${tableName}\``) ||
    message.includes(`table '${tableName}'`)
  );
}

export function isMissingFieldOrTableError(
  error: unknown,
  options: {
    tableName: string;
    columnName?: string;
    modelName?: string;
  }
) {
  const { tableName, columnName, modelName } = options;

  if (columnName && isMissingColumnError(error, tableName, columnName)) {
    return true;
  }

  if (isMissingTableError(error, modelName || tableName)) {
    return true;
  }

  return false;
}

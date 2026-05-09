export interface CsvImportError {
  row: number;
  message: string;
  data?: Record<string, string>;
}

export interface CsvImportResult {
  successCount: number;
  errorCount: number;
  errors: CsvImportError[];
}

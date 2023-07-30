export interface SteroidStackEntry {
    fileName: string;
    lineNumber: number;
    columnNumber: number;
    functionName?: string | null;
}

export interface SteroidExportEntry {
    targetKey: string;
    fileName: string;
    lineNumber: number;
    columnNumber: number;
    measurements: SteroidExportMeasurment[];
}

export type SteroidExportMeasurment = [number, number];


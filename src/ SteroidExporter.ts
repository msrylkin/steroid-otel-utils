import { SpanExporter, ReadableSpan } from '@opentelemetry/sdk-trace-base';
import { ExportResult, ExportResultCode } from '@opentelemetry/core';

import axios from 'axios';
import { SteroidStackEntry } from './types';

const baseUrl = 'https://ly2jrkewbd.execute-api.us-east-1.amazonaws.com';
const tracePath = '/dev/trace'
const token = 'example';

interface CodePlaceable {
    fileName: string;
    lineNumber: number;
    columnNumber: number;
}

interface QueryItem extends CodePlaceable {
    measurements: [number, number][];
    callers: CodePlaceable[]
}

export class SteroidExporter implements SpanExporter {
    url: string;

    constructor({ apiUrl }: { apiUrl?: string } = {}) {
        this.url = `${apiUrl || baseUrl}${tracePath}`;
    }

    export(spans: ReadableSpan[], resultCallback: (result: ExportResult) => void): void {
        const steroidSpans: ReadableSpan[] = spans.filter(span => !!span.attributes && span.attributes['steroid.trace']);
        const queries: QueryItem[] = [];

        for (const span of steroidSpans) {
            const [queryPlace, ...callerSpans]: SteroidStackEntry[] = JSON.parse(span.attributes['steroid.trace'] as string);

            let queryItem: QueryItem | undefined = queries.find(q => findEqualCodePlace(q, queryPlace));

            if (!queryItem) {
                queryItem = {
                    fileName: queryPlace.fileName,
                    lineNumber: queryPlace.lineNumber,
                    columnNumber: queryPlace.columnNumber,
                    measurements: [],
                    callers: [],
                };
                queries.push(queryItem);
            }

            queryItem.measurements.push(span.duration);

            for (const callerSpan of callerSpans) {
                let callerItem = queryItem.callers.find(c => findEqualCodePlace(c, callerSpan));

                if (!callerItem) {
                    queryItem.callers.push({
                        fileName: callerSpan.fileName,
                        lineNumber: callerSpan.lineNumber,
                        columnNumber: callerSpan.columnNumber,
                    });
                }
            }
        }

        axios.post(this.url, { queries }, { headers: {
            token
        } }).then(() => resultCallback({ code: ExportResultCode.SUCCESS })).catch(e => console.log(e));
    }
    shutdown(): Promise<void> {
        return Promise.resolve();
        // throw new Error('Method not implemented.');
    }

}

function findEqualCodePlace(a: CodePlaceable, b: CodePlaceable) {
    return a.fileName === b.fileName && a.lineNumber === b.lineNumber && a.columnNumber === b.columnNumber;
}
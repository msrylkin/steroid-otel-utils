import callsites, { CallSite } from 'callsites';
import { TypeormInstrumentation } from 'opentelemetry-instrumentation-typeorm';

interface GetInstrumentationParams {
    wrapCallSite?: (originalCallStie: CallSite) => CallSite;
    projectPath?: string;
}

export function getSteroidInstrumentation({ wrapCallSite, projectPath }: GetInstrumentationParams) {
    const projectRootPath = projectPath ? projectPath : process.cwd(); 
    return [
        new TypeormInstrumentation({
            collectParameters: true,
            responseHook: (span) => {
                const traces = callsites();
                const wrappedTraces = traces.map(orig => wrapCallSite ? wrapCallSite(orig) : orig);

                const results = [];
                wrappedTraces.shift(); // remove current file
                for (const trace of wrappedTraces) {
                    if (isProjectFile(trace.getFileName())) {
                        const fileName = trace.getFileName().replace(projectRootPath, '');
            
                        results.push({
                            fileName,
                            lineNumber: trace.getLineNumber(),
                            columnNumber: trace.getColumnNumber(),
                            functionName: trace.getFunctionName(),
                        });
                    }
                }
        
                span.setAttribute('steroid.callee.filename', '');
                span.setAttribute('steroid.callee.line', '');
                span.setAttribute('steroid.callee.column', '');
                span.setAttribute('steroid.trace', JSON.stringify(results));
            }
        }),
    ]
}

function isProjectFile(fileName: string) {
    return !(/node_modules/.test(fileName)) && !(/(^internal)/.test(fileName));
}

import IORedis from 'ioredis';
import { Queue, Worker, Job } from 'bullmq';
import fs from 'fs/promises';

export const redisConnection = new IORedis({ 
    host: 'redis', 
    port: 6379,
    maxRetriesPerRequest: null 
});

export const executionQueue = new Queue('code-execution', { connection: redisConnection });

export function setupWorker(compileFn: Function) {
    console.log("[INFO] Redis Worker initialized and listening for jobs...");

    return new Worker('code-execution', async (job: Job) => {
        const { type, code, file_name } = job.data;
        console.log(`[WORKER] Processing Job ${job.id} for ${file_name}`);

        // Write the file to the workspace
        await fs.writeFile(`/app/workspaces/${file_name}`, code);

        // FIX 1: Map the actual shell commands to run inside the container!
        const pairs: Record<string, string> = { py: "python", js: "node", ts: "node" };
        
        // Use the injected compile function
        const result = await compileFn(file_name, pairs[type], type);
        
        // Clean up safely so it doesn't crash the worker if the file is missing
        await fs.unlink(`/app/workspaces/${file_name}`).catch(() => {});

        // FIX 2: Use result.stdout, not result.output
        return {
            status: result.exitCode === 0 ? "success" : "error",
            output: result.stdout || null,
            error: result.stderr || (result.exitCode === 137 ? "Memory Limit Exceeded" : `Process exited with code ${result.exitCode}`)
        };
    }, { connection: redisConnection });
}
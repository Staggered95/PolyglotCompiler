import express, {Request, Response} from 'express';
import {spawn} from 'child_process';
import { executionQueue, setupWorker } from './redis';

const app = express();
app.use(express.static('views'));
app.use(express.json());

const types = ['js', 'ts', 'py'];
const pairs: Record<string, string> = { 'js': 'nodejs', 'ts': 'nodejs', 'py': 'python' };

const compile = (file_name: string, language: string, type: string): Promise<{exitCode: number | null, stdout: string, stderr: string}> => {
    return new Promise((resolve) => {
        const hostPath = process.env.HOST_WORKSPACE_PATH;
        console.log(`[INFO] Spawning docker container for ${file_name}...`);

        const docker = spawn('docker', [
            'run', '--rm', 
            '--memory=256m', 
            '--cpus=0.5', 
            '-v', `${hostPath}:/app/workspaces`, 
            `polyglot-${type}:latest`, 
            language, 
            `/app/workspaces/${file_name}`
        ]);
        
        let output = "";
        let errorOutput = "";

        const timeout = setTimeout(() => {
            console.error(`[CRITICAL] Time Limit Exceeded for ${file_name}. Killing container!`);
            docker.kill(); 
            resolve({
                exitCode: 124, 
                stdout: output,
                stderr: "Execution Error: Time Limit Exceeded (10 seconds)."
            });
        }, 10000);

        docker.on('error', (err) => {
            clearTimeout(timeout);
            console.error("Spawn Error:", err);
            console.error(`[ERROR] Failed to start container for ${file_name}:`, err.message);
            resolve({
                exitCode: -1,
                stdout: "",
                stderr: "Server Engine Error: Failed to start sandbox."
            });
        });

        docker.stdout.on('data', (data) => {
            output += data.toString();
        });

        docker.stderr.on('data', (data) => {
            errorOutput += data.toString();
        });

        docker.on('close', (code) => {
            clearTimeout(timeout); 
            
            if (code !== null) {
                resolve({
                    exitCode: code,
                    stdout: output,
                    stderr: errorOutput
                });
            }
        });
    });
};

setupWorker(compile);

const execute = async (req: Request, res: Response) => {
    const type = req.body.type;
    const code = req.body.code;
    
    if (!type || !code) return res.status(500).json({"status": "failed", "message": "Code or Type not provided"});
    if (!types.includes(type)) return res.status(500).json({"status": "failed", "message": "This language is not supported"});
    
    const randomName = Math.random().toString().substring(2, 9);
    const file_name = `script_${randomName}.${type}`;

    console.log(`[API] Adding ${file_name} to queue...`);
    
    const job = await executionQueue.add('run-code', { type, code, file_name });
    
    res.json({ jobId: job.id, status: "queued" });
};

const checkStatus = async (req: Request, res: Response) => {
    const job = await executionQueue.getJob(req.params.jobId as string);
    
    if (!job) {
        return res.status(404).json({ error: "Job not found" });
    }

    const state = await job.getState();
    
    if (state === 'completed') {
        res.json({ state, result: job.returnvalue });
    } else if (state === 'failed') {
        res.json({ state, error: job.failedReason });
    } else {
        res.json({ state }); 
    }
};

const health = (req: Request, res: Response) => {
    res.status(200).json({ status: "success", message: "You have successfully reached the server" });
};

app.post('/execute', execute);
app.get('/status/:jobId', checkStatus);
app.get('/health', health);

app.listen(5000, () => {
    console.log("Polyglot Engine listening on port 5000...");
});
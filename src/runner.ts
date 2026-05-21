import express, {Request, Response} from 'express';
import fs from 'fs/promises';
import {spawn} from 'child_process';
const app = express();
app.use(express.static('views'));
app.use(express.json());

const types = ['js', 'ts', 'py'];
const pairs: Record<string, string> = { 'js': 'nodejs', 'ts': 'nodejs', 'py': 'python' };

const compile = (file_name: string, language: string, type: string): Promise<{exitCode: number | null, stdout: string, stderr: string}> => {
    return new Promise((resolve) => {
        const hostPath = process.env.HOST_WORKSPACE_PATH;
        
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
            docker.kill(); 
            resolve({
                exitCode: 124, 
                stdout: output,
                stderr: "Execution Error: Time Limit Exceeded (5 seconds)."
            });
        }, 5000);

        docker.on('error', (err) => {
            clearTimeout(timeout);
            console.error("Spawn Error:", err);
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

const execute = async (req: Request, res: Response) => {
    const type = req.body.type;
    const code = req.body.code;
    if (!type || !code) return res.status(500).json({"status": "failed", "message": "Code or Type not provided"});
    if (!types.includes(type)) return res.status(500).json({"status": "failed", "message": "This language is not supported"});
    const randomName = Math.random().toString().substring(2, 9);
    const file_name = `script_${randomName}.${type}`;

    try {
        await fs.writeFile(`/app/workspaces/${file_name}`, code);
        console.log("File written successfully");
    } catch (err) {
        console.error("Error writing file:", err);
        return res.status(500).json({status: "failed", message: "Server file error"});
    }

    const result = await compile(file_name, pairs[type], type);
    await fs.unlink(`/app/workspaces/${file_name}`);

    let finalError = result.stderr;
    if (result.exitCode === 137) {
        finalError = "Execution Error: Memory Limit Exceeded (256MB).";
    }

    res.json({
        status: result.exitCode === 0 ? "success" : "failed",
        exitCode: result.exitCode,
        output: result.stdout,
        error: finalError
    });
}

const health = (req: Request, res: Response) => {
    res.status(200).json({ status: "success", message: "You have successfully reached the server" });
}

app.post('/execute', execute);
app.get('/health', health);

app.listen(5000, () => {
    console.log("Polyglot Engine listening on port 5000...");
});
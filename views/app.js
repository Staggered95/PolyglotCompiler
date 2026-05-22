const editor = CodeMirror.fromTextArea(document.getElementById("editor"), {
    lineNumbers: true,      
    theme: "nord",          
    mode: "python",         
    lineWrapping: true,    
});

const languageSelect = document.getElementById("language-select");
const templates = {
    py: `def main():\n    print("Hello, Polyglot!")\n\nif __name__ == "__main__":\n    main()`,
    js: `function main() {\n    console.log("Hello, Polyglot!");\n}\n\nmain();`
};

editor.setValue(templates[languageSelect.value]);

languageSelect.addEventListener("change", (e) => {
    const chosenLang = e.target.value;
    
    if (chosenLang === "py") {
        editor.setOption("mode", "python");
        editor.setValue(templates.py);
    } else if (chosenLang === "js") {
        editor.setOption("mode", "javascript");
        editor.setValue(templates.js);
    }
});

const runButton = document.getElementById("run-button");
const outputDisplay = document.getElementById("output");
const loader = document.getElementById("loader");

runButton.addEventListener("click", async () => {
    const codeToRun = editor.getValue();
    const selectedLang = languageSelect.value;

    loader.classList.remove("hidden");
    outputDisplay.textContent = "Added to Queue...";
    outputDisplay.style.color = "var(--text-main)"; 

    try {
        const submitRes = await fetch("/execute", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                type: selectedLang,
                code: codeToRun
            })
        });

        const { jobId } = await submitRes.json();

        const pollInterval = setInterval(async () => {
            const statusRes = await fetch(`/status/${jobId}`);
            const statusData = await statusRes.json();

            if (statusData.state === 'active') {
                outputDisplay.textContent = "Executing in Sandbox...";
            }

            if (statusData.state === 'completed') {
                clearInterval(pollInterval);
                const result = statusData.result;
                
                if (result.status === "success") {
                    outputDisplay.textContent = result.output || "Program finished with no output.";
                    outputDisplay.style.color = "var(--text-main)";
                } else {
                    outputDisplay.textContent = result.error || "Unknown execution error.";
                    outputDisplay.style.color = "#ff6b6b"; 
                }
                loader.classList.add("hidden");
            }
            
            if (statusData.state === 'failed') {
                clearInterval(pollInterval);
                outputDisplay.textContent = "Server Error: Worker failed to process job.";
                outputDisplay.style.color = "#ff6b6b";
                loader.classList.add("hidden");
            }
        }, 1000); 

    } catch (err) {
        outputDisplay.textContent = "Network Error: Could not connect to the API.";
        outputDisplay.style.color = "#ff6b6b";
        loader.classList.add("hidden");
    } 
});
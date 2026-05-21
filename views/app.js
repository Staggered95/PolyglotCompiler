const editor = CodeMirror.fromTextArea(document.getElementById("editor"), {
    lineNumbers: true,      
    theme: "nord",          
    mode: "python",         
    lineWrapping: true,    
});

// Listen for when the user changes the language dropdown
const languageSelect = document.getElementById("language-select");

languageSelect.addEventListener("change", (e) => {
    const chosenLang = e.target.value;
    
    if (chosenLang === "py") {
        editor.setOption("mode", "python");
    } else if (chosenLang === "js") {
        editor.setOption("mode", "javascript");
    }
});



// 1. Grab the UI elements from the DOM
const runButton = document.getElementById("run-button");
const outputDisplay = document.getElementById("output");
const loader = document.getElementById("loader");
// Note: We already have 'editor' and 'languageSelect' from your CodeMirror setup

runButton.addEventListener("click", async () => {
    // 2. Get the current text from CodeMirror and the dropdown
    const codeToRun = editor.getValue();
    const selectedLang = languageSelect.value;

    // 3. UI State: Show the spinner, clear old output, reset text color
    loader.classList.remove("hidden");
    outputDisplay.textContent = "Compiling...";
    outputDisplay.style.color = "var(--text-main)"; 

    try {
        // 4. Send the payload to your Docker API
        // Notice we just use '/execute' because the UI and API are on the same port!
        const response = await fetch("/execute", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                type: selectedLang,
                code: codeToRun
            })
        });

        // Parse the JSON response back into a JavaScript object
        const data = await response.json();

        // 5. Update the UI based on what the API returned
        if (data.status === "success") {
            // If success, show output (or a fallback message if it printed nothing)
            outputDisplay.textContent = data.output || "Program finished with no output.";
            outputDisplay.style.color = "var(--text-main)";
        } else {
            // If the code crashed or hit the timeout, show error in red
            outputDisplay.textContent = data.error || data.stderr || "Unknown execution error.";
            outputDisplay.style.color = "#ff6b6b"; 
        }

    } catch (err) {
        // This catches if the Docker server crashes or network fails
        outputDisplay.textContent = "Network Error: Could not connect to the API.";
        outputDisplay.style.color = "#ff6b6b";
        console.error("Fetch Error:", err);
    } finally {
        // 6. Hide the loader exactly when the response comes back, pass or fail
        loader.classList.add("hidden");
    }
});
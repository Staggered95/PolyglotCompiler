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
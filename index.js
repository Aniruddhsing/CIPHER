// Import the compiler functions
import { compiler, runner } from './compiler.js';

// Debug function
function updateDebug(info) {
    const debugElement = document.getElementById('debugInfo');
    debugElement.textContent += info + '\n';
}

// Clear debug info
function clearDebug() {
    const debugElement = document.getElementById('debugInfo');
    debugElement.textContent = '';
}

// Run button click event
document.getElementById("runButton").addEventListener("click", function () {
    try {
        clearDebug();
        const inputCode = document.getElementById("input").value;
        updateDebug(`Input code: ${inputCode}`);

        const compiledCode = compiler(inputCode);
        updateDebug(`Compiled code: ${compiledCode}`);

        // Execute the compiled code and store the result
        const executionResult = runner(compiledCode);
        updateDebug(`Execution result: ${executionResult}`);

        // Display the execution result in the output textarea
        const outputElement = document.getElementById("output");
        outputElement.value = executionResult !== null ? executionResult : "Error during code execution";

    } catch (error) {
        console.error("Error:", error);
        updateDebug(`Error: ${error.message}`);
        document.getElementById("output").value = `Error: ${error.message}`;
    }
}); 
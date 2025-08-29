import { useState } from "react";
import Editor from "react-simple-code-editor";
import Prism from "prismjs";
import "prismjs/themes/prism-tomorrow.css"; // Tema oscuro
import "prismjs/components/prism-java"; // Soporte Java

function IDE() {
  const [code, setCode] = useState(`public class Main {
  public static void main(String[] args) {
    System.out.println("Hola Mundo");
  }
}`);

  const [semanticResult, setSemanticResult] = useState("");
  const [syntaxResult, setSyntaxResult] = useState("");

  const highlight = (code) =>
    Prism.highlight(code, Prism.languages.java, "java");

  const handleRunAnalysis = () => {
    setSemanticResult("Resultado del análisis semántico...");
    setSyntaxResult("Resultado del análisis sintáctico...");
  };

  const handleClear = () => {
    setCode("");
    setSemanticResult("");
    setSyntaxResult("");
  };

  return (
    <div className="h-screen bg-gray-900 text-white flex flex-col">
      <header className="p-4 bg-indigo-600 text-center text-3xl font-bold">
        WarningCode
      </header>

      <div className="flex flex-1">
        {/* Área de código con resaltado */}
        <div className="w-full p-4 border-r-2 border-gray-700">
          <Editor
            value={code}
            onValueChange={(code) => setCode(code)}
            highlight={highlight}
            padding={12}
            className="w-full h-full font-mono text-lg bg-gray-800 text-white rounded-lg overflow-auto"
            style={{
              minHeight: "100%",
              outline: "none",
            }}
          />
        </div>
      </div>

      {/* Consola para el análisis semántico */}
      <div className="h-1/3 p-4 bg-gray-800 border-t-2 border-gray-700 overflow-auto">
        <h2 className="text-xl font-bold mb-4">Consola Semántica</h2>
        <div>{semanticResult || "No se ha ejecutado el análisis semántico"}</div>
      </div>

      <div className="p-4 bg-indigo-600 flex justify-between">
        <div className="flex space-x-4">
          <button
            onClick={handleRunAnalysis}
            className="bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600"
          >
            Ejecutar Análisis
          </button>
          <button
            onClick={handleClear}
            className="bg-red-500 text-white py-2 px-4 rounded hover:bg-red-600"
          >
            Limpiar
          </button>
        </div>
      </div>
    </div>
  );
}

export default IDE;

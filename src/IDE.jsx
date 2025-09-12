import { useState } from "react";
import Editor from "@monaco-editor/react";

function IDE() {
  const [code, setCode] = useState(`public class Main {
    public static void main(String[] args) {
        System.out.println("Hola Mundo");
    }
}`);

  const [semanticResult, setSemanticResult] = useState("");
  const [syntaxResult, setSyntaxResult] = useState("");

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => setCode(reader.result);
      reader.readAsText(file);
    }
  };

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
      {/* Header */}
      <header className="p-2 bg-indigo-600 text-center text-yellow-300 text-3xl font-bold">
        WarningCode
      </header>

      {/* Contenedor principal dividido en editor + consola */}
      <div className="flex-1 flex flex-col">
        {/* Editor ocupa 2/3 de la altura */}
        <div className="flex-1 border-b-2 border-gray-700">
          <Editor
            height="100%"
            language="java"
            value={code}
            onChange={(value) => setCode(value || "")}
            theme="vs-dark"
            options={{
              fontSize: 16,
              minimap: { enabled: false },
              automaticLayout: true,
              scrollBeyondLastLine: false,
              wordWrap: "on",
            }}
          />
        </div>

        {/* Consola ocupa 1/3 de la altura */}
        <div className="h-1/3 p-4 bg-gray-800 overflow-auto">
          <h2 className="text-xl font-bold mb-2">Consola Sintáctica</h2>
          <div className="mb-4">
            {syntaxResult || "No se ha ejecutado el análisis sintáctico"}
          </div>
          <h2 className="text-xl font-bold mb-2">Consola Semántica</h2>
          <div>{semanticResult || "No se ha ejecutado el análisis semántico"}</div>
        </div>
      </div>

      {/* Barra inferior con acciones */}
      <div className="p-4 bg-indigo-600 flex justify-between">
        <div className="flex space-x-4">
          <label className="bg-green-500 text-white py-2 px-4 rounded cursor-pointer hover:bg-green-600">
            Cargar Archivo
            <input
              type="file"
              accept=".txt,.java,.js"
              className="hidden"
              onChange={handleFileUpload}
            />
          </label>
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

import { useState, useRef } from "react";
import Editor from "@monaco-editor/react";
import { analyzeLexicalSyntactic } from "./lexer-parser.js";
import { analyzeSemantics } from "./semantic-analyzer.js";
import { FileText, Play, Trash2, Eye, EyeOff, AlertTriangle, CheckCircle, XCircle } from "lucide-react";

function IDE() {
  const [code, setCode] = useState(`// Ejemplo de código JavaScript
const greeting = "Hola Mundo";
let count = 0;

function sayHello(name) {
  console.log(greeting + ", " + name);
  count++;
  return count;
}

// Error intencional para demostrar análisis
let undeclaredVariable = someUndefinedVar;

sayHello("Usuario");`);

  const [lexicalResult, setLexicalResult] = useState("");
  const [syntacticResult, setSyntacticResult] = useState("");
  const [semanticResult, setSemanticResult] = useState("");
  const [analysisStats, setAnalysisStats] = useState(null);
  const [showConsole, setShowConsole] = useState(true);
  const [consoleHeight, setConsoleHeight] = useState(300);
  const [activeTab, setActiveTab] = useState("lexical");

  const editorRef = useRef(null);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file && (file.name.endsWith('.js') || file.name.endsWith('.txt'))) {
      const reader = new FileReader();
      reader.onload = () => setCode(reader.result);
      reader.readAsText(file);
    } else {
      alert('Por favor, selecciona un archivo .js o .txt');
    }
  };

  const handleRunAnalysis = () => {
    try {
      // Análisis léxico y sintáctico
      const lexSyntaxResults = analyzeLexicalSyntactic(code);
      setLexicalResult(lexSyntaxResults.lexicalResult);
      setSyntacticResult(lexSyntaxResults.syntacticResult);

      // Análisis semántico
      const semanticResults = analyzeSemantics(code);
      setSemanticResult(semanticResults.result);

      // Estadísticas generales
      setAnalysisStats({
        lexicalErrors: lexSyntaxResults.lexicalErrors || 0,
        syntaxErrors: lexSyntaxResults.syntaxErrors || 0,
        semanticErrors: semanticResults.errorCount || 0,
        warnings: semanticResults.warningCount || 0,
        linesOfCode: code.split('\n').length,
        tokens: lexSyntaxResults.tokenCount || 0
      });
    } catch (error) {
      setLexicalResult("Error durante el análisis: " + error.message);
      setSyntacticResult("Error durante el análisis: " + error.message);
      setSemanticResult("Error durante el análisis: " + error.message);
    }
  };

  const handleClearCode = () => {
    setCode("");
    handleClearConsole();
  };

  const handleClearConsole = () => {
    setLexicalResult("");
    setSyntacticResult("");
    setSemanticResult("");
    setAnalysisStats(null);
  };

  const toggleConsole = () => setShowConsole(!showConsole);

  const handleMouseDown = (e) => {
    const startY = e.clientY;
    const startHeight = consoleHeight;

    const onMouseMove = (eMove) => {
      const newHeight = startHeight - (eMove.clientY - startY);
      if (newHeight > 100 && newHeight < window.innerHeight - 150) {
        setConsoleHeight(newHeight);
      }
    };

    const onMouseUp = () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  const getStatusIcon = (errors) => {
    if (errors === 0) return <CheckCircle className="text-green-400" size={16} />;
    return <XCircle className="text-red-400" size={16} />;
  };

  return (
    <div className="h-screen bg-gray-900 text-white flex flex-col relative">
      {/* Header */}
      <header className="p-3 bg-gradient-to-r from-indigo-600 to-purple-600 flex justify-between items-center z-10 shadow-lg">
        <div className="flex items-center gap-3">
          <span className="text-yellow-300 text-3xl font-bold">⚠️ WarningCode</span>
          <span className="text-sm text-gray-200">Analizador JavaScript Avanzado</span>
        </div>
        <div className="flex space-x-2">
          <label className="bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded-lg flex items-center gap-2 cursor-pointer transition-colors shadow-md">
            <FileText size={16} /> Cargar Archivo
            <input
              type="file"
              accept=".js,.txt"
              className="hidden"
              onChange={handleFileUpload}
            />
          </label>
          <button
            onClick={handleRunAnalysis}
            className="bg-blue-500 hover:bg-blue-600 py-2 px-4 rounded-lg flex items-center gap-2 transition-colors shadow-md"
          >
            <Play size={16} /> Analizar
          </button>
          <button
            onClick={handleClearCode}
            className="bg-red-500 hover:bg-red-600 py-2 px-4 rounded-lg flex items-center gap-2 transition-colors shadow-md"
          >
            <Trash2 size={16} /> Limpiar
          </button>
        </div>
      </header>

      {/* Stats Bar */}
      {analysisStats && (
        <div className="bg-gray-800 px-4 py-2 flex gap-6 text-sm border-b border-gray-700">
          <div className="flex items-center gap-1">
            {getStatusIcon(analysisStats.lexicalErrors)}
            <span>Léxico: {analysisStats.lexicalErrors} errores</span>
          </div>
          <div className="flex items-center gap-1">
            {getStatusIcon(analysisStats.syntaxErrors)}
            <span>Sintáctico: {analysisStats.syntaxErrors} errores</span>
          </div>
          <div className="flex items-center gap-1">
            {getStatusIcon(analysisStats.semanticErrors)}
            <span>Semántico: {analysisStats.semanticErrors} errores</span>
          </div>
          <div className="flex items-center gap-1">
            <AlertTriangle className="text-yellow-400" size={16} />
            <span>Advertencias: {analysisStats.warnings}</span>
          </div>
          <div className="text-gray-400">
            Líneas: {analysisStats.linesOfCode} | Tokens: {analysisStats.tokens}
          </div>
        </div>
      )}

      {/* Editor */}
      <div
        className="flex-1 border-b-2 border-gray-700"
        style={{ marginBottom: showConsole ? consoleHeight : 0 }}
      >
        <Editor
          height="100%"
          language="javascript"
          value={code}
          onChange={(value) => setCode(value || "")}
          theme="vs-dark"
          options={{
            fontSize: 16,
            minimap: { enabled: false },
            automaticLayout: true,
            scrollBeyondLastLine: false,
            wordWrap: "on",
            lineNumbers: "on",
            renderWhitespace: "boundary",
            showFoldingControls: "always",
          }}
          onMount={(editor) => (editorRef.current = editor)}
        />
      </div>

      {/* Console */}
      {showConsole && (
        <div
          className="bg-gray-800 overflow-hidden fixed bottom-0 left-0 w-full z-20 shadow-2xl"
          style={{ height: consoleHeight }}
        >
          <div
            className="h-2 bg-gray-700 cursor-row-resize hover:bg-gray-600 transition-colors"
            onMouseDown={handleMouseDown}
          ></div>

          <div className="flex h-full">
            {/* Tabs */}
            <div className="w-48 bg-gray-900 border-r border-gray-700">
              <div className="p-2">
                <h3 className="text-sm font-semibold text-gray-300 mb-2">Resultados</h3>
                <div className="space-y-1">
                  <button
                    onClick={() => setActiveTab("lexical")}
                    className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${activeTab === "lexical"
                      ? "bg-blue-600 text-white"
                      : "text-gray-300 hover:bg-gray-700"
                      }`}
                  >
                    🔤 Análisis Léxico
                  </button>
                  <button
                    onClick={() => setActiveTab("syntactic")}
                    className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${activeTab === "syntactic"
                      ? "bg-green-600 text-white"
                      : "text-gray-300 hover:bg-gray-700"
                      }`}
                  >
                    🌳 Análisis Sintáctico
                  </button>
                  <button
                    onClick={() => setActiveTab("semantic")}
                    className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${activeTab === "semantic"
                      ? "bg-purple-600 text-white"
                      : "text-gray-300 hover:bg-gray-700"
                      }`}
                  >
                    🧠 Análisis Semántico
                  </button>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 p-4 overflow-auto">
              {activeTab === "lexical" && (
                <div>
                  <h4 className="text-lg font-semibold mb-3 text-blue-300">Análisis Léxico</h4>
                  <pre className="whitespace-pre-wrap text-sm font-mono bg-gray-900 p-3 rounded border">
                    {lexicalResult || "No se ha ejecutado el análisis léxico"}
                  </pre>
                </div>
              )}

              {activeTab === "syntactic" && (
                <div>
                  <h4 className="text-lg font-semibold mb-3 text-green-300">Análisis Sintáctico</h4>
                  <pre className="whitespace-pre-wrap text-sm font-mono bg-gray-900 p-3 rounded border">
                    {syntacticResult || "No se ha ejecutado el análisis sintáctico"}
                  </pre>
                </div>
              )}

              {activeTab === "semantic" && (
                <div>
                  <h4 className="text-lg font-semibold mb-3 text-purple-300">Análisis Semántico</h4>
                  <pre className="whitespace-pre-wrap text-sm font-mono bg-gray-900 p-3 rounded border">
                    {semanticResult || "No se ha ejecutado el análisis semántico"}
                  </pre>
                </div>
              )}

              {/* Clear button */}
              <button
                onClick={handleClearConsole}
                className="mt-4 bg-purple-500 hover:bg-purple-600 py-2 px-4 rounded-lg flex items-center gap-2 transition-colors"
              >
                <Trash2 size={16} /> Limpiar Consola
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toggle Console Tab */}
      <div
        onClick={toggleConsole}
        className={`fixed top-1/2 -translate-y-1/2 z-30 flex items-center px-3 py-2 rounded-l-lg cursor-pointer transition-all duration-300 shadow-lg
        ${showConsole ? 'right-0 bg-yellow-500 hover:bg-yellow-600' : '-right-6 bg-yellow-500 hover:bg-yellow-600'}`}
        style={{ top: '50%', transform: 'translateY(100%)' }}
        onMouseEnter={(e) => {
          if (!showConsole) e.currentTarget.style.right = '0px';
        }}
        onMouseLeave={(e) => {
          if (!showConsole) e.currentTarget.style.right = '-24px';
        }}
      >
        {showConsole ? <EyeOff size={16} /> : <Eye size={16} />}
        <span className="ml-2 text-sm font-medium">
          {showConsole ? '' : ''}
        </span>
      </div>
    </div>
  );
}

export default IDE;
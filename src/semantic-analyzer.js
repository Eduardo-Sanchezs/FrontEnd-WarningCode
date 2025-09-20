// semantic-analyzer.js
// Analizador Semántico para JavaScript

class SymbolTable {
    constructor(parent = null) {
        this.parent = parent;
        this.symbols = new Map();
        this.children = [];
        this.scopeType = 'block'; // 'global', 'function', 'block'
    }

    define(name, info) {
        if (this.symbols.has(name)) {
            return {
                error: `Variable '${name}' is already declared in this scope`,
                line: info.line,
                column: info.column
            };
        }
        this.symbols.set(name, info);
        return null;
    }

    lookup(name) {
        if (this.symbols.has(name)) {
            return this.symbols.get(name);
        }
        if (this.parent) {
            return this.parent.lookup(name);
        }
        return null;
    }

    createChild(scopeType = 'block') {
        const child = new SymbolTable(this);
        child.scopeType = scopeType;
        this.children.push(child);
        return child;
    }

    getAllSymbols() {
        const symbols = new Map(this.symbols);
        if (this.parent) {
            const parentSymbols = this.parent.getAllSymbols();
            for (const [name, info] of parentSymbols) {
                if (!symbols.has(name)) {
                    symbols.set(name, info);
                }
            }
        }
        return symbols;
    }
}

class SemanticAnalyzer {
    constructor() {
        this.globalScope = new SymbolTable();
        this.currentScope = this.globalScope;
        this.errors = [];
        this.warnings = [];
        this.functionStack = [];

        // Initialize built-in objects and functions
        this.initializeBuiltins();
    }

    initializeBuiltins() {
        const builtins = [
            // Global objects
            { name: 'console', type: 'object', builtin: true },
            { name: 'window', type: 'object', builtin: true },
            { name: 'document', type: 'object', builtin: true },
            { name: 'Array', type: 'function', builtin: true },
            { name: 'Object', type: 'function', builtin: true },
            { name: 'String', type: 'function', builtin: true },
            { name: 'Number', type: 'function', builtin: true },
            { name: 'Boolean', type: 'function', builtin: true },
            { name: 'Date', type: 'function', builtin: true },
            { name: 'RegExp', type: 'function', builtin: true },
            { name: 'Math', type: 'object', builtin: true },
            { name: 'JSON', type: 'object', builtin: true },

            // Global functions
            { name: 'parseInt', type: 'function', builtin: true },
            { name: 'parseFloat', type: 'function', builtin: true },
            { name: 'isNaN', type: 'function', builtin: true },
            { name: 'isFinite', type: 'function', builtin: true },
            { name: 'eval', type: 'function', builtin: true },
            { name: 'setTimeout', type: 'function', builtin: true },
            { name: 'setInterval', type: 'function', builtin: true },
            { name: 'clearTimeout', type: 'function', builtin: true },
            { name: 'clearInterval', type: 'function', builtin: true },

            // Global variables
            { name: 'undefined', type: 'undefined', builtin: true },
            { name: 'NaN', type: 'number', builtin: true },
            { name: 'Infinity', type: 'number', builtin: true }
        ];

        builtins.forEach(builtin => {
            this.globalScope.define(builtin.name, {
                type: builtin.type,
                builtin: true,
                initialized: true,
                used: false,
                line: 0,
                column: 0
            });
        });
    }

    addError(message, node = null) {
        this.errors.push({
            type: 'error',
            message,
            line: node?.line || 0,
            column: node?.column || 0,
            node: node?.type || 'unknown'
        });
    }

    addWarning(message, node = null) {
        this.warnings.push({
            type: 'warning',
            message,
            line: node?.line || 0,
            column: node?.column || 0,
            node: node?.type || 'unknown'
        });
    }

    enterScope(scopeType = 'block') {
        this.currentScope = this.currentScope.createChild(scopeType);
    }

    exitScope() {
        if (this.currentScope.parent) {
            this.currentScope = this.currentScope.parent;
        }
    }

    analyzeNode(node) {
        if (!node) return;

        switch (node.type) {
            case 'Program':
                this.analyzeProgram(node);
                break;
            case 'VariableDeclaration':
                this.analyzeVariableDeclaration(node);
                break;
            case 'FunctionDeclaration':
                this.analyzeFunctionDeclaration(node);
                break;
            case 'Identifier':
                return this.analyzeIdentifier(node);
            case 'AssignmentExpression':
                this.analyzeAssignmentExpression(node);
                break;
            case 'CallExpression':
                this.analyzeCallExpression(node);
                break;
            case 'MemberExpression':
                this.analyzeMemberExpression(node);
                break;
            case 'BinaryExpression':
                this.analyzeBinaryExpression(node);
                break;
            case 'UnaryExpression':
                this.analyzeUnaryExpression(node);
                break;
            case 'UpdateExpression':
                this.analyzeUpdateExpression(node);
                break;
            case 'LogicalExpression':
                this.analyzeLogicalExpression(node);
                break;
            case 'ConditionalExpression':
                this.analyzeConditionalExpression(node);
                break;
            case 'BlockStatement':
                this.analyzeBlockStatement(node);
                break;
            case 'ExpressionStatement':
                this.analyzeExpressionStatement(node);
                break;
            case 'IfStatement':
                this.analyzeIfStatement(node);
                break;
            case 'WhileStatement':
                this.analyzeWhileStatement(node);
                break;
            case 'ForStatement':
                this.analyzeForStatement(node);
                break;
            case 'ReturnStatement':
                this.analyzeReturnStatement(node);
                break;
            case 'ArrayExpression':
                this.analyzeArrayExpression(node);
                break;
            case 'ObjectExpression':
                this.analyzeObjectExpression(node);
                break;
            case 'Literal':
                return this.analyzeLiteral(node);
            case 'TemplateLiteral':
                return this.analyzeTemplateLiteral(node);
            default:
                this.addWarning(`Unknown node type: ${node.type}`, node);
        }
    }

    analyzeProgram(node) {
        this.currentScope.scopeType = 'global';

        // First pass: collect all function declarations (hoisting)
        node.body.forEach(stmt => {
            if (stmt.type === 'FunctionDeclaration') {
                this.hoistFunctionDeclaration(stmt);
            }
        });

        // Second pass: analyze all statements
        node.body.forEach(stmt => this.analyzeNode(stmt));

        // Check for unused variables
        this.checkUnusedVariables();
    }

    hoistFunctionDeclaration(node) {
        if (node.id && node.id.name) {
            const error = this.currentScope.define(node.id.name, {
                type: 'function',
                initialized: true,
                used: false,
                params: node.params ? node.params.map(p => p.name) : [],
                line: node.line || 0,
                column: node.column || 0,
                hoisted: true
            });

            if (error) {
                this.addError(error.error, node);
            }
        }
    }

    analyzeVariableDeclaration(node) {
        node.declarations.forEach(declarator => {
            if (declarator.id && declarator.id.name) {
                const varInfo = {
                    type: node.kind === 'const' ? 'const' : 'variable',
                    kind: node.kind,
                    initialized: !!declarator.init,
                    used: false,
                    line: declarator.line || 0,
                    column: declarator.column || 0
                };

                // Check for const without initializer
                if (node.kind === 'const' && !declarator.init) {
                    this.addError(`Missing initializer in const declaration '${declarator.id.name}'`, declarator);
                }

                const error = this.currentScope.define(declarator.id.name, varInfo);
                if (error) {
                    // Check if it's a redeclaration with different kind
                    const existing = this.currentScope.lookup(declarator.id.name);
                    if (existing && existing.kind !== node.kind) {
                        this.addError(`Identifier '${declarator.id.name}' has already been declared with different kind`, declarator);
                    } else {
                        this.addError(error.error, declarator);
                    }
                }

                // Analyze initializer
                if (declarator.init) {
                    this.analyzeNode(declarator.init);
                }
            }
        });
    }

    analyzeFunctionDeclaration(node) {
        if (node.id && node.id.name) {
            // Enter function scope
            this.enterScope('function');
            this.functionStack.push({
                name: node.id.name,
                hasReturn: false,
                node: node
            });

            // Define parameters in function scope
            if (node.params) {
                node.params.forEach(param => {
                    if (param.name) {
                        this.currentScope.define(param.name, {
                            type: 'parameter',
                            initialized: true,
                            used: false,
                            line: param.line || 0,
                            column: param.column || 0
                        });
                    }
                });
            }

            // Analyze function body
            if (node.body) {
                this.analyzeNode(node.body);
            }

            // Check if function should return a value
            const currentFunction = this.functionStack.pop();
            if (!currentFunction.hasReturn && node.id.name !== 'main') {
                this.addWarning(`Function '${node.id.name}' does not have a return statement`, node);
            }

            this.exitScope();
        }
    }

    analyzeIdentifier(node) {
        if (!node.name) return;

        const symbol = this.currentScope.lookup(node.name);
        if (!symbol) {
            this.addError(`'${node.name}' is not defined`, node);
            return { type: 'unknown' };
        }

        // Mark as used
        symbol.used = true;

        // Check if variable is used before initialization
        if (!symbol.initialized && symbol.type !== 'function' && !symbol.builtin) {
            this.addError(`Variable '${node.name}' is used before being initialized`, node);
        }

        return { type: symbol.type };
    }

    analyzeAssignmentExpression(node) {
        // Analyze right side first
        const rightType = this.analyzeNode(node.right);

        // Check left side
        if (node.left) {
            if (node.left.type === 'Identifier') {
                const symbol = this.currentScope.lookup(node.left.name);
                if (!symbol) {
                    this.addError(`Cannot assign to undeclared variable '${node.left.name}'`, node.left);
                } else {
                    // Check const assignment
                    if (symbol.type === 'const' && symbol.initialized) {
                        this.addError(`Cannot assign to const variable '${node.left.name}'`, node.left);
                    }

                    // Mark as initialized if it's a variable
                    if (symbol.type === 'variable' || symbol.type === 'const') {
                        symbol.initialized = true;
                    }
                }
            } else {
                // Member expressions, etc.
                this.analyzeNode(node.left);
            }
        }

        // Type checking for specific operators
        if (node.operator === '+=') {
            // Both operands should be compatible for addition
            this.checkArithmeticCompatibility(node.left, node.right, node);
        } else if (['*=', '/=', '-=', '%='].includes(node.operator)) {
            // Should be numeric
            this.checkNumericOperation(node.left, node.right, node);
        }
    }

    analyzeCallExpression(node) {
        // Analyze callee
        let calleeType = null;
        if (node.callee) {
            if (node.callee.type === 'Identifier') {
                const symbol = this.currentScope.lookup(node.callee.name);
                if (!symbol) {
                    this.addError(`'${node.callee.name}' is not defined`, node.callee);
                } else if (symbol.type !== 'function') {
                    this.addWarning(`'${node.callee.name}' is not a function`, node.callee);
                } else {
                    calleeType = symbol;
                    symbol.used = true;
                }
            } else {
                this.analyzeNode(node.callee);
            }
        }

        // Analyze arguments
        if (node.arguments) {
            node.arguments.forEach(arg => this.analyzeNode(arg));

            // Check argument count for known functions
            if (calleeType && calleeType.params) {
                if (node.arguments.length !== calleeType.params.length) {
                    this.addWarning(
                        `Function '${node.callee.name}' expects ${calleeType.params.length} arguments, got ${node.arguments.length}`,
                        node
                    );
                }
            }
        }
    }

    analyzeMemberExpression(node) {
        if (node.object) {
            this.analyzeNode(node.object);
        }

        if (node.computed && node.property) {
            this.analyzeNode(node.property);
        }

        // Check for common mistakes
        if (node.object && node.object.type === 'Identifier' && node.object.name === 'console') {
            if (node.property && node.property.name && !['log', 'warn', 'error', 'info', 'debug'].includes(node.property.name)) {
                this.addWarning(`Unknown console method: ${node.property.name}`, node);
            }
        }
    }

    analyzeBinaryExpression(node) {
        const leftType = this.analyzeNode(node.left);
        const rightType = this.analyzeNode(node.right);

        // Type checking
        if (['==', '===', '!=', '!=='].includes(node.operator)) {
            if (node.operator === '==' || node.operator === '!=') {
                this.addWarning(`Use '${node.operator}=' for strict comparison instead of '${node.operator}'`, node);
            }
        } else if (['+', '-', '*', '/', '%', '**'].includes(node.operator)) {
            this.checkArithmeticCompatibility(node.left, node.right, node);
        } else if (['<', '>', '<=', '>='].includes(node.operator)) {
            // Comparison operators
            this.checkComparisonCompatibility(node.left, node.right, node);
        }
    }

    analyzeUnaryExpression(node) {
        this.analyzeNode(node.argument);

        if (node.operator === '!') {
            // Logical NOT - check for double negation
            if (node.argument && node.argument.type === 'UnaryExpression' && node.argument.operator === '!') {
                this.addWarning('Double negation (!!), consider using Boolean() instead', node);
            }
        } else if (node.operator === 'typeof') {
            // typeof is always safe
        } else if (['+', '-'].includes(node.operator)) {
            // Numeric unary operators
            this.checkNumericOperation(node.argument, null, node);
        } else if (node.operator === 'delete') {
            // Delete operator warnings
            if (node.argument && node.argument.type === 'Identifier') {
                this.addWarning(`Delete of unqualified identifier '${node.argument.name}' in strict mode`, node);
            }
        }
    }

    analyzeUpdateExpression(node) {
        if (node.argument && node.argument.type === 'Identifier') {
            const symbol = this.currentScope.lookup(node.argument.name);
            if (!symbol) {
                this.addError(`Cannot update undeclared variable '${node.argument.name}'`, node.argument);
            } else if (symbol.type === 'const') {
                this.addError(`Cannot update const variable '${node.argument.name}'`, node.argument);
            } else {
                symbol.used = true;
            }
        } else if (node.argument) {
            this.analyzeNode(node.argument);
        }
    }

    analyzeLogicalExpression(node) {
        this.analyzeNode(node.left);
        this.analyzeNode(node.right);

        // Check for potential short-circuit issues
        if (node.operator === '&&') {
            // Check if left side is always falsy
            if (this.isAlwaysFalsy(node.left)) {
                this.addWarning('Left side of && is always falsy, right side will never execute', node);
            }
        } else if (node.operator === '||') {
            // Check if left side is always truthy
            if (this.isAlwaysTruthy(node.left)) {
                this.addWarning('Left side of || is always truthy, right side will never execute', node);
            }
        }
    }

    analyzeConditionalExpression(node) {
        this.analyzeNode(node.test);
        this.analyzeNode(node.consequent);
        this.analyzeNode(node.alternate);

        // Check for always true/false conditions
        if (this.isAlwaysTruthy(node.test)) {
            this.addWarning('Condition is always truthy, alternate branch will never execute', node);
        } else if (this.isAlwaysFalsy(node.test)) {
            this.addWarning('Condition is always falsy, consequent branch will never execute', node);
        }
    }

    analyzeBlockStatement(node) {
        this.enterScope('block');
        if (node.body) {
            node.body.forEach(stmt => this.analyzeNode(stmt));
        }
        this.exitScope();
    }

    analyzeExpressionStatement(node) {
        if (node.expression) {
            this.analyzeNode(node.expression);
        }
    }

    analyzeIfStatement(node) {
        if (node.test) {
            this.analyzeNode(node.test);

            // Check for always true/false conditions
            if (this.isAlwaysTruthy(node.test)) {
                this.addWarning('Condition is always truthy', node);
            } else if (this.isAlwaysFalsy(node.test)) {
                this.addWarning('Condition is always falsy', node);
            }
        }

        if (node.consequent) {
            this.analyzeNode(node.consequent);
        }

        if (node.alternate) {
            this.analyzeNode(node.alternate);
        }
    }

    analyzeWhileStatement(node) {
        if (node.test) {
            this.analyzeNode(node.test);

            // Check for infinite loops
            if (this.isAlwaysTruthy(node.test)) {
                this.addWarning('Potential infinite loop: condition is always truthy', node);
            }
        }

        if (node.body) {
            this.analyzeNode(node.body);
        }
    }

    analyzeForStatement(node) {
        this.enterScope('block');

        if (node.init) {
            this.analyzeNode(node.init);
        }

        if (node.test) {
            this.analyzeNode(node.test);

            if (this.isAlwaysFalsy(node.test)) {
                this.addWarning('For loop condition is always falsy, loop will not execute', node);
            }
        }

        if (node.update) {
            this.analyzeNode(node.update);
        }

        if (node.body) {
            this.analyzeNode(node.body);
        }

        this.exitScope();
    }

    analyzeReturnStatement(node) {
        if (this.functionStack.length > 0) {
            this.functionStack[this.functionStack.length - 1].hasReturn = true;
        } else {
            this.addError('Return statement outside of function', node);
        }

        if (node.argument) {
            this.analyzeNode(node.argument);
        }
    }

    analyzeArrayExpression(node) {
        if (node.elements) {
            node.elements.forEach(element => {
                if (element) {
                    this.analyzeNode(element);
                }
            });
        }
    }

    analyzeObjectExpression(node) {
        const keys = new Set();

        if (node.properties) {
            node.properties.forEach(property => {
                if (property.key) {
                    let keyName = null;
                    if (property.key.type === 'Identifier') {
                        keyName = property.key.name;
                    } else if (property.key.type === 'Literal') {
                        keyName = property.key.value;
                    }

                    if (keyName !== null) {
                        if (keys.has(keyName)) {
                            this.addWarning(`Duplicate key '${keyName}' in object literal`, property);
                        }
                        keys.add(keyName);
                    }
                }

                if (property.value) {
                    this.analyzeNode(property.value);
                }
            });
        }
    }

    analyzeLiteral(node) {
        return { type: typeof node.value };
    }

    analyzeTemplateLiteral(node) {
        return { type: 'string' };
    }

    // Helper methods
    checkArithmeticCompatibility(left, right, node) {
        // This is a simplified check - in a real analyzer, you'd have more sophisticated type inference
        if (left && left.type === 'Literal' && typeof left.value === 'string' &&
            right && right.type === 'Literal' && typeof right.value === 'number') {
            this.addWarning('Adding string and number might produce unexpected results', node);
        }
    }

    checkNumericOperation(left, right, node) {
        // Check if operands are likely to be numeric
        if (left && left.type === 'Literal' && typeof left.value === 'string') {
            this.addWarning('Numeric operation on string value', node);
        }
        if (right && right.type === 'Literal' && typeof right.value === 'string') {
            this.addWarning('Numeric operation on string value', node);
        }
    }

    checkComparisonCompatibility(left, right, node) {
        // Check for potential type coercion issues
        if (left && right &&
            left.type === 'Literal' && right.type === 'Literal' &&
            typeof left.value !== typeof right.value) {
            this.addWarning('Comparing different types might produce unexpected results', node);
        }
    }

    isAlwaysTruthy(node) {
        if (!node) return false;

        if (node.type === 'Literal') {
            return !!node.value && node.value !== 0 && node.value !== '';
        }

        if (node.type === 'Identifier' && node.name === 'true') {
            return true;
        }

        return false;
    }

    isAlwaysFalsy(node) {
        if (!node) return false;

        if (node.type === 'Literal') {
            return !node.value || node.value === 0 || node.value === '';
        }

        if (node.type === 'Identifier' && (node.name === 'false' || node.name === 'undefined' || node.name === 'null')) {
            return true;
        }

        return false;
    }

    checkUnusedVariables() {
        const checkScope = (scope) => {
            scope.symbols.forEach((info, name) => {
                if (!info.used && !info.builtin && info.type !== 'function') {
                    this.addWarning(`Variable '${name}' is declared but never used`, {
                        line: info.line,
                        column: info.column
                    });
                }
            });

            scope.children.forEach(child => checkScope(child));
        };

        checkScope(this.globalScope);
    }

    generateReport() {
        let report = "=== ANÁLISIS SEMÁNTICO ===\n\n";

        report += `Errores semánticos: ${this.errors.length}\n`;
        report += `Advertencias: ${this.warnings.length}\n\n`;

        if (this.errors.length > 0) {
            report += "ERRORES SEMÁNTICOS:\n";
            this.errors.forEach((error, index) => {
                report += `${index + 1}. [Línea ${error.line}, Columna ${error.column}] ${error.message}\n`;
                if (error.node !== 'unknown') {
                    report += `   Tipo de nodo: ${error.node}\n`;
                }
            });
            report += "\n";
        }

        if (this.warnings.length > 0) {
            report += "ADVERTENCIAS:\n";
            this.warnings.forEach((warning, index) => {
                report += `${index + 1}. [Línea ${warning.line}, Columna ${warning.column}] ${warning.message}\n`;
                if (warning.node !== 'unknown') {
                    report += `   Tipo de nodo: ${warning.node}\n`;
                }
            });
            report += "\n";
        }

        // Symbol table report
        report += "TABLA DE SÍMBOLOS:\n";
        report += "Nombre\t\t\tTipo\t\tÁmbito\t\tUsado\tInicializado\n";
        report += "─".repeat(80) + "\n";

        const generateSymbolReport = (scope, scopeName, depth = 0) => {
            const indent = "  ".repeat(depth);
            scope.symbols.forEach((info, name) => {
                if (!info.builtin) {
                    const nameCol = (indent + name).padEnd(24);
                    const typeCol = info.type.padEnd(12);
                    const scopeCol = scopeName.padEnd(12);
                    const usedCol = info.used ? "✓" : "✗";
                    const initCol = info.initialized ? "✓" : "✗";

                    report += `${nameCol}\t${typeCol}\t${scopeCol}\t${usedCol}\t${initCol}\n`;
                }
            });

            scope.children.forEach((child, index) => {
                const childName = `${scopeName}.${child.scopeType}${index}`;
                generateSymbolReport(child, childName, depth + 1);
            });
        };

        generateSymbolReport(this.globalScope, "global");

        // Statistics
        report += "\nESTADÍSTICAS:\n";
        const allSymbols = this.globalScope.getAllSymbols();
        const stats = {
            variables: 0,
            constants: 0,
            functions: 0,
            parameters: 0,
            unused: 0
        };

        const countSymbols = (scope) => {
            scope.symbols.forEach((info) => {
                if (!info.builtin) {
                    switch (info.type) {
                        case 'variable':
                            stats.variables++;
                            break;
                        case 'const':
                            stats.constants++;
                            break;
                        case 'function':
                            stats.functions++;
                            break;
                        case 'parameter':
                            stats.parameters++;
                            break;
                    }

                    if (!info.used) {
                        stats.unused++;
                    }
                }
            });

            scope.children.forEach(child => countSymbols(child));
        };

        countSymbols(this.globalScope);

        report += `Variables: ${stats.variables}\n`;
        report += `Constantes: ${stats.constants}\n`;
        report += `Funciones: ${stats.functions}\n`;
        report += `Parámetros: ${stats.parameters}\n`;
        report += `Símbolos sin usar: ${stats.unused}\n`;

        return report;
    }
}

// Main semantic analysis function
export function analyzeSemantics(code) {
    try {
        // For this implementation, we'll need to parse the code first
        // In a real scenario, you'd import your AST from the lexer-parser

        // Simple AST extraction for demonstration
        // This is a simplified approach - in production, you'd use the full AST from the parser
        const analyzer = new SemanticAnalyzer();

        // Create a simple AST representation for testing
        // In practice, this would come from your parser
        const mockAST = createMockAST(code);

        if (mockAST) {
            analyzer.analyzeNode(mockAST);
        }

        const report = analyzer.generateReport();

        return {
            result: report,
            errorCount: analyzer.errors.length,
            warningCount: analyzer.warnings.length,
            errors: analyzer.errors,
            warnings: analyzer.warnings
        };

    } catch (error) {
        return {
            result: `Error durante el análisis semántico: ${error.message}\n\nStack trace:\n${error.stack}`,
            errorCount: 1,
            warningCount: 0,
            errors: [{ message: error.message, line: 0, column: 0 }],
            warnings: []
        };
    }
}

// Helper function to create a mock AST for testing
// In a real implementation, this would be provided by your parser
function createMockAST(code) {
    try {
        // This is a very simplified AST creation for demonstration
        // In practice, you would use the AST from your lexer-parser

        const lines = code.split('\n');
        const statements = [];

        lines.forEach((line, index) => {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('//')) return;

            // Very basic pattern matching for common constructs
            if (trimmed.match(/^(let|var|const)\s+(\w+)/)) {
                const match = trimmed.match(/^(let|var|const)\s+(\w+)(?:\s*=\s*(.+?))?;?$/);
                if (match) {
                    statements.push({
                        type: 'VariableDeclaration',
                        kind: match[1],
                        declarations: [{
                            type: 'VariableDeclarator',
                            id: { type: 'Identifier', name: match[2], line: index + 1, column: 0 },
                            init: match[3] ? { type: 'Literal', value: match[3], line: index + 1, column: 0 } : null,
                            line: index + 1,
                            column: 0
                        }],
                        line: index + 1,
                        column: 0
                    });
                }
            } else if (trimmed.match(/^function\s+(\w+)/)) {
                const match = trimmed.match(/^function\s+(\w+)\s*\(([^)]*)\)/);
                if (match) {
                    const params = match[2] ? match[2].split(',').map(p => ({
                        type: 'Identifier',
                        name: p.trim(),
                        line: index + 1,
                        column: 0
                    })) : [];

                    statements.push({
                        type: 'FunctionDeclaration',
                        id: { type: 'Identifier', name: match[1], line: index + 1, column: 0 },
                        params: params,
                        body: { type: 'BlockStatement', body: [], line: index + 1, column: 0 },
                        line: index + 1,
                        column: 0
                    });
                }
            } else if (trimmed.includes('=') && !trimmed.startsWith('=')) {
                const match = trimmed.match(/^(\w+)\s*=\s*(.+?);?$/);
                if (match) {
                    statements.push({
                        type: 'ExpressionStatement',
                        expression: {
                            type: 'AssignmentExpression',
                            operator: '=',
                            left: { type: 'Identifier', name: match[1], line: index + 1, column: 0 },
                            right: { type: 'Literal', value: match[2], line: index + 1, column: 0 },
                            line: index + 1,
                            column: 0
                        },
                        line: index + 1,
                        column: 0
                    });
                }
            } else if (trimmed.match(/^\w+\s*\(/)) {
                const match = trimmed.match(/^(\w+)\s*\((.*?)\)/);
                if (match) {
                    const args = match[2] ? match[2].split(',').map(arg => ({
                        type: 'Literal',
                        value: arg.trim(),
                        line: index + 1,
                        column: 0
                    })) : [];

                    statements.push({
                        type: 'ExpressionStatement',
                        expression: {
                            type: 'CallExpression',
                            callee: { type: 'Identifier', name: match[1], line: index + 1, column: 0 },
                            arguments: args,
                            line: index + 1,
                            column: 0
                        },
                        line: index + 1,
                        column: 0
                    });
                }
            }
        });

        return {
            type: 'Program',
            body: statements,
            line: 1,
            column: 0
        };

    } catch (error) {
        console.error('Error creating mock AST:', error);
        return null;
    }
}
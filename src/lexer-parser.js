// lexer-parser.js
// Analizador Léxico y Sintáctico para JavaScript usando Acorn

// Simulamos la importación de Acorn (en un proyecto real, instalar: npm install acorn)
// Para este ejemplo, implementamos un parser básico pero robusto

class JavaScriptLexer {
    constructor(code) {
        this.code = code;
        this.position = 0;
        this.line = 1;
        this.column = 1;
        this.tokens = [];
        this.errors = [];
    }

    // Definición de tokens
    static TOKEN_TYPES = {
        KEYWORD: 'KEYWORD',
        IDENTIFIER: 'IDENTIFIER',
        NUMBER: 'NUMBER',
        STRING: 'STRING',
        TEMPLATE_LITERAL: 'TEMPLATE_LITERAL',
        OPERATOR: 'OPERATOR',
        PUNCTUATOR: 'PUNCTUATOR',
        COMMENT: 'COMMENT',
        WHITESPACE: 'WHITESPACE',
        EOF: 'EOF',
        INVALID: 'INVALID'
    };

    static KEYWORDS = new Set([
        'abstract', 'await', 'boolean', 'break', 'byte', 'case', 'catch', 'char',
        'class', 'const', 'continue', 'debugger', 'default', 'delete', 'do',
        'double', 'else', 'enum', 'export', 'extends', 'false', 'final',
        'finally', 'float', 'for', 'function', 'goto', 'if', 'implements',
        'import', 'in', 'instanceof', 'int', 'interface', 'let', 'long',
        'native', 'new', 'null', 'package', 'private', 'protected', 'public',
        'return', 'short', 'static', 'super', 'switch', 'synchronized', 'this',
        'throw', 'throws', 'transient', 'true', 'try', 'typeof', 'var', 'void',
        'volatile', 'while', 'with', 'yield', 'async', 'of'
    ]);

    static OPERATORS = new Set([
        '+', '-', '*', '/', '%', '++', '--', '=', '+=', '-=', '*=', '/=', '%=',
        '==', '===', '!=', '!==', '>', '<', '>=', '<=', '&&', '||', '!',
        '&', '|', '^', '~', '<<', '>>', '>>>', '?', ':', '=>', '**', '**='
    ]);

    static PUNCTUATORS = new Set([
        '{', '}', '[', ']', '(', ')', ';', ',', '.', '...', '?.'
    ]);

    currentChar() {
        return this.position < this.code.length ? this.code[this.position] : null;
    }

    peekChar(offset = 1) {
        const pos = this.position + offset;
        return pos < this.code.length ? this.code[pos] : null;
    }

    advance() {
        if (this.position < this.code.length) {
            if (this.code[this.position] === '\n') {
                this.line++;
                this.column = 1;
            } else {
                this.column++;
            }
            this.position++;
        }
    }

    addToken(type, value, startPos = null, endPos = null) {
        this.tokens.push({
            type,
            value,
            line: this.line,
            column: this.column - (value?.length || 0),
            start: startPos || this.position - (value?.length || 0),
            end: endPos || this.position
        });
    }

    addError(message) {
        this.errors.push({
            message,
            line: this.line,
            column: this.column,
            position: this.position
        });
    }

    skipWhitespace() {
        while (this.currentChar() && /\s/.test(this.currentChar())) {
            this.advance();
        }
    }

    readString(quote) {
        const startPos = this.position;
        let value = '';
        this.advance(); // Skip opening quote

        while (this.currentChar() && this.currentChar() !== quote) {
            if (this.currentChar() === '\\') {
                this.advance();
                const escaped = this.currentChar();
                if (escaped) {
                    // Handle escape sequences
                    switch (escaped) {
                        case 'n': value += '\n'; break;
                        case 't': value += '\t'; break;
                        case 'r': value += '\r'; break;
                        case '\\': value += '\\'; break;
                        case quote: value += quote; break;
                        default: value += escaped;
                    }
                    this.advance();
                }
            } else {
                value += this.currentChar();
                this.advance();
            }
        }

        if (this.currentChar() === quote) {
            this.advance(); // Skip closing quote
            this.addToken(JavaScriptLexer.TOKEN_TYPES.STRING, quote + value + quote);
        } else {
            this.addError(`Unterminated string literal`);
        }
    }

    readTemplateString() {
        const startPos = this.position;
        let value = '';
        this.advance(); // Skip opening backtick

        while (this.currentChar() && this.currentChar() !== '`') {
            if (this.currentChar() === '\\') {
                this.advance();
                if (this.currentChar()) {
                    value += '\\' + this.currentChar();
                    this.advance();
                }
            } else if (this.currentChar() === '$' && this.peekChar() === '{') {
                // Handle template expressions ${...}
                value += '${';
                this.advance(); // $
                this.advance(); // {
                let braceCount = 1;

                while (this.currentChar() && braceCount > 0) {
                    if (this.currentChar() === '{') braceCount++;
                    if (this.currentChar() === '}') braceCount--;
                    value += this.currentChar();
                    this.advance();
                }
            } else {
                value += this.currentChar();
                this.advance();
            }
        }

        if (this.currentChar() === '`') {
            this.advance(); // Skip closing backtick
            this.addToken(JavaScriptLexer.TOKEN_TYPES.TEMPLATE_LITERAL, '`' + value + '`');
        } else {
            this.addError(`Unterminated template literal`);
        }
    }

    readNumber() {
        let value = '';
        let hasDecimal = false;

        // Handle hexadecimal, binary, octal
        if (this.currentChar() === '0') {
            const next = this.peekChar();
            if (next === 'x' || next === 'X') {
                value += this.currentChar();
                this.advance();
                value += this.currentChar();
                this.advance();

                while (this.currentChar() && /[0-9a-fA-F]/.test(this.currentChar())) {
                    value += this.currentChar();
                    this.advance();
                }

                this.addToken(JavaScriptLexer.TOKEN_TYPES.NUMBER, value);
                return;
            }
            if (next === 'b' || next === 'B') {
                value += this.currentChar();
                this.advance();
                value += this.currentChar();
                this.advance();

                while (this.currentChar() && /[01]/.test(this.currentChar())) {
                    value += this.currentChar();
                    this.advance();
                }

                this.addToken(JavaScriptLexer.TOKEN_TYPES.NUMBER, value);
                return;
            }
        }

        // Regular decimal numbers
        while (this.currentChar() && (/\d/.test(this.currentChar()) || this.currentChar() === '.')) {
            if (this.currentChar() === '.') {
                if (hasDecimal) break;
                hasDecimal = true;
            }
            value += this.currentChar();
            this.advance();
        }

        // Scientific notation
        if (this.currentChar() === 'e' || this.currentChar() === 'E') {
            value += this.currentChar();
            this.advance();

            if (this.currentChar() === '+' || this.currentChar() === '-') {
                value += this.currentChar();
                this.advance();
            }

            while (this.currentChar() && /\d/.test(this.currentChar())) {
                value += this.currentChar();
                this.advance();
            }
        }

        this.addToken(JavaScriptLexer.TOKEN_TYPES.NUMBER, value);
    }

    readIdentifier() {
        let value = '';

        while (this.currentChar() && (/[a-zA-Z0-9_$]/.test(this.currentChar()))) {
            value += this.currentChar();
            this.advance();
        }

        const type = JavaScriptLexer.KEYWORDS.has(value)
            ? JavaScriptLexer.TOKEN_TYPES.KEYWORD
            : JavaScriptLexer.TOKEN_TYPES.IDENTIFIER;

        this.addToken(type, value);
    }

    readComment() {
        if (this.currentChar() === '/' && this.peekChar() === '/') {
            // Single line comment
            let value = '';
            while (this.currentChar() && this.currentChar() !== '\n') {
                value += this.currentChar();
                this.advance();
            }
            this.addToken(JavaScriptLexer.TOKEN_TYPES.COMMENT, value);
        } else if (this.currentChar() === '/' && this.peekChar() === '*') {
            // Multi-line comment
            let value = '';
            this.advance(); // /
            this.advance(); // *
            value += '/*';

            while (this.currentChar()) {
                if (this.currentChar() === '*' && this.peekChar() === '/') {
                    value += '*/';
                    this.advance(); // *
                    this.advance(); // /
                    break;
                }
                value += this.currentChar();
                this.advance();
            }

            if (!value.endsWith('*/')) {
                this.addError('Unterminated comment');
            }

            this.addToken(JavaScriptLexer.TOKEN_TYPES.COMMENT, value);
        }
    }

    readOperator() {
        let value = this.currentChar();
        this.advance();

        // Check for multi-character operators
        const possible2 = value + (this.currentChar() || '');
        const possible3 = possible2 + (this.peekChar() || '');

        if (JavaScriptLexer.OPERATORS.has(possible3)) {
            value = possible3;
            this.advance();
            this.advance();
        } else if (JavaScriptLexer.OPERATORS.has(possible2)) {
            value = possible2;
            this.advance();
        }

        this.addToken(JavaScriptLexer.TOKEN_TYPES.OPERATOR, value);
    }

    tokenize() {
        while (this.position < this.code.length) {
            this.skipWhitespace();

            if (this.position >= this.code.length) break;

            const char = this.currentChar();

            // String literals
            if (char === '"' || char === "'") {
                this.readString(char);
            }
            // Template literals
            else if (char === '`') {
                this.readTemplateString();
            }
            // Numbers
            else if (/\d/.test(char)) {
                this.readNumber();
            }
            // Identifiers and keywords
            else if (/[a-zA-Z_$]/.test(char)) {
                this.readIdentifier();
            }
            // Comments
            else if (char === '/' && (this.peekChar() === '/' || this.peekChar() === '*')) {
                this.readComment();
            }
            // Punctuators
            else if (JavaScriptLexer.PUNCTUATORS.has(char)) {
                this.addToken(JavaScriptLexer.TOKEN_TYPES.PUNCTUATOR, char);
                this.advance();
            }
            // Operators
            else if (JavaScriptLexer.OPERATORS.has(char)) {
                this.readOperator();
            }
            // Invalid characters
            else {
                this.addError(`Unexpected character: '${char}'`);
                this.addToken(JavaScriptLexer.TOKEN_TYPES.INVALID, char);
                this.advance();
            }
        }

        this.addToken(JavaScriptLexer.TOKEN_TYPES.EOF, '');
        return { tokens: this.tokens, errors: this.errors };
    }
}

// Simple Recursive Descent Parser
class JavaScriptParser {
    constructor(tokens) {
        this.tokens = tokens.filter(t => t.type !== JavaScriptLexer.TOKEN_TYPES.WHITESPACE);
        this.position = 0;
        this.errors = [];
        this.ast = null;
    }

    currentToken() {
        return this.position < this.tokens.length ? this.tokens[this.position] : null;
    }

    peekToken(offset = 1) {
        const pos = this.position + offset;
        return pos < this.tokens.length ? this.tokens[pos] : null;
    }

    advance() {
        if (this.position < this.tokens.length) {
            this.position++;
        }
        return this.currentToken();
    }

    match(type, value = null) {
        const token = this.currentToken();
        return token && token.type === type && (value === null || token.value === value);
    }

    consume(type, value = null, errorMessage = null) {
        if (this.match(type, value)) {
            const token = this.currentToken();
            this.advance();
            return token;
        } else {
            const error = errorMessage || `Expected ${type}${value ? ` '${value}'` : ''} but found ${this.currentToken()?.type || 'EOF'}`;
            this.addError(error);
            return null;
        }
    }

    addError(message) {
        const token = this.currentToken();
        this.errors.push({
            message,
            line: token?.line || 0,
            column: token?.column || 0,
            token: token?.value || 'EOF'
        });
    }

    // Grammar productions
    parseProgram() {
        const statements = [];

        while (this.currentToken() && this.currentToken().type !== JavaScriptLexer.TOKEN_TYPES.EOF) {
            try {
                const stmt = this.parseStatement();
                if (stmt) statements.push(stmt);
            } catch (error) {
                this.addError(`Parse error: ${error.message}`);
                // Skip to next statement
                this.synchronize();
            }
        }

        return {
            type: 'Program',
            body: statements
        };
    }

    synchronize() {
        this.advance();
        while (this.currentToken() && this.currentToken().type !== JavaScriptLexer.TOKEN_TYPES.EOF) {
            if (this.currentToken().value === ';') {
                this.advance();
                return;
            }

            if (this.match(JavaScriptLexer.TOKEN_TYPES.KEYWORD)) {
                const keyword = this.currentToken().value;
                if (['function', 'var', 'let', 'const', 'if', 'while', 'for', 'return'].includes(keyword)) {
                    return;
                }
            }

            this.advance();
        }
    }

    parseStatement() {
        if (!this.currentToken()) return null;

        // Skip comments
        if (this.currentToken().type === JavaScriptLexer.TOKEN_TYPES.COMMENT) {
            this.advance();
            return this.parseStatement();
        }

        if (this.match(JavaScriptLexer.TOKEN_TYPES.KEYWORD, 'function')) {
            return this.parseFunctionDeclaration();
        }

        if (this.match(JavaScriptLexer.TOKEN_TYPES.KEYWORD, 'var') ||
            this.match(JavaScriptLexer.TOKEN_TYPES.KEYWORD, 'let') ||
            this.match(JavaScriptLexer.TOKEN_TYPES.KEYWORD, 'const')) {
            return this.parseVariableDeclaration();
        }

        if (this.match(JavaScriptLexer.TOKEN_TYPES.KEYWORD, 'if')) {
            return this.parseIfStatement();
        }

        if (this.match(JavaScriptLexer.TOKEN_TYPES.KEYWORD, 'while')) {
            return this.parseWhileStatement();
        }

        if (this.match(JavaScriptLexer.TOKEN_TYPES.KEYWORD, 'for')) {
            return this.parseForStatement();
        }

        if (this.match(JavaScriptLexer.TOKEN_TYPES.KEYWORD, 'return')) {
            return this.parseReturnStatement();
        }

        if (this.match(JavaScriptLexer.TOKEN_TYPES.PUNCTUATOR, '{')) {
            return this.parseBlockStatement();
        }

        // Expression statement
        return this.parseExpressionStatement();
    }

    parseFunctionDeclaration() {
        this.consume(JavaScriptLexer.TOKEN_TYPES.KEYWORD, 'function');
        const name = this.consume(JavaScriptLexer.TOKEN_TYPES.IDENTIFIER);

        this.consume(JavaScriptLexer.TOKEN_TYPES.PUNCTUATOR, '(');
        const params = this.parseParameterList();
        this.consume(JavaScriptLexer.TOKEN_TYPES.PUNCTUATOR, ')');

        const body = this.parseBlockStatement();

        return {
            type: 'FunctionDeclaration',
            id: name ? { type: 'Identifier', name: name.value } : null,
            params,
            body
        };
    }

    parseParameterList() {
        const params = [];

        if (!this.match(JavaScriptLexer.TOKEN_TYPES.PUNCTUATOR, ')')) {
            do {
                const param = this.consume(JavaScriptLexer.TOKEN_TYPES.IDENTIFIER);
                if (param) {
                    params.push({ type: 'Identifier', name: param.value });
                }

                if (this.match(JavaScriptLexer.TOKEN_TYPES.PUNCTUATOR, ',')) {
                    this.advance();
                } else {
                    break;
                }
            } while (this.currentToken());
        }

        return params;
    }

    parseVariableDeclaration() {
        const kind = this.currentToken().value;
        this.advance();

        const declarations = [];

        do {
            const id = this.consume(JavaScriptLexer.TOKEN_TYPES.IDENTIFIER);
            let init = null;

            if (this.match(JavaScriptLexer.TOKEN_TYPES.OPERATOR, '=')) {
                this.advance();
                init = this.parseExpression();
            }

            if (id) {
                declarations.push({
                    type: 'VariableDeclarator',
                    id: { type: 'Identifier', name: id.value },
                    init
                });
            }

            if (this.match(JavaScriptLexer.TOKEN_TYPES.PUNCTUATOR, ',')) {
                this.advance();
            } else {
                break;
            }
        } while (this.currentToken());

        this.consume(JavaScriptLexer.TOKEN_TYPES.PUNCTUATOR, ';');

        return {
            type: 'VariableDeclaration',
            declarations,
            kind
        };
    }

    parseIfStatement() {
        this.consume(JavaScriptLexer.TOKEN_TYPES.KEYWORD, 'if');
        this.consume(JavaScriptLexer.TOKEN_TYPES.PUNCTUATOR, '(');
        const test = this.parseExpression();
        this.consume(JavaScriptLexer.TOKEN_TYPES.PUNCTUATOR, ')');

        const consequent = this.parseStatement();
        let alternate = null;

        if (this.match(JavaScriptLexer.TOKEN_TYPES.KEYWORD, 'else')) {
            this.advance();
            alternate = this.parseStatement();
        }

        return {
            type: 'IfStatement',
            test,
            consequent,
            alternate
        };
    }

    parseWhileStatement() {
        this.consume(JavaScriptLexer.TOKEN_TYPES.KEYWORD, 'while');
        this.consume(JavaScriptLexer.TOKEN_TYPES.PUNCTUATOR, '(');
        const test = this.parseExpression();
        this.consume(JavaScriptLexer.TOKEN_TYPES.PUNCTUATOR, ')');
        const body = this.parseStatement();

        return {
            type: 'WhileStatement',
            test,
            body
        };
    }

    parseForStatement() {
        this.consume(JavaScriptLexer.TOKEN_TYPES.KEYWORD, 'for');
        this.consume(JavaScriptLexer.TOKEN_TYPES.PUNCTUATOR, '(');

        const init = this.parseStatement();
        const test = this.parseExpression();
        this.consume(JavaScriptLexer.TOKEN_TYPES.PUNCTUATOR, ';');
        const update = this.parseExpression();

        this.consume(JavaScriptLexer.TOKEN_TYPES.PUNCTUATOR, ')');
        const body = this.parseStatement();

        return {
            type: 'ForStatement',
            init,
            test,
            update,
            body
        };
    }

    parseReturnStatement() {
        this.consume(JavaScriptLexer.TOKEN_TYPES.KEYWORD, 'return');
        let argument = null;

        if (!this.match(JavaScriptLexer.TOKEN_TYPES.PUNCTUATOR, ';')) {
            argument = this.parseExpression();
        }

        this.consume(JavaScriptLexer.TOKEN_TYPES.PUNCTUATOR, ';');

        return {
            type: 'ReturnStatement',
            argument
        };
    }

    parseBlockStatement() {
        this.consume(JavaScriptLexer.TOKEN_TYPES.PUNCTUATOR, '{');
        const body = [];

        while (!this.match(JavaScriptLexer.TOKEN_TYPES.PUNCTUATOR, '}') &&
            this.currentToken() &&
            this.currentToken().type !== JavaScriptLexer.TOKEN_TYPES.EOF) {
            const stmt = this.parseStatement();
            if (stmt) body.push(stmt);
        }

        this.consume(JavaScriptLexer.TOKEN_TYPES.PUNCTUATOR, '}');

        return {
            type: 'BlockStatement',
            body
        };
    }

    parseExpressionStatement() {
        const expression = this.parseExpression();
        this.consume(JavaScriptLexer.TOKEN_TYPES.PUNCTUATOR, ';');

        return {
            type: 'ExpressionStatement',
            expression
        };
    }

    parseExpression() {
        return this.parseAssignmentExpression();
    }

    parseAssignmentExpression() {
        const left = this.parseConditionalExpression();

        if (this.currentToken() && this.currentToken().value &&
            ['=', '+=', '-=', '*=', '/=', '%='].includes(this.currentToken().value)) {
            const operator = this.currentToken().value;
            this.advance();
            const right = this.parseAssignmentExpression();

            return {
                type: 'AssignmentExpression',
                operator,
                left,
                right
            };
        }

        return left;
    }

    parseConditionalExpression() {
        const test = this.parseLogicalExpression();

        if (this.match(JavaScriptLexer.TOKEN_TYPES.OPERATOR, '?')) {
            this.advance();
            const consequent = this.parseExpression();
            this.consume(JavaScriptLexer.TOKEN_TYPES.PUNCTUATOR, ':');
            const alternate = this.parseExpression();

            return {
                type: 'ConditionalExpression',
                test,
                consequent,
                alternate
            };
        }

        return test;
    }

    parseLogicalExpression() {
        let left = this.parseEqualityExpression();

        while (this.currentToken() && ['&&', '||'].includes(this.currentToken().value)) {
            const operator = this.currentToken().value;
            this.advance();
            const right = this.parseEqualityExpression();

            left = {
                type: 'LogicalExpression',
                operator,
                left,
                right
            };
        }

        return left;
    }

    parseEqualityExpression() {
        let left = this.parseRelationalExpression();

        while (this.currentToken() && ['==', '===', '!=', '!=='].includes(this.currentToken().value)) {
            const operator = this.currentToken().value;
            this.advance();
            const right = this.parseRelationalExpression();

            left = {
                type: 'BinaryExpression',
                operator,
                left,
                right
            };
        }

        return left;
    }

    parseRelationalExpression() {
        let left = this.parseAdditiveExpression();

        while (this.currentToken() && ['<', '>', '<=', '>=', 'in', 'instanceof'].includes(this.currentToken().value)) {
            const operator = this.currentToken().value;
            this.advance();
            const right = this.parseAdditiveExpression();

            left = {
                type: 'BinaryExpression',
                operator,
                left,
                right
            };
        }

        return left;
    }

    parseAdditiveExpression() {
        let left = this.parseMultiplicativeExpression();

        while (this.currentToken() && ['+', '-'].includes(this.currentToken().value)) {
            const operator = this.currentToken().value;
            this.advance();
            const right = this.parseMultiplicativeExpression();

            left = {
                type: 'BinaryExpression',
                operator,
                left,
                right
            };
        }

        return left;
    }

    parseMultiplicativeExpression() {
        let left = this.parseUnaryExpression();

        while (this.currentToken() && ['*', '/', '%'].includes(this.currentToken().value)) {
            const operator = this.currentToken().value;
            this.advance();
            const right = this.parseUnaryExpression();

            left = {
                type: 'BinaryExpression',
                operator,
                left,
                right
            };
        }

        return left;
    }

    parseUnaryExpression() {
        if (this.currentToken() && ['!', '-', '+', '++', '--', 'typeof', 'void', 'delete'].includes(this.currentToken().value)) {
            const operator = this.currentToken().value;
            this.advance();
            const argument = this.parseUnaryExpression();

            return {
                type: 'UnaryExpression',
                operator,
                argument,
                prefix: true
            };
        }

        return this.parsePostfixExpression();
    }

    parsePostfixExpression() {
        let left = this.parseCallExpression();

        if (this.currentToken() && ['++', '--'].includes(this.currentToken().value)) {
            const operator = this.currentToken().value;
            this.advance();

            return {
                type: 'UpdateExpression',
                operator,
                argument: left,
                prefix: false
            };
        }

        return left;
    }

    parseCallExpression() {
        let left = this.parseMemberExpression();

        while (this.match(JavaScriptLexer.TOKEN_TYPES.PUNCTUATOR, '(')) {
            this.advance();
            const args = this.parseArgumentList();
            this.consume(JavaScriptLexer.TOKEN_TYPES.PUNCTUATOR, ')');

            left = {
                type: 'CallExpression',
                callee: left,
                arguments: args
            };
        }

        return left;
    }

    parseArgumentList() {
        const args = [];

        if (!this.match(JavaScriptLexer.TOKEN_TYPES.PUNCTUATOR, ')')) {
            do {
                const arg = this.parseExpression();
                if (arg) args.push(arg);

                if (this.match(JavaScriptLexer.TOKEN_TYPES.PUNCTUATOR, ',')) {
                    this.advance();
                } else {
                    break;
                }
            } while (this.currentToken());
        }

        return args;
    }

    parseMemberExpression() {
        let left = this.parsePrimaryExpression();

        while (this.currentToken()) {
            if (this.match(JavaScriptLexer.TOKEN_TYPES.PUNCTUATOR, '.')) {
                this.advance();
                const property = this.consume(JavaScriptLexer.TOKEN_TYPES.IDENTIFIER);

                left = {
                    type: 'MemberExpression',
                    object: left,
                    property: property ? { type: 'Identifier', name: property.value } : null,
                    computed: false
                };
            } else if (this.match(JavaScriptLexer.TOKEN_TYPES.PUNCTUATOR, '[')) {
                this.advance();
                const property = this.parseExpression();
                this.consume(JavaScriptLexer.TOKEN_TYPES.PUNCTUATOR, ']');

                left = {
                    type: 'MemberExpression',
                    object: left,
                    property,
                    computed: true
                };
            } else {
                break;
            }
        }

        return left;
    }

    parsePrimaryExpression() {
        if (!this.currentToken()) {
            this.addError('Unexpected end of input');
            return null;
        }

        // Identifier
        if (this.match(JavaScriptLexer.TOKEN_TYPES.IDENTIFIER)) {
            const name = this.currentToken().value;
            this.advance();
            return { type: 'Identifier', name };
        }

        // Literals
        if (this.match(JavaScriptLexer.TOKEN_TYPES.NUMBER)) {
            const value = this.currentToken().value;
            this.advance();
            return { type: 'Literal', value: parseFloat(value), raw: value };
        }

        if (this.match(JavaScriptLexer.TOKEN_TYPES.STRING)) {
            const value = this.currentToken().value;
            this.advance();
            return { type: 'Literal', value: value.slice(1, -1), raw: value };
        }

        if (this.match(JavaScriptLexer.TOKEN_TYPES.TEMPLATE_LITERAL)) {
            const value = this.currentToken().value;
            this.advance();
            return { type: 'TemplateLiteral', value: value.slice(1, -1), raw: value };
        }

        // Keywords as literals
        if (this.match(JavaScriptLexer.TOKEN_TYPES.KEYWORD, 'true') ||
            this.match(JavaScriptLexer.TOKEN_TYPES.KEYWORD, 'false')) {
            const value = this.currentToken().value === 'true';
            this.advance();
            return { type: 'Literal', value, raw: value.toString() };
        }

        if (this.match(JavaScriptLexer.TOKEN_TYPES.KEYWORD, 'null')) {
            this.advance();
            return { type: 'Literal', value: null, raw: 'null' };
        }

        if (this.match(JavaScriptLexer.TOKEN_TYPES.KEYWORD, 'undefined')) {
            this.advance();
            return { type: 'Identifier', name: 'undefined' };
        }

        // Parenthesized expression
        if (this.match(JavaScriptLexer.TOKEN_TYPES.PUNCTUATOR, '(')) {
            this.advance();
            const expression = this.parseExpression();
            this.consume(JavaScriptLexer.TOKEN_TYPES.PUNCTUATOR, ')');
            return expression;
        }

        // Array literal
        if (this.match(JavaScriptLexer.TOKEN_TYPES.PUNCTUATOR, '[')) {
            return this.parseArrayExpression();
        }

        // Object literal
        if (this.match(JavaScriptLexer.TOKEN_TYPES.PUNCTUATOR, '{')) {
            return this.parseObjectExpression();
        }

        this.addError(`Unexpected token: '${this.currentToken().value}'`);
        this.advance();
        return null;
    }

    parseArrayExpression() {
        this.consume(JavaScriptLexer.TOKEN_TYPES.PUNCTUATOR, '[');
        const elements = [];

        while (!this.match(JavaScriptLexer.TOKEN_TYPES.PUNCTUATOR, ']') &&
            this.currentToken() &&
            this.currentToken().type !== JavaScriptLexer.TOKEN_TYPES.EOF) {
            if (this.match(JavaScriptLexer.TOKEN_TYPES.PUNCTUATOR, ',')) {
                elements.push(null); // Sparse array
                this.advance();
            } else {
                elements.push(this.parseExpression());
                if (this.match(JavaScriptLexer.TOKEN_TYPES.PUNCTUATOR, ',')) {
                    this.advance();
                }
            }
        }

        this.consume(JavaScriptLexer.TOKEN_TYPES.PUNCTUATOR, ']');

        return {
            type: 'ArrayExpression',
            elements
        };
    }

    parseObjectExpression() {
        this.consume(JavaScriptLexer.TOKEN_TYPES.PUNCTUATOR, '{');
        const properties = [];

        while (!this.match(JavaScriptLexer.TOKEN_TYPES.PUNCTUATOR, '}') &&
            this.currentToken() &&
            this.currentToken().type !== JavaScriptLexer.TOKEN_TYPES.EOF) {

            let key = null;

            if (this.match(JavaScriptLexer.TOKEN_TYPES.IDENTIFIER)) {
                key = { type: 'Identifier', name: this.currentToken().value };
                this.advance();
            } else if (this.match(JavaScriptLexer.TOKEN_TYPES.STRING)) {
                const value = this.currentToken().value;
                key = { type: 'Literal', value: value.slice(1, -1), raw: value };
                this.advance();
            }

            this.consume(JavaScriptLexer.TOKEN_TYPES.PUNCTUATOR, ':');
            const value = this.parseExpression();

            properties.push({
                type: 'Property',
                key,
                value,
                kind: 'init'
            });

            if (this.match(JavaScriptLexer.TOKEN_TYPES.PUNCTUATOR, ',')) {
                this.advance();
            }
        }

        this.consume(JavaScriptLexer.TOKEN_TYPES.PUNCTUATOR, '}');

        return {
            type: 'ObjectExpression',
            properties
        };
    }

    parse() {
        try {
            this.ast = this.parseProgram();
            return { ast: this.ast, errors: this.errors };
        } catch (error) {
            this.addError(`Fatal parse error: ${error.message}`);
            return { ast: null, errors: this.errors };
        }
    }
}

// Main analyzer function
export function analyzeLexicalSyntactic(code) {
    try {
        // Lexical Analysis
        const lexer = new JavaScriptLexer(code);
        const lexicalResult = lexer.tokenize();

        // Format lexical analysis output
        let lexicalOutput = "=== ANÁLISIS LÉXICO ===\n\n";
        lexicalOutput += `Total de tokens: ${lexicalResult.tokens.length}\n`;
        lexicalOutput += `Errores léxicos: ${lexicalResult.errors.length}\n\n`;

        if (lexicalResult.errors.length > 0) {
            lexicalOutput += "ERRORES LÉXICOS:\n";
            lexicalResult.errors.forEach((error, index) => {
                lexicalOutput += `${index + 1}. Línea ${error.line}, Columna ${error.column}: ${error.message}\n`;
            });
            lexicalOutput += "\n";
        }

        lexicalOutput += "TOKENS ENCONTRADOS:\n";
        lexicalOutput += "Tipo\t\t\tValor\t\t\tLínea\tColumna\n";
        lexicalOutput += "─".repeat(60) + "\n";

        const tokenStats = {};
        lexicalResult.tokens
            .filter(token => token.type !== JavaScriptLexer.TOKEN_TYPES.EOF)
            .forEach((token, index) => {
                tokenStats[token.type] = (tokenStats[token.type] || 0) + 1;
                if (index < 50) { // Show first 50 tokens
                    const type = token.type.padEnd(16);
                    const value = (token.value.length > 20 ? token.value.substring(0, 17) + "..." : token.value).padEnd(20);
                    lexicalOutput += `${type}\t${value}\t${token.line}\t${token.column}\n`;
                }
            });

        if (lexicalResult.tokens.length > 51) {
            lexicalOutput += `\n... y ${lexicalResult.tokens.length - 51} tokens más\n`;
        }

        lexicalOutput += "\nESTADÍSTICAS DE TOKENS:\n";
        Object.entries(tokenStats).forEach(([type, count]) => {
            lexicalOutput += `${type}: ${count}\n`;
        });

        // Syntactic Analysis
        const parser = new JavaScriptParser(lexicalResult.tokens);
        const syntacticResult = parser.parse();

        let syntacticOutput = "=== ANÁLISIS SINTÁCTICO ===\n\n";
        syntacticOutput += `Errores sintácticos: ${syntacticResult.errors.length}\n\n`;

        if (syntacticResult.errors.length > 0) {
            syntacticOutput += "ERRORES SINTÁCTICOS:\n";
            syntacticResult.errors.forEach((error, index) => {
                syntacticOutput += `${index + 1}. Línea ${error.line}, Columna ${error.column}: ${error.message}\n`;
                if (error.token) {
                    syntacticOutput += `   Token problemático: '${error.token}'\n`;
                }
            });
            syntacticOutput += "\n";
        }

        if (syntacticResult.ast) {
            syntacticOutput += "ÁRBOL SINTÁCTICO ABSTRACTO (AST):\n";
            syntacticOutput += JSON.stringify(syntacticResult.ast, null, 2);

            // AST Statistics
            syntacticOutput += "\n\nESTADÍSTICAS DEL AST:\n";
            const nodeStats = {};

            function countNodes(node) {
                if (!node || typeof node !== 'object') return;

                if (node.type) {
                    nodeStats[node.type] = (nodeStats[node.type] || 0) + 1;
                }

                for (const key in node) {
                    if (Array.isArray(node[key])) {
                        node[key].forEach(countNodes);
                    } else if (typeof node[key] === 'object') {
                        countNodes(node[key]);
                    }
                }
            }

            countNodes(syntacticResult.ast);

            Object.entries(nodeStats).forEach(([type, count]) => {
                syntacticOutput += `${type}: ${count}\n`;
            });
        } else {
            syntacticOutput += "No se pudo generar el AST debido a errores sintácticos.\n";
        }

        return {
            lexicalResult: lexicalOutput,
            syntacticResult: syntacticOutput,
            lexicalErrors: lexicalResult.errors.length,
            syntaxErrors: syntacticResult.errors.length,
            tokenCount: lexicalResult.tokens.length - 1, // Exclude EOF
            ast: syntacticResult.ast
        };

    } catch (error) {
        const errorMessage = `Error crítico durante el análisis: ${error.message}\n\nStack trace:\n${error.stack}`;
        return {
            lexicalResult: errorMessage,
            syntacticResult: errorMessage,
            lexicalErrors: 1,
            syntaxErrors: 1,
            tokenCount: 0,
            ast: null
        };
    }
}
const tokenizer = (input) => {
  const tokens = [];
  let cursor = 0;
  let line = 1;

  while (cursor < input.length) {
      let char = input[cursor];

      // Skip white spaces and track line numbers
      if (/\s/.test(char)) {
          if (char === '\n') line++;
          cursor++;
          continue;
      }

      // Handle single-line comments
      if (char === '/' && input[cursor + 1] === '/') {
          while (cursor < input.length && input[cursor] !== '\n') {
              cursor++;
          }
          continue;
      }

      // Handle multi-line comments
      if (char === '/' && input[cursor + 1] === '*') {
          cursor += 2;
          while (cursor < input.length && !(input[cursor] === '*' && input[cursor + 1] === '/')) {
              if (input[cursor] === '\n') line++;
              cursor++;
          }
          cursor += 2; // Move past closing '*/'
          continue;
      }

      // Handle strings (both single and double quotes)
      if (char === '"' || char === "'") {
          const quote = char;
          let string = "";
          cursor++; // Move past the opening quote
          char = input[cursor];
          
          while (cursor < input.length && char !== quote) {
              if (char === '\\') {
                  cursor++;
                  char = input[cursor];
                  switch (char) {
                      case 'n': 
                          string += '\n'; 
                          break;
                      case 't': 
                          string += '\t'; 
                          break;
                      case 'r': 
                          string += '\r'; 
                          break;
                      default: 
                          string += char;
                  }
              } else {
                  string += char;
              }
              cursor++;
              char = input[cursor];
          }
          cursor++; // Move past the closing quote
          tokens.push({ 
              type: "string", 
              value: string,
              raw: string.replace(/\n/g, '\\n')
                  .replace(/\t/g, '\\t')
                  .replace(/\r/g, '\\r')
          });
          continue;
      }

      // Keywords and identifiers
      if (/[a-zA-Z]/.test(char)) {
          let word = "";
          while (cursor < input.length && /[a-zA-Z0-9]/.test(char)) {
              word += char;
              cursor++;
              char = input[cursor];
          }
          
          // Check for keywords
          const keywords = [
              "set", "print", "if", "else", "for", "while", "do", "int", "float", "char", "string", "input",
              "sqrt", "pow", "abs", "round", "floor", "ceil", "random", "max", "min",
              "length", "substring", "concat", "uppercase", "lowercase", "trim",
              "array", "push", "pop", "size", "get",
              "debug", "assert", "trace"
          ];
          if (keywords.includes(word)) {
              tokens.push({ type: "keyword", value: word });
          } else {
              tokens.push({ type: "identifier", value: word });
          }
          continue;
      }

      // Numbers (including floating point)
      if (/[0-9]/.test(char) || (char === '-' && /[0-9]/.test(input[cursor + 1]))) {
          let num = "";
          let isFloat = false;
          
          // Handle negative sign
          if (char === '-') {
              num += char;
              cursor++;
              char = input[cursor];
          }
          
          while (cursor < input.length && (/[0-9]/.test(char) || char === '.')) {
              if (char === '.') {
                  if (isFloat) break; // Second decimal point - break
                  isFloat = true;
              }
              num += char;
              cursor++;
              char = input[cursor];
          }
          tokens.push({ 
              type: isFloat ? "float" : "number", 
              value: isFloat ? parseFloat(num) : parseInt(num) 
          });
          continue;
      }

      // Operators (including modulo %)
      if (/[\+\-\*\/\%=<>!&|]/.test(char)) {
          let operator = char;
          cursor++;
          // Check for double-character operators
          if (cursor < input.length) {
              const nextChar = input[cursor];
              if ((char === '=' && nextChar === '=') ||
                  (char === '!' && nextChar === '=') ||
                  (char === '<' && nextChar === '=') ||
                  (char === '>' && nextChar === '=') ||
                  (char === '&' && nextChar === '&') ||
                  (char === '|' && nextChar === '|') ||
                  (char === '+' && nextChar === '+') ||  // Add increment
                  (char === '-' && nextChar === '-')) {  // Add decrement
                  operator += nextChar;
                  cursor++;
              }
          }
          tokens.push({ type: "operator", value: operator });
          continue;
      }

      // Parentheses and braces
      if (/[\(\)\{\}]/.test(char)) {
          tokens.push({ type: "punctuation", value: char });
          cursor++;
          continue;
      }

      // Commas and Semicolons
      if (char === ',' || char === ';') {
          tokens.push({ type: "punctuation", value: char });
          cursor++;
          continue;
      }

      // Handle array brackets
      if (char === '[' || char === ']') {
          tokens.push({ type: "bracket", value: char });
          cursor++;
          continue;
      }

      cursor++;
  }
  console.log("Tokens:", tokens);
  return tokens;
};

const parser = (tokens) => {
  let current = 0;
  let line = 1;

  function parseExpression() {
      // Check for unary minus
      if (current < tokens.length && 
          tokens[current].type === "operator" && 
          tokens[current].value === "-") {
          current++; // Move past the minus
          const value = parseTerm();
          return {
              type: "UnaryExpression",
              operator: "-",
              argument: value,
              prefix: true
          };
      }
      
      let left = parseTerm();
      
      while (current < tokens.length && 
              tokens[current].type === "operator" && 
              /[<>]=?|==|!=|&&|\|\|/.test(tokens[current].value)) { // Add logical operators
          const operator = tokens[current].value;
          current++; // move past operator
          const right = parseTerm();
          left = {
              type: "BinaryExpression",
              operator: operator,
              left: left,
              right: right
          };
      }
      
      return left;
  }

  function parseTerm() {
      let left = parseFactor();

      while (current < tokens.length && 
              tokens[current].type === "operator" && 
              /[\+\-\*\/\%]/.test(tokens[current].value)) {
          const operator = tokens[current].value;
          current++; // move past operator
          const right = parseFactor();
          left = {
              type: "BinaryExpression",
              operator: operator,
              left: left,
              right: right
          };
      }

      return left;
  }

  function parseFactor() {
      const token = tokens[current];

      // Handle parentheses
      if (token.type === "punctuation" && token.value === "(") {
          current++; // move past '('
          const expression = parseExpression();
          
          // Expect closing parenthesis
          if (current >= tokens.length || 
              tokens[current].type !== "punctuation" || 
              tokens[current].value !== ")") {
              throw new Error("Missing closing parenthesis");
          }
          current++; // move past ')'
          return expression;
      }

      return parseValue();
  }

  function parseValue() {
      const token = tokens[current];
      
      if (token.type === "number" || token.type === "float") {
          current++;
          return token;
      }
      
      if (token.type === "string") {
          current++;
          return token;
      }
      
      if (token.type === "identifier") {
          current++;
          return token;
      }

      if (token.type === "keyword") {
          if (token.value === "input") {
              return parseInput();
          }
          if (["sqrt", "pow", "abs", "round", "floor", "ceil", "random", "max", "min"].includes(token.value)) {
              return parseMathFunction();
          }
          if (["length", "substring", "concat", "uppercase", "lowercase", "trim"].includes(token.value)) {
              return parseStringFunction();
          }
      }

      if (token.type === "bracket" && token.value === "[") {
          return parseArrayLiteral();
      }
      
      if (token.type === "keyword" && ["push", "pop", "size", "get"].includes(token.value)) {
          return parseArrayOperation();
      }

      throw new Error(`Unexpected token: ${token.value} at line ${line}`);
  }

  function parseInput() {
      current++; // Move past 'input'
      
      // Expect opening parenthesis
      if (tokens[current].type !== "punctuation" || tokens[current].value !== "(") {
          throw new Error("Expected '(' after 'input'");
      }
      current++; // Move past '('
      
      // Parse prompt string if provided
      let prompt = null;
      if (tokens[current].type === "string") {
          prompt = tokens[current];
          current++; // Move past string
      }
      
      // Expect closing parenthesis
      if (tokens[current].type !== "punctuation" || tokens[current].value !== ")") {
          throw new Error("Expected ')' after input");
      }
      current++; // Move past ')'
      
      return {
          type: "InputExpression",
          prompt: prompt
      };
  }

  function parseForLoop() {
      console.log("Parsing for loop...");
      // Move past 'for'
      current++;
      
      // Expect opening parenthesis
      if (tokens[current].type !== "punctuation" || tokens[current].value !== "(") {
          throw new Error("Expected '(' after 'for'");
      }
      current++; // Move past '('
      console.log("Current token before init:", tokens[current]);
      
      // Parse initialization
      let init;
      if (tokens[current].type === "identifier") {
          const name = tokens[current].value;
          current++; // Move past identifier
          
          if (tokens[current].type === "operator" && tokens[current].value === "=") {
              current++; // Move past '='
              const value = parseTerm();
              init = {
                  type: "AssignmentExpression",
                  name: name,
                  value: value
              };
          } else {
              throw new Error("Expected '=' in for loop initialization");
          }
      } else {
          throw new Error("Expected identifier in for loop initialization");
      }
      
      console.log("Current token after init:", tokens[current]);
      
      // Expect semicolon
      if (tokens[current].type !== "punctuation" || tokens[current].value !== ";") {
          throw new Error("Expected ';' after for loop initialization");
      }
      current++; // Move past semicolon
      
      // Parse condition
      console.log("Current token before condition:", tokens[current]);
      const condition = parseComparison();
      console.log("Current token after condition:", tokens[current]);
      
      // Expect semicolon
      if (tokens[current].type !== "punctuation" || tokens[current].value !== ";") {
          throw new Error("Expected ';' after for loop condition");
      }
      current++; // Move past semicolon
      
      // Parse increment
      console.log("Current token before increment:", tokens[current]);
      let increment;
      if (tokens[current].type === "identifier") {
          const name = tokens[current].value;
          current++; // Move past identifier
          
          if (tokens[current].type === "operator" && tokens[current].value === "=") {
              current++; // Move past '='
              const value = parseTerm();
              increment = {
                  type: "AssignmentExpression",
                  name: name,
                  value: value
              };
          } else {
              throw new Error("Expected '=' in for loop increment");
          }
      } else {
          throw new Error("Expected identifier in for loop increment");
      }
      console.log("Current token after increment:", tokens[current]);
      
      // Expect closing parenthesis
      if (tokens[current].type !== "punctuation" || tokens[current].value !== ")") {
          throw new Error("Expected ')' after for loop increment");
      }
      current++; // Move past ')'
      
      // Parse body
      const body = parseBlock();
      
      return {
          type: "ForLoop",
          init: init,
          condition: condition,
          increment: increment,
          body: body
      };
  }

  function parseWhileLoop() {
      current++; // Move past 'while'
      
      // Expect opening parenthesis
      if (tokens[current].type !== "punctuation" || tokens[current].value !== "(") {
          throw new Error("Expected '(' after 'while'");
      }
      current++; // Move past '('
      
      const condition = parseComparison();
      
      // Expect closing parenthesis
      if (tokens[current].type !== "punctuation" || tokens[current].value !== ")") {
          throw new Error("Expected ')' after while condition");
      }
      current++; // Move past ')'
      
      // Parse body
      const body = parseBlock();
      
      return {
          type: "WhileLoop",
          condition: condition,
          body: body
      };
  }

  function parseBlock() {
      // Expect opening brace
      if (tokens[current].type !== "punctuation" || tokens[current].value !== "{") {
          throw new Error("Expected '{' at start of block");
      }
      current++; // Move past '{'
      
      const statements = [];
      while (current < tokens.length && 
              !(tokens[current].type === "punctuation" && tokens[current].value === "}")) {
          statements.push(walk());
      }
      
      // Expect closing brace
      if (tokens[current].type !== "punctuation" || tokens[current].value !== "}") {
          throw new Error("Expected '}' at end of block");
      }
      current++; // Move past '}'
      
      return statements;
  }

  function parseAssignment() {
      const left = parseValue();
      
      if (current < tokens.length && tokens[current].type === "operator" && tokens[current].value === "=") {
          if (left.type !== "identifier") {
              throw new Error("Invalid left-hand side in assignment");
          }
          current++; // Move past '='
          const value = parseExpression();
          
          // Skip semicolon if present
          if (current < tokens.length && tokens[current].type === "punctuation" && tokens[current].value === ";") {
              current++;
          }
          
          return {
              type: "AssignmentExpression",
              name: left.value,
              value: value
          };
      }
      
      return left;
  }

  function parseComparison() {
      let left = parseTerm();
      
      if (current < tokens.length && 
          tokens[current].type === "operator" && 
          /[<>]=?|==|!=/.test(tokens[current].value)) {
          const operator = tokens[current].value;
          current++; // Move past operator
          const right = parseTerm();
          return {
              type: "BinaryExpression",
              operator: operator,
              left: left,
              right: right
          };
      }
      
      return left;
  }

  function parseVariableDeclaration() {
      current++; // Move past 'set'
      
      const typeToken = tokens[current];
      if (!["int", "float", "char", "string", "array"].includes(typeToken.value)) {
          throw new Error("Expected type after 'set'");
      }
      current++;

      const nameToken = tokens[current];
      if (nameToken.type !== "identifier") {
          throw new Error("Expected variable name");
      }
      current++;

      if (tokens[current].value !== "=") {
          throw new Error("Expected '=' in variable declaration");
      }
      current++; // Move past '='

      // Update this part to handle function calls
      let valueExpr;
      if (tokens[current].type === "keyword" && 
          ["sqrt", "pow", "abs", "round", "floor", "ceil", "random", "max", "min"].includes(tokens[current].value)) {
          valueExpr = parseMathFunction();
      } else {
          valueExpr = parseValue();
      }

      // Skip semicolon if present
      if (current < tokens.length && tokens[current].type === "punctuation" && tokens[current].value === ";") {
          current++;
      }

      return {
          type: "VariableDeclaration",
          varType: typeToken.value,
          name: nameToken.value,
          value: valueExpr
      };
  }

  function parsePrint() {
      current++; // Move past 'print'
      const expression = parseExpression();
      
      // Skip semicolon if present
      if (current < tokens.length && tokens[current].type === "punctuation" && tokens[current].value === ";") {
          current++;
      }

      return {
          type: "Print",
          expression: expression
      };
  }

  function parseIf() {
      current++; // Move past 'if'
      
      // Expect opening parenthesis
      if (tokens[current].type !== "punctuation" || tokens[current].value !== "(") {
          throw new Error("Expected '(' after 'if'");
      }
      current++; // Move past '('
      
      const condition = parseExpression();
      
      // Expect closing parenthesis
      if (tokens[current].type !== "punctuation" || tokens[current].value !== ")") {
          throw new Error("Expected ')' after if condition");
      }
      current++; // Move past ')'
      
      const ifBody = parseBlock();
      
      // Check for else
      let elseBody = null;
      if (current < tokens.length && tokens[current].type === "keyword" && tokens[current].value === "else") {
          current++; // Move past 'else'
          elseBody = parseBlock();
      }
      
      return {
          type: "IfStatement",
          condition: condition,
          ifBody: ifBody,
          elseBody: elseBody
      };
  }

  function parseMathFunction() {
      const functionName = tokens[current].value;
      current++; // Move past function name
      
      if (tokens[current].type !== "punctuation" || tokens[current].value !== "(") {
          throw new Error(`Expected '(' after ${functionName}`);
      }
      current++;
      
      const args = [];
      while (current < tokens.length && 
             !(tokens[current].type === "punctuation" && tokens[current].value === ")")) {
          args.push(parseExpression());
          if (tokens[current].type === "punctuation" && tokens[current].value === ",") {
              current++; // Skip comma
          }
      }
      
      if (tokens[current].type !== "punctuation" || tokens[current].value !== ")") {
          throw new Error(`Expected ')' after ${functionName} arguments`);
      }
      current++;
      
      return {
          type: "MathFunction",
          name: functionName,
          arguments: args
      };
  }

  function parseStringFunction() {
      const functionName = tokens[current].value;
      current++;
      
      if (tokens[current].type !== "punctuation" || tokens[current].value !== "(") {
          throw new Error(`Expected '(' after ${functionName}`);
      }
      current++;
      
      const args = [];
      while (current < tokens.length && 
             !(tokens[current].type === "punctuation" && tokens[current].value === ")")) {
          args.push(parseExpression());
          if (tokens[current].type === "punctuation" && tokens[current].value === ",") {
              current++;
          }
      }
      
      if (tokens[current].type !== "punctuation" || tokens[current].value !== ")") {
          throw new Error(`Expected ')' after ${functionName} arguments`);
      }
      current++;
      
      return {
          type: "StringFunction",
          name: functionName,
          arguments: args
      };
  }

  function parseDebugFunction() {
      const functionName = tokens[current].value;
      current++;
      
      if (tokens[current].type !== "punctuation" || tokens[current].value !== "(") {
          throw new Error(`Expected '(' after ${functionName}`);
      }
      current++;
      
      const args = [];
      while (current < tokens.length && 
             !(tokens[current].type === "punctuation" && tokens[current].value === ")")) {
          args.push(parseExpression());
          if (tokens[current].type === "punctuation" && tokens[current].value === ",") {
              current++;
          }
      }
      
      if (tokens[current].type !== "punctuation" || tokens[current].value !== ")") {
          throw new Error(`Expected ')' after ${functionName} arguments`);
      }
      current++;
      
      return {
          type: "DebugFunction",
          name: functionName,
          arguments: args
      };
  }

  function parseArrayLiteral() {
      current++; // Move past '['
      
      const elements = [];
      
      // Handle empty array
      if (tokens[current].type === "bracket" && tokens[current].value === "]") {
          current++; // Move past ']'
          return {
              type: "ArrayLiteral",
              elements: elements
          };
      }
      
      // Parse first element
      elements.push(parseExpression());
      
      // Parse remaining elements
      while (current < tokens.length) {
          // Check for closing bracket
          if (tokens[current].type === "bracket" && tokens[current].value === "]") {
              current++; // Move past ']'
              return {
                  type: "ArrayLiteral",
                  elements: elements
              };
          }
          
          // Expect a comma
          if (tokens[current].type !== "punctuation" || tokens[current].value !== ",") {
              throw new Error("Expected comma between array elements");
          }
          current++; // Move past comma
          
          // Parse next element
          elements.push(parseExpression());
      }
      
      throw new Error("Expected closing bracket ']'");
  }

  function parseArrayOperation() {
      const operation = tokens[current].value;
      current++; // Move past operation keyword
      
      // Expect array name
      if (tokens[current].type !== "identifier") {
          throw new Error(`Expected array name after ${operation}`);
      }
      const arrayName = tokens[current].value;
      current++; // Move past array name
      
      let value = null;
      if (operation === "push" || operation === "get") {
          value = parseExpression();
      }
      
      // Skip semicolon if present
      if (current < tokens.length && tokens[current].type === "punctuation" && tokens[current].value === ";") {
          current++;
      }
      
      return {
          type: "ArrayOperation",
          operation: operation,
          arrayName: arrayName,
          value: value
      };
  }

  function walk() {
      let token = tokens[current];

      if (token.type === "keyword") {
          switch (token.value) {
              case "set":
                  return parseVariableDeclaration();
              case "print":
                  return parsePrint();
              case "if":
                  return parseIf();
              case "for":
                  return parseForLoop();
              case "while":
                  return parseWhileLoop();
              case "input":
                  return parseInput();
              case "push":
              case "pop":
              case "size":
              case "get":
                  return parseArrayOperation();
              case "sqrt":
              case "pow":
              case "abs":
              case "round":
              case "floor":
              case "ceil":
              case "random":
              case "max":
              case "min":
                  return parseMathFunction();
              case "length":
              case "substring":
              case "concat":
              case "uppercase":
              case "lowercase":
              case "trim":
                  return parseStringFunction();
              case "debug":
              case "assert":
              case "trace":
                  return parseDebugFunction();
          }
      }

      if (token.type === "identifier") {
          return parseAssignment();
      }

      return parseExpression();
  }

  const ast = {
      type: "Program",
      body: []
  };

  while (current < tokens.length) {
      ast.body.push(walk());
  }

  return ast;
};

const codeGen = (node) => {
  switch (node.type) {
      case "Program":
          const statements = node.body.map(codeGen);
          return `
              let __output = [];
              
              // Input helper function
              function __getInput(promptStr) {
                  const value = prompt(promptStr);
                  if (value === null) {
                      throw new Error("No input provided");
                  }
                  return value;
              }
              
              // Error handling helper functions
              function __checkDivisionByZero(a, b, op) {
                  if ((op === '/' || op === '%') && b === 0) {
                      throw new Error('Division by zero');
                  }
                  return true;
              }

              function __safeEval(left, op, right) {
                  __checkDivisionByZero(left, right, op);
                  
                  // Type checking
                  if (typeof left !== 'number' || typeof right !== 'number') {
                      throw new Error('Arithmetic operations can only be performed on numbers');
                  }

                  switch(op) {
                      case '+': return left + right;
                      case '-': return left - right;
                      case '*': return left * right;
                      case '/': return left / right;
                      case '%': return left % right;
                      default: throw new Error('Unknown operator: ' + op);
                  }
              }

              // Math helper functions
              const __math = {
                  sqrt: Math.sqrt,
                  pow: Math.pow,
                  abs: Math.abs,
                  round: Math.round,
                  floor: Math.floor,
                  ceil: Math.ceil,
                  random: () => Math.random(),
                  max: (...args) => Math.max(...args),
                  min: (...args) => Math.min(...args)
              };
              
              // String helper functions
              const __string = {
                  length: (str) => str.length,
                  substring: (str, start, end) => str.substring(start, end),
                  concat: (str1, str2) => str1.concat(str2),
                  uppercase: (str) => str.toUpperCase(),
                  lowercase: (str) => str.toLowerCase(),
                  trim: (str) => str.trim()
              };
              
              // Debug helper functions
              const __debug = {
                  log: console.log,
                  assert: (condition, message) => {
                      if (!condition) throw new Error(message);
                  },
                  trace: () => console.trace()
              };
              
              // Array helper functions
              const __array = {
                  push: (arr, value) => { arr.push(value); return arr; },
                  pop: (arr) => arr.pop(),
                  size: (arr) => arr.length,
                  get: (arr, index) => {
                      if (index < 0 || index >= arr.length) {
                          throw new Error('Array index out of bounds');
                      }
                      return arr[index];
                  }
              };
              
              ${statements.join('\n')}
              return __output;
          `;
          
      case "VariableDeclaration":
          let declaration = `let ${node.name} = `;
          
          if (node.varType === "array") {
              if (node.value.type === "ArrayLiteral") {
                  declaration += codeGen(node.value);
              } else {
                  declaration += "[]"; // Empty array if no initial value
              }
          } else {
              if (node.value.type === "BinaryExpression") {
                  declaration += `${codeGen(node.value)}`;
              } else if (node.value.type === "InputExpression") {
                  const inputCode = codeGen(node.value);
                  switch (node.varType) {
                      case "int":
                          declaration += `parseInt(${inputCode})`;
                          break;
                      case "float":
                          declaration += `parseFloat(${inputCode})`;
                          break;
                      case "string":
                          declaration += inputCode;
                          break;
                      case "char":
                          declaration += `${inputCode}.charAt(0)`;
                          break;
                  }
              } else if (node.value.type === "MathFunction") {
                  declaration += `__math.${node.value.name}(${node.value.arguments.map(arg => codeGen(arg)).join(", ")})`;
              } else if (node.value.type === "StringFunction") {
                  declaration += `__string.${node.value.name}(${node.value.arguments.map(arg => codeGen(arg)).join(", ")})`;
              } else {
                  if (node.value.type === "string") {
                      declaration += `"${node.value.raw}"`;
                  } else {
                      switch (node.varType) {
                          case "int":
                              declaration += `parseInt(${node.value.value})`;
                              break;
                          case "float":
                              declaration += `parseFloat(${node.value.value})`;
                              break;
                          case "string":
                              declaration += `"${node.value.value.replace(/\\n/g, '\n')}"`;
                              break;
                          case "char":
                              declaration += `'${node.value.value}'`;
                              break;
                      }
                  }
              }
          }
          return declaration + ";";

      case "BinaryExpression":
          const leftExpr = node.left.type === "identifier" ? node.left.value : codeGen(node.left);
          const rightExpr = node.right.type === "identifier" ? node.right.value : codeGen(node.right);
          
          if (/[<>]=?|==|!=/.test(node.operator)) {
              // For comparison operators, don't use __safeEval
              return `${leftExpr} ${node.operator} ${rightExpr}`;
          }
          if (node.operator === "&&" || node.operator === "||") {
              // Handle logical operators separately
              return `${leftExpr} ${node.operator} ${rightExpr}`;
          }
          return `__safeEval(${leftExpr}, "${node.operator}", ${rightExpr})`;

      case "Print":
          const printValue = node.expression.type === "identifier" ? 
              node.expression.value : 
              node.expression.type === "string" ?
              `"${node.expression.raw}"` :
              codeGen(node.expression);
          return `__output.push(${printValue});`;

      case "IfStatement":
          const ifCondition = node.condition.type === "identifier" ? 
              node.condition.value : 
              codeGen(node.condition);
          let ifCode = `if (${ifCondition}) {\n`;
          ifCode += Array.isArray(node.ifBody) ? 
              node.ifBody.map(stmt => codeGen(stmt)).join('\n') : 
              codeGen(node.ifBody);
          ifCode += "\n}";
          if (node.elseBody) {
              ifCode += ` else {\n${Array.isArray(node.elseBody) ? 
                  node.elseBody.map(stmt => codeGen(stmt)).join('\n') : 
                  codeGen(node.elseBody)}\n}`;
          }
          return ifCode;

      case "ForLoop":
          const forInit = codeGen(node.init);
          const forCondition = codeGen(node.condition);
          const forIncrement = codeGen(node.increment);
          let forCode = `for (${forInit}; ${forCondition}; ${forIncrement}) {\n`;
          forCode += Array.isArray(node.body) ? 
              node.body.map(stmt => codeGen(stmt)).join('\n') : 
              codeGen(node.body);
          forCode += "\n}";
          return forCode;

      case "WhileLoop":
          const whileCondition = node.condition.type === "identifier" ? 
              node.condition.value : 
              codeGen(node.condition);
          let whileCode = `while (${whileCondition}) {\n`;
          whileCode += Array.isArray(node.body) ? 
              node.body.map(stmt => codeGen(stmt)).join('\n') : 
              codeGen(node.body);
          whileCode += "\n}";
          return whileCode;

      case "AssignmentExpression":
          const assignValue = node.value.type === "identifier" ? 
              node.value.value : 
              codeGen(node.value);
          return `${node.name} = ${assignValue}`;

      case "UnaryExpression":
          const argName = node.argument.value;
          if (node.operator === "++") {
              return node.prefix ? 
                  `(${argName} = ${argName} + 1)` :
                  `(${argName}++)`;
          } else if (node.operator === "--") {
              return node.prefix ?
                  `(${argName} = ${argName} - 1)` :
                  `(${argName}--)`;
          }
          throw new Error(`Unknown unary operator: ${node.operator}`);

      case "InputExpression":
          const promptStr = node.prompt ? `"${node.prompt.value}"` : '""';
          return `parseInt(__getInput(${promptStr}))`;

      case "MathFunction":
          const mathArgs = node.arguments.map(arg => codeGen(arg)).join(", ");
          return `__math.${node.name}(${mathArgs})`;

      case "StringFunction":
          const stringArgs = node.arguments.map(arg => codeGen(arg)).join(", ");
          return `__string.${node.name}(${stringArgs})`;

      case "DebugFunction":
          const debugArgs = node.arguments.map(arg => codeGen(arg)).join(", ");
          return `__debug.${node.name}(${debugArgs})`;

      case "ArrayLiteral":
          const elements = node.elements.map(elem => codeGen(elem)).join(', ');
          return `[${elements}]`;

      case "ArrayOperation":
          switch (node.operation) {
              case "push":
                  return `__array.push(${node.arrayName}, ${codeGen(node.value)});`;
              case "pop":
                  return `__array.pop(${node.arrayName});`;
              case "size":
                  return `__array.size(${node.arrayName})`;
              case "get":
                  return `__array.get(${node.arrayName}, ${codeGen(node.value)})`;
              default:
                  throw new Error(`Unknown array operation: ${node.operation}`);
          }

      default:
          if (node.type === "identifier" || node.type === "number" || node.type === "float") {
              return node.value.toString();
          }
          throw new Error(`Unknown node type: ${node.type}`);
  }
};

const compiler = (input) => {
  if (!input || input.trim() === "") {
      throw new Error("No input code provided");
  }
  const tokens = tokenizer(input);
  const ast = parser(tokens);
  const generatedCode = codeGen(ast);
  console.log("Generated code:", generatedCode);
  return generatedCode;
};

const runner = (input) => {
  try {
      console.log("Executing code:", input);
      const executeCode = new Function(input);
      const result = executeCode();
      if (Array.isArray(result)) {
          result.forEach(item => console.log("Output:", item));
          return result.join('\n');
      }
      return result;
  } catch (error) {
      console.error("Error during code execution:", error);
      throw error;
  }
};

export { compiler, runner };


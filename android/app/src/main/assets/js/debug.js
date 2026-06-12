/* eslint-disable */

// debug.js
(() => {
  const formatValueToString = value => {
    const type = typeof value;

    if (type === 'number' || type === 'boolean' || value == null) {
      return `${value}`;
    }

    if (type === 'string') {
      return `"${value}"`;
    }

    if (type === 'symbol') {
      const description = value.description;
      return description == null ? 'Symbol' : `Symbol(${description})`;
    }

    if (type === 'function') {
      const functionName = value.name;
      return typeof functionName === 'string' && functionName.length > 0
        ? `Function(${functionName})`
        : 'Function';
    }

    if (Array.isArray(value)) {
      const arrayElements = value.map(element => formatValueToString(element));
      return `[${arrayElements.join(', ')}]`;
    }

    const rawObjectType = Object.prototype.toString.call(value);
    const regexMatch = /\[object ([^\]]+)\]/.exec(rawObjectType);
    const objectType =
      regexMatch && regexMatch.length > 1 ? regexMatch[1] : rawObjectType;

    if (objectType === 'Object') {
      try {
        return `Object(${JSON.stringify(value)})`;
      } catch (error) {
        return 'Object';
      }
    }

    if (value instanceof Error) {
      return `${value.name}: ${value.message}\n${value.stack}`;
    }

    return objectType;
  };

  const methods = ['log', 'debug', 'info', 'warn', 'error'];
  methods.forEach(method => {
    const originalMethod = console[method];
    console[method] = (...args) => {
      originalMethod.apply(console, args);
      const safeArgs = args.map(arg => formatValueToString(arg));
      reader.post({
        type: 'console',
        method: method,
        args: safeArgs,
      });
    };
  });

  window.onerror = (message, source, lineno, colno, error) => {
    const msg = `${message} at ${source}:${lineno}:${colno}${
      error ? `\n${error.stack}` : ''
    }`;
    reader.post({ type: 'error', msg });
    return true;
  };

  window.addEventListener('unhandledrejection', event => {
    const msg = `Unhandled Rejection: ${event.reason}`;
    reader.post({ type: 'error', msg });
  });
})();

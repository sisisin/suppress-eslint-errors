const path = require('path');
const jscodeshift = require('jscodeshift');
const codeMod = require('../suppress-eslint-errors');

test('inserts a new comment in javascript', () => {
	const program = `export function foo(a, b) {
  return a == b;
}
`;

	expect(modifySource(program)).toBe(`export function foo(a, b) {
  // eslint-disable-next-line eqeqeq -- TODO: Fix this the next time the file is edited.
  return a == b;
}
`);
});

test("doesn't update unnecessarily", () => {
	const program = `export function foo(a, b) {
  // eslint-disable-next-line eqeqeq -- TODO: Fix this the next time the file is edited.
  return a == b;
}
`;

	expect(modifySource(program)).toBe(undefined);
});

test('inserts a new comment in jsx', () => {
	const program = `export function Component({ a, b }) {
  return (
    <div>
      <div>{a == b}</div>
    </div>
  );
}`;

	expect(modifySource(program)).toBe(`export function Component({ a, b }) {
  return (
    (<div>
      {/* eslint-disable-next-line eqeqeq -- TODO: Fix this the next time the file is edited. */}
      <div>{a == b}</div>
    </div>)
  );
}`);
});

test('updates an existing comment in javascript', () => {
	const program = `export function foo(a, b) {
  // eslint-disable-next-line eqeqeq
  const bar = a == b;
}
`;

	expect(modifySource(program)).toBe(`export function foo(a, b) {
  // eslint-disable-next-line eqeqeq, no-unused-vars
  const bar = a == b;
}
`);
});

test('updates an existing comment with an explanation in javascript', () => {
	const program = `export function foo(a, b) {
  // eslint-disable-next-line eqeqeq -- for reasons
  const bar = a == b;
}
`;

	expect(modifySource(program)).toBe(`export function foo(a, b) {
  // eslint-disable-next-line eqeqeq, no-unused-vars -- for reasons
  const bar = a == b;
}
`);
});

test('updates an existing comment in jsx', () => {
	const program = `export function Component({ a }) {
  return (
    <div>
      {/* eslint-disable-next-line eqeqeq */}
      <div>{a == c}</div>
    </div>
  );
}`;

	expect(modifySource(program)).toBe(`export function Component({ a }) {
  return (
    <div>
      {/* eslint-disable-next-line eqeqeq, no-undef */}
      <div>{a == c}</div>
    </div>
  );
}`);
});

test('updates an existing comment with an explanation in jsx', () => {
	const program = `export function Component({ a }) {
  return (
    <div>
      {/* eslint-disable-next-line eqeqeq -- for reasons */}
      <div>{a == c}</div>
    </div>
  );
}`;

	expect(modifySource(program)).toBe(`export function Component({ a }) {
  return (
    <div>
      {/* eslint-disable-next-line eqeqeq, no-undef -- for reasons */}
      <div>{a == c}</div>
    </div>
  );
}`);
});

test('inserts comments above a closing tag', () => {
	const program = `export function Component({ a, b }) {
  return (
    <div>
      <div>
      </div>{a == b}
    </div>
  );
}`;

	expect(modifySource(program)).toBe(`export function Component({ a, b }) {
  return (
    <div>
      <div>
        {/* eslint-disable-next-line eqeqeq -- TODO: Fix this the next time the file is edited. */}
      </div>{a == b}
    </div>
  );
}`);
});

test('updates comments above a closing tag', () => {
	const program = `export function Component({ a }) {
  return (
    <div>
      <div>
        {/* eslint-disable-next-line eqeqeq */}
      </div>{a == c}
    </div>
  );
}`;

	expect(modifySource(program)).toBe(`export function Component({ a }) {
  return (
    <div>
      <div>
        {/* eslint-disable-next-line eqeqeq, no-undef */}
      </div>{a == c}
    </div>
  );
}`);
});

test('supports adding comments to JSX attributes', () => {
	const program = `export function Component({ a, b }) {
    return (
      <div
        prop={a == b ? a : b}>
      </div>
    );
  }`;

	expect(modifySource(program)).toBe(`export function Component({ a, b }) {
    return (
      <div
        // eslint-disable-next-line eqeqeq -- TODO: Fix this the next time the file is edited.
        prop={a == b ? a : b}>
      </div>
    );
  }`);
});

test('supports adding comments to JSX attributes containing markup', () => {
	const program = `export function Component({ a, b }) {
    return (
      <div
        prop={
          <div prop={a == b ? a : b} />
        }>
      </div>
    );
  }`;

	expect(modifySource(program)).toBe(`export function Component({ a, b }) {
    return (
      <div
        prop={
          // eslint-disable-next-line eqeqeq -- TODO: Fix this the next time the file is edited.
          <div prop={a == b ? a : b} />
        }>
      </div>
    );
  }`);
});

test('supports alternative messages in javascript', () => {
	const program = `export function foo(a, b) {
  return a == b;
}
`;

	expect(modifySource(program, { message: 'Something more informative' }))
		.toBe(`export function foo(a, b) {
  // eslint-disable-next-line eqeqeq -- Something more informative
  return a == b;
}
`);
});

test('supports alternative messages in jsx', () => {
	const program = `export function Component({ a, b }) {
  return (
    <div>
      <div>{a == b}</div>
    </div>
  );
}`;

	expect(modifySource(program, { message: 'Something more informative' }))
		.toBe(`export function Component({ a, b }) {
  return (
    (<div>
      {/* eslint-disable-next-line eqeqeq -- Something more informative */}
      <div>{a == b}</div>
    </div>)
  );
}`);
});

test('supports rule whitelist in javascript', () => {
	const program = `export function foo(a, b) {
  return a == b;
  console.log('unreachable');
}
`;

	expect(modifySource(program, { rules: 'no-unreachable' })).toBe(`export function foo(a, b) {
  return a == b;
  // eslint-disable-next-line no-unreachable -- TODO: Fix this the next time the file is edited.
  console.log('unreachable');
}
`);
});

test('supports errors on multiline return statements', () => {
	const program = `export function fn(a, b) {
  if (a) {
    return;
  }

  if (b) {
    return {
      b
    };
  }
}`;

	expect(modifySource(program, { rules: 'consistent-return' })).toBe(`export function fn(a, b) {
  if (a) {
    return;
  }

  if (b) {
    // eslint-disable-next-line consistent-return -- TODO: Fix this the next time the file is edited.
    return {
      b
    };
  }
}`);
});

test('skips eslint warnings', () => {
	const program = `export function fn(a) {
  a()
}`;

	expect(modifySource(program)).toBe(undefined);
});

test('skips files that eslint cannot parse', () => {
	const program = `not actually javascript`;

	expect(modifySource(program)).toBe(undefined);
});

test('comments named export with correct syntax', () => {
	const program = `export const Component = (a, b) => {
  return a === b;
}`;

	const baseConfig = { plugins: ['import'], rules: { 'import/prefer-default-export': 'error' } };

	expect(
		modifySource(program, {
			baseConfig,
		})
	)
		.toBe(`// eslint-disable-next-line import/prefer-default-export -- TODO: Fix this the next time the file is edited.
export const Component = (a, b) => {
  return a === b;
}`);
});

test('does not split JSX lines containing multiple nodes', () => {
	const program = `export function Component({ a, b }) {
  return (
    <div>
      Some text <span>{a == b}</span>.
    </div>
  );
}`;

	expect(modifySource(program)).toBe(`export function Component({ a, b }) {
  return (
    (<div>
      {/* eslint-disable-next-line eqeqeq -- TODO: Fix this the next time the file is edited. */}
      Some text <span>{a == b}</span>.
    </div>)
  );
}`);
});

test('handles trailing text on the previous line', () => {
	const program = `export function Component({ a, b }) {
  return (
    <div>
      <div />Some text
      <span>{a == b}</span>.
    </div>
  );
}`;

	expect(modifySource(program)).toBe(`export function Component({ a, b }) {
  return (
    (<div>
      <div />Some text
      {/* eslint-disable-next-line eqeqeq -- TODO: Fix this the next time the file is edited. */}
      <span>{a == b}</span>.
    </div>)
  );
}`);
});

test('preserves significant trailing whitespace in jsx text nodes', () => {
	const program = `export function Component({ a, b }) {
  return (
    <div>
      Some text <span>next to a span</span>
      <span onClick={() => a == b}>hi</span>.
    </div>
  );
}`;

	expect(modifySource(program)).toBe(`export function Component({ a, b }) {
  return (
    (<div>
      Some text <span>next to a span</span>
      {/* eslint-disable-next-line eqeqeq -- TODO: Fix this the next time the file is edited. */}
      <span onClick={() => a == b}>hi</span>.
    </div>)
  );
}`);
});

test('preserves significant leading whitespace in jsx text nodes', () => {
	const program = `export function Component({ a, b }) {
  return (
    <div>
      <span>A span</span> next to some text
      <span onClick={() => a == b}>hi</span>.
    </div>
  );
}`;

	expect(modifySource(program)).toBe(`export function Component({ a, b }) {
  return (
    (<div>
      <span>A span</span> next to some text
      {/* eslint-disable-next-line eqeqeq -- TODO: Fix this the next time the file is edited. */}
      <span onClick={() => a == b}>hi</span>.
    </div>)
  );
}`);
});

test('does not split if from preceding else', () => {
	const program = `export function foo(a, b) {
  if (a === b) {
    return a;
  } else if (a == b) {
    return b;
  }

  return null;
}`;

	expect(modifySource(program)).toBe(`export function foo(a, b) {
  if (a === b) {
    return a;
    // eslint-disable-next-line eqeqeq -- TODO: Fix this the next time the file is edited.
  } else if (a == b) {
    return b;
  }

  return null;
}`);
});

test('correctly modifies comments in else if conditions', () => {
	const program = `export function foo(a, b) {
  if (a === b) {
    return a;
    // eslint-disable-next-line eqeqeq
  } else if (a == c) {
    return b;
  }

  return null;
}`;

	expect(modifySource(program)).toBe(`export function foo(a, b) {
  if (a === b) {
    return a;
    // eslint-disable-next-line eqeqeq, no-undef
  } else if (a == c) {
    return b;
  }

  return null;
}`);
});

test('correctly handles empty blocks with multiple violations in else if conditions', () => {
	const program = `export function foo(a, b) {
  if (a === b) {
  } else if (a == c) {
    return b;
  }

  return null;
}`;

	expect(modifySource(program, { rules: 'eqeqeq,no-undef' })).toBe(`export function foo(a, b) {
  if (a === b) {

    // eslint-disable-next-line eqeqeq, no-undef -- TODO: Fix this the next time the file is edited.
  } else if (a == c) {
    return b;
  }

  return null;
}`);
});

test('correctly modifies empty blocks with violations in else if conditions', () => {
	const program = `export function foo(a, b) {
  if (a === b) {
    // eslint-disable-next-line eqeqeq
  } else if (a == c) {
    return b;
  }

  return null;
}`;

	expect(modifySource(program, { rules: 'eqeqeq,no-undef' })).toBe(`export function foo(a, b) {
  if (a === b) {
    // eslint-disable-next-line eqeqeq, no-undef
  } else if (a == c) {
    return b;
  }

  return null;
}`);
});

const defaultPath = path.resolve(__dirname, 'examples', 'index.js');
function modifySource(source, options) {
	const transformOptions = { ...options };
	if (transformOptions.baseConfig) {
		transformOptions.baseConfig = JSON.stringify(transformOptions.baseConfig);
	}

	const result = codeMod(
		{
			source,
			path: defaultPath,
		},
		{ jscodeshift, j: jscodeshift, report: console.log },
		transformOptions
	);

	return result ? result.replace(/\r\n/g, '\n') : result;
}

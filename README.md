[![Tree shaking support][badge-tree-shaking]][link-bundlephobia]
[![Compressed package size][badge-size]][link-bundlephobia]

# Store + XState

Huge thanks to the XState & Legend-State teams <3

## legend-xstate (Legend-State + XState)

- Observable and Computed context
- Optimized React hooks
- A supporting test suite

Provides a core library (`legend-xstate`) usable with vanilla `xstate` and a React sub-library (`legend-xstate/react`) with XState React hooks optimized for Legend-State

[CodeSandbox Demo](https://codesandbox.io/s/legend-xstate-example-czqmzv?file=/src/ComputedExample.jsx)\
[![NPM](https://nodei.co/npm/legend-xstate.png)](https://www.npmjs.com/package/legend-xstate)

Please see the [XState](https://xstate.js.org/docs/guides/start.html#our-first-machine) and [Legend-State](https://legendapp.com/open-source/state/) docs if you're not already familiar with either library.

```typescript
import { interpret } from 'xstate';
import { computed } from '@legendapp/state';
import { createObservableMachine } from 'legend-xstate';

const countMachine = createObservableMachine<{ count: number; computed: { doubled: number; doubledDoubled: number } }>({
  initial: 'start',
  // Automatically transformed into observable context
  context: {
    count: 0,
  },
  // Object with computed values that can reference context or other computed values
  computed: (context) => ({
    doubled: computed(() => context.count.get() * 2),
    doubledDoubled: computed(() => context.computed.doubled.get() * 2),
  }),
  states: {
    start: {
      on: {
        INC: {
          // Update context Legend-State's observable style
          action: assign((context) => context.count.set((c) => c + 1)),
        },
      },
    },
  },
});

const service = interpret(countMachine).start();

service.send({ type: 'INC' });

service.state.context.count.peek(); // 1
service.state.context.computed.doubled.peek(); // 2
service.state.context.computed.doubledDoubled.peek(); // 4
```

Installation:

- yarn: `yarn add legend-xstate`
- npm: `npm i legend-xstate`
- pnpm: `pnpm add legend-xstate`

Required peer dependencies for `legend-xstate`:

- [@legendapp/state](https://www.npmjs.com/package/@legendapp/state)
- [xstate](https://www.npmjs.com/package/xstate)

Required peer dependencies for `legend-xstate/react`:

- [react](https://www.npmjs.com/package/react)
- [@xstate/react](https://www.npmjs.com/package/@xstate/react)

### `createObservableMachine`

`createObservableMachine` is a replacement for XState's `createMachine` that turns `context` into an Observable and introduces a new `computed` config property.

- `context` is an object that is automatically transformed into an Observable.
- `computed` is a callback function providing the machine's `context` and should return an object with `computed` values from Legend-State.

`computed` values are mapped to `context.computed`

```typescript
import { createObservableMachine } from 'legend-xstate';
import { computed } from '@legendapp/state';

const machine = createObservableMachine<{ count: number; computed: { doubled: number } }>({
  initial: 'idle',
  context: { count: 1 },
  computed: (context) => ({
    doubled: computed(() => context.count.get() * 2),
  }),
  states: {},
});
```

### `ObservableContext<TypeContext, TypeComputed>`

A helper generic type accepting the shape of the context object and optionally the shape of the computed object.

```typescript
import { ObservableContext, createObservableMachine } from 'legend-xstate';

createObservableMachine<ObservableContext<{ count: number }, { doubled: number }>>({
  context: { count: 1 },
  computed: (context) => ({
    doubled: computed(() => context.count.get() * 2),
  }),
});
```

### `assign`

Overrides XState's `assign` function to allow updates in the observable without the need to return a value.

```typescript
// context { count: 0 }
const actions = {
  inc: assign((context) => context.count.set((c) => c + 1)),
  dec: assign((context) => context.count.set((c) => c - 1)),
};
```

### Helpers

- `observableContext(context, computed?): Context & {computed: Computed}`: Produces an observable context object with optional computed values. XState's context update flow requires the root context to be an object and not a Proxy, so `observableContext` adds all the methods of an observable onto context. It is recommended to use `createObservableMachine` before using `observableContext`
- args:
  - `context` XState context
  - `computed` An optional callback function that provides the `Context` as a value and returns an object with computed values

```typescript
const context = observableContext(
  // context
  {
    count: 1,
  },
  // computed callback
  (context) => ({
    doubled: computed(() => context.count.get() * 2),
    doubledDoubled: computed(() => context.computed.doubled.get() * 2),
  })
);
context.count.peek(); // 1
context.computed.doubled.peek(); // 2
```

### Notes

- Actors need to be wrapped in `opaqueObject` from `@legendapp/state` if they are stored in context
- If a computed is returning an `Observable` rather than the base value, the type passed into `Context` must be wrapped in `ObservableValue`. (I'm looking into ways to make this less annoying)
- `context` is a pseudo observable, meaning it's not a Proxy, but it has the same methods as an observable. This shouldn't cause any issues (except you'll need to use `state.context.get()` in React when rendering the root context object), but it's worth noting.

## legend-xstate/react (Legend-State + XState)

`legend-xstate/react` Exports optimized versions of `useMachine` and `useActor` from `@xstate/react` as `useObservableMachine` and `useObservableActor` that only rerender when absolutely necessary. Components using machines/actors have the same fine-grained reactivity from as you'd expect with `Legend-State`, a Component only rerenders when the `state.value` changes; `state.can`, `state.matches`, `state.hasTags`, etc. are run accordingly.
You can still use `useMachine` and `useActor` from `@xstate/react` but will lose out on more optimized component rerenders without manual memoization.

It's important to wrap your components in `@legendapp/state`'s `observer` wrapper.

The tests for `useObservableMachine` and `useObservableActor` are all ported from `@xstate/react` (thanks `@xstate/react` team :))

### Hooks

- `useObservableActor`: Optimized version of `@xstate/react`'s `useActor` with the same inputs and outputs.
- `useObservableMachine`: Optimized version of `@xstate/react`'s `useMachine` with the same inputs and outputs.

### Example

```typescript jsx
import { observer, enableLegendStateReact } from '@legendapp/state/react';
import { useObservableMachine } from 'legend-xstate/react';
enableLegendStateReact();

const Counter = observer(() => {
  // Using the same machine as above, optimized to take full advantage of `@legendapp/state/react`'s performance.
  // the full component will never re-render because `state.value` never changed
  const [state, send] = useObservableMachine(counterMachine);
  return (
    <div>
      count is {state.context.count} // Changes to count will not rerender the whole component
      <button onClick={() => send({ type: 'INC' })}>INC</button>
      <button onClick={() => send({ type: 'DEC' })}>DEC</button>
    </div>
  );
});
```

#### TODO

- Add more tests
- Better docs

# Building Development

- Install: `yarn`
- Run: `yarn`
- Run: `yarn run build:legend`

- To test run: `yarn run test`

[badge-size]: https://badgen.net/bundlephobia/minzip/legend-xstate
[badge-tree-shaking]: https://badgen.net/bundlephobia/tree-shaking/legend-xstate
[link-bundlephobia]: https://bundlephobia.com/package/legend-xstate

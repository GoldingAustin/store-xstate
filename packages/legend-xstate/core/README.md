![Size](https://badgen.net/badge/bundlephobia/minzip/legend-xstate)

# legend-xstate (Legend-State + XState)

```typescript
import { interpret } from 'xstate';
import { createContext } from 'legend-xstate';

const countMachine = createMachine({
  initial: 'start',
  context: createContext(
    {
      count: 0,
    },
    (context) => ({
      doubled: computed(() => context.count.get() * 2),
    })
  ),
  states: {
    start: {
      on: {
        INC: {
          action: assign((context) => context.count.set((c) => c + 1)),
        },
      },
    },
  },
});

const service = interpret(countMachine).start();

service.send({ type: 'INC' });

service.state.context.count; // 1
service.state.context.computed.double; // 2
```

Provides a core library (`legend-xstate`) usable with vanilla `xstate` and a React sub-library (`legend-xstate/react`) with XState React hooks optimized for Legend-State

[![NPM](https://nodei.co/npm/legend-xstate.png)](https://www.npmjs.com/package/legend-xstate)

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

### Functions

- `createContext(context, computed?): Context & {computed: Computed}`: Produces an observable context object with optional computed values. XState's context update flow requires the root context to be an object and not a Proxy, so `createContext` adds all the methods of an observable onto context.
  - args:
    - `context` XState context
    - `computed` An optional callback function that provides the `Context` as a value and returns an object with computed values
  - example:
    ```typescript
    const context = createContext(
      // context
      {
        count: 1,
      },
      // computed callback
      (context) => ({
        doubled: computed(() => context.count.get() * 2),
      })
    );
    context.count; // 1
    context.computed.doube; // 2
    ```
- `assign`: Overrides XState's `assign` function to allow updates in the observable without the need to return a value.

### Types

- `Context<TypeContext, TypeComputed>`: A generic accepting the shape of the context object and optionally the shape of the computed object. The computed object is optional because it is not required to use Legend-State in XState.
  - example:
    ```typescript
    createMachine<Context<{ count: number }, { doubled: number }>>({
      context: createContext({
        count: observable(1),
        computed: (context) => ({
          doubled: computed(() => context.count.get() * 2),
        }),
      }),
    });
    ```

### Notes

- Actors need to be wrapped in `opaqueObject` from `@legendapp/state` if they are stored in context
- If a computed is returning an `Observable` rather than the base value, the type passed into `Context` must be wrapped in `ObservableValue`
- `context` is a pseudo observable, meaning it's not a Proxy, but it has the same methods as an observable. This shouldn't cause any issues (except you'll need to use `state.context.get()` in React when rendering the root context object), but it's worth noting.

### Example

```typescript
import { createContext, assign, Context } from 'legend-xstate';
import { interpret } from 'xstate';
// Wrap context type in `Observable` generic
const counterMachine = createMachine<Context<{ count: number }>>(
  {
    initial: 'active',
    // Use `createContext` to produce something similar to `observable({count: 0})`
    context: createContext({ count: 0 }),
    states: {
      active: {
        on: {
          INC: { actions: 'inc' },
          DEC: { actions: 'dec' },
        },
      },
    },
  },
  {
    actions: {
      // `assign` overrides xstate's `assign` to disregard the return value
      inc: assign((context) => context.count.set((c) => c + 1)),
      dec: assign((context) => context.count.set((c) => c - 1)),
    },
  }
);

const service = interpret(counterMachine).start();
// Access the observable context
service.state.context;
```

## legend-xstate/react (Legend-State + XState)

`legend-xstate/react` Exports optimized versions of `useMachine` and `useActor` that only rerender when absolutely necessary. Component don't rerender on any context changes, they only rerender the `state.value` changes so `state.can`, `state.matches`, `state.hasTags`, etc. are run accordingly.

It's important to wrap your components in `legendapp/state`'s `observer` wrapper.

The tests for `useMachine` and `useActor` are all ported from `@xstate/react` (thanks `@xstate/react` team :))

### Hooks

- `useActor`: Optimized version of `@xstate/react`'s `useActor` with the same inputs and outputs.
- `useMachine`: Optimized version of `@xstate/react`'s `useMachine` with the same inputs and outputs.

### Example

```typescript jsx
import { observer, enableLegendStateReact } from '@legendapp/state/react';
import { useMachine } from 'legend-xstate/react';
enableLegendStateReact();

const Counter = observer(() => {
  // Using the same machine as above, optimized to take full advantage of `@legendapp/state/react`'s performance.
  // the full component will never re-render because `state.value` never changed
  const [state, send] = useMachine(counterMachine);
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

- Try to make typing the machine easier with observable & computed values
- Add more tests

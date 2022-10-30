# legend-xstate (Legend-State + XState)

Provides a core library (`legend-xstate`) usable with vanilla `xstate` and a React sub-library (`legend-xstate/react`) with XState React hooks optimized for Legend-State

[![NPM](https://nodei.co/npm/legend-xstate.png)](https://www.npmjs.com/package/legend-xstate)

Installation:
- yarn: ``` yarn add legend-xstate ```
- npm: ``` npm i legend-xstate ```
- pnpm: ``` pnpm add legend-xstate ```

Required peer dependencies for `legend-xstate`:
- [@legendapp/state](https://www.npmjs.com/package/@legendapp/state)
- [xstate](https://www.npmjs.com/package/xstate)

Required peer dependencies for `legend-xstate/react`:
- [react](https://www.npmjs.com/package/react)
- [@xstate/react](https://www.npmjs.com/package/@xstate/react)

### Functions
- `createContext`: Produces a context object with an observable store property. XState's context update flow requires the observable to be in a nested property to avoid being overwritten. `createContext({ count: 0 })` turns into `{store: observable({count: 0})}`
- `assign`: Overrides XState's `assign` function to allow updates in the observable without the need to return a value.
- `getStore`: A helper function that takes in a machine `State` and returns the underlying `observable`. The store can also be accessed normally with `state.context.store`.

### Types
- `Store<Context>`: A generic that accept the context type

### Notes
- Actors need to be wrapped in `opaqueObject` from `@legendapp/state` if they are stored in context
- `createContext` has a second argument `_strict` that can be set to false if a union type is causing TypeScript issues with `Observable`

### Example

```typescript
import { createContext, assign, Store, getStore } from 'legend-xstate';
import { interpret } from 'xstate';
// Wrap context type in `Store` generic
const counterMachine = createMachine<Store<{ count: number }>>(
  {
    initial: "active",
    // Use `createContext` to produce `{store: observable({count: 0})}` 
    context: createContext({ count: 0 }),
    states: {
      active: {
        on: {
          INC: { actions: "inc" },
          DEC: { actions: "dec" },
        },
      }
    },
  },
  {
    actions: {
      // `assign` overrides xstate's `assign` to disregard the return value
      inc: assign(({ store }) => store.count.set((c) => c + 1)),
      dec: assign(({ store }) => store.count.set((c) => c - 1)),
    },
  }
);

const service = interpret(counterMachine).start();
// Access the observable store
service.state.context.store
// Or you the helper function
const store = getStore(service.state);
```

## legend-xstate/react (Legend-State + XState)

`legend-xstate/react` Exports optimized versions of `useMachine` and `useActor` that only rerender when absolutely necessary. Component don't rerender on any context changes, they only rerender the `state.value` changes so `state.can`, `state.matches`, `state.hasTags`, etc. are run accordingly.

It's important to wrap your components in `legendapp/state`'s `observer` wrapper.

The tests for `useMachine` and `useActor` are all ported from `@xstate/react` (thanks `@xstate/react` team :))

### Hooks
- `useActor`: Optimized version of `@xstate/react`'s `useActor` with the same inputs and outputs.
- `useMachine`: Optimized version of `@xstate/react`'s `useMachine` with the same inputs and outputs.
- `useStateStore`: A helper hook that accepts a `State` object and returns the `observable` context store. You can still access the store without this hook using `state.context.store`;

### Example

```typescript jsx
import { observer, enableLegendStateReact } from '@legendapp/state/react';
import { useMachine, useStateStore } from 'legend-xstate/react';
enableLegendStateReact();


const Counter = observer(() => {
  // Using the same machine as above, optimized to take full advantage of `@legendapp/state/react`'s performance.
  // the full component will never re-render because `state.value` never changed
  const [state, send] = useMachine(counterMachine);
  const store = useStateStore(state); // store can also be accessed with `state.context.store`
  return (
    <div>
      
      count is {store.count}
      <button onClick={() => send({ type: "INC" })}>INC</button>
      <button onClick={() => send({ type: "DEC" })}>DEC</button>
    </div>
  );
});
```

#### TODO

- If XState had a `set` action that did not overwrite the root object on context update, the store could be used as context
- Try to make typing the machine easier
- Add more tests

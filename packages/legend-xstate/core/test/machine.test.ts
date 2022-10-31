/// <reference types="vitest/globals" />
import { computed, opaqueObject } from '@legendapp/state';
import { ActorRef, interpret, send, sendParent, spawn, createMachine } from 'xstate';
import { assign, createContext } from '../src';
import type { Context } from '../src';

describe('Vanilla XState', () => {
  test('update a primitive value', () => {
    const countMachine = createMachine<Context<{ count: number }, { doubled: number }>>(
      {
        initial: 'start',
        context: createContext(
          {
            count: 0,
          },
          (c) => ({
            doubled: computed(() => c.count.get() * 2),
          })
        ),
        states: {
          start: {
            entry: 'increment',
          },
        },
      },
      {
        actions: {
          increment: assign((store) => store.count.set(3)),
        },
      }
    );
    const state = countMachine.transition(countMachine.initialState, 'start');
    expect(state.context.count.get()).toBe(3);
    expect(state.context.computed.doubled.get()).toBe(6);
  });

  test('update a nested primitive value', () => {
    const sleepMachine = createMachine<Context<{ sleep: { count: { sheep: number } } }>>(
      {
        initial: 'start',
        context: createContext({
          sleep: {
            count: {
              sheep: 0,
            },
          },
        }),
        states: {
          start: {
            entry: 'increment',
          },
        },
      },
      {
        actions: {
          increment: assign((store) => store.sleep.count.sheep.set(3)),
        },
      }
    );

    const state = sleepMachine.transition(sleepMachine.initialState, 'start');
    expect(state.context.sleep.count.sheep.get()).toEqual(3);
  });

  test('update a nested primitive value with function', () => {
    const sleepMachine = createMachine<
      Context<{ sleep: { count: { sheep: number } } }, { doubled: number }>
    >(
      {
        initial: 'start',
        context: createContext(
          {
            sleep: {
              count: {
                sheep: 3,
              },
            },
          },
          (c) => ({
            doubled: computed(() => c.sleep.count.sheep.get() * 2),
          })
        ),
        states: {
          start: {
            entry: 'increment',
          },
        },
      },
      {
        actions: {
          increment: assign((store) => store.sleep.count.sheep.set((value) => value + 3)),
        },
      }
    );
    const state = sleepMachine.transition(sleepMachine.initialState, 'start');
    expect(state.context.sleep.count.sheep.get()).toEqual(6);
    expect(state.context.computed.doubled.get()).toEqual(12);
  });

  test('update a nested boolean with a function', () => {
    const sleepMachine = createMachine<Context<{ sleep: { isSleeping: boolean } }>>(
      {
        initial: 'start',
        context: createContext({
          sleep: {
            isSleeping: false,
          },
        }),
        states: {
          start: {
            entry: 'fall asleep',
          },
        },
      },
      {
        actions: {
          'fall asleep': assign((store) => store.sleep.isSleeping.set((value) => !value)),
        },
      }
    );
    const state = sleepMachine.transition(sleepMachine.initialState, 'start');
    expect(state.context.sleep.isSleeping.get()).toEqual(true);
  });

  test('update an array', () => {
    const todoMachine = createMachine<Context<{ todos: { task: string; completed: boolean }[] }>>(
      {
        initial: 'start',
        context: createContext({
          todos: [
            { task: 'Finish work', completed: false },
            { task: 'Go grocery shopping', completed: false },
            { task: 'Make dinner', completed: false },
          ],
        }),
        states: {
          start: {
            entry: 'sleep',
          },
        },
      },
      {
        actions: {
          sleep: assign((store) => store.todos.push({ task: 'Sleep', completed: false })),
        },
      }
    );
    const state = todoMachine.transition(todoMachine.initialState, 'start');
    expect(state.context.todos.length).toEqual(4);
    expect(state.context.todos[3].task.get()).toEqual('Sleep');
  });

  test('update multiple items in an array', () => {
    const todoMachine = createMachine<
      Context<
        { todos: { task: string; completed: boolean }[] },
        { notComplete: { task: string; completed: boolean }[] }
      >
    >(
      {
        initial: 'start',
        context: createContext(
          {
            todos: [
              { task: 'Finish work', completed: false },
              { task: 'Go grocery shopping', completed: false },
              { task: 'Make dinner', completed: false },
            ],
          },
          (c) => ({
            notComplete: computed(() => c.todos.get().filter((t) => !!t.completed)),
          })
        ),
        states: {
          start: {
            entry: 'mark done',
          },
        },
      },
      {
        actions: {
          'mark done': assign((store) =>
            store.todos.forEach((todo) => {
              if (!todo.completed.get()) todo.completed.set(true);
            })
          ),
        },
      }
    );
    expect(todoMachine.initialState.context.computed.notComplete.get().length).toEqual(3);
    const state = todoMachine.transition(todoMachine.initialState, 'start');
    expect(state.context.todos.length).toEqual(3);
    expect(state.context.todos.every((todo) => !!todo.completed.get())).toEqual(true);
  });

  test('update range of items in an array', () => {
    const todoMachine = createMachine<Context<{ todos: { task: string; completed: boolean }[] }>>(
      {
        initial: 'start',
        context: createContext({
          todos: [
            { task: 'Finish work', completed: false },
            { task: 'Go grocery shopping', completed: false },
            { task: 'Make dinner', completed: false },
          ],
        }),
        states: {
          start: {
            entry: 'mark done',
          },
        },
      },
      {
        actions: {
          'mark done': assign((store) => {
            store.todos[0].completed.set(true);
            store.todos[1].completed.set(true);
          }),
        },
      }
    );
    const state = todoMachine.transition(todoMachine.initialState, 'start');
    expect(state.context.todos.length).toEqual(3);
    expect(state.context.todos.filter((todo) => todo.completed.get()).length).toEqual(2);
  });

  test('Add an item with event data', () => {
    const todoMachine = createMachine<
      Context<{ todos: { task: string; completed: boolean }[] }>,
      { type: 'add'; name: string }
    >(
      {
        initial: 'start',
        context: createContext({
          todos: [
            { task: 'Finish work', completed: false },
            { task: 'Go grocery shopping', completed: false },
            { task: 'Make dinner', completed: false },
          ],
        }),
        states: {
          start: {
            on: {
              add: {
                actions: 'add',
              },
            },
          },
        },
      },
      {
        actions: {
          add: assign((store, event) => {
            store.todos.push({ task: event.name, completed: false });
          }),
        },
      }
    );
    const state = todoMachine.transition(todoMachine.initialState, { type: 'add', name: 'go to sleep' });
    expect(state.context.todos.length).toEqual(4);
    expect(state.context.todos[3].get()).toEqual({ task: 'go to sleep', completed: false });
  });

  test('Reset action', () => {
    const nameMachine = createMachine(
      {
        initial: 'start',
        schema: {} as {
          context: Context<{ first: string; last: string; father: undefined | { first: string; last: string } }>;
          events:
            | { type: 'set name'; first: string; last: string }
            | { type: 'set father'; first: string; last: string }
            | { type: 'reset name' };
        },
        context: createContext({
          first: '',
          last: '',
          father: undefined,
        }),
        states: {
          start: {
            on: {
              'set name': {
                actions: 'set name',
              },
              'reset name': {
                actions: 'reset name',
              },
              'set father': {
                actions: 'set father',
              },
            },
          },
        },
      },
      {
        actions: {
          'set name': assign((store, event) => {
            if (event.type === 'set name') {
              store.first.set(event.first);
              store.last.set(event.last);
            }
          }),
          'set father': assign((store, event) =>
            event.type === 'set father' ? store.father.set({ first: event.first, last: event.last }) : undefined
          ),
          'reset name': assign((store) => store.assign({ first: '', last: '' })),
        },
      }
    );
    const state = nameMachine.transition(nameMachine.initialState, {
      type: 'set name',
      first: 'Luke',
      last: 'Skywalker',
    });

    expect(state.context.get()).toEqual({ first: 'Luke', last: 'Skywalker', father: undefined });
    const state2 = nameMachine.transition(state, { type: 'reset name' });
    expect(state2.context.get()).toEqual({ first: '', last: '', father: undefined });

    const state3 = nameMachine.transition(state2, { type: 'set father', first: 'Anakin', last: 'Skywalker' });
    expect(state3.context.get()).toEqual({ first: '', last: '', father: { first: 'Anakin', last: 'Skywalker' } });
  });

  test('spawn actor', () =>
    new Promise<void>((done) => {
      const remoteMachine = createMachine({
        id: 'remote',
        initial: 'offline',
        states: {
          offline: {
            on: {
              WAKE: 'online',
            },
          },
          online: {
            after: {
              1000: {
                actions: sendParent('REMOTE.ONLINE'),
              },
            },
          },
        },
      });

      const parentMachine = createMachine<Context<{ localOne: undefined | ActorRef<typeof remoteMachine> }>>({
        id: 'parent',
        initial: 'waiting',
        context: createContext({
          localOne: undefined,
        }),
        states: {
          waiting: {
            entry: assign((store) => store.localOne.set(opaqueObject(spawn(remoteMachine)))),
            on: {
              'LOCAL.WAKE': {
                actions: send({ type: 'WAKE' }, { to: (context) => context.localOne.get()! }),
              },
              'REMOTE.ONLINE': { target: 'connected' },
            },
          },
          connected: {},
        },
      });

      const parentService = interpret(parentMachine).start();

      parentService.send({ type: 'LOCAL.WAKE' });
      expect(parentService.state.context.localOne.get()).toBeTruthy();
      setTimeout(() => {
        expect(parentService.state.value).toEqual('connected');
        done();
      }, 1500);
    }));
});

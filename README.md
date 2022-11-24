# Type State Machine

A simple, type-safe state machine library, heavily inspired by [Tinder's state
machine](https://github.com/Tinder/StateMachine).

## Installation

NPM:

```sh
npm install typed-state-machine
```

Yarn:

```sh
yarn add typed-state-machine
```

## Example

```ts
import { StateMachine } from "typed-state-machine";

type State =
  | { type: "locked"; credit: number }
  | { type: "unlocked" }
  | { type: "broken"; oldState: State };

type Event =
  | { type: "insertCoin"; value: number }
  | { type: "admitPerson" }
  | { type: "machineDidFail" }
  | { type: "machineRepairDidComplete" };

const FARE_PRICE = 50;

const fsm = new StateMachine<State, Event>(({ initialState, state }) => {
  initialState({ type: "locked", credit: 0 });

  state("locked", ({ onEnter, on }) => {
    onEnter(() => {
      console.log("Locked.");
    });
    on("insertCoin", ({ event, state, transitionTo }) => {
      const newCredit = state.credit + event.value;
      if (newCredit >= FARE_PRICE) {
        return transitionTo({ type: "unlocked" }, () => {
          console.log("Open doors");
        });
      }

      return transitionTo({ type: "locked", credit: newCredit });
    });
    on("admitPerson", ({ dontTransition }) => {
      return dontTransition(() => {
        console.log("Sound alarm");
      });
    });
    on("machineDidFail", ({ state, transitionTo }) => {
      return transitionTo({ type: "broken", oldState: state }, () => {
        console.log("Order repair");
      });
    });
  });

  state("unlocked", ({ on }) => {
    on("admitPerson", ({ transitionTo }) => {
      return transitionTo({ type: "locked", credit: 0 });
    });
  });

  state("broken", ({ on, onExit }) => {
    onExit(() => {
      console.log("No longer broken.");
    });
    on("machineRepairDidComplete", ({ state, transitionTo }) => {
      return transitionTo(state.oldState);
    });
  });
});
```

## Documentation

Before instantiating a state machine, one should first define all possible
state and event types:

```ts
type State =
  | { type: "locked"; credit: number }
  | { type: "unlocked" }
  | { type: "broken"; oldState: State };

type Event =
  | { type: "insertCoin"; value: number }
  | { type: "admitPerson" }
  | { type: "machineDidFail" }
  | { type: "machineRepairDidComplete" };
```

Each union variant should contain a mandatory field `type` alongside an optional
set of fields associated with each state or event. By explicitly defining states
and events, TypeScript will provide proper type-checking and autocomplete,
making it harder to make a type-related mistake.

A state machine could then be created by instantiating the `StateMachine` class.
The constructor takes in two generic type parameters, `State` and `Event` (both
of which extend `{ type: string }`):

```ts
const fsm = new StateMachine<State, Event>(({ initialState, state }) => {
  initialState({ type: "locked", credit: 0 });

  state("locked", ({ onEnter, on }) => {});

  state("unlocked", ({ on }) => {});

  state("broken", ({ on, onExit }) => {});
});
```

Contrary to most other state machine libraries, this library doesn't use an
object literal to configure the state machine. Instead, it uses a callback-based
configuration approach (that closely matches the way that the Tinder state
machine is used). This approach allows one to declare local variables within a
specific state without having to pollute the scope accessible to other states.
This is useful, for example, if one would like to use a timer within a specific
state:

```ts
state("timeSensitiveState", ({ onEnter, onExit, on }) => {
  let timer!: ReturnType<typeof setTimeout>;

  onEnter(() => {
    timer = setTimeout(() => {
      // do something
    }, 5000);
  });
  onExit(() => {
    clearTimeout(timer);
  });
  // handle events
});
```

The constructor for `StateMachine` takes in a single argument, `configCallback`
which in turn provides an argument object with two functions: `initialState` and
`state`. The `initialState` function is used to define the initial state. It
is mandatory to be called within the `configCallback`. It takes one argument of
the generic type `State`:

```ts
initialState({ type: "locked", credit: 0 });
```

The `state` function is used to configure a specific state. It takes two
arguments, the first one being the value of one of the `type` properties in the
generic `State` union; the second being the `stateDefinitionCallback`, which in
turn provides an argument object with three functions, `onEnter`, `onExit` and
`on`:

```ts
state("locked", ({ onEnter, onExit, on }) => {
  onEnter(({ state }) => {});
  onExit(({ state }) => {});
  on("admitPerson", ({ dontTransition }) => {
    return dontTransition();
  });
});
```

The `onEnter` function defines the callback that gets triggered once the machine
enters the state. The callback provides an argument object with the property
`state`, which refers to the current state object. The `onExit` function is
identical to `onEnter`, except that it gets triggered once the machine exits the
state.

The `on` function is used to configure what happens when an event gets
dispatched for the state. It takes two arguments, the first being the value of
one of the `type` properties in the generic `Event` union; the second being the
`onEventCallback`, which in turn provides an argument object with four
properties, `state`, `event`, `transitionTo` and `dontTransition`. The callback
should return either a call to `transitionTo` or a call to `dontTransition`:

```ts
on("admitPerson", ({ state, event, transitionTo }) => {
  console.log(state, event);
  return transitionTo({ type: "locked", credit: 0 });
});
```

```ts
on("admitPerson", ({ state, event, dontTransition }) => {
  console.log(state, event);
  return dontTransition();
});
```

The `state` and `event` properties provide access to the current state object
and the event dispatched event object respectively.

Returning a call to `transitionTo` will make the machine transition to a
specific state. The function takes 1 or 2 arguments. The first (mandatory)
argument defines the state to transition to. The second (optional) argument can
be used to define a side effect callback that will be scheduled for execution by
the event loop (asynchronously, making it so that the side effect will never run
BEFORE the transition finishes).

Returning a call to `dontTransition` will not make the machine transition. The
function takes 1 optional argument, which is the side effect callback described
above.

Once created, an event could be dispatched using the `transition` method of a
`StateMachine` instance. The first argument takes an event object:

```ts
fsm.transition({ type: "unlocked" });
```

You can access the current state object via the `state` getter:

```ts
console.log(fsm.state);
```

You can also subscribe to the state machine via the `subscribe` method. The
first argument takes a listener callback that provides three arguments,
`previous`, `current` and `event`. The method returns a function that
unsubscribes the listener when called:

```ts
const unsubscribe = fsm.subscribe((previous, current, event) => {
  console.log(previous, current, event);
});
```

The `previous` argument holds the previous state object. On the very first emit
(which gets triggered when the `subscribe` method itself gets called), the value
is `null`. The `current` argument holds the current state object. The `event`
argument holds the event object that triggered the transition. On the very first
emit, the value is `null`.

You can then call the returned function (stored in `unsubscribe` in this
example) to unsubscribe the listener:

```ts
unsubscribe();
```

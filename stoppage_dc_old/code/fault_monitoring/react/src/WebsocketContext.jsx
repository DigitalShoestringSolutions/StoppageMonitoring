import React from 'react';
import useWebSocket, { ReadyState } from 'react-use-websocket';

const WebsocketSendContext = React.createContext();

export function useWebsocketSend() {
  const context = React.useContext(WebsocketSendContext);
  if (context === undefined) {
    throw new Error("useWebsocketSend must be used within a WebsocketProvider");
  }

  return context;
}

const WebsocketStateContext = React.createContext();
const WebsocketDispatchContext = React.createContext();

export function useWebsocketState() {
  const context = React.useContext(WebsocketStateContext);
  if (context === undefined) {
    throw new Error("useWebsocketState must be used within a WebsocketProvider");
  }

  return context;
}

export function useWebsocketDispatch() {
  const context = React.useContext(WebsocketDispatchContext);
  if (context === undefined) {
    throw new Error("useToastDispatch must be used within a WebsocketProvider");
  }

  return context;
}


const DefaultReducer = (currentState, action) => {
  console.log(action)
  switch (action.type) {
    case 'STATUS':
      return {
        ...currentState,
        connected:action.connected
      };
    default:
      throw new Error(`Unhandled action type: ${action.type}`);
  }
};

async function default_new_message_action(dispatch, message) {
  //do nothing
}

export const WebsocketProvider = ({ children, url, reducer = DefaultReducer, initial_state = {connected:false}, new_message_action = default_new_message_action, debug = false }) => {
  const { sendJsonMessage, lastJsonMessage, readyState } = useWebSocket(url, { shouldReconnect: (closeEvent) => true })
  const [state, dispatch] = React.useReducer(reducer, initial_state);

  React.useEffect(() => {
    if (debug) {
      const connectionStatus = {
        [ReadyState.CONNECTING]: 'Connecting',
        [ReadyState.OPEN]: 'Open',
        [ReadyState.CLOSING]: 'Closing',
        [ReadyState.CLOSED]: 'Closed',
        [ReadyState.UNINSTANTIATED]: 'Uninstantiated',
      }[readyState];

      console.log(connectionStatus)
    }
    dispatch({type:'STATUS',connected:readyState===ReadyState.OPEN})
  }, [readyState, debug]);

  React.useEffect(() => {
    new_message_action(dispatch, lastJsonMessage)
  }, [lastJsonMessage, new_message_action]);

  return (
    <WebsocketSendContext.Provider value={sendJsonMessage}>
      <WebsocketStateContext.Provider value={state}>
        <WebsocketDispatchContext.Provider value={dispatch}>
          {children}
        </WebsocketDispatchContext.Provider>
      </WebsocketStateContext.Provider>
    </WebsocketSendContext.Provider>
  );
};


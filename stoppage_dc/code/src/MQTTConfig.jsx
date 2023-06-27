
import { STATUS } from './variables';

export async function new_message_action(dispatch, message) {
  // console.log(message)
  if (message && message.topic.match("equipment_monitoring/status/")) {
    let machine = message.topic.split('/').pop()
    let status = message.payload?.running ? STATUS.running : STATUS.stopped
    dispatch({ type: 'MACHINE_STATUS', machine: machine, status: status })
  } else if (message && message.topic.match("status/")) {
    if (message.payload?.connected === true) {
      let tsplit = message.topic.split('/')
      let machine = tsplit[1]
      dispatch({ type: 'MACHINE_STATUS', machine: machine, status: STATUS.disconnected })
    }
  } else if (message && message.topic.match("event_sm/")) {
    let machine = message.payload?.machine_name
    let event = message.payload
    dispatch({ type: 'EVENT', machine: machine, event: event })
  // } else if (message && message.topic.match(/manual_input\/stoppages\/.*\/reasons/)){
  //   let machine = message.payload?.machine_name
  //   let event = message.payload
  //   dispatch({ type: 'EVENT', machine: machine, event: event })
  }
}

export const reducer = (currentState, action) => {
  // console.log(action,currentState)
  switch (action.type) {
    case 'MQTT_STATUS':
      return {
        ...currentState,
        connected: action.connected
      };
    case 'MACHINE_STATUS':
      return {
        ...currentState,
        status: { ...currentState.status, [action.machine]: action.status }
      }
    case 'EVENT':
      let machine_events = currentState.events[action.machine] ?? []
      let found = machine_events.find((elem)=>(elem.event_id === action.event.event_id))
      if(found){
        machine_events = machine_events.map((elem) => (elem.event_id===action.event.event_id?{...action.event,...elem}:elem))
      } else {
        machine_events = [action.event,...machine_events]
      }

      return {
        ...currentState,
        events: {...currentState.events,[action.machine]:machine_events},
      }
    default:
      throw new Error(`Unhandled action type: ${action.type}`);
  }
};

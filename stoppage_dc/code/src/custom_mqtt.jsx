
import { STATUS } from './variables';
import * as dayjs from 'dayjs'

export const initial_state = { events: {}, status: {}, status_updated: {} }

export async function new_message_action(dispatch, message) {
  // console.log(message)
  if (message && message.topic.match("manual_input/stoppages")) {
    // console.log(">>>>", message.payload,message.topic)
    let machine = message.topic.split('/')[2]
    let status = message.payload?.running ? STATUS.running : STATUS.stopped
    
    dispatch({ type: 'MACHINE_STATUS', machine: machine, status: status, payload: message.payload })
    dispatch({ type: 'MANUAL_EVENT', machine: machine, status: status, payload: message.payload })
  } else if (message && message.topic.match("equipment_monitoring/status/")) {
    let machine = message.topic.split('/').pop()
    let status = message.payload?.running ? STATUS.running : STATUS.stopped
    dispatch({ type: 'MACHINE_STATUS', machine: machine, status: status, payload: message.payload })
  } else if (message && message.topic.match("status/")) {
    if (message.payload?.connected === true) {
      let tsplit = message.topic.split('/')
      let machine = tsplit[1]
      dispatch({ type: 'MACHINE_STATUS', machine: machine, status: STATUS.disconnected })
    }
  } else if (message && message.topic.match("event_sm/")) {
    let machine = message.payload?.machine_name
    let event = message.payload
    dispatch({ type: 'AUTO_EVENT', machine: machine, event: event })
    // } else if (message && message.topic.match(/manual_input\/stoppages\/.*\/reasons/)){
    //   let machine = message.payload?.machine_name
    //   let event = message.payload
    //   dispatch({ type: 'EVENT', machine: machine, event: event })
  }
}

export const custom_reducer = (currentState, action) => {
  // console.log(action,currentState)
  switch (action.type) {
    case 'MQTT_STATUS':
      return {
        ...currentState,
        connected: action.connected
      };
    case 'MACHINE_STATUS':
      let timestamp = dayjs(action.payload.timestamp)
      let last_updated = currentState.status_updated[action.machine]
      if (last_updated === undefined || timestamp > last_updated) {
        return {
          ...currentState,
          status: { ...currentState.status, [action.machine]: action.status },
          status_updated: { ...currentState.status_updated, [action.machine]: timestamp }
        }
      } else {
        return currentState
      }
    case 'MANUAL_EVENT':
      let manual_machine_events = currentState.events[action.machine] ?? []
      if (action.status === STATUS.running) {
        let last_event = manual_machine_events[0]
        let timestamp = action.payload.timestamp
        if (last_event && dayjs(timestamp) > dayjs(last_event.start)) {
          manual_machine_events = [...manual_machine_events]
          manual_machine_events[0].stop = timestamp
        }
      } else if (action.status === STATUS.stopped) {
        let last_event = manual_machine_events[0]
        let timestamp = action.payload.timestamp
        if (last_event === undefined || last_event.start !== timestamp) {
          let next_event = {
            start: action.payload.timestamp,
            reason: action.payload.status
          }
          manual_machine_events = [next_event, ...manual_machine_events]
        }
      }
      return {
        ...currentState,
        events: { ...currentState.events, [action.machine]: manual_machine_events },
      }
    case 'AUTO_EVENT':
      let auto_machine_events = currentState.events[action.machine] ?? []
      let found = auto_machine_events.find((elem) => (elem.event_id === action.event.event_id))
      if (found) {
        auto_machine_events = auto_machine_events.map((elem) => (elem.event_id === action.event.event_id ? { ...action.event, ...elem } : elem))
      } else {
        auto_machine_events = [action.event, ...auto_machine_events]
      }

      return {
        ...currentState,
        events: { ...currentState.events, [action.machine]: auto_machine_events },
      }
    default:
      throw new Error(`Unhandled action type: ${action.type}`);
  }
};

import 'bootstrap/dist/css/bootstrap.min.css';
import React from 'react'
import * as dayjs from 'dayjs'
import * as duration from 'dayjs/plugin/duration';
import { Container, Card, Col, Row, Button, Modal, Table, Spinner, ListGroup, Badge } from 'react-bootstrap'
import { WebsocketProvider, useWebsocketSend, useWebsocketState } from './WebsocketContext'
import APIBackend from './RestAPI'
import { BrowserRouter, Routes, Route, useParams, NavLink } from 'react-router-dom'

dayjs.extend(duration);

const STATUS = { running: 1, stopped: 0 }

function App() {
  return <WebsocketProvider url={'ws://' + document.location.host + '/ws/stateupdates/'}>
    <BrowserRouter>
      <Routing />
    </BrowserRouter>
  </WebsocketProvider>
}

function Routing(props) {
  return (<Routes>
    <Route path='input/' element={<ListPage {...props} />} />
    <Route path='input/:machine_id' element={<MachinePage {...props} />} />
  </Routes>)
}

function ListPage() {
  let [loaded, setLoaded] = React.useState(false)
  let [pending, setPending] = React.useState(false)
  let [error, setError] = React.useState(null)

  let [machines, setMachines] = React.useState([])

  React.useEffect(() => {
    let do_load = async () => {
      setPending(true)
      let response = await APIBackend.api_get('http://' + document.location.host + '/input/api/machines');
      if (response.status === 200) {
        setMachines(response.payload)
        setLoaded(true)
      } else {
        console.log("ERROR LOADING MACHINES")
        setError("ERROR: Unable to fetch Machine List!")
      }
    }
    if (!loaded && !pending) {
      do_load()
    }
  }, [loaded, pending])

  if (!loaded) {
    return <Container fluid="md">
      <Card className='mt-2 text-center'>
        {error !== null ? <h1>{error}</h1> : <Spinner></Spinner>}
      </Card>
    </Container>
  } else {
    return <Container fluid="md">
      <Card className='mt-2'>
        <Card.Header className='text-center'><h1>Machines</h1></Card.Header>
        <Card.Body>
          <ListGroup>
            {machines.map(machine => (
              <ListGroup.Item><NavLink to={"./" + machine.id}>{machine.name}</NavLink></ListGroup.Item>
            ))}
          </ListGroup>
        </Card.Body>
      </Card>
    </Container>
  }
}

function MachinePage() {
  let params = useParams();
  const machine_id = params.machine_id
  let [loaded, setLoaded] = React.useState(false)
  let [pending, setPending] = React.useState(false)
  let [error, setError] = React.useState(null)
  let [status, setStatus] = React.useState(STATUS.stopped)
  let [showModal, setShowModal] = React.useState(false);
  let [eventList, setEventList] = React.useState([])
  let [tmpEvent, setTmpEvent] = React.useState(null)
  let [selected_category, setSelectedCategory] = React.useState(null)
  let [reason_set, SetReasonSet] = React.useState([])
  let [machine_name, setMachineName] = React.useState([])

  let ws_send = useWebsocketSend()
  let { connected } = useWebsocketState()

  React.useEffect(() => {
    let do_load = async () => {
      setPending(true)
      let response = await APIBackend.api_get('http://' + document.location.host + '/input/api/reasons/' + machine_id);
      if (response.status === 200) {
        SetReasonSet(response.payload)
        response = await APIBackend.api_get('http://' + document.location.host + '/input/api/machines');
        if (response.status === 200) {
          console.log(response.payload, machine_id, response.payload.find(item => item.id.toString() === machine_id))
          setMachineName(response.payload.find(item => item.id.toString() === machine_id)?.name)
          setLoaded(true)
        } else {
          console.log("ERROR LOADING MACHINES")
          setError("ERROR: Unable to fetch Machine List!")
        }
      } else {
        console.log("ERROR LOADING REASONS")
        setError("ERROR: Machine Not Found!")
      }
    }
    if (!loaded && !pending) {
      do_load()
    }
  }, [loaded, pending, machine_id])

  const do_update = async (topic, payload) => {
    console.log("Sending ", payload, " to ", topic)
    await ws_send({ topic: topic, payload: payload })
  }

  const doSetStatus = (value) => {
    setStatus(value)
    setShowModal(value === STATUS.stopped)


    if (value === STATUS.running && tmpEvent) {
      do_update("input", { machine_id: machine_id, machine_name: machine_name, running: true, timestamp: dayjs().format(), status: "Running" })
      setEventList(prev => [{ ...tmpEvent, stop: dayjs() }, ...prev])
      setTmpEvent(null)
    } else if (value === STATUS.stopped) {
      setTmpEvent({ start: dayjs() })
    }
  }

  const handleReasonClick = (id) => {
    setShowModal(false)
    console.log(selected_category, reason_set)
    let category = reason_set.find(elem => elem.category_id === selected_category)
    let reason = category.reasons.find(elem => elem.id === id).text
    setTmpEvent(prev => ({ ...prev, reason: reason }))
    do_update("input", { machine_id: machine_id, machine_name: machine_name, running: false, timestamp: tmpEvent.start.format(), status: reason })
    setSelectedCategory(null)
  }

  if (!loaded) {
    return <Container fluid="md">
      <Card className='mt-2 text-center'>
        {error !== null ? <h1>{error}</h1> : <Spinner></Spinner>}
      </Card>
    </Container>
  } else {
    return <>
      <Container fluid="md">
        <Card className='mt-2'>
          <Card.Header className='text-center'>
            <h1>Stoppage Monitoring - {machine_name}</h1>
            {connected ? <Badge bg="success">Connected</Badge> : <Badge bg="danger">Disconnected</Badge>}
          </Card.Header>
          <Card.Body>
            <ButtonBar status={status} setStatus={doSetStatus} />
            <EventLog events={eventList} />
          </Card.Body>
        </Card>
      </Container>
      <ReasonModal
        show={showModal}
        handleClick={handleReasonClick}
        selected_category={selected_category}
        handleCategoryClick={(id) => setSelectedCategory(id)}
        reason_set={reason_set} />
    </>
  }
}

function ButtonBar({ status, setStatus }) {

  let status_badge, button

  if (status === STATUS.running) {
    status_badge = <Button variant="success" size="lg" disabled={true}>Running</Button>
    button = <Button variant="outline-danger" size="lg" onClick={() => setStatus(STATUS.stopped)}>Stop</Button>
  } else {
    status_badge = <Button variant="danger" size="lg" disabled={true}>Stopped</Button>
    button = <Button variant="outline-success" size="lg" onClick={() => setStatus(STATUS.running)}>Start</Button>
  }

  return <Container fluid>
    <Row className='gx-2 gy-1'>
      <Col xs={12} sm={8} className="d-grid px-1">
        {status_badge}
      </Col>
      <Col xs={12} sm={4} className="d-grid px-1">
        {button}
      </Col>
    </Row>
  </Container>
}

function ReasonModal({ show, handleClick, selected_category, handleCategoryClick, reason_set }) {

  let category_modal = <> <Modal.Header className='text-center'>
    <Modal.Title className="w-100">Reason Categories</Modal.Title>
  </Modal.Header>
    <Modal.Body>
      <Row className='gx-2 gy-2'>
        {reason_set.map(category => (
          <Col xs={12} sm={6} md={4} lg={3} key={category.category_id} className='d-grid'>
            <Button style={{ backgroundColor: category.colour, borderColor: 'transparent', color:'black' }} size='lg' onClick={() => handleCategoryClick(category.category_id)}>
              {category.category_name}
            </Button>
          </Col>
        ))}
      </Row>
    </Modal.Body>
  </>

  let chosen_category = reason_set.find(elem => elem.category_id === selected_category)

  let reason_modal = <>
    <Modal.Header className='text-center'>
      <Modal.Title className="w-100">Reason for Category {chosen_category?.category_name} <Button variant='light' className='float-end' onClick={() => handleCategoryClick(null)}>Back</Button></Modal.Title>
    </Modal.Header>
    <Modal.Body>
      <Row className='gx-2 gy-2'>
        {chosen_category?.reasons.map(reason => (
          <Col xs={12} sm={6} md={4} lg={3} key={reason.id} className='d-grid'>
            <Button variant="primary" size='lg' onClick={() => handleClick(reason.id)}>
              {reason.text}
            </Button>
          </Col>
        ))}
      </Row>
    </Modal.Body>
  </>


  return <Modal show={show} fullscreen={true}>
    {selected_category === null ? category_modal : reason_modal}
  </Modal>
}

function EventLog({ events }) {
  return <Card className='mt-4 mx-2'>
    <Table bordered>
      <thead>
        <tr>
          <th>Reason</th>
          <th>Time</th>
          <th>Duration</th>
        </tr>
      </thead>
      <tbody>
        {events.map((event, index) => (
          <tr key={index}>
            <td>{event.reason}</td>
            <td>{event.start.format('DD/MM/YYYY HH:mm:ss')}</td>
            <td>{dayjs.duration(event.stop.diff(event.start)).format('m[m] s[s]')}</td>
          </tr>
        ))}
      </tbody>
    </Table>
  </Card>
}

export default App;
